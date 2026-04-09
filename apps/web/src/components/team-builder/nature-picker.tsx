"use client";

import { useState } from "react";

import { getValidNatures, NATURE_EFFECTS } from "@trainers/pokemon";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

// =============================================================================
// Constants
// =============================================================================

const STAT_LABELS: Record<string, string> = {
  attack: "Atk",
  defense: "Def",
  specialAttack: "SpA",
  specialDefense: "SpD",
  speed: "Spe",
};

// =============================================================================
// Types
// =============================================================================

interface NaturePickerProps {
  value: string;
  onSelect: (nature: string) => void;
  onClose: () => void;
}

// =============================================================================
// NaturePicker
// =============================================================================

/**
 * Inline nature picker for the team builder Pokemon editor.
 * Displays all 25 natures with boosted/reduced stat labels.
 * Includes a search filter at the top.
 */
export function NaturePicker({ value, onSelect, onClose }: NaturePickerProps) {
  const [search, setSearch] = useState("");

  const allNatures = getValidNatures();
  const filtered = allNatures.filter((n) =>
    n.toLowerCase().includes(search.toLowerCase())
  );

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

      {/* Nature list */}
      <ScrollArea className="h-64">
        <div className="flex flex-col gap-0.5 pr-2">
          {filtered.map((nature) => {
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
                  isSelected && "bg-accent text-accent-foreground font-medium"
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

          {filtered.length === 0 && (
            <p className="text-muted-foreground py-4 text-center text-sm">
              No natures found
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
