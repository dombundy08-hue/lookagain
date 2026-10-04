import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/8bit-button";
import { PixelRocketHero } from "@/components/ui/pixel-rocket-voyager";
import {
  ClockResultStage,
  ClockStartStage,
  OrderStage,
  RewindStage,
  SpotStage,
  TunerStage,
} from "@/components/game/bonus";
import { ChannelMark, HomeMark, TwiceMark } from "@/components/game/Hint";
import { AcrosticStage, FinalStage, RecallStage, RiddlesStage } from "@/components/game/puzzles";
import type { StageProps } from "@/components/game/shared";
import { SeekProvider, SlipProvider, useSlips } from "@/components/game/slips";
import {
  DifficultyStage,
  LogStage,
  RevealStage,
  SecretBox,
  SecretStage,
  TapeStage,
} from "@/components/game/story";
import TopBar from "@/components/game/TopBar";
import { CATCHPHRASE, CLOCK_COPY, HERO_SUBTITLE, SEEK_COPY, SLIPS, START_OVER_CONFIRM } from "@/game/copy";
import { CLOCK_STAGES, SECTION_STARS, STAGE_BY_ID, STAGES, type StageType } from "@/game/stages";
import { AUDIO_EVENT, isAudioBlocked, restartMusic, setMusicEnabled, startMusic } from "@/lib/audio";
import { ClockProvider, SharedClockBar, useClockTime } from "@/lib/clock";
import { useProgress, type Progress } from "@/lib/progress";

const ORDER = STAGES.map((s) => s.id);
const rank = (id: string) => ORDER.indexOf(id === "tape" ? "reveal" : id);

/** Where each secret hides: a page id, "title" for the title screen, or "log" for the tape log. */
function hidingPlace(id: string): string {
  if (["twice", "ch3", "eyes", "m-home"].includes(id)) return "title";
  if (id === "red" || id === "ink") return "log";
  if (id === "said") return "riddles";
  const mark = SLIPS.find((s) => s.id === id)?.mark ?? "";
  return mark === "tape" ? "reveal" : mark;
}

const noop = () => {};

const THEME_URL = [`${import.meta.env.BASE_URL}media/theme-1.mp3`, `${import.meta.env.BASE_URL}media/theme-2.mp3`];

// The engine: one renderer per stage type. New stages are config entries in game/stages.ts.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const RENDERERS: Record<StageType, ComponentType<StageProps<any>>> = {
  difficulty: DifficultyStage,
  log: LogStage,
  riddles: RiddlesStage,
  "clock-start": ClockStartStage,
  tuner: TunerStage,
  rewind: RewindStage,
  order: OrderStage,
  "clock-result": ClockResultStage,
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
  // Bumped on Start over so the clock starts fresh (and the title screen comes back).
  const [epoch, setEpoch] = useState(0);
  const resetAll = useCallback(() => {
    reset();
    setEpoch((e) => e + 1);
  }, [reset]);

  const onSlipFound = useCallback(
    (id: string, allFound: boolean) =>
      update((p) => ({
        slips: p.slips.includes(id) ? p.slips : [...p.slips, id],
        stars: allFound && !p.stars.includes("slips") ? [...p.stars, "slips"] : p.stars,
      })),
    [update],
  );

  const onClockSave = useCallback(
    (ms: number | null, running: boolean) => update({ clockMs: ms, clockRunning: running }),
    [update],
  );

  return (
    <SlipProvider found={progress.slips} onFound={onSlipFound}>
      <ClockProvider
        key={epoch}
        initialMs={progress.clockMs}
        initialRunning={progress.clockRunning}
        onSave={onClockSave}
      >
        <Game progress={progress} update={update} reset={resetAll} />
      </ClockProvider>
    </SlipProvider>
  );
}

