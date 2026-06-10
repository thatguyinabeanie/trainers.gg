"use client";

import { useState } from "react";

import { useIsMobile } from "@/hooks/use-mobile";

import { DataChartCard } from "./data-chart-card";
import { DataSpriteTooltip } from "./data-sprite-tooltip";
import {
  SOURCE_COLORS,
  SOURCE_LABELS,
  type SourceComparisonRow,
} from "./data-shared";
import { DumbbellRow } from "./usage-dumbbell";

// =============================================================================
// Constants
// =============================================================================

const SOURCES = ["rk9", "limitless", "trainers.gg"] as const;
type Source = (typeof SOURCES)[number];

/** Top-N row cap: 15 on mobile, 30 on desktop. */
const TOP_N_MOBILE = 15;
const TOP_N_DESKTOP = 30;

const CAPTION = "Always compares all sources — ignores the Source filter.";

// =============================================================================
// Types
// =============================================================================

interface UsageSourceDumbbellProps {
  rows: SourceComparisonRow[];
  /** Optional href generator for species names (Phase 3). No-op when absent. */
  speciesHref?: (species: string) => string;
}

// Tooltip anchor state
interface TooltipState {
  species: string;
  source: Source;
  usagePct: number;
  players: number;
  rect: DOMRect;
}

// =============================================================================
// UsageSourceDumbbell
// =============================================================================

/**
 * Chart #3 — Source Comparison Dumbbell.
 *
 * Renders one dumbbell row per species with up to 3 dots (rk9 / limitless /
 * trainers.gg). Dots are only rendered for sources that have data for that
 * species.
 *
 * Props:
 * - `rows`: `SourceComparisonRow[]` already grouped by `groupBySource()`.
 *   The component sorts defensively by `overallPeak` desc and caps to
 *   top 15 (mobile) or top 30 (desktop).
 *
 * Ignores the Source filter by design — this chart's underlying RPC
 * (`get_usage_by_source`) has no source param. The caption communicates this.
 *
 * Wrapped in `DataChartCard` with the caption slot.
 */
export function UsageSourceDumbbell({
  rows,
  speciesHref,
}: UsageSourceDumbbellProps) {
  const isMobile = useIsMobile();
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  // Defensive sort by overallPeak desc (groupBySource already sorts, but we
  // don't rely on caller ordering per plan spec).
  const sorted = [...rows].sort(
    (a, b) =>
      b.overallPeak - a.overallPeak || a.species.localeCompare(b.species)
  );

  const topN = isMobile ? TOP_N_MOBILE : TOP_N_DESKTOP;
  const visible = sorted.slice(0, topN);

  // Shared max across all visible rows so all tracks are on the same scale.
  const globalMax =
    visible.length > 0 ? Math.max(...visible.map((r) => r.overallPeak)) : 100;

  function handleDotHover(
    dot: { value: number; color: string; label: string } | null,
    rect: DOMRect | null,
    species: string
  ) {
    if (!dot || !rect) {
      setTooltip(null);
      return;
    }
    // The dot's label is the source key.
    const source = dot.label as Source;
    const sourceData = rows.find((r) => r.species === species)?.bySource[
      source
    ];
    if (!sourceData) return;

    setTooltip({
      species,
      source,
      usagePct: sourceData.usagePct,
      players: sourceData.players,
      rect,
    });
  }

  return (
    <DataChartCard title="Source Comparison" caption={CAPTION}>
      <div className="flex flex-col gap-0 px-4 py-3">
        {/* Column header */}
        <div className="mb-2 flex items-center gap-3">
          {/* Spacer matching the sprite+name left cell */}
          <div className="w-32 shrink-0" />
          {/* Legend dots */}
          <div className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-1">
            {SOURCES.map((source) => (
              <div key={source} className="flex items-center gap-1">
                <span
                  className="inline-block size-2.5 rounded-full"
                  style={{ backgroundColor: SOURCE_COLORS[source] }}
                />
                <span className="text-muted-foreground text-xs">
                  {SOURCE_LABELS[source]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Dumbbell rows */}
        {visible.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-sm">
            No source comparison data available.
          </p>
        ) : (
          visible.map((row) => {
            // Build dots only for sources that have data for this species.
            const dots = SOURCES.flatMap((source) => {
              const data = row.bySource[source];
              if (!data) return [];
              return [
                {
                  value: data.usagePct,
                  color: SOURCE_COLORS[source],
                  label: source,
                },
              ];
            });

            return (
              <DumbbellRow
                key={row.species}
                species={row.species}
                dots={dots}
                max={globalMax}
                onDotHover={handleDotHover}
                speciesHref={speciesHref}
              />
            );
          })
        )}
      </div>

      {/* Floating tooltip — rendered via portal-lite approach using fixed positioning */}
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
                label: SOURCE_LABELS[tooltip.source],
                value: `${tooltip.usagePct.toFixed(1)}%`,
              },
              {
                label: "Players",
                value: tooltip.players.toLocaleString(),
              },
            ]}
          />
        </div>
      )}
    </DataChartCard>
  );
}
