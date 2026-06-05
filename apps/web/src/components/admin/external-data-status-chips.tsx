import { cn } from "@/lib/utils";

export interface StatusChip {
  label: string;
  count: number;
  tone: "synced" | "queued" | "importing" | "imported" | "failed";
}

const TONE_CLASS: Record<StatusChip["tone"], string> = {
  synced: "bg-muted text-muted-foreground",
  queued: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  importing: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  imported: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  failed: "bg-red-500/10 text-red-700 dark:text-red-400",
};

/** Scannable colored count pills for the import console toolbar. */
export function StatusChips({ chips }: { chips: StatusChip[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <span
          key={c.label}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums",
            TONE_CLASS[c.tone]
          )}
        >
          <span className="size-1.5 rounded-full bg-current opacity-80" />
          {c.count.toLocaleString()} {c.label}
        </span>
      ))}
    </div>
  );
}
