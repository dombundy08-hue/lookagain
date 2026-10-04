import { useRef } from "react";

import { SLIPS } from "@/game/copy";
import { cn } from "@/lib/utils";
import { useSlips } from "./slips";

// The tiny "?" secrets. Each sits on one screen. Their place in this list sets how hidden they are:
// the first is easy to spot, each one after it is smaller, fainter and tucked further away.
// The last one (home) is the last digit of the tape counter on the title screen.
const MARKS = SLIPS.filter((s) => s.mark);

// Spots on a card or page, from obvious to easy-to-miss. Later marks cycle through the sneakier ones.
const SPOTS = [
  "top-3 right-3",
  "bottom-3 right-4",
  "top-3 left-1/2",
  "bottom-3 left-4",
  "top-1 right-1",
  "-top-3 left-10",
  "-bottom-3 right-16",
  "top-1/2 -right-3",
  "-top-3 right-1/3",
];

/** A tiny "?" that, when pressed, reveals a secret and adds it to the feather count. */
export function LoreMark({ mark }: { mark: string }) {
  const { find, found } = useSlips();
  const index = MARKS.findIndex((m) => m.mark === mark);
  const slip = MARKS[index];
  if (!slip || found.includes(slip.id)) return null;

  const t = MARKS.length > 1 ? index / (MARKS.length - 1) : 0; // 0 = first, 1 = last
  const size = Math.round(20 - 11 * t); // 20px down to 9px
  const opacity = +(0.95 - 0.72 * t).toFixed(2); // fades to about 0.23
  const spot = index === 0 ? SPOTS[0] : SPOTS[1 + ((index * 3) % (SPOTS.length - 1))];

  return (
    <button
      type="button"
      onClick={() => find(slip.id)}
      aria-label="A question mark"
      className={cn(
        "retro absolute z-10 cursor-pointer p-[3px] leading-none hover:opacity-100",
        spot,
        t < 0.3 ? "text-[#c6a6ff]" : "text-muted-foreground",
        index === 0 && "blink",
      )}
      style={{
        fontSize: size,
        opacity,
        textShadow: t < 0.3 ? "0 0 8px rgb(198 166 255 / 0.7)" : undefined,
      }}
    >
      ?
    </button>
  );
}

/** The hardest one: the last digit of the tape counter on the title screen. Same size and colour as the digits. */
export function HomeMark() {
  const { find, found } = useSlips();
  const slip = MARKS.find((m) => m.mark === "home");
  const done = slip ? found.includes(slip.id) : true;
  return (
    <button
      type="button"
      onClick={() => slip && find(slip.id)}
      aria-label={done ? "0" : "A question mark"}
      className="pointer-events-auto cursor-default leading-none"
    >
      {done ? "0" : "?"}
    </button>
  );
}

/** A tiny "?" for a special secret. Hidden once that secret is found. */
function SmallMark({
  id,
  onPress,
  className,
}: {
  id: string;
  onPress: () => void;
  className?: string;
}) {
  const { found } = useSlips();
  if (found.includes(id)) return null;
  return (
    <button
      type="button"
      onClick={onPress}
      aria-label="A question mark"
      className={cn("retro cursor-pointer px-[2px] leading-none text-muted-foreground hover:text-foreground", className)}
    >
      ?
    </button>
  );
}

/** Secret 6: once the clock riddle is answered, a "?" turns up on the riddle page. */
export function SaidMark() {
  const { find } = useSlips();
  return (
    <div className="flex justify-end">
      <SmallMark id="said" onPress={() => find("said")} className="text-sm text-[#c6a6ff] opacity-80" />
    </div>
  );
}

/** Secret 8: the "?" right after "CH 3" in the corner of the title screen. */
export function ChannelMark() {
  const { find } = useSlips();
  return <SmallMark id="ch3" onPress={() => find("ch3")} className="text-[8px]" />;
}

/** Secret 7: a "?" beside the eye logo. Look twice: press it twice, quickly. */
export function TwiceMark() {
  const { find } = useSlips();
  const last = useRef(0);
  return (
    <SmallMark
      id="twice"
      className="text-[8px] opacity-70"
      onPress={() => {
        const now = Date.now();
        if (now - last.current < 450) find("twice");
        last.current = now;
      }}
    />
  );
}
