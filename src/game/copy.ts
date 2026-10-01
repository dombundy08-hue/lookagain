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
