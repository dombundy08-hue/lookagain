import { useCallback, useEffect, useState, type ComponentType } from "react";

import { Button } from "@/components/ui/8bit-button";
import { PixelRocketHero } from "@/components/ui/pixel-rocket-voyager";
import { RewindStage, SpotStage } from "@/components/game/bonus";
import { AcrosticStage, FinalStage, RecallStage, RiddlesStage } from "@/components/game/puzzles";
import type { StageProps } from "@/components/game/shared";
import { DifficultyStage, LogStage, RevealStage, SecretStage, TapeStage } from "@/components/game/story";
import TopBar from "@/components/game/TopBar";
import { HERO_SUBTITLE, START_OVER_CONFIRM } from "@/game/copy";
import { STAGE_BY_ID, type StageType } from "@/game/stages";
import { setHiss } from "@/lib/hiss";
import { useProgress } from "@/lib/progress";

// The engine: one renderer per stage type. New stages are config entries in game/stages.ts.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const RENDERERS: Record<StageType, ComponentType<StageProps<any>>> = {
  difficulty: DifficultyStage,
  log: LogStage,
  riddles: RiddlesStage,
  rewind: RewindStage,
  recall: RecallStage,
  acrostic: AcrosticStage,
  spot: SpotStage,
  final: FinalStage,
  reveal: RevealStage,
  tape: TapeStage,
  secret: SecretStage,
};

export default function App() {
  const { progress, update, reset } = useProgress();
  const [onTitle, setOnTitle] = useState(true);

  const stage = STAGE_BY_ID[progress.stageId] ?? STAGE_BY_ID.difficulty;

  const go = useCallback(
    (stageId: string) => {
      update({ stageId });
      window.scrollTo({ top: 0 });
    },
    [update],
  );
  const next = useCallback(() => {
    if (stage.next) go(stage.next);
  }, [stage.next, go]);

  useEffect(() => {
    setHiss(progress.hiss && !onTitle);
  }, [progress.hiss, onTitle]);

  const startOver = () => {
    if (!window.confirm(START_OVER_CONFIRM)) return;
    reset();
    setOnTitle(true);
  };

  if (onTitle) {
    return (
      <main className="crt">
        <PixelRocketHero
          headline="Look Again"
          kicker="A Curiosity Hour lost episode"
          subtitle={<p>{HERO_SUBTITLE}</p>}
          ctaLabel={progress.started ? "Resume Tape" : "Press Play"}
          onStart={() => {
            update({ started: true });
            setOnTitle(false);
          }}
          secondary={
            progress.started ? (
              <Button variant="ghost" size="sm" onClick={startOver}>
                Start over
              </Button>
            ) : null
          }
        />
      </main>
    );
  }

  const Renderer = RENDERERS[stage.type];
  return (
    <div className="crt min-h-svh">
      <TopBar
        stageId={stage.id}
        stars={progress.stars.length}
        hiss={progress.hiss}
        onToggleHiss={() => update((p) => ({ hiss: !p.hiss }))}
        onStartOver={startOver}
      />
      <main key={stage.id}>
        <Renderer stage={stage} progress={progress} update={update} next={next} go={go} />
      </main>
    </div>
  );
}
