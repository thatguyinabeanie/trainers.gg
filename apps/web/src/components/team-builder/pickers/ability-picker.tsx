"use client";

import { useState } from "react";

import {
  getAbilityShortDesc,
  getLegalAbilities,
  getValidAbilities,
  legalSetOrPermissive,
  type GameFormat,
} from "@trainers/pokemon";

import { cn } from "@/lib/utils";

import { UsageSparkline } from "../usage-sparkline";
import { useUsageData } from "../use-usage-data";
import { PickerShell } from "./picker-shell";

// =============================================================================
// Types
// =============================================================================

interface AbilityPickerProps {
  value: string | null | undefined;
  species: string;
  format: GameFormat | undefined;
  onPick: (abilityName: string) => void;
  onClose: () => void;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Normalize an ability name to a comparison key.
 *
 * DB ability values may differ in casing or separators from the builder's
 * internal ability names (e.g. "Rough Skin" vs "rough-skin"). Lowercasing and
 * stripping spaces, hyphens, and apostrophes produces a canonical key.
 */
function normalizeAbilityKey(name: string): string {
  return name.toLowerCase().replace(/[\s\-']/g, "");
}

type AbilityUsageEntry = { currentPct: number; series: number[] };

// =============================================================================
// AbilityPicker
// =============================================================================

/**
 * Ability picker scoped to species-legal abilities in the given format.
 * Shows short descriptions under each ability name.
 *
 * When usage data is available (via `useUsageData`), also shows a usage %
 * label and sparkline on each row, and auto-sorts abilities by descending
 * latest usage % (unknown/0 last), falling back to the original order when
 * no usage data is present. Reuses the same map-building pattern as ItemPicker.
 */
export function AbilityPicker({
  value,
  species,
  format,
  onPick,
  onClose,
}: AbilityPickerProps) {
  const [search, setSearch] = useState("");

  // ---------------------------------------------------------------------------
  // Usage data — fetch rollup for this species + format.
  // Build a normalized map: abilityKey → { currentPct, series }.
  // ---------------------------------------------------------------------------

  const { data: usagePeriods } = useUsageData(species || undefined, format);

  const usageMap = new Map<string, AbilityUsageEntry>();
  if (usagePeriods && usagePeriods.length > 0) {
    // Accumulate per-ability series across periods (oldest → newest).
    const seriesAccumulator = new Map<string, number[]>();
    for (const period of usagePeriods) {
      for (const ability of period.abilities) {
        const key = normalizeAbilityKey(ability.value);
        const existing = seriesAccumulator.get(key);
        if (existing) {
          existing.push(ability.pct);
        } else {
          seriesAccumulator.set(key, [ability.pct]);
        }
      }
    }
    // The last period is the most recent; its value is the current usage %.
    for (const [key, series] of seriesAccumulator) {
      const currentPct = series[series.length - 1] ?? 0;
      usageMap.set(key, { currentPct, series });
    }
  }

  const hasUsageData = usageMap.size > 0;

  // ---------------------------------------------------------------------------
  // Format-legal abilities with graceful fallback to species abilities
  // ---------------------------------------------------------------------------

  const abilities = format
    ? Array.from(
        legalSetOrPermissive(getLegalAbilities(species, format.id)) ??
          getValidAbilities(species)
      )
    : getValidAbilities(species);

  // ---------------------------------------------------------------------------
  // Search + sort pipeline
  // ---------------------------------------------------------------------------

  const filtered = abilities.filter((a) =>
    a.toLowerCase().includes(search.toLowerCase())
  );

  // When usage data is present, sort descending by latest usage % (unknown/0
  // last). Falls back to original list order when no usage data is available.
  const sorted = hasUsageData
    ? [...filtered].sort((a, b) => {
        const au = usageMap.get(normalizeAbilityKey(a))?.currentPct ?? 0;
        const bu = usageMap.get(normalizeAbilityKey(b))?.currentPct ?? 0;
        if (bu !== au) return bu - au; // higher usage first
        return a.localeCompare(b); // tie-break alphabetically
      })
    : filtered;

  return (
    <PickerShell
      title="Ability"
      onClose={onClose}
      width="480px"
      search={{
        value: search,
        onChange: setSearch,
        placeholder: "Search abilities…",
      }}
    >
      {/* Ability list */}
      <div className="max-h-48 overflow-y-auto p-1">
        {sorted.map((ability) => {
          const desc = getAbilityShortDesc(ability);
          const isSelected = ability === value;
          const usageEntry = usageMap.get(normalizeAbilityKey(ability));
          const usagePct = usageEntry?.currentPct;
          const usageSeries = usageEntry?.series;

          return (
            <button
              key={ability}
              type="button"
              onClick={() => {
                onPick(ability);
                onClose();
              }}
              className={cn(
                "flex w-full flex-col rounded px-3 py-2 text-left transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                isSelected && "bg-accent text-accent-foreground"
              )}
            >
              <div className="flex min-w-0 items-center gap-1.5">
                <span
                  className={cn(
                    "min-w-0 flex-1 text-sm font-medium",
                    isSelected && "font-semibold"
                  )}
                >
                  {ability}
                </span>
                {/* Usage % — tabular-nums, muted when 0/unknown */}
                {hasUsageData && (
                  <span
                    className={cn(
                      "shrink-0 font-mono text-xs tabular-nums",
                      usagePct != null && usagePct > 0
                        ? "text-foreground"
                        : "text-muted-foreground/40"
                    )}
                  >
                    {usagePct != null && usagePct > 0 ? `${usagePct}%` : "—"}
                  </span>
                )}
                {/* Sparkline — only when there are ≥2 data points */}
                {usageSeries && usageSeries.length >= 2 && (
                  <UsageSparkline
                    points={usageSeries}
                    ariaLabel={`${ability} usage trend`}
                  />
                )}
              </div>
              {desc && (
                <span className="text-muted-foreground mt-0.5 text-xs leading-tight">
                  {desc}
                </span>
              )}
            </button>
          );
        })}

        {sorted.length === 0 && (
          <p className="text-muted-foreground py-4 text-center text-sm">
            No abilities found
          </p>
        )}
      </div>
    </PickerShell>
  );
}
