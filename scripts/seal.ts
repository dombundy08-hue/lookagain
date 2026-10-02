// Seals every answer, the transcript and the secret stage into src/game/sealed.json.
// Reads private/secrets.json (gitignored). Run with: npm run seal
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  normalize,
  openPassage,
  randomB64,
  sealAnswer,
  sealPassage,
  checkAnswer,
} from "../src/lib/crypto-core.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = JSON.parse(readFileSync(resolve(root, "private/secrets.json"), "utf8"));

const salt = randomB64(16);
const answers = {};
for (const [itemId, entries] of Object.entries(src.answers)) {
  const sealedEntries = [];
  const seen = new Set();
  for (const entry of entries) {
    for (const accepted of entry.accept) {
      const norm = normalize(accepted);
      if (!norm || seen.has(norm)) continue;
      seen.add(norm);
      sealedEntries.push(await sealAnswer(salt, itemId, accepted, entry.display));
    }
  }
  answers[itemId] = sealedEntries;
}

const transcript = await sealPassage(src.transcript.key, src.transcript.text);

// Each lock can hold many codes. Every code opens its own recording.
async function sealLock(entries) {
  const out = [];
  const seen = new Set();
  for (const e of entries ?? []) {
    if (!e || !e.code) continue;
    const n = normalize(e.code);
    if (seen.has(n)) continue; // "Dane's" and "danes" are the same code once normalized
    seen.add(n);
    out.push(
      await sealPassage(e.code, JSON.stringify({ title: e.title, body: e.body, audio: e.audio ?? null, quiet: Boolean(e.quiet) })),
    );
  }
  return out;
}
const secrets = await sealLock(src.secrets);
const titleSecrets = await sealLock(src.titleSecrets);

const sealed = { v: 1, salt, answers, transcript, secrets, titleSecrets };

// Self-check before writing: every accepted answer must open, and a wrong one must not.
for (const [itemId, entries] of Object.entries(src.answers)) {
  for (const entry of entries) {
    for (const accepted of entry.accept) {
      const got = await checkAnswer(sealed, itemId, accepted);
      if (got !== entry.display) throw new Error(`Self-check failed for ${itemId}`);
    }
  }
  if ((await checkAnswer(sealed, itemId, "definitely wrong")) !== null) {
    throw new Error(`Wrong answer accepted for ${itemId}`);
  }
}
if ((await openPassage(transcript, src.transcript.key)) !== src.transcript.text) {
  throw new Error("Transcript self-check failed");
}
if ((await openPassage(transcript, "wrong")) !== null) throw new Error("Transcript opened with a wrong key");

writeFileSync(resolve(root, "src/game/sealed.json"), JSON.stringify(sealed) + "\n");
console.log(
  `Sealed ${Object.keys(answers).length} answers, transcript, ${secrets.length} recording code(s), ${titleSecrets.length} title code(s).`,
);
