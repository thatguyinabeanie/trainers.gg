"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Treemap, ResponsiveContainer } from "recharts";

import { type PipelineSpeciesData } from "@trainers/supabase";
import { getPokemonSprite } from "@trainers/pokemon/sprites";

import { assignColor } from "./usage-series";
import { DataSpriteTooltip } from "./data-sprite-tooltip";

// =============================================================================
// Constants
// =============================================================================

/** Species below this usage % are collapsed into the "Others" tile. */
const USAGE_THRESHOLD = 1;

/** Minimum tile area (width × height in layout units) before showing the sprite. */
const SPRITE_MIN_AREA = 2400;

/** Minimum tile area before showing the species name label. */
const LABEL_MIN_AREA = 3600;

/** Cap species count on narrow viewports so tiles stay tappable (~top 30). */
const MOBILE_CAP = 30;

/** Viewport width below which the mobile cap applies (matches useIsMobile breakpoint). */
const MOBILE_BREAKPOINT = 768;

// =============================================================================
// Types
// =============================================================================

interface UsageTreemapProps {
  /** Pipeline species data — the full field. */
  data: PipelineSpeciesData[];
  /**
   * Phase 3 drill-down: when provided, tiles are wrapped in links.
   * Absent now (whole-field non-interactive chart per Decision 5).
   */
  speciesHref?: (species: string) => string;
}

/** recharts Treemap node shape after layout. */
interface TreemapNode {
  x: number;
  y: number;
  width: number;
  height: number;
  // Our custom fields injected via the `data` array
  species: string;
  usagePct: number;
  rank: number;
  isOthers?: boolean;
  othersCount?: number;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Partition pipeline data into above-threshold species and the "Others" tail.
 *
 * - Species at exactly the threshold are retained (consistent with filterByThreshold).
 * - Returns the above-threshold list (sorted by usagePct desc) and a muted
 *   "Others" entry aggregating the tail. The others entry is omitted when the
 *   tail is empty.
 * - Applies MOBILE_CAP when the window width is below MOBILE_BREAKPOINT so that
 *   tiles remain tappable on phones.
 */
function partitionData(allData: PipelineSpeciesData[]): {
  treemapData: Array<{
    name: string;
    size: number;
    species: string;
    usagePct: number;
    rank: number;
    isOthers?: boolean;
    othersCount?: number;
  }>;
  othersCount: number;
} {
  // Sort by usagePct desc for deterministic ordering.
  const sorted = [...allData].sort(
    (a, b) => b.usagePct - a.usagePct || a.species.localeCompare(b.species)
  );

  const aboveThreshold = sorted.filter((s) => s.usagePct >= USAGE_THRESHOLD);
  const belowThreshold = sorted.filter((s) => s.usagePct < USAGE_THRESHOLD);

  // Apply mobile cap: if the viewport is narrow, keep only the top-N species.
  const isMobile =
    typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT;
  const capped = isMobile
    ? aboveThreshold.slice(0, MOBILE_CAP)
    : aboveThreshold;

  // Species that fall off the mobile cap also go into "Others".
  const mobileOverflow = isMobile ? aboveThreshold.slice(MOBILE_CAP) : [];
  const othersCount = belowThreshold.length + mobileOverflow.length;

  const treemapData: Array<{
    name: string;
    size: number;
    species: string;
    usagePct: number;
    rank: number;
    isOthers?: boolean;
    othersCount?: number;
  }> = capped.map((s) => ({
    name: s.species,
    // recharts Treemap sizes tiles by the `size` field.
    size: s.usagePct,
    species: s.species,
    usagePct: s.usagePct,
    rank: s.rank,
  }));

  if (othersCount > 0) {
    // Aggregate tail usagePct for proportional tile size.
    const othersUsage =
      belowThreshold.reduce((acc, s) => acc + s.usagePct, 0) +
      mobileOverflow.reduce((acc, s) => acc + s.usagePct, 0);
    treemapData.push({
      name: `Others (${othersCount} species)`,
      size: Math.max(othersUsage, 0.5), // minimum size so the tile is visible
      species: "__others__",
      usagePct: othersUsage,
      rank: 999,
      isOthers: true,
      othersCount,
    });
  }

  return { treemapData, othersCount };
}

// =============================================================================
// Custom tile renderer
// =============================================================================

interface TileProps {
  root?: TreemapNode;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  // Fields passed through from our data array
  name?: string;
  species?: string;
  usagePct?: number;
  rank?: number;
  isOthers?: boolean;
  othersCount?: number;
  speciesHref?: (species: string) => string;
  onHover?: (
    node: { species: string; usagePct: number; rank: number } | null
  ) => void;
  /** Called when the user clicks a non-Others tile (Phase 3 navigation). */
  onNavigate?: (species: string) => void;
}

function CustomTile(props: TileProps) {
  const {
    x = 0,
    y = 0,
    width = 0,
    height = 0,
    species = "",
    usagePct = 0,
    rank = 0,
    isOthers = false,
    name = "",
    speciesHref,
    onHover,
    onNavigate,
  } = props;

  if (!width || !height) return null;

  const area = width * height;
  const fill = isOthers ? "var(--muted-foreground)" : assignColor(species);

  // Sprite rendering — only for tiles above the area threshold.
  // sprite.w / sprite.h are API-bound pixel props from getPokemonSprite; not Tailwind px.
  const showSprite = !isOthers && area >= SPRITE_MIN_AREA;
  const showLabel = area >= LABEL_MIN_AREA;

  // Cap sprite to 80% of the tile dimension, at most 48px.
  const spriteSize = showSprite
    ? Math.min(Math.floor(Math.min(width, height) * 0.8), 48)
    : 0;
  const sprite = showSprite ? getPokemonSprite(species) : null;

  const handleMouseEnter = () => {
    if (!isOthers && onHover) {
      onHover({ species, usagePct, rank });
    }
  };
  const handleMouseLeave = () => {
    if (onHover) onHover(null);
  };

  // Clamp font size between 8–12px proportional to tile width.
  const fontSize = Math.max(8, Math.min(12, Math.floor(width / 8)));

  // A tile is navigable when: speciesHref is provided, not an Others tile, and
  // species is a real slug (recharts also renders the root node with empty species).
  const isNavigable = Boolean(speciesHref && !isOthers && species);

  const handleClick = () => {
    if (isNavigable && onNavigate) {
      onNavigate(species);
    }
  };

  const inner = (
    <g
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={isNavigable ? handleClick : undefined}
      role={isNavigable ? "link" : undefined}
      aria-label={isNavigable ? `View ${species} details` : undefined}
      tabIndex={isNavigable ? 0 : undefined}
      onKeyDown={
        isNavigable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") handleClick();
            }
          : undefined
      }
      style={{ cursor: isNavigable ? "pointer" : "default" }}
    >
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fill}
        opacity={isOthers ? 0.45 : 1}
        style={{ transition: "opacity 0.15s" }}
        rx={2}
      />

