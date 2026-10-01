// The stage engine config. Every screen after the title is one entry here.
// Change prompts, order or text here; the engine in App.tsx does not need to change.
// Answers are NOT here. They are sealed into sealed.json by `npm run seal`.

export interface PromptItem {
  /** Must match a key in private/secrets.json "answers". */
  id: string;
  prompt: string;
  /** Timed rounds only: seconds on the clock for this question. */
  seconds?: number;
  /** Shown above the question before the clock starts. */
  note?: string;
  /** Tiny "?" hint. A nudge, never the answer. */
  clue?: string;
}

interface Base {
  id: string;
  /** Short name for the progress strip. */
  label: string;
  next?: string;
  /** Tiny "?" hint for the whole stage. A nudge, never the answer. */
  clue?: string;
}

export type StageDef =
  | (Base & { type: "difficulty" })
  | (Base & { type: "log"; intro: string })
  | (Base & { type: "riddles"; intro: string; items: PromptItem[]; doneLine: string; hint: string })
  | (Base & { type: "rewind"; intro: string; lines: string[]; seconds: number })
  | (Base & { type: "tuner"; intro: string; message: string })
  | (Base & { type: "order"; intro: string; items: string[] })
  | (Base & { type: "recall"; intro: string; warning: string; items: PromptItem[] })
  | (Base & { type: "acrostic"; intro: string })
  | (Base & { type: "spot"; intro: string; original: string; changed: string })
  | (Base & { type: "final"; intro: string; prompt: string })
  | (Base & { type: "reveal"; intro: string; poster: string; posterAlt: string; video: string; captions: string; outro: string })
  | (Base & { type: "tape"; audio: string })
  | (Base & { type: "secret"; intro: string });

export type StageType = StageDef["type"];

export const STAGES: StageDef[] = [
  { id: "difficulty", type: "difficulty", label: "Setup", next: "log" },
  {
    id: "log",
    type: "log",
    label: "Log",
    intro: "Here is how far you've come. Here is how far there is to go. I can't see the end either.",
    next: "riddles",
  },
  {
    id: "riddles",
    type: "riddles",
    label: "Riddles",
    intro: "Let's warm up. Five little riddles. Say them out loud if it helps. Some things are easier to notice when you hear them.",
    items: [
      { id: "riddle-1", clue: "Some hands point instead of hold.", prompt: "What has hands but cannot clap?" },
      { id: "riddle-2", clue: "You already opened one of these. Someone cut a hole in it.", prompt: "What has a spine but no bones?" },
      { id: "riddle-3", clue: "Flip it.", prompt: "What has a head and a tail but no body?" },
      { id: "riddle-4", clue: "Shout into a canyon and wait.", prompt: "What speaks without a mouth and hears without ears?" },
      { id: "riddle-5", clue: "Walk across fresh snow. Then turn around.", prompt: "The more of me you take, the more of me you leave behind. What am I?" },
    ],
    doneLine: "Five for five. That earns you something. Keep it close. You'll want it soon.",
    // DRAFT: the bonus hint is a nudge for the recall round. Never an answer.
    hint: "Every answer in the next part is something you already heard on a tape, or held in your hands. If you get stuck, rewind. I never mind a rewind.",
    next: "tuner",
  },
  {
    id: "tuner",
    type: "tuner",
    clue: "Go slowly near the middle of the dial. Watch the bars, not the numbers.",
    label: "Tuner",
    intro: "The show still goes out, if you know where to find it. Turn the dial slowly. Watch the static. Listen for it to thin out.",
    message: "This is Curiosity Hour. If you can hear this, you tuned in the old way. Good. Most people turn right past us.",
    next: "rewind",
  },
  {
    id: "rewind",
    type: "rewind",
    clue: "It's the line every show ends with.",
    label: "Rewind",
    intro: "A little game from the old show. The tape got tangled. Put the lines back in order before the counter runs out. Or don't. It's only a game.",
    lines: ["Look again.", "The secret's never hiding.", "It's just waiting", "to be noticed."],
    seconds: 45,
    next: "order",
  },
  {
    id: "order",
    type: "order",
    clue: "Start with the first thing anyone handed you. End with the book.",
    label: "Order",
    intro: "My files got knocked over. Everything you found, in the order you found it. Drag them back where they belong.",
    // Story order from the hunt so far (Tape 2 left out: it turned up along the way).
    items: [
      "The letter",
      "The basement box",
      "The loft",
      "The toilet lid",
      "The CD case",
      "The vent",
      "The suitcase",
      "The red book",
    ],
    next: "recall",
  },
  {
    id: "recall",
    type: "recall",
    label: "Recall",
    intro: "Now let's see what you remember. Every answer here came from a tape you played, or something you found.",
    warning: "Be ready to act fast. Every question in this round runs on a clock. If the tape runs out, you rewind and try again. One of them gives you five whole minutes. You'll need every one of them.",
    // DRAFT prompts. Zach: rewrite these in the Keeper's voice once the tape scripts are final.
    items: [
      { id: "recall-w", clue: "Something with doors that you could hide inside.", seconds: 60, prompt: "The memo from the first tape named a piece of furniture. Which one?" },
      { id: "recall-a", clue: "Say the catchphrase out loud. All of it.", seconds: 45, prompt: "Finish the line. \"Look ___. The secret's never hiding.\"" },
      { id: "recall-t", clue: "A heavy lid, and water underneath.", seconds: 60, prompt: "Something in the bathroom had a lid worth lifting. What was it?" },
      { id: "recall-c", clue: "Round, shiny, music inside. The case had one word on it.", seconds: 60, prompt: "A case with one word on the cover sent you to the laundry room. What kind of case?" },
      {
        id: "recall-h", clue: "Find the memo from the first tape. Read every word, even the small ones.",
        seconds: 300,
        note: "This one is long. Five minutes. You may have to go and find something. Go quickly, and carefully.",
        prompt: "There was a name in the memo. Whose?",
      },
      { id: "recall-e", clue: "What are you reading this with?", seconds: 45, prompt: "The third tape said looking is not enough. What do you look with?" },
      { id: "recall-r", clue: "Think of a flower. Then think of what it could be mixed into.", seconds: 60, prompt: "On the fourth tape I told you about a smell I remember. What was it?" },
    ],
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
    clue: "Read the last sentence of each copy, one word at a time.",
    label: "Look Again",
    intro: "Two copies of the same page from the old program guide. One word changed when nobody was looking. Find it in the second copy.",
    original: "Tonight on Curiosity Hour, the Keeper shows you how to look twice. Bring a friend. Bring a flashlight. Bring your eyes.",
    changed: "Tonight on Curiosity Hour, the Keeper shows you how to look twice. Bring a friend. Bring a flashlight. Leave your eyes.",
    next: "final",
  },
  {
    id: "final",
    type: "final",
    clue: "Read the first letters, top to bottom.",
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
    posterAlt: "A dark, cropped photograph of a tall shape on a wall. Most of it is in shadow.",
    video: "media/garage.mp4",
    captions: "media/garage.vtt",
    outro: "There's a recording that goes with it. Nobody was meant to hear it.",
    next: "tape",
  },
  { id: "tape", type: "tape", label: "Tape", audio: "media/keeper.mp3", next: "secret" },
  {
    id: "secret",
    type: "secret",
    label: "Secret",
    intro: "Whatever you're holding will fit.",
  },
];

export const STAGE_BY_ID = Object.fromEntries(STAGES.map((s) => [s.id, s])) as Record<string, StageDef>;

/** The four checkpoints shown in the top bar. */
export const MILESTONES = ["riddles", "recall", "final", "tape"] as const;
