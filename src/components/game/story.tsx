import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Lock } from "lucide-react";

import { Button } from "@/components/ui/8bit-button";
import DifficultySelect, { type Difficulty } from "@/components/ui/8bit-difficulty-select";
import { DIFFICULTY_LOCKED, DIFFICULTY_REPLY, SECRET_COPY, WELCOME } from "@/game/copy";
import { duckMusic, setStatic } from "@/lib/audio";
import { normalize, openSecret, openTranscript, parseEdits, type Lock as LockKind, type Piece, type SecretPayload } from "@/lib/sealed";
import { cn } from "@/lib/utils";
import { Snow } from "./bonus";
import HuntTimeline from "./HuntTimeline";
import { AnswerForm, KeeperLine, PromptCard, StageShell, prefersReducedMotion, type StageProps } from "./shared";

const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`;

export function DifficultyStage({ progress, update, next }: StageProps<"difficulty">) {
  const chosen = progress.difficulty;
  return (
    <StageShell intro={WELCOME} mark="difficulty">
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
      <StageShell intro={stage.intro} mark="log">
        {null}
      </StageShell>
      <HuntTimeline className="py-4" />
      <Button onClick={next}>
        Start the show <span aria-hidden="true">&#9654;</span>
      </Button>
    </div>
  );
}

/* ---------- Recorded text: paragraphs, words the creature edits, and the pressable "secret" ---------- */

interface Para {
  header: boolean;
  pieces: Piece[];
}

function toParas(text: string): Para[] {
  return text.split(/\n\s*\n/).map((p, i) => ({ header: i === 0 && /^CURIOSITY HOUR/.test(p), pieces: parseEdits(p) }));
}

function pieceLength(p: Piece) {
  return p.kind === "text" ? p.text.length : p.shown.length;
}

function withSecrets(text: string, onSecret?: () => void, key = ""): ReactNode {
  if (!onSecret) return text;
  return text.split(/(secret)/gi).map((part, i) =>
    part.toLowerCase() === "secret" ? (
      <button
        key={`${key}-${i}`}
        type="button"
        onClick={onSecret}
        className="cursor-pointer text-inherit decoration-primary decoration-2 underline-offset-4 hover:underline focus-visible:underline"
      >
        {part}
      </button>
    ) : (
      <Fragment key={`${key}-${i}`}>{part}</Fragment>
    ),
  );
}

/**
 * Renders recorded text. `budget` = characters revealed so far (null = all of it).
 * Edited words show what he said first, then flicker into what it made him say.
 */
function RecordedText({
  paras,
  budget,
  edited,
  onSecret,
}: {
  paras: Para[];
  budget: number | null;
  edited: Set<string>;
  onSecret?: () => void;
}) {
  let left = budget ?? Number.POSITIVE_INFINITY;
  return (
    <>
      {paras.map((para, pi) => {
        if (left <= 0) return null;
        const nodes: ReactNode[] = [];
        para.pieces.forEach((piece, i) => {
          if (left <= 0) return;
          const key = `${pi}-${i}`;
          if (piece.kind === "text") {
            const t = piece.text.slice(0, left);
            left -= piece.text.length;
            nodes.push(<Fragment key={key}>{withSecrets(t, onSecret, key)}</Fragment>);
          } else {
            const full = left >= piece.shown.length;
            left -= piece.shown.length;
            const isEdited = budget === null || edited.has(key);
            nodes.push(
              isEdited ? (
                <span key={key} className="glitch-in text-[#c6a6ff]" title="">
                  {piece.edited}
                </span>
              ) : (
                <span key={key}>{full ? piece.shown : piece.shown.slice(0, piece.shown.length + left)}</span>
              ),
            );
          }
        });
        return para.header ? (
          <p key={pi} className="retro text-[10px] leading-loose text-destructive">
            {nodes}
          </p>
        ) : (
          <p key={pi} className="keeper-voice text-2xl leading-snug md:text-[26px]">
            {nodes}
          </p>
        );
      })}
    </>
  );
}

function useTranscript(finalKey: string | null, onMissing: () => void) {
  const [text, setText] = useState<string | null>(null);
  const missing = useRef(onMissing);
  useEffect(() => {
    missing.current = onMissing;
  }, [onMissing]);
  useEffect(() => {
    let live = true;
    if (!finalKey) {
      missing.current();
      return;
    }
    openTranscript(finalKey).then((t) => {
      if (!live) return;
      if (t) setText(t);
      else missing.current(); // sealed content changed since this device solved it
    });
    return () => {
      live = false;
    };
  }, [finalKey]);
  return text;
}

/**
 * The reveal: five seconds of NO SIGNAL, a burst of static, then the recording plays on its own
 * and the words crawl down the page with it. No play button.
 */
export function RevealStage({ stage, progress, go, next }: StageProps<"reveal">) {
  const text = useTranscript(progress.finalKey, () => go("final"));
  const paras = useMemo(() => (text ? toParas(text) : []), [text]);
  const total = useMemo(() => paras.reduce((n, p) => n + p.pieces.reduce((m, x) => m + pieceLength(x), 0), 0), [paras]);
  const reduce = prefersReducedMotion();
  const [phase, setPhase] = useState<"nosignal" | "static" | "play" | "done">(reduce ? "play" : "nosignal");
  const [budget, setBudget] = useState(0);
  const [edited, setEdited] = useState<Set<string>>(new Set());
  const [posterOk, setPosterOk] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioOk = useRef(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  // NO SIGNAL, then static.
  useEffect(() => {
    if (phase !== "nosignal") return;
    const t = window.setTimeout(() => setPhase("static"), stage.noSignalSeconds * 1000);
    return () => window.clearTimeout(t);
  }, [phase, stage.noSignalSeconds]);

  useEffect(() => {
    if (phase !== "static") return;
    duckMusic(true);
    setStatic(0.9);
    const t = window.setTimeout(() => {
      setStatic(0);
      setPhase("play");
    }, 1600);
    return () => {
      window.clearTimeout(t);
      setStatic(0);
    };
  }, [phase]);

  // Play: the voice starts by itself; the text follows the voice (or reads at a steady pace without it).
  useEffect(() => {
    if (phase !== "play" || !text) return;
    duckMusic(true);
    if (reduce) {
      setBudget(total);
      setPhase("done");
      return;
    }
    const audio = audioRef.current;
    if (audio && audioOk.current) void audio.play().catch(() => (audioOk.current = false));
    const started = performance.now();
    const id = window.setInterval(() => {
      let chars: number;
      if (audio && audioOk.current && audio.duration && Number.isFinite(audio.duration)) {
        chars = Math.round((audio.currentTime / audio.duration) * total);
        if (audio.ended) chars = total;
      } else {
        chars = Math.round(((performance.now() - started) / 1000) * 17);
      }
      setBudget(Math.min(total, chars));
      if (chars >= total && (!audio || !audioOk.current || audio.ended || !audio.duration)) {
        window.clearInterval(id);
        setPhase("done");
      }
    }, 60);
    return () => window.clearInterval(id);
  }, [phase, text, total, reduce]);

  useEffect(() => () => duckMusic(false), []);

  // Words the creature edits flip a moment after they're fully said.
  // Scheduled once per word; only cleared when the screen goes away.
  const scheduled = useRef(new Set<string>());
  const flipTimers = useRef<number[]>([]);
  useEffect(() => {
    let at = 0;
    paras.forEach((para, pi) =>
      para.pieces.forEach((piece, i) => {
        at += pieceLength(piece);
        const key = `${pi}-${i}`;
        if (piece.kind === "edit" && budget >= at && !scheduled.current.has(key)) {
          scheduled.current.add(key);
          flipTimers.current.push(window.setTimeout(() => setEdited((s) => new Set(s).add(key)), 900));
        }
      }),
    );
  }, [budget, paras]);
  useEffect(() => () => flipTimers.current.forEach(clearTimeout), []);

  // Keep the newest line in view as the words travel down the page.
  useEffect(() => {
    if (phase === "play") bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [budget, phase]);

  return (
    <StageShell intro={stage.intro}>
      <audio
        ref={audioRef}
        preload="auto"
        src={asset(stage.audio)}
        onError={() => (audioOk.current = false)}
        aria-label="The Keeper reads the recording. The words appear on screen as he speaks."
      />
      {phase === "nosignal" || phase === "static" ? (
        <div className="pixel-border relative m-1 flex aspect-video items-center justify-center overflow-hidden bg-black">
          {phase === "static" ? <Snow level={1} /> : null}
          {phase === "nosignal" ? <span className="retro blink text-xs text-muted-foreground">NO SIGNAL</span> : null}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {posterOk ? (
            <div className="pixel-border relative m-1 aspect-[16/7] overflow-hidden bg-black">
              <img
                src={asset(stage.poster)}
                alt="A dark, cropped photograph of a tall shape on a wall. Most of it is in shadow."
                onError={() => setPosterOk(false)}
                className="poster-still glitch-in absolute inset-0 h-full w-full scale-125 object-cover object-[50%_30%]"
              />
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,transparent_25%,rgb(0_0_0/0.85)_75%)]" />
            </div>
          ) : null}
          <PromptCard className="flex flex-col gap-6">
            <RecordedText paras={paras} budget={phase === "done" ? null : budget} edited={edited} />
            {phase === "play" ? <span className="blink text-primary" aria-hidden="true">_</span> : null}
          </PromptCard>
          <div ref={bottomRef} />
          {phase === "done" ? (
            <div>
              <Button autoFocus onClick={next}>
                Continue <span aria-hidden="true">&#9654;</span>
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </StageShell>
  );
}

/** The game tape, any time after the reveal: the full text, the pressable "secret", the optional media. */
export function TapeStage({ stage, progress, go }: StageProps<"tape">) {
  const text = useTranscript(progress.finalKey, () => go("final"));
  const paras = useMemo(() => (text ? toParas(text) : []), [text]);
  const [audioOk, setAudioOk] = useState(true);
  const [videoOk, setVideoOk] = useState(true);

  if (!text) {
    return (
      <StageShell>
        <p className="retro blink text-xs text-muted-foreground" role="status">
          Rewinding...
        </p>
      </StageShell>
    );
  }

  return (
    <StageShell title="The Game Tape" mark={stage.id}>
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
        <RecordedText paras={paras} budget={null} edited={new Set()} onSecret={() => go("secret")} />
      </PromptCard>
      {videoOk ? (
        <figure className="flex flex-col gap-2">
          <video controls playsInline preload="metadata" className="pixel-border m-1 w-full bg-black" onError={() => setVideoOk(false)}>
            <source src={asset(stage.video)} type="video/mp4" onError={() => setVideoOk(false)} />
            <track kind="captions" src={asset(stage.captions)} srcLang="en" label="English" default />
          </video>
          <figcaption className="text-lg text-muted-foreground">Recovered footage. Captions are on.</figcaption>
        </figure>
      ) : null}
    </StageShell>
  );
}

/** One unlocked recording: title, optional voice, and the text (with any words the creature edits). */
function Recording({ payload }: { payload: SecretPayload }) {
  const [audioOk, setAudioOk] = useState(Boolean(payload.audio));
  const paras = useMemo(() => toParas(payload.body), [payload.body]);
  return (
    <div className="flex flex-col gap-5">
      <h2 className="retro text-base text-primary md:text-xl">{payload.title}</h2>
      {payload.audio && audioOk ? (
        <audio controls preload="metadata" src={asset(payload.audio)} onError={() => setAudioOk(false)} className="w-full" />
      ) : null}
      <PromptCard className="flex flex-col gap-5">
        <RecordedText paras={paras} budget={null} edited={new Set()} />
      </PromptCard>
    </div>
  );
}

/**
 * A code lock. Every code that fits opens its own recording, and they stay open on this device.
 * "story" is the lock behind every "secret" in the recordings; "title" is the one on the title screen.
 */
export function SecretBox({
  lock,
  opened,
  onUnlock,
  footer,
}: {
  lock: LockKind;
  opened: string[];
  onUnlock: (normalizedCode: string) => void;
  footer?: ReactNode;
}) {
  const [payloads, setPayloads] = useState<SecretPayload[]>([]);

  useEffect(() => {
    let live = true;
    Promise.all(opened.map((c) => openSecret(c, lock))).then((all) => {
      if (live) setPayloads(all.filter((p): p is SecretPayload => Boolean(p)));
    });
    return () => {
      live = false;
    };
  }, [opened, lock]);

  return (
    <div className="flex flex-col gap-8">
      {payloads.map((p) => (
        <Recording key={p.title} payload={p} />
      ))}
      <PromptCard className={cn("flex flex-col gap-6")}>
        <p className="retro flex items-center gap-3 text-[10px] uppercase text-primary">
          <Lock className="size-4" aria-hidden="true" /> {payloads.length ? "Another code?" : "Locked"}
        </p>
        <AnswerForm
          label={SECRET_COPY.label}
          nudges={[SECRET_COPY.notYet]}
          submitLabel="Unlock"
          inputMode="numeric"
          onSubmit={async (typed) => {
            const p = await openSecret(typed, lock);
            if (!p) return false;
            const code = normalize(typed);
            if (!opened.includes(code)) onUnlock(code);
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
        lock="story"
        opened={progress.unlocked}
        onUnlock={(code) => update((p) => ({ unlocked: [...p.unlocked, code] }))}
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
