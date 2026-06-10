"use client";

import { getPokemonSprite } from "@trainers/pokemon/sprites";

import { cn } from "@/lib/utils";

// =============================================================================
// Types
// =============================================================================

/**
 * A single dot on the dumbbell track.
 * `value` maps to a `left` percentage on the track (value / max * 100).
 */
export interface DumbbellDot {
  /** Raw numeric value — percentage points, counts, or any consistent unit. */
  value: number;
  /** OKLCH CSS color string for this dot. */
  color: string;
  /** Human-readable label for this dot (e.g. source name, format name). */
  label: string;
}

interface DumbbellRowProps {
  /** Species slug used to resolve the sprite and as a display label fallback. */
  species: string;
  /**
   * N dots to plot on the track. Each dot is positioned at
   * `left: (dot.value / max) * 100 %`.
   */
  dots: DumbbellDot[];
  /**
   * The denominator for percentage positioning.
   * Defaults to the largest `value` across all dots in the row.
   * Pass a shared max across all rows so rows are comparable.
   */
  max?: number;
  /**
   * Called when the pointer enters a dot — consumers render their own tooltip.
   * Receives the dot and its screen-relative bounding box so the consumer can
   * position a popover.
   */
  onDotHover?: (
    dot: DumbbellDot | null,
    rect: DOMRect | null,
    species: string
  ) => void;
  /** Optional href for the species label/sprite (Phase 3). No-op when absent. */
  speciesHref?: (species: string) => string;
  /** Extra class names for the outer row wrapper. */
  className?: string;
}

// =============================================================================
// DumbbellRow
// =============================================================================

/**
 * Reusable single-row dumbbell primitive for the /data Meta Explorer.
 *
 * Layout: `[sprite + name label] [track with dots and connecting line]`
 *
 * The track uses `position: relative` with absolutely-positioned dots placed
 * at `left: (value / max) * 100 %`. The connecting line spans from the
 * minimum-valued dot to the maximum-valued dot.
 *
 * This component is hand-rolled CSS — NOT recharts — intentionally lightweight
 * for a 1-D comparison plot.
 *
 * Hover a dot → calls `onDotHover(dot, rect, species)`.
 * Hover leaves the dot → calls `onDotHover(null, null, species)`.
 *
 * Generic over N dots per row.
 */
export function DumbbellRow({
  species,
  dots,
  max,
  onDotHover,
  speciesHref,
  className,
}: DumbbellRowProps) {
  const sprite = getPokemonSprite(species);

  // Compute the effective max for this row: caller-supplied or derived from dots.
  const effectiveMax =
    max ?? (dots.length > 0 ? Math.max(...dots.map((d) => d.value)) : 100);

  // Sort dots by value to determine connecting-line span (min → max).
  const sorted = [...dots].sort((a, b) => a.value - b.value);
  const minDot = sorted[0];
  const maxDot = sorted[sorted.length - 1];

  // Percentage positions for the connecting line ends.
  const lineLeft =
    minDot && effectiveMax > 0 ? (minDot.value / effectiveMax) * 100 : 0;
  const lineRight =
    maxDot && effectiveMax > 0
      ? 100 - (maxDot.value / effectiveMax) * 100
      : 100;

  const label = (
    <span className="text-foreground truncate text-xs font-medium">
      {species}
    </span>
  );

  return (
    <div className={cn("flex items-center gap-3 py-1", className)}>
      {/* Left cell: sprite + species name */}
      <div className="flex w-32 shrink-0 items-center gap-1.5">
        <img
          src={sprite.url}
          width={sprite.w}
          height={sprite.h}
          alt={species}
          className={cn(
            "size-7 shrink-0 object-contain",
            sprite.pixelated && "[image-rendering:pixelated]"
          )}
        />
        {speciesHref ? (
          <a
            href={speciesHref(species)}
            className="hover:text-primary min-w-0 truncate"
          >
            {label}
          </a>
        ) : (
          <div className="min-w-0">{label}</div>
        )}
      </div>

      {/* Track */}
      <DumbbellTrack
        dots={dots}
        effectiveMax={effectiveMax}
        lineLeft={lineLeft}
        lineRight={lineRight}
        species={species}
        onDotHover={onDotHover}
      />
    </div>
  );
}

// =============================================================================
// DumbbellTrack (exported so Task 8 can compose it independently)
// =============================================================================

interface DumbbellTrackProps {
  dots: DumbbellDot[];
  effectiveMax: number;
  /** `left` % for the start of the connecting line (min dot position). */
  lineLeft: number;
  /** `right` % for the end of the connecting line (100 − max dot position). */
  lineRight: number;
  species: string;
  onDotHover?: DumbbellRowProps["onDotHover"];
}

/**
 * The horizontal track portion of a DumbbellRow.
 *
 * Exported separately so Task 8 can embed a track without the sprite/label
 * left-cell (e.g. when the left cell contains different content).
 *
 * - Connecting line: `h-[1px]` hairline — allowed per project rules (1–3px
 *   hairlines are an explicitly accepted exception to the no-arbitrary-px rule).
 * - Dots: `size-3` (12px) circles, absolutely positioned by `left %`.
 */
export function DumbbellTrack({
  dots,
  effectiveMax,
  lineLeft,
  lineRight,
  species,
  onDotHover,
}: DumbbellTrackProps) {
  return (
    <div
      className="relative flex-1 py-2"
      aria-label={`${species} dumbbell track`}
    >
      {/* Background rail */}
      <div className="bg-muted absolute top-1/2 right-0 left-0 h-px -translate-y-px rounded-full" />

      {/* Connecting line between min and max dot — hairline (h-[1px] exception) */}
      {dots.length > 1 && (
        <div
          className="bg-border absolute top-1/2 h-[1px] -translate-y-px rounded-full"
          style={{ left: `${lineLeft}%`, right: `${lineRight}%` }}
        />
      )}

      {/* Dots */}
      {dots.map((dot) => {
        const leftPct = effectiveMax > 0 ? (dot.value / effectiveMax) * 100 : 0;
        return (
          <button
            key={dot.label}
            type="button"
            className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full border-2 border-white shadow-sm transition-transform hover:scale-125 focus-visible:ring-2 focus-visible:outline-none"
            style={{
              left: `${leftPct}%`,
              backgroundColor: dot.color,
              borderColor: "white",
            }}
            aria-label={`${dot.label}: ${dot.value.toFixed(1)}%`}
            onPointerEnter={(e) => {
              onDotHover?.(
                dot,
                e.currentTarget.getBoundingClientRect(),
                species
              );
            }}
            onPointerLeave={() => {
              onDotHover?.(null, null, species);
            }}
          />
        );
      })}
    </div>
  );
}
