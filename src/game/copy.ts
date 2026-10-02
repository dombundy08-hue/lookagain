// The Keeper's voice. No em dashes anywhere in this file.

export const HERO_SUBTITLE =
  "Zoe. Evie. Dane. You found the book, so you already know how this works. Look once. Then look again.";

export const WELCOME =
  "Hello, Zoe. Hello, Evie. Hello, Dane. Welcome back to Curiosity Hour. Before we start, the show needs to know how brave you are. And remember: the show keeps score. Do well now, and it pays you back later.";

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
  done: "There it is. Good. Ten seconds back on the clock.",
  wrongPick: "That line comes later.",
};

export const SPOT_COPY = {
  done: "You saw it. Most people never do. You earned a star.",
  wrong: "That one is the same as before. Look again.",
  gone: "Gone. Most people never even saw it change.",
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
  unlocked: "Unlocked",
};

export const START_OVER_CONFIRM = "Start over from the beginning? Everything you've solved will be forgotten.";

export const CLOCK_COPY = {
  start: "Start the clock",
  ranOut: "The clock ran out. No bonus this time. Keep going: the puzzles still need finishing.",
  added: (s: number) => `+${s} seconds`,
};

export const RESULT_COPY = {
  none: "The clock beat you this time. No bonus. The show remembers that too.",
  tape: "You beat the clock with time to spare. Something was waiting for you.",
  file: "Fifteen seconds to spare. That's two things.",
  carry: (s: string) => `You carry ${s} into the next round, plus two more minutes.`,
  open: "Play it",
  read: "Read it",
};

export const RECALL_COPY = {
  ready: "We're ready",
  ranOut: "The tape ran out.",
  rewind: "Rewind to the start",
  rewound: (n: number) => `Rewind ${n}. New questions. Same word at the end.`,
  hint: "Hint",
};

export const TUNER_COPY = {
  label: "Tuning dial",
  locked: "You found the station. Ten seconds back on the clock.",
  strength: "Signal",
};

export const ORDER_COPY = {
  check: "Check the files",
  close: (n: number, total: number) => `${n} of ${total} are where they belong. Look again.`,
  done: "Every file back in its drawer. Good. Ten seconds back on the clock.",
  help: "Drag a card, or select it and use the arrow keys.",
};

/**
 * Hidden secrets: lore the Keeper let slip without meaning to. Every one counts toward the feather.
 * DRAFT wording. Zach: check these against canon before the hunt.
 *
 * Tiny "?" marks (mark = the stage they sit on), easiest first, hardest last:
 *   difficulty, log, riddles, clock-start, tuner, rewind, order, clock-result, recall, acrostic, final, tape, home
 * Special finds (no "?"):
 *   ch3     title screen, the "CH 3" in the corner
 *   eyes    title screen, tap while the red eyes are open
 *   twice   top bar, the eye logo pressed twice quickly
 *   ink     tape log, a faint purple "?" loose on the page under the timeline
 *   red     tape log, the red question mark
 *   said    typing "look again" into any answer box that isn't asking for it
 */
export const SLIPS: { id: string; text: string; mark?: string }[] = [
  // Fixed order. The journal and every pop-up number them this way, whatever order they are found in.
  { id: "m-difficulty", mark: "difficulty", text: "We never had difficulty settings on the show. Harlan said kids don't need them. Harlan was right about most things." },
  { id: "m-log", mark: "log", text: "I used to know exactly how many tapes there were. I counted them twice. The number was different the second time." },
  { id: "red", text: "Not yet. I'm not ready to tell you what's at the end." },
  { id: "ink", text: "If you're reading this with a light, put it down for a minute. Some things notice light." },
  { id: "m-riddles", mark: "riddles", text: "My first riddle on the air was about a clock. The audience laughed before I finished it. I never found out who told them the answer." },
  { id: "said", text: "You said it. Everyone says it, sooner or later." },
  { id: "twice", text: "Twice. Always twice. Once to see it. Once to be seen." },
  { id: "ch3", text: "Turn the dial slowly. Things hide between stations." },
  { id: "eyes", text: "Did you see that too? I always told myself it was the studio lights." },
  { id: "m-clock-start", mark: "clock-start", text: "Harlan ran the booth clock. He said I always ran long. I said the clock ran short. One of us was right." },
  { id: "m-tuner", mark: "tuner", text: "He used to sit on top of the studio radio while we tuned it. He'd turn his head toward the static, like he heard something in it." },
  { id: "m-rewind", mark: "rewind", text: "I wrote the catchphrase in one night. I don't remember writing it. I only remember reading it back the next morning." },
  { id: "m-order", mark: "order", text: "Harlan filed the segment notes every week. One week there was an extra page in the stack, in my handwriting. I don't write like that." },
  { id: "m-clock-result", mark: "clock-result", text: "Corporate wanted everything faster. Faster tapes, faster shows. Something else was never in a hurry." },
  { id: "m-recall", mark: "recall", text: "Some nights I play the old tapes back and I'm saying things I never said. Small things. A word here, a word there." },
  { id: "m-acrostic", mark: "acrostic", text: "I always liked words that hide inside other words. Lately, something hides inside mine." },
  { id: "m-final", mark: "final", text: "I drew him in the corner of the first page because that's where he was. The next night he wasn't in the corner anymore." },
  { id: "m-tape", mark: "tape", text: "If I sound different on this one, it's because I am. A little more every time." },
  { id: "m-home", mark: "home", text: "The answer is death." },
];

