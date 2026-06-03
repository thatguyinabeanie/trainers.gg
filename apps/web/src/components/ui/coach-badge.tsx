import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

interface CoachBadgeProps {
  /** Canonical coach handle (main-alt username) — the /coaching/[handle] target. */
  handle: string;
  /** Render only the icon (dense tables / narrow mobile). Keeps an aria-label. */
  iconOnly?: boolean;
  className?: string;
}

/** Coach badge shown next to a coach's name on public alts. Links to their profile. */
export function CoachBadge({
  handle,
  iconOnly = false,
  className,
}: CoachBadgeProps) {
  return (
    <Link
      href={`/coaching/${handle}`}
      aria-label="Coach"
      title="Coach"
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-teal-500/10 px-1.5 py-0.5 text-[10px] font-medium text-teal-400 hover:bg-teal-500/20",
        className
      )}
    >
      <GraduationCap className="size-2.5" />
      {!iconOnly && "Coach"}
    </Link>
  );
}
