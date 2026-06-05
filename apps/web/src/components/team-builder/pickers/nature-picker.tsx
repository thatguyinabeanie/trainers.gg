"use client";

import { useState } from "react";

import { getValidNatures, NATURE_EFFECTS, type GameFormat } from "@trainers/pokemon";

import { cn } from "@/lib/utils";

import { UsageSparkline } from "../usage-sparkline";
import { useUsageData } from "../use-usage-data";
import { type StatKey, STAT_LABELS } from "../stat-types";
import { PickerShell } from "./picker-shell";

// =============================================================================
// Types
// =============================================================================

interface NaturePickerProps {
  value: string;
  /** Optional — when provided, enables usage % display per nature. */
  species?: string | undefined;
  /** Optional — when provided alongside species, fetches per-format usage. */
  format?: GameFormat | undefined;
  onPick: (nature: string) => void;
  onClose: () => void;
}

type NatureUsageEntry = { currentPct: number; series: number[] };

interface NatureGroup {
  label: string;
  boost: StatKey | null;
  natures: string[];
}

// =============================================================================
// Constants
// =============================================================================

const HIDDEN_NEUTRAL_NATURES = new Set(["Hardy", "Docile", "Bashful", "Quirky"]);

const BOOST_GROUP_ORDER: StatKey[] = [
  "attack",
  "defense",
  "specialAttack",
  "specialDefense",
  "speed",
];

// =============================================================================
// Helpers
// =============================================================================

/**
 * Normalize a nature name to a comparison key.
 *
 * DB nature values may differ in casing from the builder's internal nature
 * names. Lowercasing produces a canonical key for both sides.
 */
function normalizeNatureKey(name: string): string {
  return name.toLowerCase();
}

/**
 * @param natures - Nature names to group. Filtered for visibility and grouped
 *   by boost stat.
 * @param preserveOrder - When true, the natures within each group retain the
 *   input order (used when the caller has already sorted by usage %). When
 *   false (default), each group is sorted alphabetically.
 */
function buildGroups(
  natures: string[],
  preserveOrder = false
): NatureGroup[] {
  const visible = natures.filter((n) => !HIDDEN_NEUTRAL_NATURES.has(n));
  const neutrals: string[] = [];
  const byBoost = new Map<StatKey, string[]>();

  for (const nature of visible) {
    const effect = NATURE_EFFECTS[nature];
    if (!effect?.boost) {
      neutrals.push(nature);
      continue;
    }
    const list = byBoost.get(effect.boost) ?? [];
    list.push(nature);
    byBoost.set(effect.boost, list);
  }

  const sortOrKeep = (list: string[]) =>
    preserveOrder ? list.slice() : list.slice().sort((a, b) => a.localeCompare(b));

  const groups: NatureGroup[] = [];

  if (neutrals.length > 0) {
    groups.push({
      label: "Neutral",
      boost: null,
      natures: sortOrKeep(neutrals),
    });
  }

  for (const stat of BOOST_GROUP_ORDER) {
    const list = byBoost.get(stat);
    if (!list || list.length === 0) continue;
    groups.push({
      label: `+ ${STAT_LABELS[stat]}`,
      boost: stat,
      natures: sortOrKeep(list),
    });
  }

  return groups;
}

// =============================================================================
// NaturePicker
// =============================================================================

/**
 * Searchable nature picker grouped by boost stat.
 * Shows only Serious for neutral (hides the 4 redundant Hardy/Docile/etc.).
 *
 * When optional `species` and `format` are provided, fetches per-Pokemon nature
 * usage rollups (via `useUsageData`) and:
 *   - Shows a usage % label and sparkline (when ≥2 periods) on each row.
 *   - Within each group, re-sorts natures by descending latest usage % (0 last),
 *     falling back to alphabetical order when no usage data is available.
 *
 * Nature usage data is currently sparse (only RK9 Champions), so most natures
 * will show 0/unknown — rendered gracefully as a muted dash.
 */
