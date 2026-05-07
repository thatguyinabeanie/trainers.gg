import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface DashboardContentProps {
  children: ReactNode;
  className?: string;
}

/**
 * Content wrapper for dashboard pages.
 * Constrains width to max-w-6xl (1152px) and centers horizontally
 * so content doesn't stretch edge-to-edge on wide screens.
 * The PageHeader remains full-width (it's a toolbar bar).
 */
export function DashboardContent({
  children,
  className,
}: DashboardContentProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-6xl flex-1 p-4 md:p-6",
        className
      )}
    >
      {children}
    </div>
  );
}
