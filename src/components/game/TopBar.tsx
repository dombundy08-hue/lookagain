import { useRef, useState, type ReactNode } from "react";
import { Eye, Feather, House, RotateCcw, ScrollText, Volume2, VolumeX, X } from "lucide-react";

import { Button } from "@/components/ui/8bit-button";
import { DIFFICULTY_LOCKED, SLIPS } from "@/game/copy";
import { MILESTONES, STAGE_BY_ID, STAGES } from "@/game/stages";
import { cn } from "@/lib/utils";
import { BonusDialog, StarCount } from "./bonus";
import HuntTimeline from "./HuntTimeline";
import { TwiceMark } from "./Hint";
import { useSlips } from "./slips";

const order = STAGES.map((s) => s.id);

export default function TopBar({
  stageId,
  stars,
  music,
  onToggleMusic,
  onStartOver,
  onHome,
  below,
  bonuses = [],
}: {
  stageId: string;
  stars: number;
  music: boolean;
  onToggleMusic: () => void;
  onStartOver: () => void;
  onHome: () => void;
  /** Extra row under the bar (the shared clock). */
  below?: ReactNode;
  /** Bonuses earned, re-openable from the tape log. */
  bonuses?: string[];
}) {
  const [bonusOpen, setBonusOpen] = useState<"tape" | "file" | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { found } = useSlips();
  const at = order.indexOf(stageId);

  return (
    <header className="sticky top-0 z-40 border-b-2 border-border bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <Eye className="size-5 text-primary" aria-hidden="true" />
          <TwiceMark />
          <span className="retro text-[10px]">Curiosity Hour</span>
        </div>

        <ol className="flex flex-1 items-center gap-2" aria-label="Progress">
          {MILESTONES.map((id) => {
            const idx = order.indexOf(id);
            const state = at > idx ? "done" : at === idx ? "current" : "todo";
            return (
              <li key={id} className="flex items-center gap-2" aria-current={state === "current" ? "step" : undefined}>
                <span
                  aria-hidden="true"
                  className={cn(
                    "inline-block size-3",
                    state === "done" && "bg-primary",
                    state === "current" && "blink bg-primary",
                    state === "todo" && "border-2 border-border",
                  )}
                />
                <span className={cn("retro hidden text-[8px] sm:inline", state === "todo" ? "text-muted-foreground" : "text-foreground")}>
                  {STAGE_BY_ID[id]?.label}
                  <span className="sr-only">{state === "done" ? " (done)" : state === "current" ? " (now)" : ""}</span>
                </span>
              </li>
            );
          })}
        </ol>

        <div className="flex items-center gap-4">
          <span className="retro hidden text-[8px] text-destructive md:inline">{DIFFICULTY_LOCKED}</span>
          <StarCount count={stars} />
          <button
            type="button"
            onClick={() => dialogRef.current?.showModal()}
            className="retro flex cursor-pointer items-center gap-2 text-[10px] text-muted-foreground hover:text-primary"
            aria-label={`${found.length} of ${SLIPS.length} secrets found. Open the list.`}
          >
            <Feather className="size-4" aria-hidden="true" /> {found.length}
          </button>
          <Button variant="ghost" size="sm" className="px-2" onClick={() => dialogRef.current?.showModal()} aria-label="Tape log">
            <ScrollText aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="sm" className="px-2" onClick={onToggleMusic} aria-pressed={music} aria-label="Music">
            {music ? <Volume2 aria-hidden="true" /> : <VolumeX aria-hidden="true" />}
          </Button>
          <Button variant="secondary" onClick={onHome} aria-label="Home screen">
            <House aria-hidden="true" /> Home
          </Button>
          <Button variant="ghost" size="sm" className="px-2" onClick={onStartOver} aria-label="Start over">
            <RotateCcw aria-hidden="true" />
          </Button>
        </div>
      </div>

      {below}
      {bonusOpen ? <BonusDialog kind={bonusOpen} onClose={() => setBonusOpen(null)} /> : null}
      <dialog
        ref={dialogRef}
        className="m-auto max-h-[90svh] w-[min(1100px,94vw)] overflow-auto bg-background text-foreground backdrop:bg-black/80"
        aria-label="Tape log"
        onClick={(e) => {
          if (e.target === dialogRef.current) dialogRef.current?.close();
        }}
      >
        <div className="pixel-border m-1 relative">
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-3 right-3 z-30 px-2"
            onClick={() => dialogRef.current?.close()}
            aria-label="Close"
          >
            <X aria-hidden="true" />
          </Button>
          <HuntTimeline className="py-10" />
          {bonuses.length ? (
            <div className="mx-auto flex max-w-3xl flex-wrap gap-4 px-4 pb-10">
              {bonuses.includes("tape") ? (
                <Button variant="secondary" size="sm" onClick={() => setBonusOpen("tape")}>
                  Bonus Reel
                </Button>
              ) : null}
              {bonuses.includes("file") ? (
                <Button variant="secondary" size="sm" onClick={() => setBonusOpen("file")}>
                  Extra File
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </dialog>
    </header>
  );
}
