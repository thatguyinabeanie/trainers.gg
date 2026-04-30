"use client";

import { type ReactNode, useState } from "react";

import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

// =============================================================================
// Types
// =============================================================================

interface CollapsiblePanelProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

// =============================================================================
// CollapsiblePanel
// =============================================================================

/**
 * Inline analytics panel with a collapsible body.
 *
 * - Header bar: eyebrow + title + subtitle on left, chevron button on right.
 * - Body: rendered always (to preserve component state), shown/hidden via
 *   display style so panels like SpeedTiersPanel don't lose toggle state on
 *   collapse.
 * - Header click toggles open/closed.
 */
export function CollapsiblePanel({
  eyebrow,
  title,
  subtitle,
  defaultOpen = true,
  children,
}: CollapsiblePanelProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border bg-background">
      {/* Header */}
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/40"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {eyebrow && (
            <span className="text-[9px] font-bold tracking-widest text-muted-foreground uppercase">
              {eyebrow}
            </span>
          )}
          <span className="text-sm font-semibold text-foreground">{title}</span>
          {subtitle && (
            <span className="text-[10px] text-muted-foreground">{subtitle}</span>
          )}
        </div>
        <ChevronDown
          className={cn(
            "mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180"
          )}
          aria-hidden="true"
        />
      </button>

      {/* Body — never unmounted so panel-internal state is preserved */}
      <div style={open ? undefined : { display: "none" }}>{children}</div>
    </div>
  );
}
