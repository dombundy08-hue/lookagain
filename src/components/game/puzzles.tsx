import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Hourglass, Lightbulb, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/8bit-button";
import { FINAL_NUDGES, GOOD, NUDGES, RECALL_COPY } from "@/game/copy";
import type { PromptItem } from "@/game/stages";
import { formatClock, useClock, useClockTime } from "@/lib/clock";
import { check, normalize, openTranscript } from "@/lib/sealed";
import { AnswerForm, Counter, GoodLine, KeeperLine, PromptCard, StageShell, type StageProps } from "./shared";
import { SaidMark } from "./Hint";

export function RiddlesStage({ stage, progress, update, next }: StageProps<"riddles">) {
  const [solved, setSolved] = useState<string | null>(null);
  const index = progress.riddleIndex;
  const finished = index >= stage.items.length;

  if (finished) {
    const perfect = progress.riddleMisses === 0;
    return (
      <StageShell title="Round One" intro={perfect ? stage.perfectLine : stage.okLine} mark={stage.id}>
        {perfect ? (
          <PromptCard className="flex flex-col gap-3 [--pb:var(--primary)]">
            <p className="retro flex items-center gap-3 text-[10px] uppercase text-primary">
              <Lightbulb className="size-4" aria-hidden="true" /> Earned
            </p>
            <p className="text-2xl leading-snug">One hint on every question in the timed round.</p>
          </PromptCard>
        ) : null}
        <div>
          <Button onClick={next} autoFocus>
            Keep going <span aria-hidden="true">&#9654;</span>
          </Button>
        </div>
      </StageShell>
    );
  }

  const item = stage.items[index];
  return (
    <StageShell title="Round One" intro={index === 0 ? stage.intro : undefined} mark={stage.id}>
      {index >= 1 ? <SaidMark /> : null}
      <PromptCard className="flex flex-col gap-6">
        <Counter index={index} total={stage.items.length} />
        <p className="text-3xl leading-snug md:text-4xl">{item.prompt}</p>
        {solved ? (
          <GoodLine
            text={`${GOOD} ${solved}.`}
            onNext={() => {
              setSolved(null);
              update((p) => ({ riddleIndex: p.riddleIndex + 1 }));
            }}
          />
        ) : (
          <AnswerForm
            key={item.id}
            label="Your answer"
            nudges={NUDGES}
            onSubmit={async (typed) => {
              const display = await check(item.id, typed);
              if (display) setSolved(display);
              else update((p) => ({ riddleMisses: p.riddleMisses + 1 }));
              return Boolean(display);
            }}
          />
        )}
      </PromptCard>
    </StageShell>
  );
}

