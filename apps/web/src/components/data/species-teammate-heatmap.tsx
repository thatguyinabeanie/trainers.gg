"use client";

import React from "react";
import Link from "next/link";
import { Dex } from "@pkmn/dex";

import { type TeammateMatrix, type TeammateRow } from "@trainers/supabase";
import { getPokemonSprite } from "@trainers/pokemon/sprites";

import { useIsMobile } from "@/hooks/use-mobile";
import { DataChartCard } from "./data-chart-card";

// =============================================================================
// Types
// =============================================================================

interface SpeciesTeammateHeatmapProps {
  /** Focal species slug — used for cell tooltip phrasing. */
  focalSpecies: string;
  /** Teammate pair-rate rows — used to look up the diagonal pairPct. */
  teammates: TeammateRow[];
  /** Top-N co-occurrence matrix from SpeciesTeammatesResult. */
  matrix: TeammateMatrix;
  /**
   * Returns the drill-down URL for a teammate slug.
   * Used for header sprite links.
   */
  onTeammateHref: (slug: string) => string;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Build the matrix lookup key for a pair (a, b).
 *
 * The RPC keys cells as "a||b" with a < b lexicographically.
 * We sort the two slugs before joining to match that convention.
 */
function cellKey(slugA: string, slugB: string): string {
  const [a, b] = [slugA, slugB].sort();
  return `${a}||${b}`;
}

/**
 * Map a co-occurrence percentage to an OKLCH teal background.
 *
 * Uses the primary teal OKLCH ramp with alpha proportional to pct.
 * Alpha range: 0.08 (trace) → 0.85 (saturated).
 */
function heatmapCellStyle(pct: number): React.CSSProperties {
  if (pct <= 0) return {};
  // Clamp pct to [0, 100] and scale to [0.08, 0.85].
  const clamped = Math.min(100, Math.max(0, pct));
  const alpha = 0.08 + (0.77 * clamped) / 100;
  // OKLCH teal: L=0.62 C=0.14 H=200 (matches --primary token family).
  return { backgroundColor: `oklch(0.62 0.14 200 / ${alpha.toFixed(2)})` };
}

// =============================================================================
// SpeciesTeammateHeatmap
// =============================================================================

/**
 * Focal-scoped teammate co-occurrence heatmap.
 *
 * Renders an N×N CSS grid where rows and columns are the top teammates
 * (from `matrix.order`). Each cell shows how often two teammates appear
 * on the same team as the focal species, shaded by co-occurrence percentage.
 *
 * - Mobile (< 768px): caps to 5×5 using `useIsMobile()`.
 * - Desktop: up to 8×8 (the RPC hard limit).
 * - Diagonal blanked (shown as "—").
 * - Header sprites link to the teammate drill-down via `onTeammateHref`.
 */
export function SpeciesTeammateHeatmap({
  focalSpecies,
  teammates: _teammates,
  matrix,
  onTeammateHref,
}: SpeciesTeammateHeatmapProps) {
  const isMobile = useIsMobile();

  // Mobile cap: 5×5; Desktop: full matrix.order length (≤8).
  const cap = isMobile ? 5 : 8;
  const order = matrix.order.slice(0, cap);

  if (order.length === 0) {
    return (
      <DataChartCard title="Teammate cores">
        <div className="text-muted-foreground flex min-h-40 items-center justify-center p-4 text-sm">
          No co-occurrence data available for this filter combination.
        </div>
      </DataChartCard>
    );
  }

  const n = order.length;

  return (
    <DataChartCard title="Teammate cores">
      <div className="overflow-x-auto p-3">
        {/*
         * CSS grid: (n+1) columns × (n+1) rows.
         * Column 0 = row header sprites; Row 0 = column header sprites.
         * Each cell is at least 40px for tap-target compliance on mobile.
         */}
        <div
          className="grid gap-px"
          style={{
            // Computed grid template — each track is at least 40px for tap targets.
            gridTemplateColumns: `repeat(${n + 1}, minmax(40px, 1fr))`,
            gridTemplateRows: `repeat(${n + 1}, minmax(40px, auto))`,
          }}
        >
          {/* Top-left corner — empty */}
          <div className="bg-card" />

          {/* Column header sprites (row 0, cols 1..n) */}
          {order.map((slug) => {
            const sprite = getPokemonSprite(slug);
            const name = Dex.species.get(slug)?.name ?? slug;
            return (
              <div
                key={`col-header-${slug}`}
                className="bg-card flex items-center justify-center"
              >
                <Link
                  href={onTeammateHref(slug)}
                  aria-label={name}
                  title={name}
                  className="flex items-center justify-center rounded p-0.5 transition-opacity hover:opacity-80"
                >
                  <img
                    src={sprite.url}
                    width={sprite.w}
                    height={sprite.h}
                    alt={name}
                    className={
                      sprite.pixelated
                        ? "[image-rendering:pixelated]"
                        : undefined
                    }
                    // Sprite API-bound pixel dimensions — Tailwind scale doesn't map exactly.
                    style={{ width: 32, height: 32, objectFit: "contain" }}
                  />
                </Link>
              </div>
            );
          })}

          {/* Data rows (rows 1..n) */}
          {order.map((rowSlug, rowIdx) => {
            const rowSprite = getPokemonSprite(rowSlug);
            const rowName = Dex.species.get(rowSlug)?.name ?? rowSlug;
            return (
              <React.Fragment key={`row-${rowSlug}`}>
                {/* Row header sprite */}
                <div
                  key={`row-header-${rowSlug}`}
                  className="bg-card flex items-center justify-center"
                >
                  <Link
                    href={onTeammateHref(rowSlug)}
                    aria-label={rowName}
                    title={rowName}
                    className="flex items-center justify-center rounded p-0.5 transition-opacity hover:opacity-80"
                  >
                    <img
                      src={rowSprite.url}
                      width={rowSprite.w}
                      height={rowSprite.h}
                      alt={rowName}
                      className={
                        rowSprite.pixelated
                          ? "[image-rendering:pixelated]"
                          : undefined
                      }
                      // Sprite API-bound pixel dimensions — Tailwind scale doesn't map exactly.
                      style={{ width: 32, height: 32, objectFit: "contain" }}
                    />
                  </Link>
                </div>

                {/* Data cells for this row */}
                {order.map((colSlug, colIdx) => {
                  const isDiagonal = rowIdx === colIdx;

                  if (isDiagonal) {
                    // Diagonal: blank with a dash.
                    return (
                      <div
                        key={`cell-${rowSlug}-${colSlug}`}
                        className="bg-muted/30 flex items-center justify-center"
                        aria-label="Self — diagonal"
                      >
                        <span className="text-muted-foreground text-xs">—</span>
                      </div>
                    );
                  }

                  // Look up the cell using the sorted "a||b" key.
                  const key = cellKey(rowSlug, colSlug);
                  const cell = matrix.cells[key];
                  const pct = cell?.pct ?? 0;
                  const count = cell?.count ?? 0;
                  const colName = Dex.species.get(colSlug)?.name ?? colSlug;
                  const focalName =
                    Dex.species.get(focalSpecies)?.name ?? focalSpecies;

                  return (
                    <div
                      key={`cell-${rowSlug}-${colSlug}`}
                      className="group relative flex items-center justify-center transition-opacity hover:opacity-90"
                      style={heatmapCellStyle(pct)}
                      // Tooltip via title attribute for simplicity (full tooltip would
                      // require a portal; this keeps the component dependency-free).
                      title={
                        pct > 0
                          ? `${rowName} + ${colName}: ${count} teams (${pct}% of ${focalName} teams)`
                          : `${rowName} + ${colName}: no data`
                      }
                      aria-label={
                        pct > 0
                          ? `${rowName} and ${colName}: ${pct}%`
                          : `${rowName} and ${colName}: no data`
                      }
                    >
                      {pct > 0 && (
                        <span className="text-foreground/80 text-xs font-medium tabular-nums">
                          {pct}%
                        </span>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </DataChartCard>
  );
}
