import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Feather } from "lucide-react";

import { Button } from "@/components/ui/8bit-button";
import { SLIP_COPY, SLIPS } from "@/game/copy";

interface SlipApi {
  found: string[];
  find: (id: string) => void;
}

const SlipContext = createContext<SlipApi>({ found: [], find: () => {} });

// eslint-disable-next-line react-refresh/only-export-components
export function useSlips() {
  return useContext(SlipContext);
}

/** Holds the found slips and shows each new one as it turns up. */
export function SlipProvider({
  found,
  onFound,
  children,
}: {
  found: string[];
  onFound: (id: string, allFound: boolean) => void;
  children: ReactNode;
}) {
  const [showing, setShowing] = useState<string | null>(null);

  const find = useCallback(
    (id: string) => {
      if (found.includes(id) || !SLIPS.some((s) => s.id === id)) return;
      onFound(id, found.length + 1 === SLIPS.length);
      setShowing(id);
    },
    [found, onFound],
  );

  return (
    <SlipContext.Provider value={{ found, find }}>
      {children}
      {showing ? (
        <SlipToast
          key={showing}
          id={showing}
          count={found.length}
          allFound={found.length === SLIPS.length}
          onClose={() => setShowing(null)}
        />
      ) : null}
    </SlipContext.Provider>
  );
}

function SlipToast({
  id,
  count,
  allFound,
  onClose,
}: {
  id: string;
  count: number;
  allFound: boolean;
  onClose: () => void;
}) {
  const slip = SLIPS.find((s) => s.id === id);
  const ref = useRef<HTMLDialogElement>(null);
  // A modal dialog sits in the top layer, so a slip found inside the tape log still shows on top.
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
    // Native listener: covers the Keep button and the Escape key alike.
    // Escape closes it natively; the button calls closeNow. Either way, report it once.
    const handle = () => closeNow();
    d.addEventListener("close", handle);
    return () => d.removeEventListener("close", handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!slip) return null;
  return (
    <dialog
      ref={ref}
      aria-label="A slip"
      className="m-auto w-[min(32rem,92vw)] bg-transparent p-0 text-foreground backdrop:bg-black/70"
    >
      <div className="pixel-border glitch-in m-1 flex flex-col gap-4 bg-card p-6 [--pb:var(--primary)]">
        <p className="retro flex items-center gap-3 text-[10px] uppercase text-primary">
          <Feather className="size-4" aria-hidden="true" /> {SLIP_COPY.found(Math.max(count, 1), SLIPS.length)}
        </p>
        <p
          className="keeper-voice text-2xl leading-snug text-[#c6a6ff]"
          style={{ textShadow: "0 0 10px rgb(198 166 255 / 0.75), 0 0 2px rgb(198 166 255 / 0.9)" }}
        >
          {slip.text}
        </p>
        {allFound ? <p className="text-xl text-primary">{SLIP_COPY.all}</p> : null}
        <div>
          <Button size="sm" autoFocus onClick={closeNow}>
            {SLIP_COPY.keep}
          </Button>
        </div>
      </div>
    </dialog>
  );
}

/** The found slips, as journal lines. Unfound ones stay blank. */
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
            <li key={s.id} className="keeper-voice">
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

/** Invisible ink: only shows where the light is. Move a pointer or a finger across the panel. */
export function InvisibleInk() {
  const { find, found } = useSlips();
  const ref = useRef<HTMLButtonElement>(null);
  const slip = SLIPS.find((s) => s.id === "ink")!;
  const [lit, setLit] = useState(false);

  function move(e: React.PointerEvent) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--x", `${e.clientX - r.left}px`);
    el.style.setProperty("--y", `${e.clientY - r.top}px`);
    if (!lit) setLit(true);
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-2 px-4">
      <p className="text-lg text-muted-foreground">{SLIP_COPY.inkHint}</p>
      <div
        onPointerMove={move}
        onPointerDown={move}
        onPointerLeave={() => setLit(false)}
        className="relative flex min-h-28 touch-none items-center justify-center overflow-hidden bg-[#070806] p-6"
      >
        <button
          ref={ref}
          type="button"
          onClick={() => find("ink")}
          aria-label={found.includes("ink") ? slip.text : "Hidden ink"}
          className="keeper-voice cursor-default text-center text-2xl text-[#c6a6ff]"
          style={{
            opacity: lit || found.includes("ink") ? 1 : 0,
            WebkitMaskImage: found.includes("ink")
              ? "none"
              : "radial-gradient(circle 80px at var(--x) var(--y), #000 30%, transparent 100%)",
            maskImage: found.includes("ink")
              ? "none"
              : "radial-gradient(circle 80px at var(--x) var(--y), #000 30%, transparent 100%)",
            textShadow: "0 0 12px rgb(198 166 255 / 0.7)",
            ["--x" as string]: "-200px",
            ["--y" as string]: "-200px",
          }}
        >
          {slip.text}
        </button>
      </div>
    </div>
  );
}
