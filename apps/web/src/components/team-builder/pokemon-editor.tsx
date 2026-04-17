"use client";

import { useEffect, useState } from "react";

import { type GameFormat, formatHasTera, getMoveData } from "@trainers/pokemon";
import { type Tables } from "@trainers/supabase";

import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown } from "lucide-react";

import { type ValidationError } from "./validation-hooks";
import { AbilityPicker } from "./ability-picker";
import { EditorHeaderBand } from "./editor-header-band";
import { ItemPicker } from "./item-picker";
import { MovePicker } from "./move-picker";
import { MoveListHeader, MoveRow } from "./move-row";
import { NaturePicker } from "./nature-picker";
import { StatsTable } from "./stats-table";
import { TeraPicker } from "./tera-picker";

// =============================================================================
// Types
// =============================================================================

/** Which inline picker is currently open in the editor. */
type ActivePicker =
  | "ability"
  | "item"
  | "tera"
  | "nature"
  | `move-${number}`
  | null;

interface PokemonEditorProps {
  pokemon: Tables<"pokemon">;
  format: GameFormat | undefined;
  /** All team_pokemon entries — used to collect held items for duplicate detection. */
  teamPokemon: Array<{ pokemon: Tables<"pokemon"> | null }>;
  onUpdate: (field: string, value: unknown) => void;
  /** Optional callback to open the species picker for this slot — clicking
   * the sprite/name in the editor header band invokes it. Omit to render
   * the identity block as static (placeholder editor). */
  onOpenSpeciesPicker?: () => void;
  /** Optional team id — when provided, the per-mon details popover (and
   * its embedded import flow) renders in the header band's ⋯ slot. */
  teamId?: number;
  /** Optional. Called after a successful per-mon import so the parent can
   * trigger a router.refresh(). Forwarded into PokemonDetailsPopover. */
  onImported?: () => void;
  /** Validation errors for this Pokemon's fields — populated by Task 5 display logic. */
  fieldErrors?: ValidationError[];
  /**
   * When true, all interactive fields except the species header are inert.
   * Use this to render the editor as a placeholder shell when no species is selected.
   * The species picker entry point remains active so the user can still pick a species.
   */
  disabled?: boolean;
  className?: string;
}

// =============================================================================
// Move slots
// =============================================================================

const MOVE_SLOTS = [1, 2, 3, 4] as const;
type MoveSlot = (typeof MOVE_SLOTS)[number];

function getMoveBySlot(
  pokemon: Tables<"pokemon">,
  slot: MoveSlot
): string | null {
  if (slot === 1) return pokemon.move1;
  if (slot === 2) return pokemon.move2;
  if (slot === 3) return pokemon.move3;
  return pokemon.move4;
}

// =============================================================================
// Helpers
// =============================================================================

/** Collect held items from all other team members for duplicate detection. */
function getTeamItems(
  teamPokemon: PokemonEditorProps["teamPokemon"],
  currentPokemonId: number
): string[] {
  return teamPokemon
    .filter((tp) => tp.pokemon !== null && tp.pokemon.id !== currentPokemonId)
    .map((tp) => tp.pokemon!.held_item)
    .filter((item): item is string => item !== null && item !== "");
}

// =============================================================================
// PokemonEditor
// =============================================================================

/**
 * Main editor card for a selected Pokemon in the team builder workspace.
 *
 * Composition (top to bottom):
 *   1. EditorHeaderBand — sprite, name, types, and the four loadout fields
 *      (Ability / Item / Tera / Nature).
 *   2. Single-column stacked body:
 *      - Moves list (4 MoveRow slots).
 *      - StatsTable (Showdown-style 3-col stat editor).
 *      - Collapsible Notes textarea.
 *   3. Inline picker overlays — at most one is open at a time. They render
 *      in-place where the trigger lives so the user keeps surrounding context.
 *
 * Per-Pokémon metadata (nickname, gender, shiny, level, import/export) is
 * NOT exposed by the new 3-column layout — those values still round-trip
 * through Showdown import/export and the sprite render, but no editor UI is
 * wired up yet (tracked as a follow-up; see Task 6 design audit).
 */
