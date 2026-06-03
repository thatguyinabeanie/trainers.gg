/**
 * SpeciesSidebar — left-column panel of the species picker.
 *
 * Renders filter sections in a fixed-width aside:
 *   1. Mega toggle (format-gated, Champions only)
 *   2. Type grid (multi-select, 3-col, with team-needs hints)
 *   3. Ability combobox (input + datalist from getAllLegalAbilities)
 *   4. Learns Move (search + quick-picks + removable chips)
 *
 * Does NOT own the `roles` filter — that lives in <RolePresetsPanel>.
 * The "Clear all filters" button lives in the parent SpeciesPicker,
 * pinned at the bottom of the left rail below Roles.
 */
"use client";

import { useEffect, useRef, useState } from "react";

import {
  ALL_TYPES,
  calculateTeamSynergy,
  getAllLegalAbilities,
  getAllLegalMoves,
  isChampionsFormat,
  type GameFormat,
} from "@trainers/pokemon";

import { cn } from "@/lib/utils";
import { getTypeStyle } from "@/lib/pokemon/type-colors";

import { TypeSymbolIcon } from "../type-symbol-icon";
import { type SpeciesFilterState } from "./species-filter-state";

// =============================================================================
// Shared section header style
// =============================================================================

const SECTION_HEADER =
  "text-muted-foreground mb-1.5 block text-[9px] font-bold tracking-widest uppercase";

const SECTION_PADDING = "px-3 py-2.5";

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

/** Maximum number of typeahead suggestions rendered for moves / abilities. */
const SUGGESTION_LIMIT = 8;

