import { cn } from "@/lib/utils";

interface DashboardCardProps {
  label?: string;
  labelClassName?: string;
  children: React.ReactNode;
  className?: string;
}

export function DashboardCard({
  label,
  labelClassName,
  children,
  className,
}: DashboardCardProps) {
  return (
    <div
      className={cn(
        "bg-card text-card-foreground rounded-lg p-4 shadow-sm",
        className
      )}
    >
      {label && (
        <p
          className={cn(
            "text-muted-foreground mb-3 text-[10px] font-semibold tracking-wide uppercase",
            labelClassName
          )}
        >
          {label}
        </p>
      )}
      {children}
    </div>
  );
}