export function PokemonEditor({
  pokemon,
  format,
  teamPokemon,
  onUpdate,
  onOpenSpeciesPicker,
  teamId,
  onImported,
  fieldErrors,
  disabled = false,
  className,
}: PokemonEditorProps) {
  const [pickerOpen, setPickerOpen] = useState<ActivePicker>(null);
  const [notesOpen, setNotesOpen] = useState(false);

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  function getFieldError(field: string): ValidationError | undefined {
    return fieldErrors?.find((e) => e.field === field);
  }

  function renderFieldError(...fields: string[]): React.ReactNode {
    const error = fields.reduce<ValidationError | undefined>(
      (found, f) => found ?? getFieldError(f),
      undefined
    );
    if (!error) return null;
    return (
      <p
        className={cn(
          "mt-1 text-xs",
          error.severity === "warning"
            ? "text-amber-600 dark:text-amber-500"
            : "text-destructive"
        )}
      >
        {error.message}
      </p>
    );
  }

  function openPicker(picker: ActivePicker) {
    if (disabled) return;
    setPickerOpen(picker);
  }

  function closePicker() {
    setPickerOpen(null);
  }

  // -------------------------------------------------------------------------
  // Derived values
  // -------------------------------------------------------------------------

  const hasTera = formatHasTera(format);
  const teamItems = getTeamItems(teamPokemon, pokemon.id);

  useEffect(() => {
    const isHeaderPickerOpen =
      pickerOpen === "ability" ||
      pickerOpen === "item" ||
      pickerOpen === "nature" ||
      (hasTera && pickerOpen === "tera");

    if (!isHeaderPickerOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closePicker();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [pickerOpen, hasTera]);

  // Count filled move slots for the section header counter.
  const filledMoves = MOVE_SLOTS.reduce(
    (count, slot) => count + (getMoveBySlot(pokemon, slot) ? 1 : 0),
    0
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  // Render-time state reset — approved pattern per react-patterns.md
  if (!hasTera && pickerOpen === "tera") {
    setPickerOpen(null);
  }

  return (
    <div className={cn("bg-card relative rounded-lg shadow-sm", className)}>
      {/* ===================================================================
          Header band — sprite, name, type pills, and the four loadout fields.
          The four fields trigger inline pickers rendered below the band.
          =================================================================== */}
      <EditorHeaderBand
        pokemon={pokemon}
        format={format}
        onOpenAbilityPicker={() => openPicker("ability")}
        onOpenItemPicker={() => openPicker("item")}
        onOpenTeraPicker={hasTera ? () => openPicker("tera") : () => {}}
        onOpenNaturePicker={() => openPicker("nature")}
        onOpenSpeciesPicker={onOpenSpeciesPicker}
        // Only mount the ⋯ details popover when we have a teamId — the
        // disabled/placeholder editor (no real Pokémon row) skips it.
        detailsPopover={
          teamId !== undefined && !disabled
            ? { teamId, onUpdate, onImported }
            : undefined
        }
        disabled={disabled}
      />

      {/* ===================================================================
          Inline picker overlays — render directly under the header band so the
          user stays anchored to the field they clicked. Only one is open at a
          time, enforced by the `pickerOpen` discriminated state.
          =================================================================== */}
      {(pickerOpen === "ability" ||
        pickerOpen === "item" ||
        (hasTera && pickerOpen === "tera") ||
        pickerOpen === "nature") && (
        <>
          {/* Backdrop — click outside picker to close */}
          <div
            className="fixed inset-0 z-[45]"
            onClick={closePicker}
            aria-hidden="true"
          />
          {/* Floating picker panel — top-[69px] = 68px header + 1px border-b */}
          <div className="bg-card absolute inset-x-0 top-[69px] z-50 max-h-80 overflow-y-auto border-b px-4 py-3 shadow-xl">
            {pickerOpen === "ability" && (
              <AbilityPicker
                species={pokemon.species}
                value={pokemon.ability}
                onSelect={(val) => {
                  onUpdate("ability", val);
                  closePicker();
                }}
                onClose={closePicker}
                formatId={format?.id}
              />
            )}
            {pickerOpen === "item" && (
              <ItemPicker
                value={pokemon.held_item}
                teamItems={teamItems}
                formatId={format?.id}
                onSelect={(val) => {
                  onUpdate("held_item", val);
                  closePicker();
                }}
                onClose={closePicker}
              />
            )}
            {hasTera && pickerOpen === "tera" && (
              <TeraPicker
                value={pokemon.tera_type}
                onSelect={(val) => {
                  onUpdate("tera_type", val);
                  closePicker();
                }}
                onClose={closePicker}
                formatId={format?.id}
              />
            )}
            {pickerOpen === "nature" && (
              <NaturePicker
                value={pokemon.nature}
                onSelect={(val) => {
                  onUpdate("nature", val);
                  closePicker();
                }}
                onClose={closePicker}
              />
            )}
          </div>
        </>
      )}

      {/* ===================================================================
          Body — single column, stacked sections: moves on top, stats below,
          notes at the bottom. Sections are separated by a single horizontal
          divider (`border-t`); the card itself has no outer border.
          =================================================================== */}
      <div className="border-t">
        {/* -----------------------------------------------------------------
            Moves
            ----------------------------------------------------------------- */}
        <section
          className={cn("p-4", disabled && "pointer-events-none opacity-50")}
          aria-label="Moves"
        >
          <h4 className="text-muted-foreground mb-2 flex items-center gap-2 text-xs font-medium tracking-wide uppercase">
            <span>Moves</span>
            <span className="text-muted-foreground/70 font-mono text-[11px] tabular-nums">
              {filledMoves} / 4
            </span>
          </h4>

          {/* BP / Acc column labels rendered once here — every MoveRow used
              to show its own BP/Acc captions, which read as repetitive
              labels. The header sits directly above the rows since
              MoveListHeader uses the same grid template as MoveRow. */}
          <MoveListHeader />

          <div className="grid gap-2">
            {MOVE_SLOTS.map((slot) => {
              const moveValue = getMoveBySlot(pokemon, slot);
              const moveData = moveValue ? getMoveData(moveValue) : null;
              const moveField = `move${slot}` as `move${typeof slot}`;
              const moveError = getFieldError(moveField);
              const pickerKey = `move-${slot}` as const;
              const isOpen = pickerOpen === pickerKey;

              return (
                <div key={slot} className="flex flex-col">
                  {isOpen ? (
                    <MovePicker
                      species={pokemon.species}
                      value={moveValue}
                      onSelect={(val) => {
                        onUpdate(`move${slot}`, val);
                        closePicker();
                      }}
                      onClose={closePicker}
                      formatId={format?.id}
                    />
                  ) : (
                    <MoveRow
                      move={moveData}
                      onOpenPicker={() => openPicker(pickerKey)}
                    />
                  )}
                  {moveError && (
                    <p className="text-destructive mt-1 text-xs">
                      {moveError.message}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          {renderFieldError("moves")}
        </section>

        {/* -----------------------------------------------------------------
            Stats — sits directly below moves, separated by a horizontal divider.
            ----------------------------------------------------------------- */}
        <section className="border-t p-4" aria-label="Stats">
          <h4 className="text-muted-foreground mb-3 text-xs font-medium tracking-wide uppercase">
            Stats
          </h4>

          <StatsTable
            pokemon={pokemon}
            format={format}
            fieldErrors={fieldErrors}
            onUpdate={onUpdate}
            disabled={disabled}
          />

          {/* TODO(IV reflow): The legacy IvEditor was removed during the
              StatsTable migration. Restore IV editing once the IV reflow
              design lands — the new surface should sit adjacent to the
              StatsTable, not as its own section. */}
        </section>

        {/* -----------------------------------------------------------------
            Notes — collapsible textarea, beneath stats with its own divider.
            ----------------------------------------------------------------- */}
        <section
          aria-label="Notes"
          className={cn(
            "border-t p-4",
            disabled && "pointer-events-none opacity-50"
          )}
        >
          <button
            type="button"
            onClick={() => {
              if (disabled) return;
              setNotesOpen((prev) => !prev);
            }}
            className="flex w-full items-center justify-between"
            aria-expanded={notesOpen}
          >
            <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Notes
            </span>
            <ChevronDown
              className={cn(
                "text-muted-foreground size-3.5 transition-transform",
                notesOpen && "rotate-180"
              )}
            />
          </button>

          {notesOpen && (
            <Textarea
              placeholder="Strategy notes, damage calcs, reminders…"
              value={pokemon.notes ?? ""}
              onChange={(e) => onUpdate("notes", e.target.value || null)}
              rows={4}
              className="mt-2 resize-none text-sm"
              aria-label="Pokemon notes"
              disabled={disabled}
            />
          )}
        </section>
      </div>
    </div>
  );
}
