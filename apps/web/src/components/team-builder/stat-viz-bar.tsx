"use client";

import { cn } from "@/lib/utils";

const spreadVbarClass = "h-2 bg-muted rounded-full overflow-hidden relative min-w-0";
const spreadVbarBaseClass = "block h-full absolute left-0 rounded-full";
const spreadVbarInvestClass = "block h-full absolute [background-image:repeating-linear-gradient(45deg,rgba(255,255,255,0.55)_0,rgba(255,255,255,0.55)_3px,transparent_3px,transparent_7px)]";
/* left-[5px]/right-[5px]: 5px pip inset — between scale tokens (px=1px, 1.5=6px); no clean map */
const spreadBumpsClass = "absolute inset-y-0 left-[5px] right-[5px] pointer-events-none";
/* size-[9px]: 9px bump-tick pip — API-bound to the slider track height; no scale token */
/* border-[1.5px]: 1.5px hairline ring — sub-pixel precision, no scale token */
const spreadBumpTickClass = "absolute top-1/2 size-[9px] bg-card border-[1.5px] border-current rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer p-0 outline-none transition-[transform,border-width] duration-150 ease-in-out hover:scale-[1.7] hover:border-2 focus-visible:outline-2 focus-visible:outline-current focus-visible:outline-offset-2";
const spreadBumpTickNextClass = "border-2";

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
    <div className={spreadVbarClass}>
      <span
        className={cn(spreadVbarBaseClass, "bg-current")}
        style={{ width: `${baseLayerWidth}%` }}
      />
      {investLayerWidth > 0 && (
        <span
          className={cn(spreadVbarInvestClass, "bg-current")}
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
    <div className={spreadBumpsClass} data-testid={testId}>
      {breakpoints.map((bpEv) => {
        const tickClass = cn(
          spreadBumpTickClass,
          bpEv === nextBpEv && spreadBumpTickNextClass
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
