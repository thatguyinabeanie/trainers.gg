import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  /** Optional extra class for the subtitle text */
  subClassName?: string;
}

export function StatCard({ label, value, sub, subClassName }: StatCardProps) {
  return (
    <div className="bg-muted/50 rounded-lg px-3.5 py-3 shadow-sm">
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {label}
      </p>
      <p className="mt-1 font-mono text-xl leading-none font-bold tabular-nums">
        {value}
      </p>
      {sub && (
        <p
          className={cn("text-muted-foreground mt-1 text-[10px]", subClassName)}
        >
          {sub}
        </p>
      )}
    </div>
  );
}
