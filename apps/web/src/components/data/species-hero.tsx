"use client";

import Image from "next/image";
import Link from "next/link";

import { getPokemonSprite } from "@trainers/pokemon/sprites";
import { getSpeciesTypes } from "@trainers/pokemon";
import { getFormatLabel } from "@trainers/pokemon";
import { type SpeciesUsagePeriod } from "@trainers/supabase";

import { cn } from "@/lib/utils";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { SpeciesSwitcher } from "./species-switcher";
import { coerceFormat, coerceSource, coerceMinPlayers } from "./usage-filters";

// =============================================================================
// Type colors — maps Pokemon type names to display colors
// =============================================================================

const TYPE_COLORS: Record<string, string> = {
  Normal: "bg-stone-400/20 text-stone-700 dark:text-stone-300",
  Fire: "bg-orange-400/20 text-orange-700 dark:text-orange-300",
  Water: "bg-blue-400/20 text-blue-700 dark:text-blue-300",
  Electric: "bg-yellow-400/20 text-yellow-700 dark:text-yellow-300",
  Grass: "bg-green-400/20 text-green-700 dark:text-green-300",
  Ice: "bg-cyan-400/20 text-cyan-700 dark:text-cyan-300",
  Fighting: "bg-red-400/20 text-red-700 dark:text-red-300",
  Poison: "bg-purple-400/20 text-purple-700 dark:text-purple-300",
  Ground: "bg-amber-400/20 text-amber-700 dark:text-amber-300",
  Flying: "bg-sky-400/20 text-sky-700 dark:text-sky-300",
  Psychic: "bg-pink-400/20 text-pink-700 dark:text-pink-300",
  Bug: "bg-lime-400/20 text-lime-700 dark:text-lime-300",
  Rock: "bg-yellow-600/20 text-yellow-800 dark:text-yellow-200",
  Ghost: "bg-violet-400/20 text-violet-700 dark:text-violet-300",
  Dragon: "bg-indigo-400/20 text-indigo-700 dark:text-indigo-300",
  Dark: "bg-slate-600/20 text-slate-700 dark:text-slate-300",
  Steel: "bg-zinc-400/20 text-zinc-700 dark:text-zinc-300",
  Fairy: "bg-rose-300/20 text-rose-700 dark:text-rose-300",
  Stellar: "bg-teal-400/20 text-teal-700 dark:text-teal-300",
};

// =============================================================================
// Types
// =============================================================================

interface FilterBarProps {
  format: string;
  source: string;
  minPlayers: number;
  onFormatChange: (format: string) => void;
  onSourceChange: (source: string) => void;
  onMinPlayersChange: (n: number) => void;
}

interface SpeciesHeroProps {
  species: string;
  displayName: string;
  /** Latest usage detail bucket — used for headline stats. */
  latestDetail: SpeciesUsagePeriod | null;
  /** Active format ID. */
  format: string;
  /** Active source filter. */
  source: string;
  /** Active minPlayers filter. */
  minPlayers: number;
  /** All species options for the switcher. */
  speciesOptions: { slug: string; name: string }[];
  /** Current filter query string (for breadcrumb links + switcher navigation). */
  filterQuery: string;
  /** Called with new slug when the switcher selects a different species. */
  onSpeciesSelect: (slug: string) => void;
  /** Compact filter bar callbacks. */
  filterBarProps: FilterBarProps;
}

// =============================================================================
// SpeciesHero
// =============================================================================

/**
 * Hero header for the species drill-down page.
 *
 * Renders: sprite, display name, type chips, headline usage stats,
 * breadcrumb, species switcher, and compact filter bar.
 */
