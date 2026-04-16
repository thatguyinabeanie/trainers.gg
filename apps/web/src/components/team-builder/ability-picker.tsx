"use client";

import { useState } from "react";

import {
  getValidAbilities,
  getAbilityShortDesc,
  getLegalAbilities,
} from "@trainers/pokemon";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

// =============================================================================
// Types
// =============================================================================

interface AbilityPickerProps {
  species: string;
  value: string;
  onSelect: (ability: string) => void;
  onClose: () => void;
  /** When provided, restricts to format-legal abilities. */
  formatId?: string;
}

// =============================================================================
// AbilityPicker
// =============================================================================

/**
 * Inline ability picker for the team builder Pokemon editor.
 * Shows valid abilities for the selected species with short descriptions.
 */
export function AbilityPicker({
  species,
  value,
  onSelect,
  onClose,
  formatId,
}: AbilityPickerProps) {
  const [search, setSearch] = useState("");

  // When a format is specified, restrict to format-legal abilities.
  // Falls back to the full species abilities when getLegalAbilities
  // returns undefined (unknown/permissive format).
  const abilities = formatId
    ? Array.from(
        getLegalAbilities(species, formatId) ?? getValidAbilities(species)
      )
    : getValidAbilities(species);

  const filtered = abilities.filter((a) =>
    a.toLowerCase().includes(search.toLowerCase())
  );

  function handleSelect(ability: string) {
    onSelect(ability);
    onClose();
  }

  return (
    <div className="bg-popover flex flex-col gap-2 rounded-lg border p-2 shadow-md">
      {/* Search */}
      <Input
        placeholder="Search abilities…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        autoFocus
        className="h-7 text-sm"
      />

      {/* Ability list */}
      <ScrollArea className="h-48">
        <div className="flex flex-col gap-0.5 pr-2">
          {filtered.map((ability) => {
            const description = getAbilityShortDesc(ability);
            const isSelected = ability === value;

            return (
              <button
                key={ability}
                type="button"
                onClick={() => handleSelect(ability)}
                className={cn(
                  "flex flex-col rounded px-2 py-1.5 text-left transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  isSelected && "bg-accent text-accent-foreground"
                )}
              >
                <span
                  className={cn(
                    "text-sm font-medium",
                    isSelected && "font-semibold"
                  )}
                >
                  {ability}
                </span>
                {description && (
                  <span className="text-muted-foreground mt-0.5 text-xs leading-tight">
                    {description}
                  </span>
                )}
              </button>
            );
          })}

          {filtered.length === 0 && (
            <p className="text-muted-foreground py-4 text-center text-sm">
              No abilities found
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