/** Left-column filter panel for the species picker. */
export function SpeciesSidebar({
  filters,
  onFiltersChange,
  format,
  currentTeam,
}: SpeciesSidebarProps) {
  const [moveInput, setMoveInput] = useState("");
  const [moveFocused, setMoveFocused] = useState(false);
  const [abilityInput, setAbilityInput] = useState("");
  const [abilityFocused, setAbilityFocused] = useState(false);

  const moveBlurTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );
  const abilityBlurTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

  // Clear blur timers on unmount to avoid state updates on unmounted components.
  useEffect(
    () => () => {
      clearTimeout(moveBlurTimerRef.current);
      clearTimeout(abilityBlurTimerRef.current);
    },
    []
  );

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------

  const allTypes = ALL_TYPES as unknown as string[];
  const showMegaToggle = isChampionsFormat(format);

  // Defensive: if the format switches away from Champions while megaOnly is
  // active, the toggle disappears but the filter would silently keep applying.
  // Clear it when the control hides so users don't get stuck staring at an
  // empty list with no UI to recover.
  useEffect(() => {
    if (showMegaToggle || !filters.megaOnly) return;
    onFiltersChange({ ...filters, megaOnly: false });
  }, [showMegaToggle, filters, onFiltersChange]);

  // Typeahead suggestion lists — cheap because the underlying enumerators
  // are cached at the package level (`getAllLegalAbilities` /
  // `getAllLegalMoves` keyed by formatId).
  const moveSuggestions =
    moveInput.trim().length > 0 && format?.id
      ? getAllLegalMoves(format.id)
          .filter((m) =>
            m.toLowerCase().includes(moveInput.trim().toLowerCase())
          )
          .filter((m) => !filters.moves.includes(m))
          .slice(0, SUGGESTION_LIMIT)
      : [];

  const abilitySuggestions =
    abilityInput.trim().length > 0 && format?.id
      ? getAllLegalAbilities(format.id)
          .filter((a) =>
            a.toLowerCase().includes(abilityInput.trim().toLowerCase())
          )
          .filter((a) => !filters.abilities.includes(a))
          .slice(0, SUGGESTION_LIMIT)
      : [];

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
      e.preventDefault();
      // Only commit when there's an actual suggestion match — typing
      // arbitrary text shouldn't apply a move filter that doesn't exist.
      const pick = moveSuggestions[0];
      if (!pick) return;
      addMove(pick);
      setMoveInput("");
    } else if (e.key === "Escape") {
      setMoveInput("");
    }
  }

  function handleAbilityKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      // Only commit when there's an actual suggestion match — typing arbitrary
      // text shouldn't apply an ability filter that doesn't exist.
      const pick = abilitySuggestions[0];
      if (pick && !filters.abilities.includes(pick)) {
        onFiltersChange({
          ...filters,
          abilities: [...filters.abilities, pick],
        });
        setAbilityInput("");
      }
    } else if (e.key === "Escape") {
      setAbilityInput("");
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <aside className="divide-border/40 flex flex-col divide-y">
      {/* ------------------------------------------------------------------ */}
      {/* 1. Mega toggle (Champions only)                                     */}
      {/* ------------------------------------------------------------------ */}
      {showMegaToggle && (
        <div className={SECTION_PADDING}>
          <button
            type="button"
            aria-pressed={filters.megaOnly}
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
      {/* 2. Type grid                                                        */}
      {/* ------------------------------------------------------------------ */}
      <div className={SECTION_PADDING}>
        <span className={SECTION_HEADER}>Type</span>
        <div className="grid grid-cols-3 gap-1">
          {allTypes.map((type) => {
            const isActive = filters.types.includes(type);
            const isNeeded = neededTypes.includes(type);
            const typeStyle = getTypeStyle(type);
            return (
              <button
                key={type}
                type="button"
                aria-label={isNeeded ? `${type} (team needs coverage)` : type}
                aria-pressed={isActive}
                title={
                  isNeeded
                    ? `${type} — team is weak to this without coverage`
                    : undefined
                }
                onClick={() => toggleType(type)}
                className={cn(
                  "relative flex items-center justify-center rounded border border-transparent px-1 py-1 transition-all",
                  typeStyle.bg,
                  isActive
                    ? cn(
                        typeStyle.border,
                        "ring-primary ring-offset-background ring-2 ring-offset-1"
                      )
                    : cn(
                        typeStyle.borderHover,
                        "before:bg-background/50 before:pointer-events-none before:absolute before:inset-0 before:rounded before:transition-opacity hover:before:opacity-0"
                      )
                )}
              >
                {isNeeded && (
                  <span
                    aria-hidden="true"
                    className="absolute -top-1 -right-1 z-10 text-[9px] leading-none text-amber-500 drop-shadow"
                  >
                    ✦
                  </span>
                )}
                <TypeSymbolIcon
                  type={type as Parameters<typeof TypeSymbolIcon>[0]["type"]}
                  size={28}
                  className="relative z-10"
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 3. Ability combobox (multi-select)                                  */}
      {/* ------------------------------------------------------------------ */}
      <div className={SECTION_PADDING}>
        <span className={SECTION_HEADER}>Ability</span>

        {/* Typeahead input + suggestion dropdown — always visible */}
        <div className="relative">
          <input
            type="text"
            placeholder={
              filters.abilities.length > 0
                ? "Add another ability..."
                : "Type or click an ability..."
            }
            value={abilityInput}
            onChange={(e) => setAbilityInput(e.target.value)}
            onKeyDown={handleAbilityKeyDown}
            onFocus={() => setAbilityFocused(true)}
            onBlur={() => {
              // Defer so a click on a suggestion can fire before the
              // dropdown disappears.
              clearTimeout(abilityBlurTimerRef.current);
              abilityBlurTimerRef.current = setTimeout(
                () => setAbilityFocused(false),
                120
              );
            }}
            className="border-border bg-background placeholder:text-muted-foreground/60 focus:border-primary focus:ring-primary w-full rounded border px-2 py-1.5 text-[11px] focus:ring-1 focus:outline-none"
          />
          {abilityFocused && abilitySuggestions.length > 0 && (
            <ul
              aria-label="Matching abilities"
              className="border-border bg-popover absolute top-full right-0 left-0 z-30 mt-1 max-h-60 overflow-y-auto rounded-md border shadow-lg"
            >
              {abilitySuggestions.map((ability) => (
                <li key={ability}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                    }}
                    onClick={() => {
                      if (!filters.abilities.includes(ability)) {
                        onFiltersChange({
                          ...filters,
                          abilities: [...filters.abilities, ability],
                        });
                      }
                      setAbilityInput("");
                    }}
                    className="hover:bg-accent w-full px-2 py-1 text-left text-[11px]"
                  >
                    {ability}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Selected abilities as chips */}
        {filters.abilities.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {filters.abilities.map((ability) => (
              <button
                key={ability}
                type="button"
                onClick={() =>
                  onFiltersChange({
                    ...filters,
                    abilities: filters.abilities.filter((a) => a !== ability),
                  })
                }
                className="bg-primary/15 text-primary border-primary hover:bg-primary/25 flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors"
              >
                {ability}
                <span aria-hidden="true" className="ml-0.5 text-[9px]">
                  ×
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 4. Learns Move                                                      */}
      {/* ------------------------------------------------------------------ */}
      <div className={SECTION_PADDING}>
        <span className={SECTION_HEADER}>Learns Move</span>

        {/* Typeahead input + suggestion dropdown */}
        <div className="relative">
          <input
            type="text"
            placeholder="Type a move..."
            value={moveInput}
            onChange={(e) => setMoveInput(e.target.value)}
            onKeyDown={handleMoveKeyDown}
            onFocus={() => setMoveFocused(true)}
            onBlur={() => {
              // Defer so a click on a suggestion fires before the dropdown
              // hides on blur.
              clearTimeout(moveBlurTimerRef.current);
              moveBlurTimerRef.current = setTimeout(
                () => setMoveFocused(false),
                120
              );
            }}
            className="border-border bg-background placeholder:text-muted-foreground/60 focus:border-primary focus:ring-primary w-full rounded border px-2 py-1.5 text-[11px] focus:ring-1 focus:outline-none"
          />
          {moveFocused && moveSuggestions.length > 0 && (
            <ul
              aria-label="Matching moves"
              className="border-border bg-popover absolute top-full right-0 left-0 z-30 mt-1 max-h-60 overflow-y-auto rounded-md border shadow-lg"
            >
              {moveSuggestions.map((move) => (
                <li key={move}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      addMove(move);
                      setMoveInput("");
                    }}
                    className="hover:bg-accent w-full px-2 py-1 text-left text-[11px]"
                  >
                    {move}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Selected moves as chips */}
        {filters.moves.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {filters.moves.map((move) => (
              <button
                key={move}
                type="button"
                onClick={() => removeMove(move)}
                className="bg-primary/15 text-primary border-primary hover:bg-primary/25 flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors"
              >
                {move}
                <span aria-hidden="true" className="ml-0.5 text-[9px]">
                  ×
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
