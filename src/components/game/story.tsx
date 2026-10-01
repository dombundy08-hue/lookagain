import { useEffect, useState, type ReactNode } from "react";
import { Lock } from "lucide-react";

import { Button } from "@/components/ui/8bit-button";
import DifficultySelect, { type Difficulty } from "@/components/ui/8bit-difficulty-select";
import { DIFFICULTY_LOCKED, DIFFICULTY_REPLY, SECRET_COPY, WELCOME } from "@/game/copy";
import { normalize, openSecret, openTranscript, type SecretPayload } from "@/lib/sealed";
import HuntTimeline from "./HuntTimeline";
import { AnswerForm, KeeperLine, PromptCard, StageShell, type StageProps } from "./shared";

const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`;

export function DifficultyStage({ progress, update, next }: StageProps<"difficulty">) {
  const chosen = progress.difficulty;
  return (
    <StageShell intro={WELCOME}>
      <DifficultySelect
        className="w-full max-w-[420px] self-center"
        value={(chosen ?? "") as Difficulty}
        onChange={(d) => update({ difficulty: d })}
        description="Choose carefully."
      />
      {chosen ? (
        <div className="flex flex-col items-center gap-6 text-center" role="status" aria-live="polite">
          <KeeperLine key={chosen} text={DIFFICULTY_REPLY[chosen]} />
          <p className="retro glitch-in text-sm text-destructive">Difficulty: {DIFFICULTY_LOCKED}</p>
          <Button onClick={next}>
            Begin <span aria-hidden="true">&#9654;</span>
          </Button>
        </div>
      ) : null}
    </StageShell>
  );
}

export function LogStage({ stage, next }: StageProps<"log">) {
  return (
    <div className="flex flex-col items-center pb-16">
      <StageShell intro={stage.intro}>{null}</StageShell>
      <HuntTimeline className="py-4" />
      <Button onClick={next} autoFocus>
        Start the show <span aria-hidden="true">&#9654;</span>
      </Button>
    </div>
  );
}

function MediaFallback({ label }: { label: string }) {
  return (
    <div
      className="flex aspect-video w-full items-center justify-center bg-[repeating-linear-gradient(0deg,#15171a_0px,#15171a_2px,#0e0f0d_3px,#0e0f0d_5px)] text-center"
      role="img"
      aria-label={label}
    >
      <span className="retro blink text-[10px] text-muted-foreground">NO SIGNAL</span>
    </div>
  );
}

export function RevealStage({ stage, next }: StageProps<"reveal">) {
  const [posterOk, setPosterOk] = useState(true);
  const [videoOk, setVideoOk] = useState(true);
  return (
    <StageShell intro={stage.intro}>
      <figure className="pixel-border m-1 overflow-hidden bg-black">
        {posterOk ? (
          <div className="relative aspect-[4/5] max-h-[70svh] w-full overflow-hidden md:aspect-video">
            <img
              src={asset(stage.poster)}
              alt={stage.posterAlt}
              onError={() => setPosterOk(false)}
              className="poster-still glitch-in absolute inset-0 h-full w-full scale-125 object-cover object-[50%_30%]"
            />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,transparent_25%,rgb(0_0_0/0.85)_75%)]" />
          </div>
        ) : (
          <MediaFallback label={stage.posterAlt} />
        )}
      </figure>

      {videoOk ? (
        <figure className="flex flex-col gap-2">
          <video
            controls
            playsInline
            preload="metadata"
            className="pixel-border m-1 w-full bg-black"
            onError={() => setVideoOk(false)}
          >
            <source src={asset(stage.video)} type="video/mp4" onError={() => setVideoOk(false)} />
            <track kind="captions" src={asset(stage.captions)} srcLang="en" label="English" default />
          </video>
          <figcaption className="text-lg text-muted-foreground">Recovered footage. Captions are on.</figcaption>
        </figure>
      ) : null}

      <KeeperLine text={stage.outro} className="text-muted-foreground" />
      <div>
        <Button onClick={next}>
          Play the recording <span aria-hidden="true">&#9654;</span>
        </Button>
      </div>
    </StageShell>
  );
}

/** Splits text so every "secret" becomes a quiet button. Nothing marks it until you look. */
function withSecrets(text: string, onSecret: () => void): ReactNode[] {
  return text.split(/(secret)/gi).map((part, i) =>
    part.toLowerCase() === "secret" ? (
      <button
        key={i}
        type="button"
        onClick={onSecret}
        className="cursor-pointer text-inherit decoration-primary decoration-2 underline-offset-4 hover:underline focus-visible:underline"
      >
        {part}
      </button>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export function TapeStage({ stage, progress, go }: StageProps<"tape">) {
  const [text, setText] = useState<string | null>(null);
  const [audioOk, setAudioOk] = useState(true);

  useEffect(() => {
    let live = true;
    if (!progress.finalKey) {
      go("final");
      return;
    }
    openTranscript(progress.finalKey).then((t) => {
      if (!live) return;
      if (t) setText(t);
      else go("final"); // sealed content changed since this device solved it
    });
    return () => {
      live = false;
    };
  }, [progress.finalKey, go]);

  if (!text) {
    return (
      <StageShell>
        <p className="retro blink text-xs text-muted-foreground" role="status">
          Rewinding...
        </p>
      </StageShell>
    );
  }

  const [header, ...paragraphs] = text.split(/\n\s*\n/);
  return (
    <StageShell title="The Game Tape">
      {audioOk ? (
        <audio
          controls
          preload="metadata"
          src={asset(stage.audio)}
          onError={() => setAudioOk(false)}
          className="w-full"
          aria-label="The Keeper reads the recording. The full text is below."
        />
      ) : null}
      <PromptCard className="flex flex-col gap-6">
        <p className="retro text-[10px] leading-loose text-destructive">{header}</p>
        {paragraphs.map((p, i) => (
          <p
            key={i}
            className="keeper-voice glitch-in text-2xl leading-snug md:text-[26px]"
            style={{ animationDelay: `${i * 0.35}s` }}
          >
            {withSecrets(p, () => go("secret"))}
          </p>
        ))}
      </PromptCard>
    </StageShell>
  );
}

/** The code lock. Used on the secret stage and from the title screen. */
export function SecretBox({
  secretKey,
  onUnlock,
  footer,
}: {
  secretKey: string | null;
  onUnlock: (normalizedCode: string) => void;
  footer?: ReactNode;
}) {
  const [payload, setPayload] = useState<SecretPayload | null>(null);

  useEffect(() => {
    if (!secretKey) return;
    let live = true;
    openSecret(secretKey).then((p) => live && setPayload(p));
    return () => {
      live = false;
    };
  }, [secretKey]);

  if (payload) {
    return (
      <div className="flex flex-col gap-6">
        <h2 className="retro text-base text-primary md:text-xl">{payload.title}</h2>
        <PromptCard className="flex flex-col gap-5">
          {payload.body.split(/\n\s*\n/).map((p, i) => (
            <p key={i} className="keeper-voice glitch-in text-2xl leading-snug">
              {p}
            </p>
          ))}
        </PromptCard>
        {footer}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PromptCard className="flex flex-col gap-6">
        <p className="retro flex items-center gap-3 text-[10px] uppercase text-primary">
          <Lock className="size-4" aria-hidden="true" /> Locked
        </p>
        <AnswerForm
          label={SECRET_COPY.label}
          nudges={[SECRET_COPY.notYet]}
          submitLabel="Unlock"
          inputMode="numeric"
          onSubmit={async (typed) => {
            const p = await openSecret(typed);
            if (!p) return false;
            onUnlock(normalize(typed));
            setPayload(p);
            return true;
          }}
        />
      </PromptCard>
      {footer}
    </div>
  );
}

export function SecretStage({ stage, progress, update, go }: StageProps<"secret">) {
  return (
    <StageShell intro={stage.intro}>
      <SecretBox
        secretKey={progress.secretKey}
        onUnlock={(code) => update({ secretKey: code })}
        footer={
          <div>
            <Button variant="ghost" size="sm" onClick={() => go("tape")}>
              {SECRET_COPY.back}
            </Button>
          </div>
        }
      />
    </StageShell>
  );
}
