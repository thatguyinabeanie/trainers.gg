"use client";

import { getPokemonSprite } from "@trainers/pokemon/sprites";

// =============================================================================
// Types
// =============================================================================

export interface SpriteTooltipLine {
  label: string;
  value: string;
}

interface DataSpriteTooltipProps {
  /** Species slug used to resolve the sprite (e.g. "Koraidon"). */
  species: string;
  /**
   * Display name for the species.
   * Defaults to `species` when omitted — Phase 3 will add pretty-name resolution.
   */
  name?: string;
  /** Stat lines rendered below the sprite + name. */
  lines: SpriteTooltipLine[];
}

// =============================================================================
// DataSpriteTooltip
// =============================================================================

/**
 * Presentational tooltip for /data Meta Explorer charts.
 *
 * Renders a species sprite + name + a list of stat lines.
 * Container styling matches the line-chart tooltip:
 *   `bg-popover border-border rounded-md border px-2 py-1 text-xs shadow-sm`
 *
 * Uses `getPokemonSprite(species)` → `{ url, w, h, pixelated }`.
 * Applies `[image-rendering:pixelated]` when `sprite.pixelated` is true.
 */
export function DataSpriteTooltip({
  species,
  name,
  lines,
}: DataSpriteTooltipProps) {
  const sprite = getPokemonSprite(species);
  const displayName = name ?? species;

  return (
    <div className="bg-popover border-border rounded-md border px-2 py-1 text-xs shadow-sm">
      {/* Sprite + name row */}
      <div className="mb-1 flex items-center gap-1.5">
        <img
          src={sprite.url}
          width={sprite.w}
          height={sprite.h}
          alt={displayName}
          className={
            sprite.pixelated ? "[image-rendering:pixelated]" : undefined
          }
          style={{ width: 32, height: 32, objectFit: "contain" }}
        />
        <span className="font-semibold">{displayName}</span>
      </div>

      {/* Stat lines */}
      {lines.map((line) => (
        <div key={line.label} className="flex justify-between gap-4">
          <span className="text-muted-foreground">{line.label}</span>
          <span className="font-medium tabular-nums">{line.value}</span>
        </div>
      ))}
    </div>
  );
}
