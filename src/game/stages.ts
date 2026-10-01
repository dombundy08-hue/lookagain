// The stage engine config. Every screen after the title is one entry here.
// Change prompts, order or text here; the engine in App.tsx does not need to change.
// Answers are NOT here. They are sealed into sealed.json by `npm run seal`.
// Parent hints are NOT here either: they print on private/parent-hints.html.
import { WATCHER_SETS } from "./watcher-sets";

export interface PromptItem {
  /** Must match a key in private/secrets.json "answers". */
  id: string;
  prompt: string;
  /** Shown on its own warning screen before this question. */
  note?: string;
  /** The clock is topped up to at least this many seconds before this question. */
  minSeconds?: number;
  /** Earned hint (timed round only): shown only if all five opening riddles were right first try. */
  hint?: string;
}

interface Base {
  id: string;
  /** Short name for the progress strip. */
  label: string;
  next?: string;
}

export type StageDef =
  | (Base & { type: "difficulty" })
  | (Base & { type: "log"; intro: string })
  | (Base & { type: "riddles"; intro: string; items: PromptItem[]; perfectLine: string; okLine: string })
  | (Base & { type: "clock-start"; intro: string; rules: string[]; seconds: number })
  | (Base & { type: "tuner"; intro: string; message: string })
  | (Base & { type: "rewind"; intro: string; lines: string[] })
  | (Base & { type: "order"; intro: string; items: string[] })
  | (Base & { type: "clock-result"; tapeAt: number; fileAt: number })
  | (Base & {
      type: "recall";
      intro: string;
      warning: string;
      startBonus: number;
      perCorrect: number;
      maxRewinds: number;
      /** Up to 20 question sets. A rewind moves to the next set. Every set's answers spell WATCHER. */
      sets: PromptItem[][];
    })
  | (Base & { type: "acrostic"; intro: string })
  | (Base & { type: "spot"; intro: string; original: string; changed: string; seconds: number })
  | (Base & { type: "final"; intro: string; prompt: string })
  | (Base & { type: "reveal"; intro: string; poster: string; audio: string; noSignalSeconds: number })
  | (Base & { type: "tape"; audio: string; video: string; captions: string })
  | (Base & { type: "secret"; intro: string });

export type StageType = StageDef["type"];

/** Seconds each shared-clock puzzle adds when it's finished. */
export const CLOCK_BONUS_PER_PUZZLE = 10;

export const STAGES: StageDef[] = [
  { id: "difficulty", type: "difficulty", label: "Setup", next: "log" },
  {
    id: "log",
    type: "log",
    label: "Log",
    intro:
      "Here is how far you've come. Here is how far there is to go. Play well and the show remembers: first-try answers and fast hands earn things you'll need later.",
    next: "riddles",
  },
  {
    id: "riddles",
    type: "riddles",
    label: "Riddles",
    intro:
      "Let's warm up. Five little riddles, no clock yet. Get all five right on the first try and you'll earn help for later, when you'll need it most.",
    items: [
      { id: "riddle-1", prompt: "What has hands but cannot clap?" },
      { id: "riddle-2", prompt: "What has a spine but no bones?" },
      { id: "riddle-3", prompt: "What has a head and a tail but no body?" },
      { id: "riddle-4", prompt: "What speaks without a mouth and hears without ears?" },
      { id: "riddle-5", prompt: "The more of me you take, the more of me you leave behind. What am I?" },
    ],
    perfectLine:
      "Five for five, every one on the first try. That earns you something: in the timed round, every question will come with one hint.",
    okLine: "All five. Not all on the first try, though. The show remembers that. No hints for you in the timed round.",
    next: "clock-start",
  },
  {
    id: "clock-start",
    type: "clock-start",
    label: "Clock",
    intro: "From here on, the clock is running.",
    rules: [
      "You start with one minute.",
      "Every puzzle you finish adds ten seconds.",
      "The clock keeps running from one puzzle to the next.",
      "Finish all three with ten seconds to spare and something will be waiting for you. Fifteen, and there's more.",
    ],
    seconds: 60,
    next: "tuner",
  },
  {
    id: "tuner",
    type: "tuner",
    label: "Tuner",
    intro: "The show still goes out, if you know where to find it. Turn the dial slowly. Watch the static. Listen for it to thin out.",
    message: "This is Curiosity Hour. If you can hear this, you tuned in the old way. Good. Most people turn right past us.",
    next: "rewind",
  },
  {
    id: "rewind",
    type: "rewind",
    label: "Rewind",
    intro: "The tape got tangled. Put the lines back in order.",
    lines: ["Look again.", "The secret's never hiding.", "It's just waiting", "to be noticed."],
    next: "order",
  },
  {
    id: "order",
    type: "order",
    label: "Files",
    intro: "My files got knocked over. Everything you found, in the order you found it. Drag them back where they belong.",
    // The order of the hunt (operator, 2026-10-01: the basement box, then the letter).
    items: [
      "The basement box",
      "The letter",
      "The loft picture",
      "The dresser",
      "The toilet lid",
      "The CD case",
      "The vent",
      "The suitcase",
      "The red book",
    ],
    next: "clock-result",
  },
  { id: "clock-result", type: "clock-result", label: "Results", tapeAt: 10, fileAt: 15, next: "recall" },
  {
    id: "recall",
    type: "recall",
    label: "Recall",
    intro: "Now let's see what you remember. Every answer here came from a tape you played, or something you found.",
    warning:
      "Be ready to act fast. Whatever time you have left carries over, plus two more minutes, because this round is harder. Every right answer adds twenty seconds. If the tape runs out, it rewinds all the way to the first question, and the questions will not be the same.",
    startBonus: 120,
    perCorrect: 20,
    maxRewinds: 20,
    sets: WATCHER_SETS,
    next: "acrostic",
  },
  {
    id: "acrostic",
    type: "acrostic",
    label: "Perspective",
    intro: "Now here's a new perspective for you.",
    next: "spot",
  },
  {
    id: "spot",
    type: "spot",
    label: "Look Again",
    intro: "Two copies of the same page from the old program guide. One word changed. Ten seconds, then it's gone.",
    original: "Tonight on Curiosity Hour, the Keeper shows you how to look twice. Bring a friend. Bring a flashlight. Bring your eyes.",
    changed: "Tonight on Curiosity Hour, the Keeper shows you how to look twice. Bring a friend. Bring a flashlight. Leave your eyes.",
    seconds: 10,
    next: "final",
  },
  {
    id: "final",
    type: "final",
    label: "Final",
    intro: "One more. Take your time with this one. Look at everything you've already written.",
    prompt: "What lurks, yet is ever present?",
    next: "reveal",
  },
  {
    id: "reveal",
    type: "reveal",
    label: "Reveal",
    intro: "You found the word. Here is something I was never supposed to show you.",
    poster: "media/poster.jpg",
    audio: "media/keeper.mp3",
    noSignalSeconds: 5,
    next: "tape",
  },
  {
    id: "tape",
    type: "tape",
    label: "Tape",
    audio: "media/keeper.mp3",
    video: "media/garage.mp4",
    captions: "media/garage.vtt",
    next: "secret",
  },
  {
    id: "secret",
    type: "secret",
    label: "Secret",
    intro: "A secret in plain sight.",
  },
];

export const STAGE_BY_ID = Object.fromEntries(STAGES.map((s) => [s.id, s])) as Record<string, StageDef>;

/** The four checkpoints shown in the top bar. */
export const MILESTONES = ["riddles", "recall", "final", "tape"] as const;

/** Stages that run on the shared clock. */
export const CLOCK_STAGES = ["tuner", "rewind", "order"] as const;
