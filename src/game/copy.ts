// The Keeper's voice. No em dashes anywhere in this file.

export const PLAYERS = ["Zoe", "Evie", "Dane"] as const;

export const HERO_SUBTITLE =
  "Zoe. Evie. Dane. You found the book, so you already know how this works. Look once. Then look again.";

export const WELCOME =
  "Hello, Zoe. Hello, Evie. Hello, Dane. Welcome back to Curiosity Hour. Before we start, the show needs to know how brave you are.";

export const DIFFICULTY_REPLY = {
  easy: "Easy. That's sweet. There is no easy on this show.",
  normal: "Normal. Nothing about this is normal.",
  hard: "Hard. Good. That's the only setting we have.",
} as const;

export const DIFFICULTY_LOCKED = "VERY HARD";

/** Gentle wrong-answer nudges. Rotated, never harsh. */
export const NUDGES = [
  "Not quite. Look again.",
  "Zoe, read it out loud. Slowly. Sometimes the ears notice first.",
  "Close. Or maybe not. Evie, what do you think?",
  "Dane, look at it one more time. The answer is never hiding.",
  "Hm. Try saying it a different way.",
  "That's not it. But you're looking, and that's the whole trick.",
  "Zoe, Evie, Dane. Put your heads together on this one.",
];

export const GOOD = "Good.";

export const REWIND_COPY = {
  timerLabel: "Tape counter",
  timerOff: "Timer off",
  timerOn: "Timer on",
  ranOut: "The tape ran out. That's alright. Rewind and try again, or skip it.",
  done: "There it is. Good. You earned a star.",
  wrongPick: "That line comes later.",
};

export const SPOT_COPY = {
  done: "You saw it. Most people never do. You earned a star.",
  wrong: "That one is the same as before. Look again.",
};

export const FINAL_NUDGES = [
  "No. Look at what you wrote before. All of it.",
  "Read down, not across.",
  "Zoe, Evie, Dane. You already have it. You just haven't noticed yet.",
];

export const SECRET_COPY = {
  label: "Code from the tape",
  notYet: "That doesn't fit. Not yet.",
  back: "Back to the recording",
};

export const START_OVER_CONFIRM = "Start over from the beginning? Everything you've solved will be forgotten.";

export const RECALL_COPY = {
  ready: "We're ready",
  ranOut: "The tape ran out. Rewind and try again.",
  rewind: "Rewind",
};

export const TUNER_COPY = {
  label: "Tuning dial",
  locked: "You found the station. You earned a star.",
  strength: "Signal",
};

export const ORDER_COPY = {
  check: "Check the files",
  close: (n: number, total: number) => `${n} of ${total} are where they belong. Look again.`,
  done: "Every file back in its drawer. Good. You earned a star.",
  help: "Drag a card, or select it and use the arrow keys.",
};

/**
 * Hidden slips: things the Keeper let slip without meaning to.
 * DRAFT wording. Zach: check these against canon before the hunt.
 * Where each one hides (production note, never shown):
 *   ch3     title screen, the "CH 3" in the corner
 *   eyes    title screen, tap while the red eyes are open
 *   twice   top bar, the eye logo pressed twice quickly
 *   ink     tape log, invisible ink found by moving the light over the dark panel
 *   red     tape log, the red question mark
 *   said    typing "look again" into any answer box
 */
export const SLIPS: { id: string; text: string }[] = [
  { id: "ch3", text: "Turn the dial slowly. Things hide between stations." },
  { id: "eyes", text: "Did you see that too? I always told myself it was the studio lights." },
  { id: "twice", text: "Twice. Always twice. Once to see it. Once to be seen." },
  { id: "ink", text: "If you're reading this with a light, put it down for a minute. Some things notice light." },
  { id: "red", text: "Not yet. I'm not ready to tell you what's at the end." },
  { id: "said", text: "You said it. Everyone says it, sooner or later." },
];

export const SLIP_COPY = {
  found: (n: number, total: number) => `Slip ${n} of ${total}`,
  keep: "Keep it",
  all: "You found every slip. He never meant to leave them. You earned a star.",
  log: "Slips found",
  inkHint: "Some ink only shows under the right light.",
};

/** The catchphrase on the title screen. The word "secret" in it is the way back in. */
export const CATCHPHRASE = ["Look again. The ", "secret", "'s never hiding. It's just waiting to be noticed."] as const;
