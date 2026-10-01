import { useEffect, useMemo, useRef, useState } from "react";
import { GripVertical, Radio, Star, Timer, TimerOff } from "lucide-react";

import { Button } from "@/components/ui/8bit-button";
import { ORDER_COPY, REWIND_COPY, SPOT_COPY, TUNER_COPY } from "@/game/copy";
import { setStatic } from "@/lib/audio";
import { cn } from "@/lib/utils";
import { GoodLine, PromptCard, StageShell, prefersReducedMotion, type StageProps } from "./shared";

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

/** TV/radio snow drawn on a tiny canvas and scaled up, so it reads as pixels. */
function Snow({ level }: { level: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const img = ctx.createImageData(canvas.width, canvas.height);
    const draw = () => {
      for (let i = 0; i < img.data.length; i += 4) {
        const v = Math.random() * 255;
        img.data[i] = v;
        img.data[i + 1] = v * 0.95;
        img.data[i + 2] = v * 0.85;
        img.data[i + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
    };
    draw();
    if (prefersReducedMotion()) return;
    const id = window.setInterval(draw, 70);
    return () => window.clearInterval(id);
  }, []);
  return (
    <canvas
      ref={ref}
      width={96}
      height={54}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full [image-rendering:pixelated]"
      style={{ opacity: 0.15 + level * 0.8 }}
    />
  );
}

/** Bonus: tune an old radio dial until the static clears and the show comes through. */
export function TunerStage({ stage, update, next }: StageProps<"tuner">) {
  const [target] = useState(() => 900 + Math.floor(Math.random() * 160));
  const [value, setValue] = useState(875);
  const [locked, setLocked] = useState(false);
  const distance = Math.abs(value - target);
  const strength = locked ? 1 : Math.max(0, 1 - distance / 30);

  useEffect(() => {
    setStatic(locked ? 0 : 1 - strength);
  }, [strength, locked]);
  useEffect(() => () => setStatic(0), []);

  useEffect(() => {
    if (locked || distance > 1) return;
    // Hold it on the station for a moment and it locks.
    const t = window.setTimeout(() => {
      setLocked(true);
      update((p) => ({ stars: addStar(p.stars, stage.id) }));
    }, 900);
    return () => window.clearTimeout(t);
  }, [distance, locked, stage.id, update]);

  const mhz = (value / 10).toFixed(1);
  return (
    <StageShell title="Bonus: Tuner" intro={stage.intro}>
      <PromptCard className="flex flex-col gap-6">
        <div className="pixel-border relative m-1 flex min-h-44 items-center justify-center overflow-hidden bg-black p-6">
          <Snow level={1 - strength} />
          <p
            className="keeper-voice relative text-center text-2xl leading-snug text-foreground md:text-3xl"
            style={{ opacity: strength * strength, filter: `blur(${(1 - strength) * 4}px)` }}
            aria-hidden={strength < 0.9}
          >
            {stage.message}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="retro flex items-center gap-3 text-sm text-primary">
            <Radio className="size-4" aria-hidden="true" /> {mhz} FM
          </p>
          <div
            className="flex items-center gap-2"
            aria-label={`${TUNER_COPY.strength} ${Math.round(strength * 100)} percent`}
            role="img"
          >
            <span className="retro text-[8px] text-muted-foreground">{TUNER_COPY.strength}</span>
            {[0.2, 0.4, 0.6, 0.8, 0.97].map((step) => (
              <span key={step} className={cn("inline-block h-4 w-2", strength >= step ? "bg-primary" : "bg-secondary")} />
            ))}
          </div>
        </div>
        <label className="flex flex-col gap-3">
          <span className="retro text-[10px] uppercase text-muted-foreground">{TUNER_COPY.label}</span>
          <input
            type="range"
            min={875}
            max={1080}
            step={1}
            value={value}
            disabled={locked}
            onChange={(e) => setValue(Number(e.target.value))}
            aria-valuetext={`${mhz} FM, signal ${Math.round(strength * 100)} percent`}
            className="h-10 w-full cursor-pointer accent-[var(--primary)]"
          />
        </label>
      </PromptCard>
      {locked ? (
        <GoodLine text={TUNER_COPY.locked} onNext={next} nextLabel="Continue" />
      ) : (
        <div>
          <Button variant="ghost" size="sm" onClick={next}>
            Skip
          </Button>
        </div>
      )}
    </StageShell>
  );
}

/** Drag-and-drop: put the things you found back in the order you found them. */
export function OrderStage({ stage, update, next }: StageProps<"order">) {
  const n = stage.items.length;
  const [order, setOrder] = useState(() => shuffled(n));
  const [drag, setDrag] = useState<{ from: number; dy: number; h: number } | null>(null);
  const [focusPos, setFocusPos] = useState<number | null>(null);
  const [result, setResult] = useState<number | null>(null);
  const [checks, setChecks] = useState(0);
  const startY = useRef(0);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const done = result === n;

  useEffect(() => {
    if (focusPos !== null) itemRefs.current[focusPos]?.focus();
  }, [focusPos, order]);

  function move(from: number, to: number) {
    if (to < 0 || to >= n || from === to) return;
    setOrder((o) => {
      const c = [...o];
      const [x] = c.splice(from, 1);
      c.splice(to, 0, x);
      return c;
    });
    setResult(null);
  }

  const dragTo = drag ? Math.max(0, Math.min(n - 1, drag.from + Math.round(drag.dy / drag.h))) : null;

  function shiftFor(pos: number) {
    if (!drag || dragTo === null || pos === drag.from) return 0;
    if (drag.from < dragTo && pos > drag.from && pos <= dragTo) return -drag.h;
    if (drag.from > dragTo && pos < drag.from && pos >= dragTo) return drag.h;
    return 0;
  }

  function check() {
    const right = order.filter((item, pos) => item === pos).length;
    setResult(right);
    setChecks((c) => c + 1);
    if (right === n) update((p) => ({ stars: addStar(p.stars, stage.id) }));
  }

  return (
    <StageShell title="Bonus: The Files" intro={stage.intro}>
      <p id="order-help" className="text-lg text-muted-foreground">
        {ORDER_COPY.help}
      </p>
      <ol className="flex flex-col gap-2" aria-describedby="order-help">
        {order.map((item, pos) => {
          const dragging = drag?.from === pos;
          return (
            <li key={item} className="flex items-center gap-4">
              <span className="retro w-8 text-right text-[10px] text-muted-foreground" aria-hidden="true">
                {pos + 1}
              </span>
              <div
                ref={(el) => {
                  itemRefs.current[pos] = el;
                }}
                tabIndex={0}
                role="button"
                aria-label={`${stage.items[item]}, position ${pos + 1} of ${n}`}
                aria-roledescription="draggable card"
                onPointerDown={(e) => {
                  if (done) return;
                  e.currentTarget.setPointerCapture(e.pointerId);
                  startY.current = e.clientY;
                  setDrag({ from: pos, dy: 0, h: e.currentTarget.offsetHeight + 8 });
                }}
                onPointerMove={(e) => {
                  if (drag?.from === pos) setDrag({ ...drag, dy: e.clientY - startY.current });
                }}
                onPointerUp={() => {
                  if (!drag || dragTo === null) return;
                  move(drag.from, dragTo);
                  setDrag(null);
                }}
                onPointerCancel={() => setDrag(null)}
                onKeyDown={(e) => {
                  if (done) return;
                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    move(pos, pos - 1);
                    setFocusPos(Math.max(0, pos - 1));
                  } else if (e.key === "ArrowDown") {
                    e.preventDefault();
                    move(pos, pos + 1);
                    setFocusPos(Math.min(n - 1, pos + 1));
                  }
                }}
                className={cn(
                  "pixel-border m-1 flex min-h-14 flex-1 touch-none select-none items-center gap-4 bg-card px-4 text-2xl",
                  done ? "cursor-default [--pb:var(--primary)]" : "cursor-grab active:cursor-grabbing",
                  dragging && "relative z-10 bg-secondary [--pb:var(--primary)]",
                )}
                style={{
                  transform: `translateY(${dragging && drag ? drag.dy : shiftFor(pos)}px)`,
                  transition: dragging ? "none" : "transform 120ms steps(3, end)",
                }}
              >
                <GripVertical className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                {stage.items[item]}
              </div>
            </li>
          );
        })}
      </ol>
      {done ? (
        <GoodLine text={ORDER_COPY.done} onNext={next} nextLabel="Continue" />
      ) : (
        <div className="flex flex-wrap items-center gap-6">
          <Button onClick={check}>{ORDER_COPY.check}</Button>
          <Button variant="ghost" size="sm" onClick={next}>
            Skip
          </Button>
          <p role="status" aria-live="polite" className="text-xl text-muted-foreground">
            {result !== null ? (
              <span key={checks} className="nudge inline-block">
                {ORDER_COPY.close(result, n)}
              </span>
            ) : (
              ""
            )}
          </p>
        </div>
      )}
    </StageShell>
  );
}
