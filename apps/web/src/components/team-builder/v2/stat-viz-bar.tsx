"use client";

import { cn } from "@/lib/utils";

import s from "./builder.module.css";

// =============================================================================
// StatVizBar
// =============================================================================

interface StatVizBarProps {
  /** % width of the solid base layer. */
  baseLayerWidth: number;
  /** % left offset where the striped invest layer starts. */
  investLayerLeft: number;
  /** % width of the striped invest layer (0 → not rendered). */
  investLayerWidth: number;
}

/**
 * Read-only stat viz bar — solid base layer + striped invest overlay.
 *
 * Renders into Col 3 of the spread row CSS grid. Both layers inherit the
 * stat-key color from the parent row via `bg-current`.
 */
export function StatVizBar({
  baseLayerWidth,
  investLayerLeft,
  investLayerWidth,
}: StatVizBarProps) {
  return (
    <div className={s.spreadVbar}>
      <span
        className={cn(s.spreadVbarBase, "bg-current")}
        style={{ width: `${baseLayerWidth}%` }}
      />
      {investLayerWidth > 0 && (
        <span
          className={cn(s.spreadVbarInvest, "bg-current")}
          style={{
            left: `${investLayerLeft}%`,
            width: `${investLayerWidth}%`,
          }}
        />
      )}
    </div>
  );
}

// =============================================================================
// StatBumpsOverlay
// =============================================================================

interface StatBumpsOverlayProps {
  /** EV values where the stat ticks up by 1 (only set for the +nature stat). */
  breakpoints: number[];
  /** The next bp reachable with current budget — highlighted if present. */
  nextBpEv: number | null | undefined;
  /** Per-stat EV cap for positioning the pips. */
  perStatMax: number;
  /** Stat label, used for aria-label on buttons (e.g. "Set SPE to 252"). */
  label: string;
  /** When provided, breakpoints render as <button> with onClick. Otherwise <span>. */
  onBumpClick?: (ev: number) => void;
  /** Optional data-testid for the bumps container. */
  testId?: string;
}

/**
 * Breakpoint bump ticks overlay — renders inside `.spreadSliderWrap` (Col 5).
 *
 * Guarded by `breakpoints.length > 0` at the call site (only rendered for
 * the +nature stat). Bumps render as interactive `<button>` elements when
 * `onBumpClick` is provided, or as decorative `<span>` elements otherwise.
 */
export function StatBumpsOverlay({
  breakpoints,
  nextBpEv,
  perStatMax,
  label,
  onBumpClick,
  testId,
}: StatBumpsOverlayProps) {
  return (
    <div className={s.spreadBumps} data-testid={testId}>
      {breakpoints.map((bpEv) => {
        const tickClass = cn(
          s.spreadBumpTick,
          bpEv === nextBpEv && s.spreadBumpTickNext
        );
        const style = { left: `${(bpEv / perStatMax) * 100}%` };

        if (onBumpClick) {
          return (
            <button
              key={bpEv}
              type="button"
              onClick={() => onBumpClick(bpEv)}
              aria-label={`Set ${label} to ${bpEv}`}
              className={tickClass}
              style={style}
            />
          );
        }

        return (
          <span key={bpEv} className={tickClass} style={style} />
        );
      })}
    </div>
  );
}