export function NaturePicker({
  value,
  species,
  format,
  onPick,
  onClose,
}: NaturePickerProps) {
  const [search, setSearch] = useState("");

  // ---------------------------------------------------------------------------
  // Usage data — fetch rollup for this species + format.
  // Build a normalized map: natureKey → { currentPct, series }.
  // ---------------------------------------------------------------------------

  const { data: usagePeriods } = useUsageData(species, format);

  const usageMap = new Map<string, NatureUsageEntry>();
  if (usagePeriods && usagePeriods.length > 0) {
    // Accumulate per-nature series across periods (oldest → newest).
    const seriesAccumulator = new Map<string, number[]>();
    for (const period of usagePeriods) {
      for (const nature of period.natures) {
        const key = normalizeNatureKey(nature.value);
        const existing = seriesAccumulator.get(key);
        if (existing) {
          existing.push(nature.pct);
        } else {
          seriesAccumulator.set(key, [nature.pct]);
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
  // Search + sort pipeline
  // ---------------------------------------------------------------------------

  const allNatures = getValidNatures();
  const filtered = allNatures.filter((n) =>
    n.toLowerCase().includes(search.toLowerCase())
  );

  // When usage data is present, re-sort within groups by descending usage %.
  // buildGroups already applies alphabetical sort within each group; we
  // override that sort here so high-usage natures bubble up.
  const sortedForGroups = hasUsageData
    ? [...filtered].sort((a, b) => {
        const au = usageMap.get(normalizeNatureKey(a))?.currentPct ?? 0;
        const bu = usageMap.get(normalizeNatureKey(b))?.currentPct ?? 0;
        if (bu !== au) return bu - au; // higher usage first
        return a.localeCompare(b); // tie-break alphabetically
      })
    : filtered;

  // Pass preserveOrder=true when usage-sorted so buildGroups doesn't re-sort
  // alphabetically and undo the usage-based ordering.
  const groups = buildGroups(sortedForGroups, hasUsageData);

  function handleSelect(nature: string) {
    onPick(nature);
    onClose();
  }

  return (
    <PickerShell
      title="Nature"
      onClose={onClose}
      width="420px"
      search={{
        value: search,
        onChange: setSearch,
        placeholder: "Search natures…",
      }}
    >
      {/* Grouped list */}
      <div className="max-h-[520px] overflow-y-auto p-1">
        {groups.map((group) => (
          <div key={group.label} className="flex flex-col">
            <div className="text-muted-foreground px-2 pt-1.5 pb-0.5 text-xs font-medium tracking-wider uppercase">
              {group.label}
            </div>
            {group.natures.map((nature) => {
              const effect = NATURE_EFFECTS[nature];
              const isNeutral = !effect?.boost;
              const isSelected = nature === value;
              const usageEntry = usageMap.get(normalizeNatureKey(nature));
              const usagePct = usageEntry?.currentPct;
              const usageSeries = usageEntry?.series;

              return (
                <button
                  key={nature}
                  type="button"
                  onClick={() => handleSelect(nature)}
                  className={cn(
                    "flex items-center justify-between rounded px-2 py-1.5 text-left text-sm transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    isSelected && "bg-accent text-accent-foreground font-medium"
                  )}
                >
                  <span className={cn(isNeutral && "text-muted-foreground")}>
                    {nature}
                  </span>
                  <span className="flex items-center gap-1 font-mono text-xs">
                    {/* Boost/reduce stat badges */}
                    {isNeutral ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <>
                        {effect?.boost && (
                          <span className="rounded bg-green-100 px-1.5 py-0.5 font-semibold uppercase tracking-wide text-green-700 dark:bg-green-900/40 dark:text-green-400">
                            +{STAT_LABELS[effect.boost]}
                          </span>
                        )}
                        {effect?.reduce && (
                          <span className="rounded bg-red-100 px-1.5 py-0.5 font-semibold uppercase tracking-wide text-red-600 dark:bg-red-900/40 dark:text-red-400">
                            −{STAT_LABELS[effect.reduce]}
                          </span>
                        )}
                      </>
                    )}
                    {/* Usage % — tabular-nums, muted when 0/unknown */}
                    {hasUsageData && (
                      <span
                        className={cn(
                          "tabular-nums",
                          usagePct != null && usagePct > 0
                            ? "text-foreground"
                            : "text-muted-foreground/40"
                        )}
                      >
                        {usagePct != null && usagePct > 0
                          ? `${usagePct}%`
                          : "—"}
                      </span>
                    )}
                    {/* Sparkline — only when there are ≥2 data points */}
                    {usageSeries && usageSeries.length >= 2 && (
                      <UsageSparkline
                        points={usageSeries}
                        ariaLabel={`${nature} usage trend`}
                      />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        ))}

        {groups.length === 0 && (
          <p className="text-muted-foreground py-4 text-center text-sm">
            No natures found
          </p>
        )}
      </div>
    </PickerShell>
  );
}