/** An earned hint, in glowing ink. Only exists if all five opening riddles were right first try. */
function EarnedHint({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const clock = useClock();
  // The clock stops while the hint is open, and starts again the moment they click out of it.
  const show = () => {
    clock.pause();
    setOpen(true);
  };
  const hide = () => {
    setOpen(false);
    clock.resume();
  };
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && hide();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  return (
    <div className="flex flex-col items-start gap-3">
      <Button variant="secondary" size="sm" onClick={open ? hide : show} aria-expanded={open}>
        <Lightbulb aria-hidden="true" /> {RECALL_COPY.hint}
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6" onClick={hide} role="dialog" aria-label="Hint">
          <div className="pixel-border flex max-w-xl flex-col gap-4 bg-background p-6">
            <p className="retro text-[10px] uppercase text-primary">Clock paused. Click anywhere to go back.</p>
            <p
              role="note"
              className="keeper-voice glitch-in border-l-2 border-[#c6a6ff] pl-4 text-2xl leading-snug text-[#c6a6ff]"
              style={{ textShadow: "0 0 10px rgb(198 166 255 / 0.75), 0 0 2px rgb(198 166 255 / 0.9)" }}
            >
              {text}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * The timed WATCHER round, on the shared clock: carry-over plus two minutes, plus twenty seconds
 * per right answer. If the clock runs out, the round starts again from question one, same questions.
 */
export function RecallStage({ stage, progress, update, next }: StageProps<"recall">) {
  const clock = useClock();
  const { leftMs } = useClockTime();
  const [solved, setSolved] = useState<string | null>(null);
  const flooredFor = useRef<string | null>(null);

  const hintsEarned = progress.riddleIndex >= 5 && progress.riddleMisses === 0;
  // One set of questions. Running out of time just starts the same round again.
  const set: PromptItem[] = stage.sets[0];
  const index = progress.recallIndex;
  const item = set[index] as PromptItem | undefined;
  const finished = !item;
  const live = progress.recallLive;
  const ranOut = live && !finished && !solved && !clock.running && !clock.paused && (leftMs ?? 0) <= 0;

  // A live attempt whose clock was paused (a reload) picks up where it left off.
  useEffect(() => {
    if (live && !finished && !clock.running && !clock.paused && (leftMs ?? 0) > 0) clock.start(leftMs as number);
  }, [live, finished, clock, leftMs]);

  // A question with minSeconds (the Harlan one) tops the clock up to at least that much.
  useEffect(() => {
    if (!item?.minSeconds || !clock.running || flooredFor.current === `${progress.rewinds}-${item.id}`) return;
    flooredFor.current = `${progress.rewinds}-${item.id}`;
    clock.floor(item.minSeconds * 1000);
  }, [item, clock, progress.rewinds]);

  if (finished) {
    return (
      <StageShell title="Round Two" intro="That's all of them. You can breathe now." mark={stage.id}>
        <div>
          <Button onClick={next} autoFocus>
            Continue <span aria-hidden="true">&#9654;</span>
          </Button>
        </div>
      </StageShell>
    );
  }

  const startFrom = progress.recallStartMs ?? stage.startBonus * 1000;

  // Before the clock starts, and after every rewind: the warning screen.
  if (!live) {
    return (
      <StageShell title="Round Two" intro={progress.rewinds === 0 ? stage.intro : undefined} mark={stage.id}>
        <PromptCard className="flex flex-col gap-6 [--pb:var(--destructive)]">
          <p className="retro flex items-center gap-3 text-[10px] uppercase text-destructive">
            <Hourglass className="size-4" aria-hidden="true" /> Timed
          </p>
          <KeeperLine
            key={`warn-${progress.rewinds}`}
            text={progress.rewinds === 0 ? stage.warning : `${RECALL_COPY.rewound(progress.rewinds)} ${stage.warning}`}
          />
          <p className="text-xl text-muted-foreground">
            Seven questions. You start with {formatClock(startFrom)} on the clock.
            {hintsEarned ? " You earned a hint on every question." : ""}
          </p>
          <div>
            <Button
              autoFocus
              onClick={() => {
                flooredFor.current = null;
                clock.start(startFrom);
                update({ recallLive: true });
              }}
            >
              {RECALL_COPY.ready} <span aria-hidden="true">&#9654;</span>
            </Button>
          </div>
        </PromptCard>
      </StageShell>
    );
  }

  if (ranOut) {
    return (
      <StageShell title="Round Two" mark={stage.id}>
        <PromptCard className="flex flex-col items-start gap-6 [--pb:var(--destructive)]">
          <p className="keeper-voice glitch-in text-3xl text-destructive">{RECALL_COPY.ranOut}</p>
          <p className="text-xl text-muted-foreground">
            Back to question one. Same questions. Try again.
          </p>
          <Button
            autoFocus
            onClick={() => {
              setSolved(null);
              update((p) => ({ rewinds: p.rewinds + 1, recallIndex: 0, recall: [], recallLive: false }));
            }}
          >
            <RotateCcw aria-hidden="true" /> {RECALL_COPY.rewind}
          </Button>
        </PromptCard>
      </StageShell>
    );
  }

  return (
    <StageShell title="Round Two" mark={stage.id}>
      <PromptCard className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Counter index={index} total={set.length} />
          {progress.rewinds > 0 ? (
            <span className="retro text-[8px] text-muted-foreground">Rewind {progress.rewinds}</span>
          ) : null}
        </div>
        {item.note ? <p className="text-xl text-destructive">{item.note}</p> : null}
        <p className="text-3xl leading-snug md:text-4xl">{item.prompt}</p>
        {solved ? (
          <GoodLine
            text={GOOD}
            onNext={() => {
              setSolved(null);
              const isLast = index + 1 >= set.length;
              if (isLast) clock.stop();
              update((p) => ({
                recallIndex: p.recallIndex + 1,
                recall: [...p.recall, solved],
                recallLive: isLast ? false : p.recallLive,
              }));
            }}
          />
        ) : (
          <>
            <AnswerForm
              key={`${item.id}-${progress.rewinds}`}
              label="Your answer"
              nudges={NUDGES}
              onSubmit={async (typed) => {
                const display = await check(item.id, typed);
                if (display) {
                  clock.add(stage.perCorrect * 1000);
                  setSolved(display);
                }
                return Boolean(display);
              }}
            />
            {hintsEarned && item.hint ? <EarnedHint key={item.id} text={item.hint} /> : null}
          </>
        )}
      </PromptCard>
    </StageShell>
  );
}

/**
 * The recall answers stacked so their first letters read down.
 * First letters sit in their own column so the frame around them always lines up.
 */
export function Stack({
  words,
  compact = false,
  framed = false,
}: {
  words: string[];
  compact?: boolean;
  framed?: boolean;
}) {
  const reduce = useReducedMotion();
  const size = compact ? "retro text-xs leading-[2] md:text-sm" : "retro text-lg leading-[2] md:text-3xl";
  const rowMotion = (i: number) => ({
    initial: reduce || compact ? false : ({ opacity: 0, x: -24 } as const),
    animate: { opacity: 1, x: 0 },
    transition: { delay: 0.5 + i * 0.45, duration: 0.4, ease: "easeOut" as const },
  });
  return (
    <div className="flex items-stretch" aria-label={`Your answers, stacked: ${words.join(", ")}`} role="img">
      <div className="relative px-2">
        {framed ? (
          <motion.div
            aria-hidden="true"
            initial={reduce ? false : { opacity: 0, scaleY: 0 }}
            animate={{ opacity: 1, scaleY: 1 }}
            transition={{ delay: 0.8 + words.length * 0.45, duration: 0.8 }}
            style={{ originY: 0 }}
            className="pointer-events-none absolute inset-0 border-2 border-primary"
          />
        ) : null}
        {words.map((w, i) => (
          <motion.div key={`l-${i}-${w}`} {...rowMotion(i)} className={`${size} text-primary`} aria-hidden="true">
            {w.charAt(0).toUpperCase()}
          </motion.div>
        ))}
      </div>
      <div className="pl-1">
        {words.map((w, i) => (
          <motion.div key={`r-${i}-${w}`} {...rowMotion(i)} className={`${size} text-muted-foreground`} aria-hidden="true">
            {w.slice(1).toUpperCase()}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export function AcrosticStage({ stage, progress, next }: StageProps<"acrostic">) {
  const reduce = useReducedMotion();
  const words = progress.recall;
  return (
    <StageShell intro={stage.intro} mark={stage.id}>
      <div className="self-start">
        <Stack words={words} framed />
      </div>
      <motion.div
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6 + words.length * 0.45 }}
      >
        <KeeperLine text="Read it the other way. Down, not across." className="mb-6 text-muted-foreground" />
        <Button onClick={next}>
          Continue <span aria-hidden="true">&#9654;</span>
        </Button>
      </motion.div>
    </StageShell>
  );
}

export function FinalStage({ stage, progress, update, next }: StageProps<"final">) {
  return (
    <StageShell title="The Last Question" intro={stage.intro} mark={stage.id}>
      {progress.recall.length > 0 ? (
        <div className="opacity-80">
          <Stack words={progress.recall} compact />
        </div>
      ) : null}
      <PromptCard className="flex flex-col gap-6">
        <p className="text-3xl leading-snug md:text-4xl">{stage.prompt}</p>
        <AnswerForm
          label="One word"
          nudges={FINAL_NUDGES}
          onSubmit={async (typed) => {
            const text = await openTranscript(typed);
            if (!text) return false;
            update({ finalKey: normalize(typed) });
            next();
            return true;
          }}
        />
      </PromptCard>
    </StageShell>
  );
}
