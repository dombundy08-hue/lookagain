import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/8bit-button";
import { PixelRocketHero } from "@/components/ui/pixel-rocket-voyager";
import { OrderStage, RewindStage, SpotStage, TunerStage } from "@/components/game/bonus";
import { AcrosticStage, FinalStage, RecallStage, RiddlesStage } from "@/components/game/puzzles";
import type { StageProps } from "@/components/game/shared";
import { SlipProvider, useSlips } from "@/components/game/slips";
import {
  DifficultyStage,
  LogStage,
  RevealStage,
  SecretBox,
  SecretStage,
  TapeStage,
} from "@/components/game/story";
import TopBar from "@/components/game/TopBar";
import { HomeHint } from "@/components/game/Hint";
import { CATCHPHRASE, HERO_SUBTITLE, START_OVER_CONFIRM } from "@/game/copy";
import { STAGE_BY_ID, type StageType } from "@/game/stages";
import { AUDIO_EVENT, isAudioBlocked, restartMusic, setMusicEnabled, startMusic } from "@/lib/audio";
import { useProgress, type Progress } from "@/lib/progress";

const THEME_URL = `${import.meta.env.BASE_URL}media/theme.mp3`;

// The engine: one renderer per stage type. New stages are config entries in game/stages.ts.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const RENDERERS: Record<StageType, ComponentType<StageProps<any>>> = {
  difficulty: DifficultyStage,
  log: LogStage,
  riddles: RiddlesStage,
  tuner: TunerStage,
  rewind: RewindStage,
  order: OrderStage,
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

  const onSlipFound = useCallback(
    (id: string, allFound: boolean) =>
      update((p) => ({
        slips: p.slips.includes(id) ? p.slips : [...p.slips, id],
        stars: allFound && !p.stars.includes("slips") ? [...p.stars, "slips"] : p.stars,
      })),
    [update],
  );

  return (
    <SlipProvider found={progress.slips} onFound={onSlipFound}>
      <Game progress={progress} update={update} reset={reset} />
    </SlipProvider>
  );
}

function Game({
  progress,
  update,
  reset,
}: {
  progress: Progress;
  update: StageProps["update"];
  reset: () => void;
}) {
  const [onTitle, setOnTitle] = useState(true);
  const [audioBlocked, setAudioBlocked] = useState(isAudioBlocked);

  // The title screen always has sound. No toggle there; muting only exists once they're inside,
  // and every return to the title (or a fresh visit) switches it back on.
  useEffect(() => {
    if (onTitle) update({ music: true });
  }, [onTitle, update]);

  useEffect(() => {
    const sync = () => setAudioBlocked(isAudioBlocked());
    sync();
    window.addEventListener(AUDIO_EVENT, sync);
    return () => window.removeEventListener(AUDIO_EVENT, sync);
  }, []);
  const secretRef = useRef<HTMLDialogElement>(null);
  const { find } = useSlips();

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
    setMusicEnabled(progress.music);
  }, [progress.music]);

  // Music from the moment the site opens. Browsers hold sound until the first tap,
  // so the song is loaded now and starts on the first touch anywhere.
  useEffect(() => {
    startMusic(THEME_URL);
  }, []);

  const startOver = () => {
    if (!window.confirm(START_OVER_CONFIRM)) return;
    reset();
    setOnTitle(true);
    restartMusic();
  };

  if (onTitle) {
    return (
      <main className="crt">
        <PixelRocketHero
          headline="Look Again"
          kicker="A Curiosity Hour lost episode"
          subtitle={
            <>
              <p>{HERO_SUBTITLE}</p>
              <p className="mt-4 text-xl">
                {CATCHPHRASE[0]}
                <button
                  type="button"
                  onClick={() => {
                    startMusic(THEME_URL);
                    secretRef.current?.showModal();
                  }}
                  className="cursor-pointer text-inherit decoration-primary decoration-2 underline-offset-4 hover:underline focus-visible:underline"
                >
                  {CATCHPHRASE[1]}
                </button>
                {CATCHPHRASE[2]}
              </p>
            </>
          }
          ctaLabel={progress.started ? "Resume Tape" : "Press Play"}
          onStart={() => {
            startMusic(THEME_URL);
            update({ started: true });
            setOnTitle(false);
          }}
          channel={
            <button
              type="button"
              className="retro cursor-default text-[10px] text-muted-foreground"
              onClick={() => find("ch3")}
            >
              CH 3
            </button>
          }
          onEyesSeen={() => find("eyes")}
          counterTail={<HomeHint />}
          secondary={
            progress.started ? (
              <Button variant="ghost" size="sm" onClick={startOver}>
                Start over
              </Button>
            ) : null
          }
        />
        {audioBlocked ? (
          <p className="retro blink pointer-events-none fixed right-6 bottom-6 z-30 text-[10px] text-muted-foreground" aria-hidden="true">
            Tap anywhere
          </p>
        ) : null}
        <dialog
          ref={secretRef}
          aria-label="The lock"
          className="m-auto w-[min(40rem,94vw)] bg-background p-0 text-foreground backdrop:bg-black/85"
        >
          <div className="pixel-border relative m-1 flex flex-col gap-6 p-6 pt-14">
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-3 right-3 px-2"
              onClick={() => secretRef.current?.close()}
              aria-label="Close"
            >
              <X aria-hidden="true" />
            </Button>
            <SecretBox secretKey={progress.secretKey} onUnlock={(code) => update({ secretKey: code })} />
          </div>
        </dialog>
      </main>
    );
  }

  const Renderer = RENDERERS[stage.type];
  return (
    <div className="crt min-h-svh">
      <TopBar
        stageId={stage.id}
        stars={progress.stars.length}
        music={progress.music}
        onToggleMusic={() => {
          startMusic(THEME_URL);
          update((p) => ({ music: !p.music }));
        }}
        onStartOver={startOver}
      />
      <main key={stage.id}>
        <Renderer stage={stage} progress={progress} update={update} next={next} go={go} />
      </main>
    </div>
  );
}
