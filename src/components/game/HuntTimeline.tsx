import { BookOpen, Tv } from "lucide-react";

import Timeline2, { type TimelineStep } from "@/components/ui/8bit-timeline2";

// The whole hunt, as far as the kids can know it. Future steps are unknowns; the last one is red.
const HUNT: TimelineStep[] = [
  { icon: "I", title: "Tape I", description: "The Method", state: "done" },
  { icon: "II", title: "Tape II", description: "Second Look", state: "done" },
  { icon: "III", title: "Tape III", description: "Overhead", state: "done" },
  { icon: "IV", title: "Tape IV", description: "The Looking-Glass", state: "done" },
  { icon: <BookOpen aria-hidden="true" />, title: "The Book", description: "Hollowed out", state: "done" },
  { icon: <Tv aria-hidden="true" />, title: "This Show", description: "You are here", state: "current" },
  { icon: "?", title: "?", description: "Not yet", state: "unknown" },
  { icon: "?", title: "?", description: "Not yet", state: "unknown" },
  { icon: "?", title: "?", description: "Not yet", state: "unknown" },
  { icon: "?", title: "?", description: "", state: "danger" },
];

export default function HuntTimeline({ className }: { className?: string }) {
  return (
    <Timeline2
      className={className}
      title="Tape Log"
      description="What you've found, and what is still waiting."
      steps={HUNT}
    />
  );
}