      {/* Sprite — rendered only above area threshold */}
      {showSprite && sprite && (
        <image
          href={sprite.url}
          // Centre the sprite within the tile.
          x={x + (width - spriteSize) / 2}
          y={y + (height - spriteSize) / 2 - (showLabel ? fontSize / 2 + 2 : 0)}
          width={spriteSize}
          height={spriteSize}
          aria-hidden="true"
          style={sprite.pixelated ? { imageRendering: "pixelated" } : undefined}
        />
      )}

      {/* Name label — shown on large tiles or "Others" */}
      {(showLabel || isOthers) && (
        <text
          x={x + width / 2}
          y={showSprite ? y + height / 2 + spriteSize / 2 + 2 : y + height / 2}
          textAnchor="middle"
          dominantBaseline={showSprite ? "hanging" : "middle"}
          style={{
            fontSize,
            fill: "white",
            fontWeight: 600,
            pointerEvents: "none",
          }}
        >
          {isOthers ? name : species}
        </text>
      )}
    </g>
  );

  return inner;
}

// =============================================================================
// UsageTreemap
// =============================================================================

/**
 * Treemap chart showing proportional meta-share for all species in the field.
 *
 * - Species below 1% usage are collapsed into a single muted "Others (N species)" tile.
 * - On narrow viewports (~<768px), only the top 30 species are shown (tiles remain tappable).
 * - `speciesHref` is reserved for Phase 3 drill-down; when absent the chart is non-interactive.
 * - Tooltip shows sprite + name + usage % + rank via DataSpriteTooltip.
 *
 * Wrap in DataChartCard at the call-site.
 */
export function UsageTreemap({ data, speciesHref }: UsageTreemapProps) {
  const router = useRouter();
  const [hoveredSpecies, setHoveredSpecies] = useState<{
    species: string;
    usagePct: number;
    rank: number;
  } | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const handleNavigate = speciesHref
    ? (species: string) => router.push(speciesHref(species))
    : undefined;

  if (!data || data.length === 0) {
    return (
      <div className="text-muted-foreground flex h-64 items-center justify-center text-sm">
        No species data available.
      </div>
    );
  }

  const { treemapData } = partitionData(data);

  if (treemapData.length === 0) {
    return (
      <div className="text-muted-foreground flex h-64 items-center justify-center text-sm">
        No species above threshold.
      </div>
    );
  }

  return (
    <div
      className="relative w-full"
      data-treemap-container
      onMouseMove={(e) => {
        if (hoveredSpecies) {
          const rect = e.currentTarget.getBoundingClientRect();
          setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }
      }}
    >
      <ResponsiveContainer width="100%" height={420}>
        <Treemap
          data={treemapData}
          dataKey="size"
          content={
            // recharts clones this element and injects per-tile nodeProps
            // (x/y/width/height/payload) that CustomTile reads as optional.
            // Widen through `unknown` because recharts' content type doesn't
            // express the cloneElement injection.
            (
              <CustomTile
                speciesHref={speciesHref}
                onHover={(node) => setHoveredSpecies(node)}
                onNavigate={handleNavigate}
              />
            ) as unknown as React.ReactElement
          }
          isAnimationActive={false}
        />
      </ResponsiveContainer>

      {/* Floating tooltip — DataSpriteTooltip with sprite + name + usage % + rank */}
      {hoveredSpecies && hoveredSpecies.species !== "__others__" && (
        <div
          className="pointer-events-none absolute z-10"
          style={{
            left: Math.min(tooltipPos.x + 12, 9999),
            top: Math.max(tooltipPos.y - 80, 4),
          }}
        >
          <DataSpriteTooltip
            species={hoveredSpecies.species}
            lines={[
              {
                label: "Usage",
                value: `${hoveredSpecies.usagePct.toFixed(1)}%`,
              },
              { label: "Rank", value: `#${hoveredSpecies.rank}` },
            ]}
          />
        </div>
      )}
    </div>
  );
}
