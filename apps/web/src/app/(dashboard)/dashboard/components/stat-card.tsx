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
    <div className="bg-muted/50 rounded-md px-2.5 py-2">
      <p className="text-muted-foreground mb-0.5 text-[9px] font-semibold tracking-widest uppercase">
        {label}
      </p>
      <p className="font-mono text-base leading-none font-bold">{value}</p>
      {sub && (
        <p
          className={cn(
            "text-muted-foreground mt-0.5 text-[8px]",
            subClassName
          )}
        >
          {sub}
        </p>
      )}
    </div>
  );
}
