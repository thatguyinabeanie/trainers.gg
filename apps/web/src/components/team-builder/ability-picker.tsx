"use client";

import { useState } from "react";

import { Dex } from "@pkmn/dex";

import { getValidAbilities } from "@trainers/pokemon";

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
}: AbilityPickerProps) {
  const [search, setSearch] = useState("");

  const abilities = getValidAbilities(species);
  const gen9 = Dex.forGen(9);

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
            const abilityData = gen9.abilities.get(ability);
            const description =
              abilityData?.shortDesc ?? abilityData?.desc ?? null;
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
