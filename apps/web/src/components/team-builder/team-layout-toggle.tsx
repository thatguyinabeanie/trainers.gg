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
function _Icon2x3() {
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
  {
    mode: "2x3-vertical",
    label: "2 × 3 — stacked per cell",
    icon: Icon3x2Vertical,
  },
];

/**
 * Topbar control for switching between team grid layouts.
 *
 * Phase 2c: this component is hidden at the mount site on `<md` viewports
 * via Tailwind (the mobile lock in `useTeamLayout()` already forces compact).
 * The component itself therefore always renders normally and has no mobile
 * branch of its own.
 */
export function TeamLayoutToggle() {
  const { setMode, persisted } = useTeamLayout();

  return (
    <div
      role="group"
      aria-label="Team layout"
      className="border-border bg-muted inline-flex gap-px rounded-md border p-0.5"
    >
      {BUTTONS.map(({ mode: btnMode, label, icon: IconCmp }) => {
        const active = persisted === btnMode;
        return (
          <button
            key={btnMode}
            type="button"
            onClick={() => setMode(btnMode)}
            aria-pressed={active}
            aria-label={label}
            title={label}
            className={cn(
              "flex size-7 items-center justify-center rounded transition-colors",
              active
                ? "bg-background text-primary shadow-sm"
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
