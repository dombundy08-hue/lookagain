import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Feather, Flashlight } from "lucide-react";

import { Button } from "@/components/ui/8bit-button";
import { BLACKLIGHT_COPY, SLIP_COPY, SLIP_PUZZLES, SLIPS } from "@/game/copy";
import { check } from "@/lib/sealed";
import { cn } from "@/lib/utils";

interface SlipApi {
  found: string[];
  /** Opens a secret. It only counts once its text has been revealed with the light. */
  find: (id: string) => void;
}

const SlipContext = createContext<SlipApi>({ found: [], find: () => {} });

// eslint-disable-next-line react-refresh/only-export-components
export function useSlips() {
  return useContext(SlipContext);
}

const UV = "#c6a6ff";
const UV_GLOW = "0 0 10px rgb(198 166 255 / 0.75), 0 0 2px rgb(198 166 255 / 0.9)";

/** Holds the found secrets and opens the blacklight pop-up when one is pressed. */
export function SlipProvider({
  found,
  onFound,
  children,
}: {
  found: string[];
  onFound: (id: string, allFound: boolean) => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState<string | null>(null);

  const find = useCallback(
    (id: string) => {
      if (found.includes(id) || !SLIPS.some((s) => s.id === id)) return;
      setOpen((cur) => cur ?? id); // never stack two pop-ups
    },
    [found],
  );

  return (
    <SlipContext.Provider value={{ found, find }}>
      {children}
      {open ? (
        <SlipDialog
          key={open}
          id={open}
          count={found.length}
          onRevealed={() => {
            if (!found.includes(open)) onFound(open, found.length + 1 === SLIPS.length);
          }}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </SlipContext.Provider>
  );
}

/**
 * Text written in invisible ink. Drag a finger or the mouse over it like a blacklight;
 * once most of it has been lit, it stays lit and onRevealed fires.
 */
function Blacklight({ text, onRevealed }: { text: string; onRevealed: () => void }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const lit = useRef(new Set<number>());
  const [revealed, setRevealed] = useState(false);
  const done = useRef(false);
  const [lightOn, setLightOn] = useState(false);
  const COLS = 10;
  const ROWS = 4;
  const RADIUS = 80;

  function shine(clientX: number, clientY: number) {
    const t = textRef.current;
    if (!t || done.current) return;
    const r = t.getBoundingClientRect();
    t.style.setProperty("--x", `${clientX - r.left}px`);
    t.style.setProperty("--y", `${clientY - r.top}px`);
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const cx = r.left + ((col + 0.5) / COLS) * r.width;
        const cy = r.top + ((row + 0.5) / ROWS) * r.height;
        if (Math.hypot(cx - clientX, cy - clientY) < RADIUS) lit.current.add(row * COLS + col);
      }
    }
    if (lit.current.size >= COLS * ROWS * 0.7) {
      done.current = true;
      setRevealed(true);
      onRevealed();
    }
  }

  // Keyboard: Enter or Space sweeps the light across the page by itself.
  function sweep() {
    const t = textRef.current;
    if (!t || done.current) return;
    const r = t.getBoundingClientRect();
    setLightOn(true);
    let step = 0;
    const steps = ROWS * 12;
    const id = window.setInterval(() => {
      const row = Math.floor(step / 12);
      const frac = (step % 12) / 11;
      shine(r.left + frac * r.width, r.top + ((row + 0.5) / ROWS) * r.height);
      step++;
      if (step >= steps || done.current) window.clearInterval(id);
    }, 40);
  }

  const mask = "radial-gradient(circle 80px at var(--x) var(--y), #000 30%, transparent 100%)";
  return (
    <div className="flex flex-col gap-3">
      {!revealed ? (
        <p className="flex items-center gap-2 text-lg text-muted-foreground">
          <Flashlight className="size-4 text-[#c6a6ff]" aria-hidden="true" /> {BLACKLIGHT_COPY.how}
        </p>
      ) : null}
      <div
        ref={boxRef}
        tabIndex={revealed ? -1 : 0}
        role="button"
        aria-label={revealed ? text : `Hidden ink. ${BLACKLIGHT_COPY.keys}`}
        onPointerEnter={() => setLightOn(true)}
        onPointerMove={(e) => shine(e.clientX, e.clientY)}
        onPointerDown={(e) => {
          setLightOn(true);
          shine(e.clientX, e.clientY);
        }}
        onPointerLeave={() => setLightOn(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            sweep();
          }
        }}
        className={cn(
          "relative flex min-h-36 touch-none select-none items-center justify-center overflow-hidden bg-[#070806] p-6 outline-none",
          !revealed && "cursor-crosshair focus-visible:ring-2 focus-visible:ring-[#c6a6ff]",
        )}
      >
        <p
          ref={textRef}
          className="keeper-voice text-center text-2xl leading-snug"
          style={{
            color: UV,
            textShadow: UV_GLOW,
            opacity: revealed || lightOn ? 1 : 0,
            WebkitMaskImage: revealed ? "none" : mask,
            maskImage: revealed ? "none" : mask,
            transition: revealed ? "opacity 400ms" : undefined,
            ["--x" as string]: "-200px",
            ["--y" as string]: "-200px",
          }}
        >
          {text}
        </p>
      </div>
    </div>
  );
}

