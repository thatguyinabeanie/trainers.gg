"use client";

import { useEffect, useRef, useState } from "react";

import {
  getAbilityShortDesc,
  getLegalAbilities,
  getValidAbilities,
  type GameFormat,
} from "@trainers/pokemon";

import { cn } from "@/lib/utils";

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
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Format-legal abilities with graceful fallback to species abilities
  const abilities = format
    ? Array.from(
        getLegalAbilities(species, format.id) ?? getValidAbilities(species)
      )
    : getValidAbilities(species);

  const filtered = abilities.filter((a) =>
    a.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-popover text-popover-foreground flex w-[360px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-lg border shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-muted-foreground font-mono text-[9.5px] font-medium tracking-widest uppercase">
          Ability
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
        placeholder="Search abilities…"
        className="bg-muted/40 border-b px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/60 focus:bg-card"
      />

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
    </div>
  );
}
