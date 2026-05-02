/**
 * SpeciesSidebar — left-column panel of the species picker.
 *
 * Renders four filter sections in a fixed-width aside:
 *   1. Type grid (multi-select, 3-col, with team-needs hints)
 *   2. Ability combobox (input + datalist from getAllLegalAbilities)
 *   3. Champions M-A Mega toggle (gated on isChampionsFormat)
 *   4. Learns Move (search + quick-picks + removable chips)
 *   5. Clear all filters — pinned at bottom, always visible
 *
 * Does NOT own the `roles` filter — that lives in <RolePresetsPanel>.
 */
"use client";

import { useState } from "react";

import {
  ALL_TYPES,
  calculateTeamSynergy,
  isChampionsFormat,
  type GameFormat,
} from "@trainers/pokemon";
import { getShowdownTypeIconUrl } from "@trainers/pokemon/sprites";

import { cn } from "@/lib/utils";
import {
  DEFAULT_SPECIES_FILTERS,
  type SpeciesFilterState,
} from "./species-filter-state";

// =============================================================================
// Constants
// =============================================================================

/** Quick-pick moves for the Learns Move section. */
const QUICK_PICK_MOVES = [
  "Tailwind",
  "Trick Room",
  "Follow Me",
  "Protect",
  "Spore",
  "Fake Out",
] as const;

// =============================================================================
// Types
// =============================================================================

interface SpeciesSidebarProps {
  filters: SpeciesFilterState;
  onFiltersChange: (filters: SpeciesFilterState) => void;
  format: GameFormat | undefined;
  currentTeam: Array<{ species: string }>;
}

// =============================================================================
// SpeciesSidebar
// =============================================================================

