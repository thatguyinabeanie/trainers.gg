"use client";

import { type JSX } from "react";

import { cn } from "@/lib/utils";

import { type TeamLayoutMode, useTeamLayout } from "./use-team-layout";

// =============================================================================
// Icons
// =============================================================================

function Icon1x6() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="size-3.5">
      <rect x="2" y="3" width="12" height="2" fill="currentColor" />
      <rect x="2" y="7" width="12" height="2" fill="currentColor" />
      <rect x="2" y="11" width="12" height="2" fill="currentColor" />
    </svg>
  );
}

// 2×3 — mid-stack layout: two columns, cells show a horizontal bar per row
function Icon2x3() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="size-3.5">
      <rect x="2" y="3" width="5" height="2" fill="currentColor" />
      <rect x="9" y="3" width="5" height="2" fill="currentColor" />
      <rect x="2" y="7" width="5" height="2" fill="currentColor" />
      <rect x="9" y="7" width="5" height="2" fill="currentColor" />
      <rect x="2" y="11" width="5" height="2" fill="currentColor" />
      <rect x="9" y="11" width="5" height="2" fill="currentColor" />
    </svg>
  );
}

// 2×3-vertical — two columns, cells stacked vertically (taller blocks per slot)
function Icon2x3Vertical() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="size-3.5">
      <rect x="2" y="3" width="5" height="4" fill="currentColor" />
      <rect x="9" y="3" width="5" height="4" fill="currentColor" />
      <rect x="2" y="9" width="5" height="4" fill="currentColor" />
      <rect x="9" y="9" width="5" height="4" fill="currentColor" />
    </svg>
  );
}

// 3×2 — three columns, cells show a horizontal bar per row (mid-stacked)
function Icon3x2Mid() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="size-3.5">
      <rect x="2" y="4" width="3" height="3" fill="currentColor" />
      <rect x="6.5" y="4" width="3" height="3" fill="currentColor" />
      <rect x="11" y="4" width="3" height="3" fill="currentColor" />
      <rect x="2" y="9" width="3" height="3" fill="currentColor" />
      <rect x="6.5" y="9" width="3" height="3" fill="currentColor" />
      <rect x="11" y="9" width="3" height="3" fill="currentColor" />
    </svg>
  );
}

// 3×2-vertical — three columns, each cell stacks sprite + form vertically
function Icon3x2Vertical() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="size-3.5">
      <rect x="2" y="3" width="3" height="3" fill="currentColor" />
      <rect x="2" y="6.5" width="3" height="3" fill="currentColor" />
      <rect x="2" y="10" width="3" height="3" fill="currentColor" />
      <rect x="6.5" y="3" width="3" height="3" fill="currentColor" />
      <rect x="6.5" y="6.5" width="3" height="3" fill="currentColor" />
      <rect x="6.5" y="10" width="3" height="3" fill="currentColor" />
      <rect x="11" y="3" width="3" height="3" fill="currentColor" />
      <rect x="11" y="6.5" width="3" height="3" fill="currentColor" />
      <rect x="11" y="10" width="3" height="3" fill="currentColor" />
    </svg>
  );
}

// =============================================================================
// Toggle
// =============================================================================

interface ToggleButton {
  mode: TeamLayoutMode;
  label: string;
  icon: () => JSX.Element;
}

const BUTTONS: readonly ToggleButton[] = [
  { mode: "1x6", label: "1 × 6 — full row layout", icon: Icon1x6 },
  { mode: "2x3", label: "2 × 3 — mid-stacked per cell", icon: Icon2x3 },
  {
    mode: "2x3-vertical",
    label: "2 × 3 — stacked per cell",
    icon: Icon2x3Vertical,
  },
  { mode: "3x2", label: "3 × 2 — mid-stacked per cell", icon: Icon3x2Mid },
  {
    mode: "3x2-vertical",
    label: "3 × 2 — stacked per cell",
    icon: Icon3x2Vertical,
  },
];

/** Topbar control for switching between team grid layouts. */
export function TeamLayoutToggle() {
  const { setMode, persisted, isMobileLocked, isAutoDegraded } =
    useTeamLayout();

  return (
    <div
      role="group"
      aria-label="Team layout"
      className={cn(
        "border-border bg-muted inline-flex gap-px rounded-md border p-0.5",
        isMobileLocked && "pointer-events-none opacity-50"
      )}
    >
      {BUTTONS.map(({ mode: btnMode, label, icon: IconCmp }) => {
        // Pressed reflects the user's persisted choice, not the
        // (possibly auto-degraded) effective mode — the toggle should
        // show what the user picked even when the viewport forced a
        // smaller column count.
        const active = persisted === btnMode;
        const fullLabel =
          active && isAutoDegraded
            ? `${label} (auto-fit at this width — widen the window to apply)`
            : label;
        return (
          <button
            key={btnMode}
            type="button"
            onClick={() => setMode(btnMode)}
            aria-pressed={active}
            aria-label={fullLabel}
            title={fullLabel}
            className={cn(
              "flex size-7 items-center justify-center rounded transition-colors",
              active
                ? cn(
                    "bg-background text-primary shadow-sm",
                    isAutoDegraded && "opacity-60"
                  )
                : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
            )}
          >
            <IconCmp />
          </button>
        );
      })}
    </div>
  );
}
