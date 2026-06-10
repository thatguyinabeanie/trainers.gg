"use client";

import { useState } from "react";

import { type ConversionRow } from "@trainers/supabase";

import { useIsMobile } from "@/hooks/use-mobile";

import { DataChartCard } from "./data-chart-card";
import { DataSpriteTooltip } from "./data-sprite-tooltip";
import { topPctLabel } from "./usage-filters";
import { DumbbellRow } from "./usage-dumbbell";

// =============================================================================
// Constants
// =============================================================================

/** Top-N row cap: 15 on mobile, 20 on desktop. */
const TOP_N_MOBILE = 15;
const TOP_N_DESKTOP = 20;

/**
 * Muted OKLCH color for the overall usage dot (left dot).
 * Distinct from teal primary so the two dots read clearly as separate values.
 */
const COLOR_OVERALL = "oklch(0.66 0.04 240)";

/**
 * Teal primary OKLCH color for the top-share dot (right dot).
 * Matches the project's teal accent family.
 */
const COLOR_TOP_SHARE = "oklch(0.66 0.12 195)";

// =============================================================================
// Types
// =============================================================================

export interface UsageTopShareDumbbellProps {
  /**
   * Rows from `getUsageConversion()`. Species with `conversionPct === null`
   * (no placement events) are dropped before rendering.
   */
  rows: ConversionRow[];
  /**
   * Top-percentile threshold in [0, 1], e.g. 0.1 for "Top 10%".
   * Drives the dynamic chart title and right-dot label.
   */
  topPct: number;
  /** Optional href generator for species names (Phase 3). No-op when absent. */
  speciesHref?: (species: string) => string;
}

/** Tooltip anchor state for the floating sprite tooltip. */
interface TooltipState {
  species: string;
  dotLabel: string;
  value: number;
  rect: DOMRect;
  overallPct: number;
  topSharePct: number;
}

// =============================================================================
// UsageTopShareDumbbell
// =============================================================================

/**
 * Chart #4 — Overall vs. Top-N% Usage Dumbbell.
 *
 * Each row shows two dots on a shared 0–100 track:
 * - Left dot (muted): overall `usagePct` across all players.
 * - Right dot (teal): `topSharePct` — usage among the top N% placing players.
 *
 * Rows where `conversionPct === null` are dropped because they have no
 * placement-bearing event data and the top-share value is meaningless.
 *
 * Title is dynamic: "Overall vs. Top 10% usage" — driven by `topPct`.
 * The phrase "top cut" is never used.
 *
 * The chart uses a shared `max=100` so all percentage tracks are on the
 * same 0–100 scale regardless of species.
 */
export function UsageTopShareDumbbell({
  rows,
  topPct,
  speciesHref,
}: UsageTopShareDumbbellProps) {
  const isMobile = useIsMobile();
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  // Drop rows with no placement data — their topSharePct is not meaningful.
  const withPlacement = rows.filter((r) => r.conversionPct !== null);

  // Sort by overall usage descending; species name is tiebreaker.
  const sorted = [...withPlacement].sort(
    (a, b) => b.usagePct - a.usagePct || a.species.localeCompare(b.species)
  );

  const topN = isMobile ? TOP_N_MOBILE : TOP_N_DESKTOP;
  const visible = sorted.slice(0, topN);

  // Dynamic label for the right dot — e.g. "Top 10%".
  const topLabel = topPctLabel(topPct);

  // Dynamic card title — e.g. "Overall vs. Top 10% usage".
  const cardTitle = `Overall vs. ${topLabel} usage`;

  function handleDotHover(
    dot: { value: number; color: string; label: string } | null,
    rect: DOMRect | null,
    species: string
  ) {
    if (!dot || !rect) {
      setTooltip(null);
      return;
    }
    const row = rows.find((r) => r.species === species);
    if (!row) return;
    setTooltip({
      species,
      dotLabel: dot.label,
      value: dot.value,
      rect,
      overallPct: row.usagePct,
      topSharePct: row.topSharePct,
    });
  }

  return (
    <DataChartCard title={cardTitle}>
      <div className="flex flex-col gap-0 px-4 py-3">
        {/* Legend strip */}
        <div className="mb-2 flex items-center gap-3">
          {/* Spacer matching the sprite+name left cell */}
          <div className="w-32 shrink-0" />
          <div className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-1">
            <div className="flex items-center gap-1">
              <span
                className="inline-block size-2.5 rounded-full"
                style={{ backgroundColor: COLOR_OVERALL }}
              />
              <span className="text-muted-foreground text-xs">Overall</span>
            </div>
            <div className="flex items-center gap-1">
              <span
                className="inline-block size-2.5 rounded-full"
                style={{ backgroundColor: COLOR_TOP_SHARE }}
              />
              <span className="text-muted-foreground text-xs">{topLabel}</span>
            </div>
          </div>
        </div>

        {/* Rows */}
        {visible.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-sm">
            No top-share data available.
          </p>
        ) : (
          visible.map((row) => {
            const dots = [
              {
                value: row.usagePct,
                color: COLOR_OVERALL,
                label: "Overall",
              },
              {
                value: row.topSharePct,
                color: COLOR_TOP_SHARE,
                label: topLabel,
              },
            ];

            return (
              <DumbbellRow
                key={row.species}
                species={row.species}
                dots={dots}
                // Use 100 as the shared max so tracks are always on a 0–100 scale.
                max={100}
                onDotHover={handleDotHover}
                speciesHref={speciesHref}
              />
            );
          })
        )}
      </div>

      {/* Floating sprite tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none fixed z-50"
          style={{
            top: tooltip.rect.top - 8,
            left: tooltip.rect.left + tooltip.rect.width / 2,
            transform: "translate(-50%, -100%)",
          }}
        >
          <DataSpriteTooltip
            species={tooltip.species}
            lines={[
              {
                label: "Overall",
                value: `${tooltip.overallPct.toFixed(1)}%`,
              },
              {
                label: topLabel,
                value: `${tooltip.topSharePct.toFixed(1)}%`,
              },
            ]}
          />
        </div>
      )}
    </DataChartCard>
  );
}