export function SpeciesHero({
  species,
  displayName,
  latestDetail,
  format,
  source,
  minPlayers,
  speciesOptions,
  filterQuery,
  onSpeciesSelect,
  filterBarProps,
}: SpeciesHeroProps) {
  const sprite = getPokemonSprite(species);
  const types = getSpeciesTypes(species);
  const formatLabel = getFormatLabel(format);

  // Breadcrumb back link — /data preserving active filters.
  const dataHref = `/data${filterQuery ? `?${filterQuery}` : ""}`;

  // Headline stat components.
  const usagePct = latestDetail?.usagePct ?? null;
  const rank = latestDetail?.rank ?? null;
  const change7d = latestDetail?.usageChange7d ?? null;
  const change30d = latestDetail?.usageChange30d ?? null;

  return (
    <div className="mb-6 flex flex-col gap-3">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href={dataHref} />}>
              Data
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href={dataHref} />}>
              {formatLabel}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{displayName}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Hero content row */}
      <div className="flex flex-wrap items-start gap-4">
        {/* Sprite */}
        <div className="bg-muted/30 shrink-0 rounded-lg p-1">
          {/* sprite w/h are API-bound pixel props from getPokemonSprite */}
          <Image
            src={sprite.url}
            alt={displayName}
            width={sprite.w}
            height={sprite.h}
            className={cn(
              "size-20 object-contain",
              sprite.pixelated && "[image-rendering:pixelated]"
            )}
            unoptimized={sprite.pixelated}
          />
        </div>

        {/* Name + types + stats */}
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold sm:text-4xl">{displayName}</h1>
            {/* Type chips */}
            <div className="flex flex-wrap gap-1">
              {types.map((type) => (
                <span
                  key={type}
                  className={cn(
                    "rounded px-1.5 py-0.5 text-xs font-medium",
                    TYPE_COLORS[type] ?? "bg-muted/50 text-muted-foreground"
                  )}
                >
                  {type}
                </span>
              ))}
            </div>
          </div>

          {/* Headline usage stats */}
          {usagePct !== null && rank !== null ? (
            <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
              <span className="text-foreground font-semibold">
                {usagePct.toFixed(1)}% usage
              </span>
              <span>·</span>
              <span>Rank #{rank}</span>
              {change7d !== null && (
                <>
                  <span>·</span>
                  <span
                    className={
                      change7d >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
                    }
                  >
                    {change7d >= 0 ? "▲" : "▼"} {Math.abs(change7d).toFixed(1)}{" "}
                    (7d)
                  </span>
                </>
              )}
              {change30d !== null && (
                <>
                  <span>·</span>
                  <span
                    className={
                      change30d >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
                    }
                  >
                    {change30d >= 0 ? "▲" : "▼"}{" "}
                    {Math.abs(change30d).toFixed(1)} (30d)
                  </span>
                </>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              No usage data for {displayName} in {formatLabel} yet.
            </p>
          )}

          {/* Context line */}
          <p className="text-muted-foreground text-xs">
            {formatLabel}
            {source !== "all" && ` · ${source}`}
            {minPlayers > 0 && ` · ${minPlayers}+ players`}
          </p>
        </div>

        {/* Species switcher */}
        <div className="shrink-0">
          <SpeciesSwitcher
            currentSpecies={species}
            options={speciesOptions}
            onSelect={onSpeciesSelect}
          />
        </div>
      </div>

      {/* Compact filter bar */}
      <CompactFilterBar {...filterBarProps} />
    </div>
  );
}

// =============================================================================
// CompactFilterBar
// =============================================================================

/**
 * Compact filter controls for the drill-down hero.
 *
 * Format, source, and min-players shown as small inline selects.
 * Full-width stacked on mobile.
 */
function CompactFilterBar({
  format,
  source,
  minPlayers,
  onFormatChange,
  onSourceChange,
  onMinPlayersChange,
}: FilterBarProps) {
  const validFormat = coerceFormat(format);
  const validSource = coerceSource(source);
  const validMinPlayers = coerceMinPlayers(String(minPlayers));

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Format select */}
      <select
        value={validFormat}
        onChange={(e) => onFormatChange(e.target.value)}
        className="bg-muted/50 border-border h-8 rounded-md border px-2 text-xs focus:ring-1 focus:outline-none"
        aria-label="Format"
      >
        {/* Format options — the coercers keep any out-of-range value as the default */}
        <optgroup label="Champions">
          <option value="gen9championsvgc2026regma">Champions M-A</option>
          <option value="gen9championsvgc2026regl">Champions Reg L</option>
        </optgroup>
        <optgroup label="VGC">
          <option value="gen9vgc2026regi">VGC 2026 Reg I</option>
          <option value="gen9vgc2026regh">VGC 2026 Reg H</option>
          <option value="gen9vgc2026regg">VGC 2026 Reg G</option>
          <option value="gen9vgc2026regf">VGC 2026 Reg F</option>
        </optgroup>
      </select>

      {/* Source select */}
      <select
        value={validSource}
        onChange={(e) => onSourceChange(e.target.value)}
        className="bg-muted/50 border-border h-8 rounded-md border px-2 text-xs focus:ring-1 focus:outline-none"
        aria-label="Source"
      >
        <option value="all">All sources</option>
        <option value="rk9">RK9</option>
        <option value="limitless">Limitless</option>
        <option value="trainers.gg">trainers.gg</option>
      </select>

      {/* Min players input */}
      <label className="text-muted-foreground flex items-center gap-1 text-xs">
        <span>Min players</span>
        <input
          type="number"
          min={0}
          step={10}
          value={validMinPlayers}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10);
            if (!Number.isNaN(n) && n >= 0) onMinPlayersChange(n);
          }}
          className="bg-muted/50 border-border h-8 w-20 rounded-md border px-2 text-xs focus:ring-1 focus:outline-none"
          aria-label="Minimum players per event"
        />
      </label>
    </div>
  );
}
