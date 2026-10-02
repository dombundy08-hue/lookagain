import sealedJson from "@/game/sealed.json";
import { checkAnswer, normalize, openPassage, type Sealed } from "@/lib/crypto-core";

const sealed = sealedJson as unknown as Sealed;

export { normalize };

export function check(itemId: string, typed: string) {
  return checkAnswer(sealed, itemId, typed);
}

export function openTranscript(typed: string) {
  return openPassage(sealed.transcript, typed);
}

export interface SecretPayload {
  title: string;
  body: string;
  audio: string | null;
  /** A transcript whose changed words look like ordinary text. */
  quiet?: boolean;
}

export type Lock = "story" | "title";

/**
 * Tries a code against every recording in a lock. Null when nothing fits,
 * including when no recording has been sealed yet. Same message either way.
 */
export async function openSecret(typed: string, lock: Lock = "story"): Promise<SecretPayload | null> {
  const list = (lock === "story" ? sealed.secrets : sealed.titleSecrets) ?? [];
  for (const passage of list) {
    const text = await openPassage(passage, typed);
    if (!text) continue;
    try {
      return JSON.parse(text) as SecretPayload;
    } catch {
      return null;
    }
  }
  return null;
}

/** Splits recorded text into display pieces. [[shown→edited]] marks a word the creature rewrites. */
export type Piece = { kind: "text"; text: string } | { kind: "edit"; shown: string; edited: string };

export function parseEdits(text: string): Piece[] {
  const out: Piece[] = [];
  const re = /\[\[([^\]]*?)→([^\]]*?)\]\]/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index! > last) out.push({ kind: "text", text: text.slice(last, m.index) });
    out.push({ kind: "edit", shown: m[1], edited: m[2] });
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push({ kind: "text", text: text.slice(last) });
  return out;
}
