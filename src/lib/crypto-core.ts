// Shared by the browser game and by scripts/seal.ts (Node runs this file directly).
// Keep it free of imports and non-erasable TypeScript so both can load it.

export const PBKDF2_ITERATIONS = 250_000;

const LEADING_WORDS = /^(the|a|an|my|your|his|her|our)\s+/;

/**
 * Normalize a typed answer: lowercase, strip accents and punctuation,
 * drop a leading article or possessive, drop spaces, drop one plural "s".
 * The same function runs when answers are sealed and when they are checked.
 */
export function normalize(input: string): string {
  let s = input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  while (LEADING_WORDS.test(s)) s = s.replace(LEADING_WORDS, "");
  s = s.replace(/\s/g, "");
  if (s.length >= 3 && s.endsWith("s") && !s.endsWith("ss")) s = s.slice(0, -1);
  return s;
}

const enc = new TextEncoder();
const dec = new TextDecoder();

export function toB64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export function fromB64(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function randomB64(length: number): string {
  return toB64(crypto.getRandomValues(new Uint8Array(length)));
}

async function sha256(text: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(text)));
}

export async function answerHash(salt: string, itemId: string, norm: string): Promise<string> {
  const bytes = await sha256(`${salt}|h|${itemId}|${norm}`);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function displayKey(salt: string, itemId: string, norm: string): Promise<CryptoKey> {
  const raw = await sha256(`${salt}|d|${itemId}|${norm}`);
  return crypto.subtle.importKey("raw", raw as Uint8Array<ArrayBuffer>, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function passphraseKey(
  passphrase: string,
  saltB64: string,
  iterations = PBKDF2_ITERATIONS,
): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: fromB64(saltB64), iterations, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export interface Box {
  iv: string;
  ct: string;
}

export async function seal(key: CryptoKey, text: string): Promise<Box> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(text)));
  return { iv: toB64(iv), ct: toB64(ct) };
}

/** Returns null when the key is wrong (AES-GCM authentication fails). */
export async function open(key: CryptoKey, box: Box): Promise<string | null> {
  try {
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64(box.iv) }, key, fromB64(box.ct));
    return dec.decode(pt);
  } catch {
    return null;
  }
}

export interface SealedAnswer {
  h: string;
  d: Box;
}

export interface SealedPassage extends Box {
  salt: string;
  iter: number;
}

export interface Sealed {
  v: 1;
  salt: string;
  answers: Record<string, SealedAnswer[]>;
  transcript: SealedPassage;
  secret: SealedPassage | null;
}

export async function sealAnswer(
  salt: string,
  itemId: string,
  accepted: string,
  display: string,
): Promise<SealedAnswer> {
  const norm = normalize(accepted);
  return {
    h: await answerHash(salt, itemId, norm),
    d: await seal(await displayKey(salt, itemId, norm), display),
  };
}

/** Checks a typed answer. Returns the canonical display word, or null if wrong. */
export async function checkAnswer(
  sealed: Sealed,
  itemId: string,
  typed: string,
): Promise<string | null> {
  const norm = normalize(typed);
  if (!norm) return null;
  const h = await answerHash(sealed.salt, itemId, norm);
  const hit = sealed.answers[itemId]?.find((a) => a.h === h);
  if (!hit) return null;
  return open(await displayKey(sealed.salt, itemId, norm), hit.d);
}

export async function sealPassage(passphrase: string, text: string): Promise<SealedPassage> {
  const salt = randomB64(16);
  const key = await passphraseKey(normalize(passphrase), salt);
  return { salt, iter: PBKDF2_ITERATIONS, ...(await seal(key, text)) };
}

/** Opens a locked passage with a typed word or code. Returns null if it does not fit. */
export async function openPassage(passage: SealedPassage, typed: string): Promise<string | null> {
  const norm = normalize(typed);
  if (!norm) return null;
  return open(await passphraseKey(norm, passage.salt, passage.iter), passage);
}
