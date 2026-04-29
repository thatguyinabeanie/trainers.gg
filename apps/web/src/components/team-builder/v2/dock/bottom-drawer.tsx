"use client";

import { type ReactNode } from "react";

import { cn } from "@/lib/utils";

// =============================================================================
// Types
// =============================================================================

export interface BottomDrawerProps {
  drawer: "matchups" | "speed" | null;
  onClose: () => void;
  children: ReactNode;
}

// =============================================================================
// BottomDrawer
// =============================================================================

/**
 * Slide-up bottom drawer container for the team builder dock.
 *
 * Renders a backdrop and a panel that animates in from below when `drawer`
 * is non-null. Backdrop click calls `onClose`. Esc key is handled at the
 * workspace level (team-workspace-v2.tsx) — do not add a duplicate handler here.
 *
 * Header contents are derived from the `drawer` prop:
 *   - "matchups" → "Defensive type coverage"
 *   - "speed"    → "Speed tier ladder"
 *
 * Body is filled by `children` (typically HeatmapPanel or SpeedTiersPanel
 * rendered conditionally by the parent workspace).
 */
export function BottomDrawer({ drawer, onClose, children }: BottomDrawerProps) {
  const open = drawer !== null;

  const eyebrow =
    drawer === "matchups" ? "DEFENSIVE" : drawer === "speed" ? "SPEED" : "";
  const title =
    drawer === "matchups"
      ? "Defensive type coverage"
      : drawer === "speed"
        ? "Speed tier ladder"
        : "";
  const subtitle =
    drawer === "matchups"
      ? "18 attacking types × your 6 slots"
      : drawer === "speed"
        ? "Your team vs the format · all values @ Lv 50"
        : "";

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/25 backdrop-blur-[1px]"
          aria-hidden="true"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <section
        role="dialog"
        aria-modal="false"
        aria-hidden={!open}
        aria-label={title}
        className={cn(
          "relative z-30 flex max-h-[70vh] flex-col overflow-hidden border-t bg-background shadow-[0_-4px_32px_-8px_rgba(0,0,0,0.3)]",
          "transition-[max-height,opacity] duration-300 ease-out",
          open ? "max-h-[70vh] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        {/* Drag handle */}
        <div
          className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-border"
          aria-hidden="true"
        />

        {/* Header */}
        <header className="flex items-start gap-3 border-b px-4 py-2.5">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            {eyebrow && (
              <span className="text-muted-foreground text-[9px] font-bold tracking-widest uppercase">
                {eyebrow}
              </span>
            )}
            <span className="text-foreground text-sm font-semibold">
              {title}
            </span>
            {subtitle && (
              <span className="text-muted-foreground text-[10px]">
                {subtitle}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel (Esc)"
            title="Close (Esc)"
            className="text-muted-foreground hover:text-foreground flex size-7 shrink-0 items-center justify-center rounded text-lg transition-colors hover:bg-muted"
          >
            ×
          </button>
        </header>

        {/* Body — scrollable */}
        <div className="min-h-0 flex-1 overflow-auto">
          {children}
        </div>
      </section>
    </>
  );
}
