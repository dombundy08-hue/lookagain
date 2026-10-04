import { useCallback, useEffect, useState } from "react";

import type { Difficulty } from "@/components/ui/8bit-difficulty-select";

const KEY = "look-again:v2";

export interface Progress {
  started: boolean;
  stageId: string;
  difficulty: Difficulty | null;
  stars: string[];
  riddleIndex: number;
  /** Wrong answers in the opening riddles. Zero means hints are earned for the timed round. */
  riddleMisses: number;
  /** Shared clock, in milliseconds left. Null before the clock section starts. */
  clockMs: number | null;
  clockRunning: boolean;
  /** Time left when the shared-clock section ended (ms). */
  sectionLeftMs: number | null;
  /** Clock value the timed WATCHER round starts (and restarts) from. */
  recallStartMs: number | null;
  /** True while a timed WATCHER attempt is under way (between "We're ready" and finish or rewind). */
  recallLive: boolean;
  /** How many times the WATCHER tape has rewound. Picks the question set. */
  rewinds: number;
  recallIndex: number;
  recall: string[];
  /** Bonuses earned from the clock: "tape" and/or "file". */
  bonuses: string[];
  /** Normalized final word, kept on this device only, so a reload can reopen the tape. */
  finalKey: string | null;
  /** The reveal (static, then the words) has played once; later visits show the finished page. */
  revealSeen: boolean;
  /** Normalized codes that opened the recordings lock. */
  unlocked: string[];
  /** Normalized codes that opened the title-screen lock. */
  titleUnlocked: string[];
  /** Soundtrack on or off inside the game. The title screen always forces it on. */
  music: boolean;
  /** Hidden secrets found around the site. */
  slips: string[];
  /** The furthest page reached, so secrets can be hunted again on any page already seen. */
  furthest: string;
}

export const FRESH: Progress = {
  started: false,
  stageId: "difficulty",
  difficulty: null,
  stars: [],
  riddleIndex: 0,
  riddleMisses: 0,
  clockMs: null,
  clockRunning: false,
  sectionLeftMs: null,
  recallStartMs: null,
  recallLive: false,
  rewinds: 0,
  recallIndex: 0,
  recall: [],
  bonuses: [],
  finalKey: null,
  revealSeen: false,
  unlocked: [],
  titleUnlocked: [],
  music: true,
  slips: [],
  furthest: "difficulty",
};

function load(): Progress {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return FRESH;
    return { ...FRESH, ...(JSON.parse(raw) as Partial<Progress>) };
  } catch {
    return FRESH; // storage blocked or corrupt: play without saving
  }
}

function save(p: Progress) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable: progress lives only in memory */
  }
}

export function useProgress() {
  const [progress, setProgress] = useState<Progress>(load);

  useEffect(() => save(progress), [progress]);

  const update = useCallback((patch: Partial<Progress> | ((p: Progress) => Partial<Progress>)) => {
    setProgress((p) => ({ ...p, ...(typeof patch === "function" ? patch(p) : patch) }));
  }, []);

  const reset = useCallback(() => {
    try {
      window.localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    setProgress(() => ({ ...FRESH }));
  }, []);

  return { progress, update, reset };
}
