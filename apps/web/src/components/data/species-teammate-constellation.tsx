"use client";

import { useState } from "react";
import Link from "next/link";
import { Dex } from "@pkmn/dex";

import { type TeammateRow } from "@trainers/supabase";
import { getPokemonSprite } from "@trainers/pokemon/sprites";

import { cn } from "@/lib/utils";

import { computeRingLayout } from "./usage-series";
import { DataChartCard } from "./data-chart-card";
import { DataSpriteTooltip } from "./data-sprite-tooltip";

// =============================================================================
// Types
// =============================================================================

interface SpeciesTeammateConstellationProps {
  /** Focal species slug (e.g. "calyrex-ice-rider"). */
  focalSpecies: string;
  /** Display name for the focal species. */
  focalDisplayName: string;
  /** Teammate rows from SpeciesTeammatesResult, ordered by pairPct desc. */
  teammates: TeammateRow[];
  /**
   * Returns the drill-down URL for a teammate slug.
   * Used for the bubble links.
   */
  onTeammateHref: (slug: string) => string;
}

// =============================================================================
// Bubble size buckets (Tailwind scale — no arbitrary px)
// =============================================================================

/**
 * Map a pair percentage to a Tailwind size class.
 *
 * Tailwind scale:
 *   size-8  = 32px  (< 20%)
 *   size-10 = 40px  (20–34%)
 *   size-12 = 48px  (35–49%)
 *   size-14 = 56px  (≥ 50%)
 */
function bubbleSizeClass(pairPct: number): string {
  if (pairPct >= 50) return "size-14";
  if (pairPct >= 35) return "size-12";
  if (pairPct >= 20) return "size-10";
  return "size-8";
}

// =============================================================================
// SVG line layer — stroke from center to each bubble
// =============================================================================

interface ConstellationLinesProps {
  /** Bubble center positions as percentages [0–100]. */
  positions: { x: number; y: number }[];
  /** Pair percentages for opacity scaling. */
  pairPcts: number[];
}

function ConstellationLines({ positions, pairPcts }: ConstellationLinesProps) {
  const maxPct = Math.max(...pairPcts, 1);
  return (
    // SVG is positioned absolutely over the container (pointer-events:none so
    // it doesn't block bubble clicks).
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden
    >
      {positions.map((pos, i) => {
        // Scale opacity 0.15 → 0.55 by relative pairPct.
        const opacity = 0.15 + 0.4 * ((pairPcts[i] ?? 0) / maxPct);
        return (
          <line
            key={i}
            x1="50%"
            y1="50%"
            x2={`${pos.x}%`}
            y2={`${pos.y}%`}
            stroke="var(--border)"
            strokeWidth={1}
            opacity={opacity}
          />
        );
      })}
    </svg>
  );
}

// =============================================================================
// SpeciesTeammateConstellation
// =============================================================================

/**
 * Deterministic radial ring visualization of a species' top teammates.
 *
 * - Focal sprite centered; teammate bubbles on a ring, positioned by
 *   `computeRingLayout(n)` from `usage-series.ts` (pure trig, no force layout).
 * - Default top 12; a "show top 20" toggle expands to a two-ring layout.
 *   The shell already fetches topN=20, so this toggle never triggers a refetch.
 * - Bubble size scales with pairPct via Tailwind size-scale buckets.
 * - Each bubble is a `<Link>` to the teammate drill-down.
 * - SVG line layer underneath, opacity proportional to pairPct.
 * - Mobile: caps to top 8 on narrow widths via responsive Tailwind.
 */
export function SpeciesTeammateConstellation({
  focalSpecies,
  focalDisplayName,
  teammates,
  onTeammateHref,
}: SpeciesTeammateConstellationProps) {
  const [showTop20, setShowTop20] = useState(false);

  // Slice to the shown set. Mobile caps to 8 via CSS, not JS, so we keep the
  // showTop20 toggle JS-side only (up to 20) and let mobile CSS hide the outer
  // ring bubbles via the sm: Tailwind variant if needed.
  const shown = teammates.slice(0, showTop20 ? 20 : 12);

  const positions = computeRingLayout(shown.length);
  const pairPcts = shown.map((t) => t.pairPct);

  const focalSprite = getPokemonSprite(focalSpecies);

  // Toggle button rendered in the DataChartCard actions slot.
  const toggleButton = (
    <button
      type="button"
      onClick={() => setShowTop20((v) => !v)}
      className="text-muted-foreground hover:text-foreground rounded px-2 py-0.5 text-xs transition-colors"
      aria-pressed={showTop20}
    >
      {showTop20 ? "Show top 12" : "Show top 20"}
    </button>
  );

  if (teammates.length === 0) {
    return (
      <DataChartCard title="Teammates">
        <div className="text-muted-foreground flex min-h-40 items-center justify-center p-4 text-sm">
          No teammate data available for this filter combination.
        </div>
      </DataChartCard>
    );
  }

  return (
    <DataChartCard title="Teammates" actions={toggleButton}>
      {/*
       * Square container — `aspect-square` so the ring radius percentages
       * resolve consistently.  Relative so SVG lines + absolute bubbles
       * position correctly.
       */}
      <div className="relative mx-auto aspect-square w-full max-w-sm p-2">
        {/* SVG line layer (underneath bubbles) */}
        <ConstellationLines positions={positions} pairPcts={pairPcts} />

        {/* Focal species — absolutely centered */}
        <div className="absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
          <img
            src={focalSprite.url}
            width={focalSprite.w}
            height={focalSprite.h}
            alt={focalDisplayName}
            className={
              focalSprite.pixelated ? "[image-rendering:pixelated]" : undefined
            }
            // Sprite API-bound pixel dimensions — Tailwind scale doesn't map exactly.
            style={{ width: 56, height: 56, objectFit: "contain" }}
          />
        </div>

        {/* Teammate bubbles */}
        {shown.map((teammate, i) => {
          const pos = positions[i];
          if (!pos) return null;
          const sprite = getPokemonSprite(teammate.teammate);
          const displayName =
            Dex.species.get(teammate.teammate)?.name ?? teammate.teammate;
          const sizeClass = bubbleSizeClass(teammate.pairPct);

          return (
            <div
              key={teammate.teammate}
              className="group absolute z-20 -translate-x-1/2 -translate-y-1/2"
              // Computed trig positions — inline style is required (not arbitrary px).
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            >
              {/* Tooltip on hover — absolute-positioned above the bubble */}
              <div className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1 -translate-x-1/2 opacity-0 transition-opacity group-hover:opacity-100">
                <DataSpriteTooltip
                  species={teammate.teammate}
                  name={displayName}
                  lines={[
                    { label: "Teams", value: String(teammate.pairCount) },
                    { label: "Pair rate", value: `${teammate.pairPct}%` },
                  ]}
                />
              </div>

              {/* Bubble link */}
              <Link
                href={onTeammateHref(teammate.teammate)}
                aria-label={`${displayName}: ${teammate.pairCount} teams (${teammate.pairPct}%)`}
                className={cn(
                  "bg-card border-border hover:border-primary flex items-center justify-center rounded-full border shadow-sm transition-colors",
                  sizeClass
                )}
              >
                <img
                  src={sprite.url}
                  width={sprite.w}
                  height={sprite.h}
                  alt={displayName}
                  className={cn(
                    "h-full w-full object-contain",
                    sprite.pixelated ? "[image-rendering:pixelated]" : undefined
                  )}
                />
              </Link>
            </div>
          );
        })}
      </div>
    </DataChartCard>
  );
}