function ClockRow({ stageId, recallLive }: { stageId: string; recallLive: boolean }) {
  const { leftMs } = useClockTime();
  const onClockStage = (CLOCK_STAGES as readonly string[]).includes(stageId);
  if (!(onClockStage || (stageId === "recall" && recallLive))) return null;
  const ranOut = onClockStage && leftMs !== null && leftMs <= 0;
  return <SharedClockBar note={ranOut ? CLOCK_COPY.ranOut : undefined} />;
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
  const secretRef = useRef<HTMLDialogElement>(null);
  const { find } = useSlips();

  // The old separate "tape" page is now the finished reveal page.
  const stage = STAGE_BY_ID[progress.stageId === "tape" ? "reveal" : progress.stageId] ?? STAGE_BY_ID.difficulty;

  const [visit, setVisit] = useState<string | null>(null);
  const go = useCallback(
    (stageId: string) => {
      update((p) => ({ stageId, furthest: rank(stageId) > rank(p.furthest) ? stageId : p.furthest }));
      window.scrollTo({ top: 0 });
    },
    [update],
  );
  const next = useCallback(() => {
    // Every section they beat earns a star. "next" is only reachable once a section is done.
    if ((SECTION_STARS as readonly string[]).includes(stage.id)) {
      const id = `beat-${stage.id}`;
      update((p) => (p.stars.includes(id) ? {} : { stars: [...p.stars, id] }));
    }
    if (stage.next) go(stage.next);
  }, [stage.id, stage.next, go, update]);

  // The title screen always has sound. Muting only exists once they're inside,
  // and every return to the title (or a fresh visit) switches it back on.
  useEffect(() => {
    if (onTitle) update({ music: true });
  }, [onTitle, update]);

  useEffect(() => {
    setMusicEnabled(progress.music);
  }, [progress.music]);

  // Music from the moment the site opens. Browsers hold sound until the first tap,
  // so the song is loaded now and starts on the first touch anywhere.
  useEffect(() => {
    startMusic(THEME_URL);
  }, []);

  useEffect(() => {
    const sync = () => setAudioBlocked(isAudioBlocked());
    sync();
    window.addEventListener(AUDIO_EVENT, sync);
    return () => window.removeEventListener(AUDIO_EVENT, sync);
  }, []);

  // "Go look" in the secrets list: back to a page already reached, to hunt for its "?" again.
  const furthest = rank(progress.furthest) > rank(progress.stageId) ? progress.furthest : progress.stageId;
  const seek = useCallback(
    (id: string) => {
      const place = hidingPlace(id);
      if (place === "log") return SEEK_COPY.here;
      if (place !== "title" && rank(place) > rank(furthest)) return SEEK_COPY.notYet;
      document.querySelectorAll("dialog[open]").forEach((d) => (d as HTMLDialogElement).close());
      window.scrollTo({ top: 0 });
      if (place === "title") {
        setVisit(null);
        setOnTitle(true);
      } else {
        setVisit(place === stage.id ? null : place);
      }
      return null;
    },
    [furthest, stage.id],
  );

  const startOver = () => {
    if (!window.confirm(START_OVER_CONFIRM)) return;
    reset();
    setOnTitle(true);
    restartMusic();
  };

  if (onTitle) {
    return (
      <SeekProvider value={seek}>
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
                  // No hover colour or underline here: only the pointer gives it away.
                  className="cursor-pointer text-inherit"
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
            <span className="retro text-[10px] text-muted-foreground">
              CH 3<ChannelMark />
            </span>
          }
          brandMark={<TwiceMark />}
          onEyesSeen={() => find("eyes")}
          eyesFound={progress.slips.includes("eyes")}
          counterTail={<HomeMark />}
          secondary={
            progress.started ? (
              <Button variant="ghost" size="sm" onClick={startOver}>
                Start over
              </Button>
            ) : null
          }
        />
        {audioBlocked ? (
          <p
            className="retro blink pointer-events-none fixed right-6 bottom-6 z-30 text-[10px] text-muted-foreground"
            aria-hidden="true"
          >
            Tap anywhere
          </p>
        ) : null}
        <dialog
          ref={secretRef}
          aria-label="A secret in plain sight"
          className="m-auto max-h-[92svh] w-[min(40rem,94vw)] overflow-auto bg-background p-0 text-foreground backdrop:bg-black/85"
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
            <p className="keeper-voice text-2xl">A secret in plain sight.</p>
            <SecretBox
              lock="title"
              opened={progress.titleUnlocked}
              onUnlock={(code) => update((p) => ({ titleUnlocked: [...p.titleUnlocked, code] }))}
            />
          </div>
        </dialog>
      </main>
      </SeekProvider>
    );
  }

  const visiting = visit ? STAGE_BY_ID[visit] : null;
  const Renderer = RENDERERS[(visiting ?? stage).type];
  return (
    <SeekProvider value={seek}>
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
        onHome={() => {
          setVisit(null);
          setOnTitle(true);
        }}
        below={visiting ? undefined : <ClockRow stageId={stage.id} recallLive={progress.recallLive} />}
        bonuses={progress.bonuses}
      />
      {visiting ? (
        // A look back: the real page, but nothing on it can change the game, and its clock is a copy.
        <>
          <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-4 px-4 pt-6">
            <span className="retro text-[10px] uppercase text-muted-foreground">{SEEK_COPY.looking}</span>
            <Button size="sm" onClick={() => setVisit(null)}>
              {SEEK_COPY.back}
            </Button>
          </div>
          <ClockProvider key={visiting.id} initialMs={progress.clockMs} initialRunning={false} onSave={noop}>
            <main key={visiting.id}>
              <Renderer
                stage={visiting}
                progress={visiting.id === "riddles" ? { ...progress, riddleIndex: 0 } : progress}
                update={noop}
                next={noop}
                go={noop}
              />
            </main>
          </ClockProvider>
        </>
      ) : (
        <main key={stage.id}>
          <Renderer stage={stage} progress={progress} update={update} next={next} go={go} />
        </main>
      )}
    </div>
    </SeekProvider>
  );
}
