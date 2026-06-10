import { type ReactNode } from "react";

import { cn } from "@/lib/utils";

// =============================================================================
// Types
// =============================================================================

interface DataChartCardProps {
  /** Card heading — rendered uppercase with wide tracking in muted color. */
  title: string;
  /**
   * Optional muted caption below the title.
   * Use for caveats such as "ignores Source filter".
   */
  caption?: ReactNode;
  /**
   * Optional right-aligned actions slot — for toggles, selects, etc.
   */
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

// =============================================================================
// DataChartCard
// =============================================================================

/**
 * Shared card chrome for /data Meta Explorer charts.
 *
 * Renders a `bg-card rounded-xl shadow-sm` container with:
 * - A header row: uppercase tracking-widest muted title (left) + actions (right).
 * - An optional caption line below the title for caveats.
 * - A body slot (`children`).
 *
 * Matches the Meta Pipeline card style in `usage-explorer.tsx`.
 */
export function DataChartCard({
  title,
  caption,
  actions,
  children,
  className,
}: DataChartCardProps) {
  return (
    <div
      className={cn("bg-card flex flex-col rounded-xl shadow-sm", className)}
    >
      {/* Header */}
      <div className="flex items-start justify-between border-b px-4 py-2.5">
        <div className="flex flex-col gap-0.5">
          <span className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
            {title}
          </span>
          {caption && (
            <span className="text-muted-foreground text-xs">{caption}</span>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      {/* Body */}
      <div>{children}</div>
    </div>
  );
}
