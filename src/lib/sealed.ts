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
}

/** Null when the code is wrong OR when no secret stage has been sealed yet. Same message either way. */
export async function openSecret(typed: string): Promise<SecretPayload | null> {
  if (!sealed.secret) return null;
  const text = await openPassage(sealed.secret, typed);
  if (!text) return null;
  try {
    return JSON.parse(text) as SecretPayload;
  } catch {
    return null;
  }
}
