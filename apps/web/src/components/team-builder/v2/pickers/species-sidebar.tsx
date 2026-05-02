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
  getAllLegalAbilities,
  isChampionsFormat,
  type GameFormat,
} from "@trainers/pokemon";

import { cn } from "@/lib/utils";
import { TYPE_PILL_COLORS } from "../../type-colors";
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
  const abilities: string[] = format ? getAllLegalAbilities(format.id) : [];
  const showMegaToggle = isChampionsFormat(format);

  // Team-needs hints: types the team is weak to 2+ times AND uncovered
  const synergy =
    currentTeam.length > 0 ? calculateTeamSynergy(currentTeam) : null;
  const neededTypes: string[] = synergy
    ? allTypes.filter((type) => {
        const weakCount = (synergy.sharedWeaknesses as Record<string, number>)[type] ?? 0;
        return weakCount >= 2 && (synergy.uncoveredTypes as Set<string>).has(type);
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
    <aside className="flex w-[196px] flex-shrink-0 flex-col overflow-y-auto border-r border-border bg-muted/50">
      {/* ------------------------------------------------------------------ */}
      {/* 1. Type grid                                                        */}
      {/* ------------------------------------------------------------------ */}
      <div className="px-3 pt-3 pb-2">
        <span className="mb-2 block text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
          Type
        </span>

        <div className="grid grid-cols-3 gap-1">
          {allTypes.map((type) => {
            const isActive = filters.types.includes(type);
            return (
              <button
                key={type}
                type="button"
                onClick={() => toggleType(type)}
                className={cn(
                  "rounded px-1 py-0.5 text-[10px] font-medium transition-all",
                  isActive
                    ? cn(
                        TYPE_PILL_COLORS[type as keyof typeof TYPE_PILL_COLORS] ??
                          "bg-muted",
                        "outline outline-2 outline-offset-0 outline-white shadow-[0_0_0_3px_currentColor]"
                      )
                    : "bg-muted text-muted-foreground opacity-70 hover:opacity-100"
                )}
              >
                {type}
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
                onClick={() => toggleType(type)}
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors",
                  filters.types.includes(type)
                    ? (TYPE_PILL_COLORS[
                        type as keyof typeof TYPE_PILL_COLORS
                      ] ?? "bg-muted")
                    : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                ✦ {type}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 2. Ability combobox                                                 */}
      {/* ------------------------------------------------------------------ */}
      <div className="border-t border-border px-3 py-2">
        <span className="mb-1.5 block text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
          Ability
        </span>
        <input
          list="species-picker-abilities"
          placeholder={
            filters.ability ? undefined : "Click any ability in the table to filter"
          }
          value={filters.ability ?? ""}
          onChange={(e) => {
            const val = e.target.value.trim();
            onFiltersChange({ ...filters, ability: val || null });
          }}
          className="w-full rounded border border-input bg-background px-2 py-1 text-[11px] placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <datalist id="species-picker-abilities">
          {abilities.map((ab) => (
            <option key={ab}>{ab}</option>
          ))}
        </datalist>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 3. Champions M-A Mega toggle (format-gated)                         */}
      {/* ------------------------------------------------------------------ */}
      {showMegaToggle && (
        <div className="border-t border-border px-3 py-2">
          <button
            type="button"
            onClick={() =>
              onFiltersChange({ ...filters, megaOnly: !filters.megaOnly })
            }
            className={cn(
              "flex w-full items-center gap-2 rounded-md border px-2.5 py-1.5 transition-colors",
              filters.megaOnly
                ? "border-violet-400/40 bg-violet-500/8 text-foreground"
                : "border-border bg-transparent text-muted-foreground hover:bg-muted"
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
      <div className="border-t border-border px-3 py-2">
        <span className="mb-1.5 block text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
          Learns Move
        </span>

        {/* Search input */}
        <input
          type="text"
          placeholder="Add move, press Enter"
          value={moveInput}
          onChange={(e) => setMoveInput(e.target.value)}
          onKeyDown={handleMoveKeyDown}
          className="w-full rounded border border-input bg-background px-2 py-1 text-[11px] placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
        />

        {/* Selected moves as chips */}
        {filters.moves.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {filters.moves.map((move) => (
              <button
                key={move}
                type="button"
                onClick={() => removeMove(move)}
                className="flex items-center gap-0.5 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary transition-colors hover:bg-primary/25"
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
      <div className="border-t border-border px-3 py-2">
        <button
          type="button"
          onClick={clearAll}
          className="w-full rounded bg-muted px-2 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          Clear all filters
        </button>
      </div>
    </aside>
  );
}
