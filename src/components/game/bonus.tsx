import { useEffect, useMemo, useState } from "react";
import { Star, Timer, TimerOff } from "lucide-react";

import { Button } from "@/components/ui/8bit-button";
import { REWIND_COPY, SPOT_COPY } from "@/game/copy";
import { cn } from "@/lib/utils";
import { GoodLine, PromptCard, StageShell, type StageProps } from "./shared";

function shuffled(n: number): number[] {
  const order = Array.from({ length: n }, (_, i) => i);
  do {
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
  } while (n > 1 && order.every((v, i) => v === i));
  return order;
}

function addStar(stars: string[], id: string) {
  return stars.includes(id) ? stars : [...stars, id];
}

/** Optional timed puzzle: tap the tangled lines back into order before the counter runs out. */
export function RewindStage({ stage, progress, update, next }: StageProps<"rewind">) {
  const [order, setOrder] = useState(() => shuffled(stage.lines.length));
  const [picked, setPicked] = useState<number[]>([]);
  const [left, setLeft] = useState(stage.seconds);
  const [wrong, setWrong] = useState<number | null>(null);
  const done = picked.length === stage.lines.length;
  const timerOn = !progress.timerOff;
  const ranOut = timerOn && left <= 0 && !done;

  useEffect(() => {
    if (!timerOn || done || left <= 0) return;
    const id = window.setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [timerOn, done, left]);

  useEffect(() => {
    if (done) update((p) => ({ stars: addStar(p.stars, stage.id) }));
  }, [done, stage.id, update]);

  function pick(line: number) {
    if (done || ranOut) return;
    if (line === picked.length) {
      setPicked((p) => [...p, line]);
      setWrong(null);
    } else {
      setWrong(line);
    }
  }

  function retry() {
    setOrder(shuffled(stage.lines.length));
    setPicked([]);
    setLeft(stage.seconds);
    setWrong(null);
  }

  const counter = String(Math.max(left, 0)).padStart(3, "0");

  return (
    <StageShell title="Bonus: Rewind" intro={stage.intro}>
      <div className="flex flex-wrap items-center gap-4">
        <div
          className={cn(
            "retro pixel-border bg-background px-4 py-3 text-sm tabular-nums",
            timerOn && left <= 10 && !done ? "text-destructive" : "text-primary",
          )}
          aria-label={timerOn ? `${REWIND_COPY.timerLabel}: ${left} seconds left` : REWIND_COPY.timerOff}
          role="timer"
        >
          {timerOn ? counter : "---"}
        </div>
        <Button
          variant="secondary"
          size="sm"
          aria-pressed={!timerOn}
          onClick={() => update((p) => ({ timerOff: !p.timerOff }))}
        >
          {timerOn ? <TimerOff aria-hidden="true" /> : <Timer aria-hidden="true" />}
          {timerOn ? REWIND_COPY.timerOff : REWIND_COPY.timerOn}
        </Button>
        <Button variant="ghost" size="sm" onClick={next}>
          Skip
        </Button>
      </div>

      <PromptCard className="flex flex-col gap-3">
        <p className="retro text-[10px] uppercase text-muted-foreground">The tape, in order</p>
        <ol className="flex min-h-24 flex-col gap-2 text-2xl">
          {picked.map((line) => (
            <li key={line} className="glitch-in text-foreground">
              {stage.lines[line]}
            </li>
          ))}
          {!done ? <li className="blink text-primary" aria-hidden="true">_</li> : null}
        </ol>
      </PromptCard>

      {!done && !ranOut ? (
        <div className="flex flex-col gap-3" role="group" aria-label="Tangled lines. Choose the next one.">
          {order
            .filter((line) => !picked.includes(line))
            .map((line) => (
              <Button
                key={line}
                variant="secondary"
                className={cn("justify-start whitespace-normal text-left normal-case", wrong === line && "nudge")}
                onClick={() => pick(line)}
              >
                <span className="font-body text-2xl tracking-normal">{stage.lines[line]}</span>
              </Button>
            ))}
          <p role="status" aria-live="polite" className="min-h-8 text-xl text-muted-foreground">
            {wrong !== null ? REWIND_COPY.wrongPick : ""}
          </p>
        </div>
      ) : null}

      {ranOut ? (
        <div className="flex flex-col gap-4" role="status" aria-live="polite">
          <p className="text-2xl">{REWIND_COPY.ranOut}</p>
          <div className="flex flex-wrap gap-4">
            <Button onClick={retry} autoFocus>
              Rewind
            </Button>
            <Button variant="secondary" onClick={next}>
              Skip
            </Button>
          </div>
        </div>
      ) : null}

      {done ? <GoodLine text={REWIND_COPY.done} onNext={next} nextLabel="Continue" /> : null}
    </StageShell>
  );
}

/** Optional bonus: spot the one word that changed between two copies. */
export function SpotStage({ stage, update, next }: StageProps<"spot">) {
  const a = useMemo(() => stage.original.split(" "), [stage.original]);
  const b = useMemo(() => stage.changed.split(" "), [stage.changed]);
  const changedIndex = useMemo(() => b.findIndex((w, i) => w !== a[i]), [a, b]);
  const [found, setFound] = useState(false);
  const [miss, setMiss] = useState(0);

  function choose(i: number) {
    if (found) return;
    if (i === changedIndex) {
      setFound(true);
      update((p) => ({ stars: addStar(p.stars, stage.id) }));
    } else {
      setMiss((m) => m + 1);
    }
  }

  return (
    <StageShell title="Bonus: Look Again" intro={stage.intro}>
      <div className="grid gap-6 md:grid-cols-2">
        <PromptCard className="flex flex-col gap-3">
          <p className="retro text-[10px] uppercase text-muted-foreground">Copy one</p>
          <p className="text-2xl leading-snug">{stage.original}</p>
        </PromptCard>
        <PromptCard className="flex flex-col gap-3">
          <p className="retro text-[10px] uppercase text-muted-foreground">Copy two. Tap the changed word.</p>
          <p className="text-2xl leading-snug">
            {b.map((w, i) => (
              <span key={i}>
                <button
                  type="button"
                  onClick={() => choose(i)}
                  className={cn(
                    "cursor-pointer px-[2px] hover:bg-secondary",
                    found && i === changedIndex && "bg-destructive text-destructive-foreground",
                  )}
                >
                  {w}
                </button>{" "}
              </span>
            ))}
          </p>
        </PromptCard>
      </div>
      {found ? (
        <GoodLine text={SPOT_COPY.done} onNext={next} nextLabel="Continue" />
      ) : (
        <div className="flex flex-wrap items-center gap-6">
          <p role="status" aria-live="polite" className="min-h-8 flex-1 text-xl text-muted-foreground">
            {miss > 0 ? <span key={miss} className="nudge inline-block">{SPOT_COPY.wrong}</span> : ""}
          </p>
          <Button variant="ghost" size="sm" onClick={next}>
            Skip
          </Button>
        </div>
      )}
    </StageShell>
  );
}

export function StarCount({ count }: { count: number }) {
  return (
    <span className="retro flex items-center gap-2 text-[10px] text-primary" aria-label={`${count} bonus stars`}>
      <Star className="size-4 fill-current" aria-hidden="true" /> {count}
    </span>
  );
}
