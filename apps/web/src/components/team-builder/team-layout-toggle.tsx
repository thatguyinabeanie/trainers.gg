"use client";

import { type JSX } from "react";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import { type TeamLayoutMode, useTeamLayout } from "./use-team-layout";

// =============================================================================
// Icons
// =============================================================================

// single — one framed cell, full width (rounded rect outline + inner filled cell)
function IconSingle() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="size-3.5">
      {/* Outer rounded rect outline */}
      <rect
        x="2"
        y="2"
        width="12"
        height="12"
        rx="2"
        ry="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      {/* Inner filled cell */}
      <rect x="4" y="4" width="8" height="8" rx="1" fill="currentColor" />
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
  {
    mode: "single",
    label: "Single — one Pokémon, full width",
    icon: IconSingle,
  },
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
 *
 * Phase 3a: rebuilt on shadcn ToggleGroup; controlled single-select bound
 * to `persisted` + `setMode` from `useTeamLayout()`. Base UI's ToggleGroup
 * is array-shaped even in single-select mode (the default `multiple={false}`
 * still surfaces values as `Value[]`).
 */
export function TeamLayoutToggle() {
  const { setMode, persisted } = useTeamLayout();

  return (
    <ToggleGroup
      aria-label="Team layout"
      value={[persisted]}
      onValueChange={(next) => {
        // Single-select: Base UI returns `[]` when the user clicks the
        // already-pressed item (deselect). We disallow the empty state by
        // re-asserting the current mode, keeping the control idempotent
        // and matching the previous bespoke-button behavior.
        const [picked] = next;
        if (!picked || picked === persisted) return;
        setMode(picked as TeamLayoutMode);
      }}
      size="sm"
    >
      {BUTTONS.map(({ mode: btnMode, label, icon: IconCmp }) => (
        <ToggleGroupItem
          key={btnMode}
          value={btnMode}
          aria-label={label}
          title={label}
        >
          <IconCmp />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
