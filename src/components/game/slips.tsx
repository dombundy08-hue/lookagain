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

const INK_MASK = "radial-gradient(circle 70px at var(--x) var(--y), #000 25%, transparent 100%)";

/**
 * Invisible ink: the words only ever show inside the circle of light under the finger or mouse.
 * The page never lights up by itself, even after the secret is found.
 */
function InkText({
  text,
  className,
  onShine,
}: {
  text: string;
  className?: string;
  onShine?: (x: number, y: number, rect: DOMRect) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const [lightOn, setLightOn] = useState(false);

  function shine(clientX: number, clientY: number) {
    const t = textRef.current;
    if (!t) return;
    const r = t.getBoundingClientRect();
    t.style.setProperty("--x", `${clientX - r.left}px`);
    t.style.setProperty("--y", `${clientY - r.top}px`);
    onShine?.(clientX, clientY, r);
  }

  return (
    <div
      ref={ref}
      onPointerEnter={() => setLightOn(true)}
      onPointerMove={(e) => {
        setLightOn(true);
        shine(e.clientX, e.clientY);
      }}
      onPointerDown={(e) => {
        setLightOn(true);
        shine(e.clientX, e.clientY);
      }}
      onPointerLeave={() => setLightOn(false)}
      onPointerUp={(e) => {
        if (e.pointerType !== "mouse") setLightOn(false); // a lifted finger takes the light with it
      }}
      className={cn("relative touch-none select-none cursor-crosshair", className)}
      data-ink=""
    >
      <p
        ref={textRef}
        aria-hidden="true"
        className="keeper-voice text-center leading-snug"
        style={{
          color: UV,
          textShadow: UV_GLOW,
          opacity: lightOn ? 1 : 0,
          WebkitMaskImage: INK_MASK,
          maskImage: INK_MASK,
          ["--x" as string]: "-200px",
          ["--y" as string]: "-200px",
        }}
      >
        {text}
      </p>
    </div>
  );
}

/**
 * The pop-up's ink panel. Sweep the light over the words; once most of them have been lit,
 * the secret counts. The words stay invisible ink the whole time.
 */
function Blacklight({ text, onRevealed }: { text: string; onRevealed: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const lit = useRef(new Set<number>());
  const done = useRef(false);
  const [progress, setProgress] = useState(0);
  const [found, setFound] = useState(false);
  const COLS = 12;
  const ROWS = 4;
  const RADIUS = 45;
  const NEED = 0.85;

  function mark(clientX: number, clientY: number, r: DOMRect) {
    if (done.current) return;
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const cx = r.left + ((col + 0.5) / COLS) * r.width;
        const cy = r.top + ((row + 0.5) / ROWS) * r.height;
        if (Math.hypot(cx - clientX, cy - clientY) < RADIUS) lit.current.add(row * COLS + col);
      }
    }
    const p = lit.current.size / (COLS * ROWS);
    setProgress(p);
    if (p >= NEED) {
      done.current = true;
      setFound(true);
      onRevealed();
    }
  }

  // Keyboard: Enter or Space sweeps the light across the words by itself, row by row.
  function sweep() {
    const panel = panelRef.current;
    const ink = panel?.querySelector<HTMLElement>("[data-ink]");
    const p = ink?.querySelector("p");
    if (!ink || !p || done.current) return;
    const r = p.getBoundingClientRect();
    let step = 0;
    const per = 16;
    const id = window.setInterval(() => {
      const row = Math.floor(step / per);
      const frac = (step % per) / (per - 1);
      const x = r.left + frac * r.width;
      const y = r.top + ((row + 0.5) / ROWS) * r.height;
      ink.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: x, clientY: y, pointerType: "mouse" }));
      step++;
      if (step >= ROWS * per || done.current) {
        window.clearInterval(id);
        ink.dispatchEvent(new PointerEvent("pointerleave", { bubbles: false }));
      }
    }, 35);
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="flex items-center gap-2 text-lg text-muted-foreground">
        <Flashlight className="size-4 text-[#c6a6ff]" aria-hidden="true" /> {BLACKLIGHT_COPY.how}
      </p>
      <div
        ref={panelRef}
        tabIndex={0}
        role="button"
        aria-label={found ? text : `Hidden ink. ${BLACKLIGHT_COPY.keys}`}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            sweep();
          }
        }}
        className="flex min-h-36 items-center justify-center bg-[#070806] p-6 outline-none focus-visible:ring-2 focus-visible:ring-[#c6a6ff]"
      >
        <InkText text={text} className="w-full text-2xl" onShine={mark} />
      </div>
      <div className="flex items-center gap-3" aria-hidden="true">
        <div className="h-1 flex-1 bg-secondary">
          <div className="h-1 bg-[#c6a6ff]" style={{ width: `${Math.min(1, progress / NEED) * 100}%` }} />
        </div>
        <span className="retro text-[8px] text-muted-foreground">{found ? "Read" : "Light it"}</span>
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
  // Numbered by its fixed place in the order, not by when it was found.
  const position = SLIPS.findIndex((s) => s.id === id) + 1;
  const isLast = position === SLIPS.length;
  return (
    <dialog
      ref={ref}
      aria-label="A secret"
      className="m-auto w-[min(34rem,94vw)] bg-transparent p-0 text-foreground backdrop:bg-black/80"
    >
      <div className="pixel-border glitch-in m-1 flex flex-col gap-5 bg-card p-6 [--pb:#c6a6ff]">
        <p className="retro flex items-center gap-3 text-[10px] uppercase text-[#c6a6ff]">
          <Feather className="size-4" aria-hidden="true" /> {SLIP_COPY.found(position, SLIPS.length)}
          {isLast ? <span className="text-destructive"> {SLIP_COPY.last}</span> : null}
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
      {/* Always in the same order, whatever order they were found in. */}
      <ol className="flex flex-col gap-2 text-xl">
        {SLIPS.map((s, i) => (
          <li key={s.id} className="flex gap-3">
            <span className="retro w-8 shrink-0 pt-1 text-right text-[10px] text-muted-foreground">{i + 1}</span>
            {found.includes(s.id) ? (
              <span className="keeper-voice" style={{ color: UV, textShadow: UV_GLOW }}>
                {s.text}
              </span>
            ) : (
              <span className="text-muted-foreground" aria-label="Not found yet">
                . . .
              </span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Secret 4: a faint purple "?" sitting loose on the tape log page, no box around it. */
export function InvisibleInk() {
  const { find, found } = useSlips();
  if (found.includes("ink")) return null;
  return (
    <button
      type="button"
      onClick={() => find("ink")}
      aria-label="A question mark"
      className="retro absolute right-[12%] bottom-2 z-10 cursor-pointer p-1 text-[11px] text-[#c6a6ff] opacity-40 hover:opacity-100"
      style={{ textShadow: UV_GLOW }}
    >
      ?
    </button>
  );
}
