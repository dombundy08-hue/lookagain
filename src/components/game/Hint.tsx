import { useState } from "react";

import { HOME_CLUE } from "@/game/copy";
import { STAGES } from "@/game/stages";
import { cn } from "@/lib/utils";

// Every hint in story order. Its place in this list sets how hidden its "?" is:
// the first is easy to spot, each one after it is smaller, fainter and tucked further away.
const ORDER: string[] = STAGES.flatMap((s) => {
  if (s.type === "riddles" || s.type === "recall") return s.items.filter((i) => i.clue).map((i) => i.id);
  return s.clue ? [s.id] : [];
});

const CLUES: Record<string, string> = Object.fromEntries(
  STAGES.flatMap((s) => {
    const own: [string, string][] = s.clue ? [[s.id, s.clue]] : [];
    const items: [string, string][] =
      s.type === "riddles" || s.type === "recall"
        ? s.items.filter((i) => i.clue).map((i) => [i.id, i.clue as string])
        : [];
    return [...own, ...items];
  }),
);

// Spots on the card, from obvious to easy-to-miss. Later hints cycle through the sneakier ones.
const SPOTS = [
  "top-3 right-3",
  "bottom-3 right-4",
  "top-3 left-1/2",
  "bottom-3 left-4",
  "top-1 right-1",
  "-top-3 left-10",
  "-bottom-3 right-16",
  "top-1/2 -right-3",
  "-top-3 right-1/3",
];

/** A tiny "?" on a puzzle card. Pressing it shows the hint in glowing LED ink. */
export function Hint({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const text = CLUES[id];
  const index = ORDER.indexOf(id);
  if (!text || index < 0) return null;

  const t = ORDER.length > 1 ? index / (ORDER.length - 1) : 0; // 0 = first, 1 = last
  const size = Math.round(20 - 11 * t); // 20px down to 9px
  const opacity = +(0.95 - 0.7 * t).toFixed(2); // fades to 0.25
  const spot = index === 0 ? SPOTS[0] : SPOTS[1 + ((index * 3) % (SPOTS.length - 1))];
  const early = t < 0.3;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Hint"
        aria-expanded={open}
        className={cn(
          "retro absolute z-10 cursor-pointer p-[3px] leading-none hover:opacity-100",
          spot,
          early ? "text-primary" : "text-muted-foreground",
          index === 0 && !open && "blink",
        )}
        style={{ fontSize: size, opacity: open ? 1 : opacity }}
      >
        ?
      </button>
      {open ? (
        <p
          className="keeper-voice glitch-in border-l-2 border-[#c6a6ff] pl-4 text-xl leading-snug text-[#c6a6ff] md:text-2xl"
          style={{ textShadow: "0 0 10px rgb(198 166 255 / 0.75), 0 0 2px rgb(198 166 255 / 0.9)" }}
          role="note"
        >
          {text}
        </p>
      ) : null}
    </>
  );
}

const LED_TEXT_SHADOW = "0 0 10px rgb(198 166 255 / 0.75), 0 0 2px rgb(198 166 255 / 0.9)";

/**
 * The home-screen hint. Hardest of all: it is the last digit of the tape counter in the corner,
 * same size and colour as the digits around it.
 */
export function HomeHint() {
  const [open, setOpen] = useState(false);
  return (
    <span className="pointer-events-auto relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Hint"
        aria-expanded={open}
        className={cn("cursor-default leading-none", open && "text-[#c6a6ff]")}
      >
        ?
      </button>
      {open ? (
        <span
          role="note"
          className="keeper-voice glitch-in absolute bottom-6 left-0 block w-[min(22rem,80vw)] font-body text-xl normal-case leading-snug tracking-normal text-[#c6a6ff]"
          style={{ textShadow: LED_TEXT_SHADOW }}
        >
          {HOME_CLUE}
        </span>
      ) : null}
    </span>
  );
}
