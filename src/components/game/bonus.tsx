import { useEffect, useMemo, useRef, useState } from "react";
import { playAlarm } from "@/lib/audio";
import { FileText, GripVertical, Radio, Star, Tv } from "lucide-react";

import { Button } from "@/components/ui/8bit-button";
import {
  BONUS_FILE,
  BONUS_TAPE,
  CLOCK_COPY,
  ORDER_COPY,
  RESULT_COPY,
  REWIND_COPY,
  SPOT_COPY,
  TUNER_COPY,
} from "@/game/copy";
import { CLOCK_BONUS_PER_PUZZLE, STAGE_BY_ID } from "@/game/stages";
import { setStatic } from "@/lib/audio";
import { ClockFace, formatClock, useClock } from "@/lib/clock";
import { cn } from "@/lib/utils";
import { GoodLine, KeeperLine, PromptCard, StageShell, prefersReducedMotion, type StageProps } from "./shared";

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

export function StarCount({ count }: { count: number }) {
  return (
    <span className="retro flex items-center gap-2 text-[10px] text-primary" aria-label={`${count} bonus stars`}>
      <Star className="size-4 fill-current" aria-hidden="true" /> {count}
    </span>
  );
}

/** The rules, then the button that starts the shared clock. */
export function ClockStartStage({ stage, next }: StageProps<"clock-start">) {
  const clock = useClock();
  return (
    <StageShell title="The Clock" intro={stage.intro} mark={stage.id}>
      <PromptCard className="flex flex-col gap-4">
        <ul className="flex flex-col gap-3 text-2xl leading-snug">
          {stage.rules.map((r) => (
            <li key={r} className="flex gap-3">
              <span className="text-primary" aria-hidden="true">
                &#9654;
              </span>
              {r}
            </li>
          ))}
        </ul>
      </PromptCard>
      <div>
        <Button
          autoFocus
          onClick={() => {
            clock.start(stage.seconds * 1000);
            next();
          }}
        >
          {CLOCK_COPY.start} <span aria-hidden="true">&#9654;</span>
        </Button>
      </div>
    </StageShell>
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

export { Snow };

/** Tune an old radio dial until the static clears and the show comes through. */
export function TunerStage({ stage, next }: StageProps<"tuner">) {
  const clock = useClock();
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
      clock.add(CLOCK_BONUS_PER_PUZZLE * 1000);
    }, 900);
    return () => window.clearTimeout(t);
  }, [distance, locked, clock]);

  const mhz = (value / 10).toFixed(1);
  return (
    <StageShell title="Tuner" intro={stage.intro} mark={stage.id}>
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
      {locked ? <GoodLine text={TUNER_COPY.locked} onNext={next} nextLabel="Continue" /> : null}
    </StageShell>
  );
}