/** Left-column filter panel for the species picker. */
export function SpeciesSidebar({
  filters,
  onFiltersChange,
  format,
  currentTeam,
}: SpeciesSidebarProps) {
  const [moveInput, setMoveInput] = useState("");

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------

  const allTypes = ALL_TYPES as unknown as string[];
  const showMegaToggle = isChampionsFormat(format);

  // Team-needs hints: types the team is weak to 2+ times AND uncovered
  const synergy =
    currentTeam.length > 0 ? calculateTeamSynergy(currentTeam) : null;
  const neededTypes: string[] = synergy
    ? allTypes.filter((type) => {
        const weakCount =
          (synergy.sharedWeaknesses as Record<string, number>)[type] ?? 0;
        return (
          weakCount >= 2 && (synergy.uncoveredTypes as Set<string>).has(type)
        );
      })
    : [];

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function toggleType(type: string) {
    const next = filters.types.includes(type)
      ? filters.types.filter((t) => t !== type)
      : [...filters.types, type];
    onFiltersChange({ ...filters, types: next });
  }

  function addMove(move: string) {
    if (filters.moves.includes(move)) return;
    onFiltersChange({ ...filters, moves: [...filters.moves, move] });
  }

  function removeMove(move: string) {
    onFiltersChange({
      ...filters,
      moves: filters.moves.filter((m) => m !== move),
    });
  }

  function handleMoveKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      const val = moveInput.trim();
      if (val) {
        addMove(val);
        setMoveInput("");
      }
    }
  }

  function clearAll() {
    onFiltersChange(DEFAULT_SPECIES_FILTERS);
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <aside className="bg-muted/50 flex h-full flex-col">
      {/* ------------------------------------------------------------------ */}
      {/* 1. Type grid                                                        */}
      {/* ------------------------------------------------------------------ */}
      <div className="px-3 pt-3 pb-2">
        <span className="text-muted-foreground mb-2 block text-[9px] font-bold tracking-widest uppercase">
          Type
        </span>

        <div className="grid grid-cols-3 gap-1">
          {allTypes.map((type) => {
            const isActive = filters.types.includes(type);
            return (
              <button
                key={type}
                type="button"
                aria-label={type}
                aria-pressed={isActive}
                onClick={() => toggleType(type)}
                className={cn(
                  "flex items-center justify-center rounded px-1 py-1 transition-all",
                  isActive
                    ? "ring-primary bg-background ring-2 ring-offset-1"
                    : "bg-muted/40 opacity-70 hover:opacity-100"
                )}
              >
                <img
                  src={getShowdownTypeIconUrl(type)}
                  alt={type}
                  className="h-6 w-auto [image-rendering:pixelated]"
                />
              </button>
            );
          })}
        </div>

        {/* Team-needs hints */}
        {neededTypes.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {neededTypes.map((type) => (
              <button
                key={type}
                type="button"
                aria-label={`Add ${type} (team-needs hint)`}
                onClick={() => toggleType(type)}
                className={cn(
                  "flex items-center gap-1 rounded px-1.5 py-0.5 transition-colors",
                  filters.types.includes(type)
                    ? "bg-primary/10 ring-primary/40 ring-1"
                    : "bg-muted hover:bg-accent"
                )}
              >
                <span aria-hidden="true" className="text-[10px]">
                  ✦
                </span>
                <img
                  src={getShowdownTypeIconUrl(type)}
                  alt={type}
                  className="h-6 w-auto [image-rendering:pixelated]"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 2. Ability combobox                                                 */}
      {/* ------------------------------------------------------------------ */}
      <div className="border-border border-t px-3 py-2">
        <span className="text-muted-foreground mb-1.5 block text-[9px] font-bold tracking-widest uppercase">
          Ability
        </span>
        {filters.ability ? (
          <button
            type="button"
            onClick={() => onFiltersChange({ ...filters, ability: null })}
            aria-label={`Clear ${filters.ability} filter`}
            className="bg-primary/10 text-primary border-primary/30 hover:bg-primary/15 inline-flex w-full items-center justify-between gap-2 rounded border px-2 py-1 text-[11px] font-medium transition-colors"
          >
            <span className="truncate">{filters.ability}</span>
            <span aria-hidden="true" className="text-[10px] opacity-70">
              ×
            </span>
          </button>
        ) : (
          <p className="text-muted-foreground/70 px-1 text-[10px] leading-snug">
            Click any ability in the table to filter.
          </p>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 3. Champions M-A Mega toggle (format-gated)                         */}
      {/* ------------------------------------------------------------------ */}
      {showMegaToggle && (
        <div className="border-border border-t px-3 py-2">
          <button
            type="button"
            onClick={() =>
              onFiltersChange({ ...filters, megaOnly: !filters.megaOnly })
            }
            className={cn(
              "flex w-full items-center gap-2 rounded-md border px-2.5 py-1.5 transition-colors",
              filters.megaOnly
                ? "text-foreground border-violet-400/40 bg-violet-500/8"
                : "border-border text-muted-foreground hover:bg-muted bg-transparent"
            )}
          >
            {/* Gradient gem icon */}
            <span
              className="flex size-4 items-center justify-center rounded-sm bg-gradient-to-br from-violet-500 to-pink-500 text-[8px] font-bold text-white"
              aria-hidden="true"
            >
              M
            </span>

            <span className="text-[11px] font-medium">Mega only</span>

            {/* Checkbox — filled violet when active */}
            <span
              className={cn(
                "ml-auto flex size-3.5 items-center justify-center rounded-sm border transition-colors",
                filters.megaOnly
                  ? "border-violet-500 bg-violet-500 text-white"
                  : "border-border bg-transparent"
              )}
              aria-hidden="true"
            >
              {filters.megaOnly && (
                <svg
                  viewBox="0 0 12 12"
                  className="size-2.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path d="M2 6l3 3 5-5" />
                </svg>
              )}
            </span>
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 4. Learns Move                                                      */}
      {/* ------------------------------------------------------------------ */}
      <div className="border-border border-t px-3 py-2">
        <span className="text-muted-foreground mb-1.5 block text-[9px] font-bold tracking-widest uppercase">
          Learns Move
        </span>

        {/* Search input */}
        <input
          type="text"
          placeholder="Add move, press Enter"
          value={moveInput}
          onChange={(e) => setMoveInput(e.target.value)}
          onKeyDown={handleMoveKeyDown}
          className="border-input bg-background placeholder:text-muted-foreground/60 focus:ring-ring w-full rounded border px-2 py-1 text-[11px] focus:ring-1 focus:outline-none"
        />

        {/* Selected moves as chips */}
        {filters.moves.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {filters.moves.map((move) => (
              <button
                key={move}
                type="button"
                onClick={() => removeMove(move)}
                className="bg-primary/15 text-primary hover:bg-primary/25 flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors"
              >
                {move}
                <span aria-hidden="true" className="ml-0.5 text-[9px]">
                  ×
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Quick-pick buttons */}
        <div className="mt-1.5 flex flex-wrap gap-1">
          {QUICK_PICK_MOVES.map((move) => {
            const isActive = filters.moves.includes(move);
            return (
              <button
                key={move}
                type="button"
                onClick={() => addMove(move)}
                disabled={isActive}
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px] transition-colors",
                  isActive
                    ? "bg-primary/15 text-primary cursor-default"
                    : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                {move}
              </button>
            );
          })}
        </div>
      </div>

      {/* Spacer so Clear button pins to bottom */}
      <div className="flex-1" />

      {/* ------------------------------------------------------------------ */}
      {/* 5. Clear all filters                                                */}
      {/* ------------------------------------------------------------------ */}
      <div className="border-border border-t px-3 py-2">
        <button
          type="button"
          onClick={clearAll}
          className="bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground w-full rounded px-2 py-1.5 text-[11px] font-medium transition-colors"
        >
          Clear all filters
        </button>
      </div>
    </aside>
  );
}