/** The small puzzle that guards the last five secrets. */
function SlipPuzzle({ id, onSolved }: { id: string; onSolved: () => void }) {
  const puzzle = SLIP_PUZZLES[id];
  const inputId = useId();
  const [value, setValue] = useState("");
  const [wrong, setWrong] = useState(0);
  const [busy, setBusy] = useState(false);
  if (!puzzle) return null;

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!value.trim() || busy) return;
        setBusy(true);
        const ok = await check(`slip-${id}`, value);
        setBusy(false);
        if (ok) onSolved();
        else setWrong((w) => w + 1);
      }}
    >
      <p className="text-2xl leading-snug">{puzzle.prompt}</p>
      <p
        className="retro bg-[#070806] p-4 text-center text-sm leading-loose tracking-widest text-foreground md:text-base"
        style={puzzle.kind === "mirror" ? { transform: "scaleX(-1)" } : undefined}
        aria-label={puzzle.kind === "mirror" ? `The word ${puzzle.clue.split("").reverse().join("")}, written backwards` : undefined}
      >
        {puzzle.clue}
      </p>
      <label htmlFor={inputId} className="retro text-[10px] uppercase text-muted-foreground">
        Your answer
      </label>
      <div className="flex flex-col gap-4 sm:flex-row">
        <input
          id={inputId}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="pixel-border m-1 min-h-12 flex-1 bg-background px-4 text-2xl text-foreground placeholder:text-muted-foreground focus-visible:[--pb:var(--primary)]"
          placeholder="type here"
        />
        <Button type="submit" disabled={busy || !value.trim()}>
          {busy ? "..." : BLACKLIGHT_COPY.solve}
        </Button>
      </div>
      <p role="status" aria-live="polite" className="min-h-8 text-xl text-muted-foreground">
        {wrong ? (
          <span key={wrong} className="nudge inline-block">
            {BLACKLIGHT_COPY.wrong}
          </span>
        ) : (
          ""
        )}
      </p>
    </form>
  );
}

function SlipDialog({
  id,
  count,
  onRevealed,
  onClose,
}: {
  id: string;
  count: number;
  onRevealed: () => void;
  onClose: () => void;
}) {
  const slip = SLIPS.find((s) => s.id === id);
  const ref = useRef<HTMLDialogElement>(null);
  const [solved, setSolved] = useState(!SLIP_PUZZLES[id]);
  const [revealed, setRevealed] = useState(false);
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
  // A modal dialog sits in the top layer, so a secret found inside the tape log still shows on top.
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (!d.open) d.showModal();
    const handle = () => closeNow();
    d.addEventListener("close", handle);
    return () => d.removeEventListener("close", handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!slip) return null;
  const n = revealed ? count : count + 1;
  return (
    <dialog
      ref={ref}
      aria-label="A secret"
      className="m-auto w-[min(34rem,94vw)] bg-transparent p-0 text-foreground backdrop:bg-black/80"
    >
      <div className="pixel-border glitch-in m-1 flex flex-col gap-5 bg-card p-6 [--pb:#c6a6ff]">
        <p className="retro flex items-center gap-3 text-[10px] uppercase text-[#c6a6ff]">
          <Feather className="size-4" aria-hidden="true" /> {SLIP_COPY.found(Math.max(n, 1), SLIPS.length)}
        </p>
        {!solved ? (
          <SlipPuzzle id={id} onSolved={() => setSolved(true)} />
        ) : (
          <Blacklight
            text={slip.text}
            onRevealed={() => {
              setRevealed(true);
              onRevealed();
            }}
          />
        )}
        {revealed && count + 1 >= SLIPS.length ? <p className="text-xl text-primary">{SLIP_COPY.all}</p> : null}
        <div>
          <Button size="sm" variant={revealed ? "default" : "ghost"} autoFocus={revealed} onClick={closeNow}>
            {revealed ? SLIP_COPY.keep : "Close"}
          </Button>
        </div>
      </div>
    </dialog>
  );
}

/** The found secrets, as journal lines. Unfound ones stay blank. */
export function SlipJournal() {
  const { found } = useSlips();
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4">
      <p className="retro flex items-center gap-3 text-[10px] uppercase text-muted-foreground">
        <Feather className="size-4" aria-hidden="true" /> {SLIP_COPY.log}: {found.length} / {SLIPS.length}
      </p>
      <ul className="flex flex-col gap-2 text-xl">
        {SLIPS.map((s) =>
          found.includes(s.id) ? (
            <li key={s.id} className="keeper-voice" style={{ color: UV, textShadow: UV_GLOW }}>
              {s.text}
            </li>
          ) : (
            <li key={s.id} className="text-muted-foreground" aria-label="Not found yet">
              . . .
            </li>
          ),
        )}
      </ul>
    </div>
  );
}

/** A dark panel in the tape log. Somewhere in it is a faint mark that opens a secret. */
export function InvisibleInk() {
  const { find, found } = useSlips();
  const done = found.includes("ink");
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-2 px-4">
      <p className="text-lg text-muted-foreground">{SLIP_COPY.inkHint}</p>
      <div className="relative flex min-h-28 items-center justify-center bg-[#070806] p-6">
        {!done ? (
          <button
            type="button"
            onClick={() => find("ink")}
            aria-label="Hidden ink"
            className="retro absolute right-[18%] bottom-4 cursor-pointer p-1 text-[9px] text-[#c6a6ff] opacity-30 hover:opacity-100"
            style={{ textShadow: UV_GLOW }}
          >
            ?
          </button>
        ) : null}
      </div>
    </div>
  );
}