/** Tap the tangled lines back into order. Runs on the shared clock. */
export function RewindStage({ stage, next }: StageProps<"rewind">) {
  const clock = useClock();
  const [order] = useState(() => shuffled(stage.lines.length));
  const [picked, setPicked] = useState<number[]>([]);
  const [wrong, setWrong] = useState<number | null>(null);
  const done = picked.length === stage.lines.length;

  useEffect(() => {
    if (done) clock.add(CLOCK_BONUS_PER_PUZZLE * 1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  function pick(line: number) {
    if (done) return;
    if (line === picked.length) {
      setPicked((p) => [...p, line]);
      setWrong(null);
    } else {
      setWrong(line);
    }
  }

  return (
    <StageShell title="Rewind" intro={stage.intro} mark={stage.id}>
      <PromptCard className="flex flex-col gap-3">
        <p className="retro text-[10px] uppercase text-muted-foreground">The tape, in order</p>
        <ol className="flex min-h-24 flex-col gap-2 text-2xl">
          {picked.map((line) => (
            <li key={line} className="glitch-in text-foreground">
              {stage.lines[line]}
            </li>
          ))}
          {!done ? (
            <li className="blink text-primary" aria-hidden="true">
              _
            </li>
          ) : null}
        </ol>
      </PromptCard>

      {!done ? (
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
      ) : (
        <GoodLine text={REWIND_COPY.done} onNext={next} nextLabel="Continue" />
      )}
    </StageShell>
  );
}

/** Drag-and-drop: put the things you found back in the order you found them. Last puzzle on the shared clock. */
export function OrderStage({ stage, update, next }: StageProps<"order">) {
  const clock = useClock();
  const n = stage.items.length;
  const [order, setOrder] = useState(() => shuffled(n));
  const [drag, setDrag] = useState<{ from: number; dy: number; h: number } | null>(null);
  const [settling, setSettling] = useState(false);
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

  function drop() {
    if (!drag || dragTo === null) return;
    // Snap without animating: the cards are already where they land, so nothing should slide back.
    setSettling(true);
    move(drag.from, dragTo);
    setDrag(null);
    requestAnimationFrame(() => requestAnimationFrame(() => setSettling(false)));
  }

  function check() {
    const right = order.filter((item, pos) => item === pos).length;
    setResult(right);
    setChecks((c) => c + 1);
    if (right === n) {
      clock.add(CLOCK_BONUS_PER_PUZZLE * 1000);
      // End of the shared-clock section: stop the clock and keep what's left.
      const left = clock.stop();
      update({ sectionLeftMs: left });
    }
  }

  return (
    <StageShell title="The Files" intro={stage.intro} mark={stage.id}>
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
                  e.preventDefault();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  startY.current = e.clientY;
                  setDrag({ from: pos, dy: 0, h: e.currentTarget.offsetHeight + 8 });
                }}
                onPointerMove={(e) => {
                  if (drag?.from === pos) setDrag({ ...drag, dy: e.clientY - startY.current });
                }}
                onPointerUp={drop}
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
                  dragging && "relative z-10 bg-secondary shadow-[0_8px_24px_rgb(0_0_0/0.6)] [--pb:var(--primary)]",
                )}
                style={{
                  transform: dragging && drag ? `translateY(${drag.dy}px) scale(1.02)` : `translateY(${shiftFor(pos)}px)`,
                  transition: dragging || settling ? "none" : "transform 180ms cubic-bezier(0.2, 0.7, 0.2, 1)",
                  willChange: drag ? "transform" : undefined,
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

/** A bonus reward, shown as a pop-up. The tape plays its audio if the file exists. */
export function BonusDialog({ kind, onClose }: { kind: "tape" | "file"; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [audioOk, setAudioOk] = useState(true);
  const content = kind === "tape" ? BONUS_TAPE : BONUS_FILE;
  const onCloseRef = useRef(onClose);
  const closed = useRef(false);
  function closeNow() {
    if (closed.current) return;
    closed.current = true;
    if (ref.current?.open) ref.current.close();
    onCloseRef.current();
  }
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (!d.open) d.showModal();
    // Escape closes it natively; the button calls closeNow. Either way, report it once.
    const handle = () => closeNow();
    d.addEventListener("close", handle);
    return () => d.removeEventListener("close", handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label={content.title}
      className="m-auto w-[min(40rem,94vw)] bg-transparent p-0 text-foreground backdrop:bg-black/80"
    >
      <div className="pixel-border glitch-in m-1 flex flex-col gap-5 bg-card p-6 [--pb:var(--primary)]">
        <p className="retro flex items-center gap-3 text-[10px] uppercase text-primary">
          {kind === "tape" ? <Tv className="size-4" aria-hidden="true" /> : <FileText className="size-4" aria-hidden="true" />}
          {content.title}
        </p>
        <p className="retro text-[9px] leading-loose text-destructive">{content.header}</p>
        {kind === "tape" && audioOk ? (
          <audio
            controls
            autoPlay
            preload="auto"
            src={`${import.meta.env.BASE_URL}${BONUS_TAPE.audio}`}
            onError={() => setAudioOk(false)}
            className="w-full"
          />
        ) : null}
        {content.body.map((p) => (
          <p key={p} className="keeper-voice text-2xl leading-snug">
            {p}
          </p>
        ))}
        <div>
          <Button size="sm" autoFocus onClick={closeNow}>
            Keep it
          </Button>
        </div>
      </div>
    </dialog>
  );
}

/** Results of the shared-clock section: pop up whatever they earned. */
export function ClockResultStage({ stage, progress, update, next }: StageProps<"clock-result">) {
  const left = progress.sectionLeftMs ?? 0;
  const earned = useMemo(() => {
    const out: ("tape" | "file")[] = [];
    if (left >= stage.tapeAt * 1000) out.push("tape");
    if (left >= stage.fileAt * 1000) out.push("file");
    return out;
  }, [left, stage.tapeAt, stage.fileAt]);
  const [showing, setShowing] = useState<"tape" | "file" | null>(earned[0] ?? null);
  const recall = STAGE_BY_ID.recall;
  const bonusSeconds = recall?.type === "recall" ? recall.startBonus : 120;

  useEffect(() => {
    update((p) => ({
      bonuses: Array.from(new Set([...p.bonuses, ...earned])),
      stars: earned.length ? addStar(p.stars, "clock") : p.stars,
      recallStartMs: left + bonusSeconds * 1000,
    }));
  }, [earned, left, bonusSeconds, update]);

  const line = earned.length === 0 ? RESULT_COPY.none : earned.length === 2 ? RESULT_COPY.file : RESULT_COPY.tape;
  return (
    <StageShell title="Time" mark={stage.id}>
      <div className="flex flex-col gap-6">
        <ClockFace ms={left} label="Left" running={false} />
        <KeeperLine text={line} />
        {earned.length ? (
          <div className="flex flex-wrap gap-4">
            {earned.map((k) => (
              <Button key={k} variant="secondary" onClick={() => setShowing(k)}>
                {k === "tape" ? <Tv aria-hidden="true" /> : <FileText aria-hidden="true" />}
                {k === "tape" ? BONUS_TAPE.title : BONUS_FILE.title}
              </Button>
            ))}
          </div>
        ) : null}
        <p className="text-xl text-muted-foreground">{RESULT_COPY.carry(formatClock(left))}</p>
        <div>
          <Button onClick={next}>
            Continue <span aria-hidden="true">&#9654;</span>
          </Button>
        </div>
      </div>
      {showing ? (
        <BonusDialog
          key={showing}
          kind={showing}
          onClose={() => {
            // The tape pops up first; the file follows when the tape is closed.
            const i = earned.indexOf(showing);
            setShowing(earned[i + 1] ?? null);
          }}
        />
      ) : null}
    </StageShell>
  );
}

/** Spot the changed word. Ten seconds, then the pages vanish. */
export function SpotStage({ stage, update, next }: StageProps<"spot">) {
  const a = useMemo(() => stage.original.split(" "), [stage.original]);
  const b = useMemo(() => stage.changed.split(" "), [stage.changed]);
  const changedIndex = useMemo(() => b.findIndex((w, i) => w !== a[i]), [a, b]);
  const [found, setFound] = useState(false);
  const [miss, setMiss] = useState(0);
  const [leftMs, setLeftMs] = useState(stage.seconds * 1000);
  const gone = !found && leftMs <= 0;

  useEffect(() => {
    if (found || leftMs <= 0) return;
    const end = performance.now() + leftMs;
    const id = window.setInterval(() => {
      const l = Math.max(0, end - performance.now());
      setLeftMs(l);
      if (l <= 0) {
        window.clearInterval(id);
        playAlarm();
      }
    }, 31);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [found]);

  function choose(i: number) {
    if (found || gone) return;
    if (i === changedIndex) {
      setFound(true);
      update((p) => ({ stars: addStar(p.stars, stage.id) }));
    } else {
      setMiss((m) => m + 1);
    }
  }

  return (
    <StageShell title="Look Again" intro={stage.intro}>
      <ClockFace ms={leftMs} running={!found && !gone} />
      {gone ? (
        <div className="glitch-in flex min-h-40 items-center justify-center bg-black" aria-hidden="true">
          <span className="retro blink text-[10px] text-muted-foreground">NO SIGNAL</span>
        </div>
      ) : (
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
      )}
      {found ? (
        <GoodLine text={SPOT_COPY.done} onNext={next} nextLabel="Continue" />
      ) : gone ? (
        <GoodLine text={SPOT_COPY.gone} onNext={next} nextLabel="Continue" />
      ) : (
        <p role="status" aria-live="polite" className="min-h-8 text-xl text-muted-foreground">
          {miss > 0 ? (
            <span key={miss} className="nudge inline-block">
              {SPOT_COPY.wrong}
            </span>
          ) : (
            ""
          )}
        </p>
      )}
    </StageShell>
  );
}
