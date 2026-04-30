"use client";

import { useEffect, useRef, useState } from "react";

import { getValidNatures, NATURE_EFFECTS } from "@trainers/pokemon";

import { cn } from "@/lib/utils";

import { type StatKey, STAT_LABELS } from "../../stat-types";

// =============================================================================
// Types
// =============================================================================

interface NaturePickerProps {
  value: string;
  onPick: (nature: string) => void;
  onClose: () => void;
}

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

function buildGroups(natures: string[]): NatureGroup[] {
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

  const groups: NatureGroup[] = [];

  if (neutrals.length > 0) {
    groups.push({
      label: "Neutral",
      boost: null,
      natures: neutrals.slice().sort((a, b) => a.localeCompare(b)),
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
 * Searchable nature picker grouped by boost stat.
 * Shows only Serious for neutral (hides the 4 redundant Hardy/Docile/etc.).
 */
export function NaturePicker({ value, onPick, onClose }: NaturePickerProps) {
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const allNatures = getValidNatures();
  const filtered = allNatures.filter((n) =>
    n.toLowerCase().includes(search.toLowerCase())
  );
  const groups = buildGroups(filtered);

  function handleSelect(nature: string) {
    onPick(nature);
    onClose();
  }

  return (
    <div className="bg-popover text-popover-foreground flex w-[420px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-lg border shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-muted-foreground font-mono text-[9.5px] font-medium tracking-widest uppercase">
          Nature
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="text-muted-foreground hover:text-foreground flex size-4 items-center justify-center rounded text-sm"
        >
          ×
        </button>
      </div>

      {/* Search */}
      <input
        ref={inputRef}
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search natures…"
        className="bg-muted/40 border-b px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/60 focus:bg-card"
      />

      {/* Grouped list */}
      <div className="max-h-[520px] overflow-y-auto p-1">
        {groups.map((group) => (
          <div key={group.label} className="flex flex-col">
            <div className="text-muted-foreground px-2 pt-1.5 pb-0.5 text-[9.5px] font-medium tracking-wider uppercase">
              {group.label}
            </div>
            {group.natures.map((nature) => {
              const effect = NATURE_EFFECTS[nature];
              const isNeutral = !effect?.boost;
              const isSelected = nature === value;

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
                  <span className="flex items-center gap-1 font-mono text-[9.5px]">
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
    </div>
  );
}
