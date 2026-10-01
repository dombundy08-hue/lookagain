import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type TimelineState = "done" | "current" | "unknown" | "danger";

export interface TimelineStep {
  description: string;
  icon: ReactNode;
  title: string;
  /** Look Again addition: how the checkpoint is drawn. Defaults to "done". */
  state?: TimelineState;
  /** Look Again addition: makes the checkpoint pressable. */
  onSelect?: () => void;
  /** Accessible name for a pressable checkpoint. */
  selectLabel?: string;
}

interface Timeline2Props {
  className?: string;
  description?: string;
  steps?: TimelineStep[];
  title?: string;
}

const defaultSteps: TimelineStep[] = [
  {
    icon: "I",
    title: "Design",
    description: "Plan your layout and pick your blocks.",
  },
  {
    icon: "II",
    title: "Develop",
    description: "Install components and wire them up.",
  },
  {
    icon: "III",
    title: "Test",
    description: "Check responsiveness and dark mode.",
  },
  {
    icon: "IV",
    title: "Deploy",
    description: "Push to production. Game over (in a good way).",
  },
];

const checkpointByState: Record<TimelineState, string> = {
  done: "border-primary bg-background text-primary",
  current: "border-primary bg-primary text-primary-foreground",
  unknown: "border-border border-dashed bg-background text-muted-foreground",
  danger: "border-destructive bg-background text-destructive",
};

export default function Timeline2({
  title = "The Quest Line",
  description = "Your path from idea to launch",
  steps = defaultSteps,
  className,
}: Timeline2Props) {
  return (
    <section className={cn("w-full px-4 py-16", className)}>
      <div className="mx-auto max-w-5xl">
        {(title || description) && (
          <div className="mb-10 text-center">
            {title && (
              <h2 className="retro mb-3 font-bold text-xl tracking-tight md:text-2xl">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-lg text-muted-foreground">{description}</p>
            )}
          </div>
        )}

        {/* Horizontal on desktop, vertical on mobile */}
        <ol className="relative flex flex-col gap-8 md:flex-row md:gap-0">
          {/* Horizontal line (desktop) */}
          <div
            aria-hidden="true"
            className="absolute top-7 right-0 left-0 hidden h-0 border-t-2 border-dashed border-border md:block"
          />

          {steps.map((step, i) => {
            const state = step.state ?? "done";
            return (
              <li
                className="relative flex flex-1 flex-col items-center text-center"
                key={`${i}-${step.title}`}
                aria-current={state === "current" ? "step" : undefined}
              >
                {/* Checkpoint */}
                {(() => {
                  const cls = cn(
                    "retro relative z-10 mb-4 flex size-14 items-center justify-center border-2 font-bold text-xs",
                    checkpointByState[state],
                    state === "danger" && "shadow-[0_0_18px_rgb(224_72_58/0.45)]",
                  );
                  return step.onSelect ? (
                    <button type="button" className={cn(cls, "cursor-default")} onClick={step.onSelect} aria-label={step.selectLabel}>
                      {step.icon}
                    </button>
                  ) : (
                    <div className={cls}>{step.icon}</div>
                  );
                })()}

                <h3
                  className={cn(
                    "retro mb-1 font-bold text-[10px]",
                    state === "danger" && "text-destructive",
                    state === "unknown" && "text-muted-foreground",
                  )}
                >
                  {step.title}
                </h3>
                <p className="max-w-[160px] text-base leading-tight text-muted-foreground">
                  {step.description}
                </p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
