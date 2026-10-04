// The shared game clock. Counts down in real time (hundredths shown), keeps running from one
// puzzle to the next, and is saved so a reload doesn't reset it.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { playAlarm } from "@/lib/audio";
import { cn } from "@/lib/utils";

interface ClockControl {
  /** Set the clock to ms and start it. */
  start: (ms: number) => void;
  /** Add ms, only while the clock is still running (a clock that ran out stays out). */
  add: (ms: number) => void;
  /** Top up to at least ms. */
  floor: (ms: number) => void;
  /** Stop the clock and return what was left. */
  stop: () => number;
  /** Current ms left. */
  now: () => number;
  /** Hold the clock while a hint is open; resume picks up from the same time. */
  pause: () => void;
  resume: () => void;
  paused: boolean;
  running: boolean;
}

interface ClockTime {
  leftMs: number | null;
  /** Last bonus added, for the little "+10 seconds" flash. */
  bump: { ms: number; at: number } | null;
}

const ControlCtx = createContext<ClockControl | null>(null);
const TimeCtx = createContext<ClockTime>({ leftMs: null, bump: null });

export function ClockProvider({
  initialMs,
  initialRunning,
  onSave,
  children,
}: {
  initialMs: number | null;
  initialRunning: boolean;
  onSave: (ms: number | null, running: boolean) => void;
  children: ReactNode;
}) {
  const [running, setRunning] = useState(initialRunning && (initialMs ?? 0) > 0);
  const [leftMs, setLeftMs] = useState<number | null>(initialMs);
  const [bump, setBump] = useState<ClockTime["bump"]>(null);
  const [paused, setPaused] = useState(false);
  const leftRef = useRef(initialMs ?? 0);
  const endAt = useRef<number | null>(null);
  // A clock that was running when the page closed picks up from what was saved.
  useEffect(() => {
    if (initialRunning && (initialMs ?? 0) > 0) endAt.current = performance.now() + (initialMs ?? 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const saveRef = useRef(onSave);
  useEffect(() => {
    saveRef.current = onSave;
  }, [onSave]);

  const now = useCallback(() => {
    if (endAt.current === null) return leftRef.current;
    return Math.max(0, endAt.current - performance.now());
  }, []);

  useEffect(() => {
    if (!running) return;
    let lastSaved = -1;
    const id = window.setInterval(() => {
      const l = now();
      leftRef.current = l;
      setLeftMs(l);
      const sec = Math.floor(l / 1000);
      if (sec !== lastSaved) {
        lastSaved = sec;
        saveRef.current(l, l > 0);
      }
      if (l <= 0) {
        endAt.current = null;
        setRunning(false);
        saveRef.current(0, false);
        playAlarm();
      }
    }, 31);
    return () => window.clearInterval(id);
  }, [running, now]);

  const control = useMemo<ClockControl>(
    () => ({
      running,
      paused,
      now,
      pause() {
        if (endAt.current === null) return;
        const l = now();
        leftRef.current = l;
        endAt.current = null;
        setLeftMs(l);
        setRunning(false);
        setPaused(true);
        saveRef.current(l, true);
      },
      resume() {
        setPaused((was) => {
          if (was && leftRef.current > 0) {
            endAt.current = performance.now() + leftRef.current;
            setRunning(true);
          }
          return false;
        });
      },
      start(ms) {
        leftRef.current = ms;
        endAt.current = performance.now() + ms;
        setLeftMs(ms);
        setRunning(ms > 0);
        saveRef.current(ms, ms > 0);
      },
      add(ms) {
        if (endAt.current === null) return;
        endAt.current += ms;
        const l = now();
        leftRef.current = l;
        setLeftMs(l);
        setBump({ ms, at: Date.now() });
        saveRef.current(l, true);
      },
      floor(ms) {
        const l = now();
        if (l >= ms) return;
        if (endAt.current !== null) endAt.current += ms - l;
        leftRef.current = ms;
        setLeftMs(ms);
        setBump({ ms: ms - l, at: Date.now() });
        saveRef.current(ms, endAt.current !== null);
      },
      stop() {
        const l = now();
        leftRef.current = l;
        endAt.current = null;
        setLeftMs(l);
        setRunning(false);
        saveRef.current(l, false);
        return l;
      },
    }),
    [running, paused, now],
  );

  return (
    <ControlCtx.Provider value={control}>
      <TimeCtx.Provider value={{ leftMs, bump }}>{children}</TimeCtx.Provider>
    </ControlCtx.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useClock() {
  const c = useContext(ControlCtx);
  if (!c) throw new Error("useClock outside ClockProvider");
  return c;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useClockTime() {
  return useContext(TimeCtx);
}

// eslint-disable-next-line react-refresh/only-export-components
export function formatClock(ms: number) {
  const total = Math.max(0, ms);
  const m = Math.floor(total / 60000);
  const s = Math.floor((total % 60000) / 1000);
  const cs = Math.floor((total % 1000) / 10);
  return `${m}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

/** Tape-counter readout with hundredths. Red and blinking in the last ten seconds. */
export function ClockFace({ ms, label = "Clock", running = true }: { ms: number; label?: string; running?: boolean }) {
  const urgent = ms <= 10000;
  const secs = Math.ceil(ms / 1000);
  const announce = running && (secs === 60 || secs === 30 || secs === 10);
  return (
    <div className="flex items-center gap-3">
      <span className="retro text-[10px] uppercase text-muted-foreground">{label}</span>
      <div
        role="timer"
        aria-label={`${Math.floor(ms / 60000)} minutes ${Math.floor((ms % 60000) / 1000)} seconds left`}
        className={cn(
          "retro pixel-border bg-background px-4 py-3 text-xl tabular-nums md:px-5 md:text-3xl",
          urgent ? "text-destructive [--pb:var(--destructive)]" : "text-primary",
          urgent && running && ms > 0 && "blink",
        )}
      >
        {formatClock(ms)}
      </div>
      <span className="sr-only" aria-live="assertive">
        {announce ? `${secs} seconds left` : ""}
      </span>
    </div>
  );
}

/** The shared clock as a bar, with a flash when time is added. */
export function SharedClockBar({ note }: { note?: ReactNode }) {
  const { leftMs, bump } = useClockTime();
  const { running, paused } = useClock();
  const [flash, setFlash] = useState<string | null>(null);
  useEffect(() => {
    if (!bump) return;
    setFlash(`+${Math.round(bump.ms / 1000)}s`);
    const t = window.setTimeout(() => setFlash(null), 1600);
    return () => window.clearTimeout(t);
  }, [bump]);
  if (leftMs === null) return null;
  return (
    <div className="border-t-2 border-border">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-4 px-4 py-3">
        <ClockFace ms={leftMs} running={running} />
        {flash ? (
          <span key={bump?.at} className="retro glitch-in text-xs text-primary" aria-live="polite">
            {flash}
          </span>
        ) : null}
        {paused ? <span className="retro blink text-xs text-primary">PAUSED</span> : null}
        {note ? <span className="text-lg text-muted-foreground">{note}</span> : null}
      </div>
    </div>
  );
}
