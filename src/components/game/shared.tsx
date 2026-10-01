import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/8bit-button";
import { Card } from "@/components/ui/8bit-card";
import type { StageDef } from "@/game/stages";
import { normalize } from "@/lib/sealed";
import { useSlips } from "./slips";
import type { Progress } from "@/lib/progress";
import { cn } from "@/lib/utils";

export interface StageProps<T extends StageDef["type"] = StageDef["type"]> {
  stage: Extract<StageDef, { type: T }>;
  progress: Progress;
  update: (patch: Partial<Progress> | ((p: Progress) => Partial<Progress>)) => void;
  next: () => void;
  go: (stageId: string) => void;
}

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** The Keeper speaks: text types out like a caption. Click or tap to show it all at once. */
export function KeeperLine({ text, className }: { text: string; className?: string }) {
  const [shown, setShown] = useState(() => (prefersReducedMotion() ? text.length : 0));

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const id = window.setInterval(() => {
      setShown((n) => {
        if (n >= text.length) {
          window.clearInterval(id);
          return n;
        }
        return n + 1;
      });
    }, 26);
    return () => window.clearInterval(id);
  }, [text]);

  const done = shown >= text.length;
  return (
    <p
      className={cn("keeper-voice text-2xl leading-snug text-foreground md:text-[28px]", className)}
      onClick={() => setShown(text.length)}
    >
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {text.slice(0, shown)}
        {!done && <span className="blink text-primary">_</span>}
      </span>
    </p>
  );
}

/** Frame for every stage: optional eyebrow-free heading, Keeper intro, then the work. */
export function StageShell({
  title,
  intro,
  children,
}: {
  title?: string;
  intro?: string;
  children: ReactNode;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, [title]);
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 md:py-16">
      {title ? (
        <h1 ref={headingRef} tabIndex={-1} className="retro text-base text-primary outline-none md:text-xl">
          {title}
        </h1>
      ) : null}
      {intro ? <KeeperLine key={intro} text={intro} /> : null}
      {children}
    </section>
  );
}

export function PromptCard({ children, className }: { children: ReactNode; className?: string }) {
  return <Card className={cn("p-6 md:p-8", className)}>{children}</Card>;
}

/**
 * Typed-answer form. onSubmit returns true when right.
 * Wrong answers get a gentle in-character nudge, never a fail state.
 */
export function AnswerForm({
  label,
  onSubmit,
  nudges,
  submitLabel = "Enter",
  disabled = false,
}: {
  label: string;
  onSubmit: (typed: string) => Promise<boolean>;
  nudges: readonly string[];
  submitLabel?: string;
  disabled?: boolean;
}) {
  const id = useId();
  const { find, found } = useSlips();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [misses, setMisses] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim() || busy || disabled) return;
    setBusy(true);
    const ok = await onSubmit(value);
    setBusy(false);
    if (!ok) {
      // Hidden slip: saying the catchphrase into any box that isn't asking for it.
      if (normalize(value) === "lookagain" && !found.includes("said")) {
        find("said");
        setMessage("The box heard you.");
        setMisses((m) => m + 1);
        return;
      }
      setMessage(nudges[misses % nudges.length]);
      setMisses((m) => m + 1);
      inputRef.current?.select();
    }
  }

  return (
    <form onSubmit={handle} className="flex flex-col gap-4">
      <label htmlFor={id} className="retro text-[10px] uppercase text-muted-foreground">
        {label}
      </label>
      <div className="flex flex-col gap-4 sm:flex-row">
        <input
          ref={inputRef}
          id={id}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={disabled}
          autoFocus
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="pixel-border m-1 min-h-12 flex-1 bg-background px-4 text-2xl text-foreground placeholder:text-muted-foreground focus-visible:[--pb:var(--primary)]"
          placeholder="type here"
          aria-describedby={message ? `${id}-msg` : undefined}
        />
        <Button type="submit" disabled={busy || disabled || !value.trim()}>
          {busy ? "..." : submitLabel}
        </Button>
      </div>
      <p id={`${id}-msg`} role="status" aria-live="polite" className="min-h-8 text-xl text-muted-foreground">
        {message ? (
          <span key={misses} className="nudge inline-block">
            {message}
          </span>
        ) : null}
      </p>
    </form>
  );
}

export function GoodLine({ text, onNext, nextLabel = "Next" }: { text: string; onNext: () => void; nextLabel?: string }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <div className="flex flex-col items-start gap-6" role="status" aria-live="polite">
      <p className="keeper-voice glitch-in text-3xl text-primary">{text}</p>
      <Button ref={ref} onClick={onNext}>
        {nextLabel} <span aria-hidden="true">&#9654;</span>
      </Button>
    </div>
  );
}

/** Tape-counter clock. Counts down while running; calls onExpire once at zero. */
export function TapeClock({
  seconds,
  running,
  onExpire,
}: {
  seconds: number;
  running: boolean;
  onExpire: () => void;
}) {
  const [left, setLeft] = useState(seconds);
  const expired = useRef(false);

  useEffect(() => {
    if (!running || left <= 0) return;
    const t = window.setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [running, left]);

  useEffect(() => {
    if (left <= 0 && !expired.current) {
      expired.current = true;
      onExpire();
    }
  }, [left, onExpire]);

  const m = Math.floor(Math.max(left, 0) / 60);
  const sec = Math.max(left, 0) % 60;
  const urgent = left <= 10;
  const announce = left === 60 || left === 30 || left === 10;
  return (
    <div className="flex items-center gap-4">
      <div
        role="timer"
        className={cn(
          "retro pixel-border bg-background px-4 py-3 text-base tabular-nums md:text-lg",
          urgent ? "text-destructive [--pb:var(--destructive)]" : "text-primary",
          urgent && running && "blink",
        )}
        aria-label={`${m} minutes ${sec} seconds left`}
      >
        {m}:{String(sec).padStart(2, "0")}
      </div>
      <span className="sr-only" aria-live="assertive">
        {announce && running ? `${left} seconds left` : ""}
      </span>
    </div>
  );
}

export function Counter({ index, total }: { index: number; total: number }) {
  return (
    <p className="retro text-[10px] text-muted-foreground" aria-label={`Question ${index + 1} of ${total}`}>
      {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
    </p>
  );
}
