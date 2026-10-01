import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Lightbulb } from "lucide-react";

import { Button } from "@/components/ui/8bit-button";
import { FINAL_NUDGES, GOOD, NUDGES } from "@/game/copy";
import { STAGE_BY_ID } from "@/game/stages";
import { check, normalize, openTranscript } from "@/lib/sealed";
import { AnswerForm, Counter, GoodLine, KeeperLine, PromptCard, StageShell, type StageProps } from "./shared";

const riddles = STAGE_BY_ID.riddles;
const BONUS_HINT = riddles?.type === "riddles" ? riddles.hint : "";

export function RiddlesStage({ stage, progress, update, next }: StageProps<"riddles">) {
  const [solved, setSolved] = useState<string | null>(null);
  const index = progress.riddleIndex;
  const finished = index >= stage.items.length;

  if (finished) {
    return (
      <StageShell title="Round One" intro={stage.doneLine}>
        <PromptCard className="flex flex-col gap-4">
          <p className="retro flex items-center gap-3 text-[10px] uppercase text-primary">
            <Lightbulb className="size-4" aria-hidden="true" /> Bonus hint
          </p>
          <p className="text-2xl leading-snug">{stage.hint}</p>
        </PromptCard>
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
    <StageShell title="Round One" intro={index === 0 ? stage.intro : undefined}>
      <PromptCard className="flex flex-col gap-6">
        <Counter index={index} total={stage.items.length} />
        <p className="text-3xl leading-snug md:text-4xl">{item.prompt}</p>
        {solved ? (
          <GoodLine
            text={`${GOOD} ${solved}.`}
            onNext={() => {
              setSolved(null);
              update((p) => {
                const riddleIndex = p.riddleIndex + 1;
                return { riddleIndex, bonusHint: riddleIndex >= stage.items.length };
              });
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
              return Boolean(display);
            }}
          />
        )}
      </PromptCard>
    </StageShell>
  );
}

export function RecallStage({ stage, progress, update, next }: StageProps<"recall">) {
  const [solved, setSolved] = useState<string | null>(null);
  const index = progress.recallIndex;

  if (index >= stage.items.length) {
    return (
      <StageShell title="Round Two" intro="That's all of them.">
        <div>
          <Button onClick={next} autoFocus>
            Continue <span aria-hidden="true">&#9654;</span>
          </Button>
        </div>
      </StageShell>
    );
  }

  const item = stage.items[index];
  return (
    <StageShell title="Round Two" intro={index === 0 ? stage.intro : undefined}>
      {progress.bonusHint ? (
        <details className="text-xl text-muted-foreground">
          <summary className="retro cursor-pointer text-[10px] uppercase text-primary">Bonus hint</summary>
          <p className="mt-3">{BONUS_HINT}</p>
        </details>
      ) : null}
      <PromptCard className="flex flex-col gap-6">
        <Counter index={index} total={stage.items.length} />
        <p className="text-3xl leading-snug md:text-4xl">{item.prompt}</p>
        {solved ? (
          <GoodLine
            text={GOOD}
            onNext={() => {
              setSolved(null);
              update((p) => ({ recallIndex: p.recallIndex + 1, recall: [...p.recall, solved] }));
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
              return Boolean(display);
            }}
          />
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
    <StageShell intro={stage.intro}>
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
    <StageShell title="The Last Question" intro={stage.intro}>
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
