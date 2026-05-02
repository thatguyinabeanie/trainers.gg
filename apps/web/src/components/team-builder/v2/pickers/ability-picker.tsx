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
// AbilityPicker
// =============================================================================

/**
 * Ability picker scoped to species-legal abilities in the given format.
 * Shows short descriptions under each ability name.
 */
export function AbilityPicker({
  value,
  species,
  format,
  onPick,
  onClose,
}: AbilityPickerProps) {
  const [search, setSearch] = useState("");

  // Format-legal abilities with graceful fallback to species abilities
  const abilities = format
    ? Array.from(
        legalSetOrPermissive(getLegalAbilities(species, format.id)) ??
          getValidAbilities(species)
      )
    : getValidAbilities(species);

  const filtered = abilities.filter((a) =>
    a.toLowerCase().includes(search.toLowerCase())
  );

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
        {filtered.map((ability) => {
          const desc = getAbilityShortDesc(ability);
          const isSelected = ability === value;

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
              <span
                className={cn(
                  "text-sm font-medium",
                  isSelected && "font-semibold"
                )}
              >
                {ability}
              </span>
              {desc && (
                <span className="text-muted-foreground mt-0.5 text-xs leading-tight">
                  {desc}
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
    </PickerShell>
  );
}
