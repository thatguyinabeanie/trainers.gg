"use client";

import { useState } from "react";

import { getValidNatures, NATURE_EFFECTS } from "@trainers/pokemon";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

import { type StatKey, STAT_LABELS } from "./stat-types";

// =============================================================================
// Types
// =============================================================================

interface NaturePickerProps {
  value: string;
  onSelect: (nature: string) => void;
  onClose: () => void;
}

interface NatureGroup {
  /** Display label for the section header. "NEUTRAL" or "+ ATK", "+ DEF", … */
  label: string;
  /** Which stat this group is the boost for. `null` = neutral group. */
  boost: StatKey | null;
  /** Natures in this group, alphabetized. */
  natures: string[];
}

// =============================================================================
// Constants
// =============================================================================

/**
 * The 4 redundant neutral natures. All 5 neutrals (Hardy, Docile, Bashful,
 * Quirky, Serious) are functionally identical; we surface only Serious in
 * the picker. Existing Pokemon with a hidden neutral nature still display
 * correctly because NATURE_EFFECTS retains entries for them — we only filter
 * what the picker shows; we don't auto-migrate stored values.
 */
const HIDDEN_NEUTRAL_NATURES = new Set([
  "Hardy",
  "Docile",
  "Bashful",
  "Quirky",
]);

/**
 * Order in which boost-stat groups appear, matching the canonical
 * stat order used elsewhere in the editor (Atk, Def, SpA, SpD, Spe).
 */
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
 * Build the section list in display order: NEUTRAL first, then one section
 * per boost stat (Atk / Def / SpA / SpD / Spe). Within each section, natures
 * are alphabetized. Sections with no natures after filtering are omitted.
 */
function buildGroups(natures: string[]): NatureGroup[] {
  const visible = natures.filter((n) => !HIDDEN_NEUTRAL_NATURES.has(n));

  const neutralNatures: string[] = [];
  // Bucket boost stat → list of natures.
  const byBoost = new Map<StatKey, string[]>();

  for (const nature of visible) {
    const effect = NATURE_EFFECTS[nature];
    if (!effect?.boost) {
      // Neutral (Serious is the surviving neutral; legacy hidden ones already
      // filtered above). If a nature is missing from NATURE_EFFECTS entirely,
      // bucket it as neutral so it still shows up.
      neutralNatures.push(nature);
      continue;
    }
    const list = byBoost.get(effect.boost) ?? [];
    list.push(nature);
    byBoost.set(effect.boost, list);
  }

  const groups: NatureGroup[] = [];

  if (neutralNatures.length > 0) {
    groups.push({
      label: "Neutral",
      boost: null,
      natures: neutralNatures.slice().sort((a, b) => a.localeCompare(b)),
    });
  }

  for (const stat of BOOST_GROUP_ORDER) {
    const list = byBoost.get(stat);
    if (!list || list.length === 0) continue;
    groups.push({
      label: `+ ${STAT_LABELS[stat]}`,
      boost: stat,
      natures: list.slice().sort((a, b) => a.localeCompare(b)),
    });
  }

  return groups;
}

// =============================================================================
// NaturePicker
// =============================================================================

/**
 * Inline nature picker for the team builder Pokemon editor.
 *
 * Shows 21 natures (Serious + 20 boost/reduce pairs) grouped by their
 * positively-influenced stat. The 4 redundant neutral natures (Hardy, Docile,
 * Bashful, Quirky) are hidden — all 5 neutrals are functionally identical, so
 * we surface only Serious.
 *
 * Includes a search filter at the top — sections with no matches collapse out
 * of view automatically.
 */
export function NaturePicker({ value, onSelect, onClose }: NaturePickerProps) {
  const [search, setSearch] = useState("");

  const allNatures = getValidNatures();
  const filtered = allNatures.filter((n) =>
    n.toLowerCase().includes(search.toLowerCase())
  );

  const groups = buildGroups(filtered);

  function handleSelect(nature: string) {
    onSelect(nature);
    onClose();
  }

  return (
    <div className="bg-popover flex flex-col gap-2 rounded-lg border p-2 shadow-md">
      {/* Search */}
      <Input
        placeholder="Search natures…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        autoFocus
        className="h-7 text-sm"
      />

      {/* Nature list — grouped by +stat with section headers */}
      <ScrollArea className="h-64">
        <div className="flex flex-col gap-1 pr-2">
          {groups.map((group) => (
            <div
              key={group.label}
              data-testid={`nature-group-${group.boost ?? "neutral"}`}
              className="flex flex-col gap-0.5"
            >
              <div
                data-testid={`nature-group-header-${group.boost ?? "neutral"}`}
                className="text-muted-foreground px-2 pt-1 text-xs font-medium tracking-wide uppercase"
              >
                {group.label}
              </div>
              {group.natures.map((nature) => {
                const effect = NATURE_EFFECTS[nature];
                const isNeutral = !effect?.boost && !effect?.reduce;
                const isSelected = nature === value;

                return (
                  <button
                    key={nature}
                    type="button"
                    onClick={() => handleSelect(nature)}
                    className={cn(
                      "flex items-center justify-between rounded px-2 py-1.5 text-left text-sm transition-colors",
                      "hover:bg-accent hover:text-accent-foreground",
                      isSelected &&
                        "bg-accent text-accent-foreground font-medium"
                    )}
                  >
                    {/* Nature name */}
                    <span
                      className={cn(
                        "min-w-[80px]",
                        isNeutral && "text-muted-foreground"
                      )}
                    >
                      {nature}
                    </span>

                    {/* Stat effects */}
                    <div className="flex items-center gap-2 text-xs">
                      {isNeutral ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <>
                          {effect?.boost && (
                            <span className="font-medium text-green-600 dark:text-green-400">
                              +{STAT_LABELS[effect.boost]}
                            </span>
                          )}
                          {effect?.reduce && (
                            <span className="font-medium text-red-500 dark:text-red-400">
                              -{STAT_LABELS[effect.reduce]}
                            </span>
                          )}
                        </>
                      )}
                    </div>
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
      </ScrollArea>
    </div>
  );
}