export const SLIP_COPY = {
  found: (n: number, total: number) => `Secret ${n} of ${total}`,
  /** Shown on the very last secret. */
  last: "The last one.",
  keep: "Keep it",
  all: "You found every secret. He never meant to leave them. You earned a star.",
  log: "Secrets found",
};

/** The catchphrase on the title screen. The word "secret" in it opens its own lock. */
export const CATCHPHRASE = ["Look again. The ", "secret", "'s never hiding. It's just waiting to be noticed."] as const;

/** Earned by finishing the shared-clock section with 10+ seconds left. DRAFT, Zach to check canon. */
export const BONUS_TAPE = {
  title: "Bonus Reel",
  header: "CURIOSITY HOUR. BONUS REEL, NEVER AIRED. Speaker: KEEPER.",
  body: [
    "Fast hands. I like that.",
    "We used to have a game at the end of every show. The quickest kid in the audience got a prize. A little gold coin, wrapped up shiny. Something to keep.",
    "I handed out hundreds of them. I thought I was giving something away. It took me years to understand I was only ever passing it along.",
    "You don't own a thing like that. You accept it. And once you've accepted it, something gets to come and collect. It never takes. It only collects what it's owed.",
    "I kept the very first one myself, you know. Before the show ever aired. I never looked at it twice. Funny, for me.",
    "Keep your hands fast. Keep them empty.",
  ],
  audio: "media/bonus-reel.mp3",
};

/** Earned by finishing the shared-clock section with 15+ seconds left. DRAFT, Zach to check canon. */
export const BONUS_FILE = {
  title: "Extra File",
  header: "CURIOSITY HOUR. SEGMENT NOTES, STUDIO B. Supervisor: Harlan Vance. Distribution: Production only.",
  body: [
    "Owl segment pulled from the rundown, effective immediately. Host's request.",
    "Do not ask him about it. Do not move the perch.",
    "Note for the booth: Tuesday's tape has eleven seconds on it that nobody remembers recording. Do not air. Do not erase. Bring it to me directly.",
    "Signed, H.V.",
  ],
};

/**
 * Small puzzles on the last five secrets. Answers are sealed (ids "slip-<secret id>").
 * kind: "cipher" uses the Flag Clock card; "mirror" shows the clue flipped; others are plain.
 */
export const SLIP_PUZZLES: Record<string, { kind: "cipher" | "scramble" | "mirror" | "count"; prompt: string; clue: string }> = {
  "m-recall": { kind: "cipher", prompt: "Some of my notes are in code. Get out the Flag Clock card.", clue: "8:00   9:00   4:00   5:00" },
  "m-acrostic": { kind: "scramble", prompt: "These letters fell out of order. Put them back.", clue: "T  C  E  R  E  S" },
  "m-final": { kind: "mirror", prompt: "This one was written the wrong way round. What does it say?", clue: "NOTICED" },
  "m-tape": {
    kind: "count",
    prompt: "How many times do I say the word look? Only the word look.",
    clue: "Look. Look again. Look closer. Don't look away. Look at me. Looking is not enough.",
  },
  "m-home": {
    kind: "cipher",
    prompt: "The last of my notes. The card, one more time. I never wanted to write this one.",
    clue: "12:00   1:00   7:05   8:05",
  },
};

export const BLACKLIGHT_COPY = {
  how: "Move your finger or the mouse over the dark. It only shows where the light is.",
  keys: "Or press Enter to sweep the light across.",
  solve: "Open it",
  wrong: "That's not it. Look again.",
};
