import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface NewTrainerBadgeProps {
  className?: string;
}

/** Visual indicator rendered next to "New Trainer" placeholder usernames. */
export function NewTrainerBadge({ className }: NewTrainerBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-teal-500/10 px-1.5 py-0.5 text-[10px] font-medium text-teal-400",
        className
      )}
    >
      <Sparkles className="size-2.5" />
      New
    </span>
  );
}
