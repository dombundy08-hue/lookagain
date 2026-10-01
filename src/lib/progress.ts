import { useCallback, useEffect, useState } from "react";

import type { Difficulty } from "@/components/ui/8bit-difficulty-select";

const KEY = "look-again:v1";

export interface Progress {
  started: boolean;
  stageId: string;
  difficulty: Difficulty | null;
  stars: string[];
  riddleIndex: number;
  bonusHint: boolean;
  recallIndex: number;
  recall: string[];
  /** Normalized final word, kept on this device only, so a reload can reopen the tape. */
  finalKey: string | null;
  /** Normalized secret code, same reason. */
  secretKey: string | null;
  timerOff: boolean;
  hiss: boolean;
}

export const FRESH: Progress = {
  started: false,
  stageId: "difficulty",
  difficulty: null,
  stars: [],
  riddleIndex: 0,
  bonusHint: false,
  recallIndex: 0,
  recall: [],
  finalKey: null,
  secretKey: null,
  timerOff: false,
  hiss: false,
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
    setProgress((p) => ({ ...FRESH, hiss: p.hiss, timerOff: p.timerOff }));
  }, []);

  return { progress, update, reset };
}
