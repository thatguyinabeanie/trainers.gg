"use client";

import { useState } from "react";

import {
  type GameFormat,
  getBaseStats,
  getMoveData,
  getValidAbilities,
  NATURE_EFFECTS,
} from "@trainers/pokemon";
import { type Tables } from "@trainers/supabase";

import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown } from "lucide-react";

import { type StatKey, STAT_LABELS } from "./stat-types";
import { type ValidationError } from "./validation-hooks";
import { AbilityPicker } from "./ability-picker";
import { NaturePicker } from "./nature-picker";
import { EvEditor } from "./ev-editor";
import { ItemPicker } from "./item-picker";
import { IvEditor } from "./iv-editor";
import { MovePicker } from "./move-picker";
import { TeraPicker } from "./tera-picker";
import { TYPE_BG_COLORS } from "./type-colors";

// =============================================================================
// Constants
// =============================================================================

/** Maps stat key names to database column suffixes. */
const STAT_TO_DB_FIELD: Record<StatKey, string> = {
  hp: "hp",
  attack: "attack",
  defense: "defense",
  specialAttack: "special_attack",
  specialDefense: "special_defense",
  speed: "speed",
};

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
  /** Validation errors for this Pokemon's fields — populated by Task 5 display logic. */
  fieldErrors?: ValidationError[];
  /**
   * When true, all interactive fields except the species header are inert.
   * Use this to render the editor as a placeholder shell when no species is selected.
   * The species picker entry point remains active so the user can still pick a species.
   */
  disabled?: boolean;
}

// =============================================================================
// Helpers
// =============================================================================

/** Convert a stat camelCase key to the database column suffix. */
function statToDbField(stat: StatKey): string {
  return STAT_TO_DB_FIELD[stat];
}

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
// Move slots — 2x2 grid helper
// =============================================================================

const MOVE_SLOTS = [1, 2, 3, 4] as const;

function getMoveBySlot(
  pokemon: Tables<"pokemon">,
  slot: (typeof MOVE_SLOTS)[number]
): string | null {
  if (slot === 1) return pokemon.move1;
  if (slot === 2) return pokemon.move2;
  if (slot === 3) return pokemon.move3;
  return pokemon.move4;
}

// =============================================================================
// PokemonEditor
// =============================================================================

/**
 * Main editor form for a selected Pokemon in the team builder workspace.
 * Composes all individual picker and editor sub-components.
 *
 * Layout (top to bottom):
 *   1. 3-across field row: ability, held item, tera type
 *   2. Moves: single-column list with type badge, category, BP, accuracy
 *   3. EV editor
 *   4. IV editor (hidden for Champions format)
 *   5. Notes collapsible textarea
 *
 * The species header (name, type pills, nickname, gender, shiny, level,
 * import/export) is rendered in TeamWorkspace above the editor/panel split.
 */
export function PokemonEditor({
  pokemon,
  format,
  teamPokemon,
  onUpdate,
  fieldErrors,
  disabled = false,
}: PokemonEditorProps) {
  // Helper — look up the first error for a given field name.
  function getFieldError(field: string): ValidationError | undefined {
    return fieldErrors?.find((e) => e.field === field);
  }

  // Helper — render inline error text for one or more field names, or null.
  function renderFieldError(...fields: string[]): React.ReactNode {
    const error = fields.reduce<ValidationError | undefined>(
      (found, f) => found ?? getFieldError(f),
      undefined
    );
    if (!error) return null;
    return (
      <p
        className={cn(
          "mt-0.5 text-xs",
          error.severity === "warning"
            ? "text-amber-600 dark:text-amber-500"
            : "text-destructive"
        )}
      >
        {error.message}
      </p>
    );
  }

  const [activePicker, setActivePicker] = useState<ActivePicker>(null);
  const [notesOpen, setNotesOpen] = useState(false);

  // -------------------------------------------------------------------------
  // Derived values
  // -------------------------------------------------------------------------

  const baseStats = getBaseStats(pokemon.species) ?? {
    hp: 0,
    attack: 0,
    defense: 0,
    specialAttack: 0,
    specialDefense: 0,
    speed: 0,
  };

  const evs = {
    hp: pokemon.ev_hp ?? 0,
    attack: pokemon.ev_attack ?? 0,
    defense: pokemon.ev_defense ?? 0,
    specialAttack: pokemon.ev_special_attack ?? 0,
    specialDefense: pokemon.ev_special_defense ?? 0,
    speed: pokemon.ev_speed ?? 0,
  };

  const ivs = {
    hp: pokemon.iv_hp ?? 31,
    attack: pokemon.iv_attack ?? 31,
    defense: pokemon.iv_defense ?? 31,
    specialAttack: pokemon.iv_special_attack ?? 31,
    specialDefense: pokemon.iv_special_defense ?? 31,
    speed: pokemon.iv_speed ?? 31,
  };

  const teamItems = getTeamItems(teamPokemon, pokemon.id);
  // Champions is generation 10 — detect by generation field, not format ID,
  // so all Champions regulation variants are covered.
  const isChampionsFormat = format?.generation === 10;

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  function openPicker(picker: ActivePicker) {
    if (disabled) return;
    setActivePicker(picker);
  }

  function closePicker() {
    setActivePicker(null);
  }

  function handleEvPreset(preset: "reset" | "maxAtk" | "maxBulk") {
    const presets = {
      reset: {
        hp: 0,
        attack: 0,
        defense: 0,
        specialAttack: 0,
        specialDefense: 0,
        speed: 0,
      },
      maxAtk: {
        hp: 4,
        attack: 252,
        defense: 0,
        specialAttack: 0,
        specialDefense: 0,
        speed: 252,
      },
      maxBulk: {
        hp: 252,
        attack: 0,
        defense: 128,
        specialAttack: 0,
        specialDefense: 128,
        speed: 0,
      },
    };
    const spread = presets[preset];
    for (const [stat, value] of Object.entries(spread) as Array<
      [StatKey, number]
    >) {
      onUpdate(`ev_${statToDbField(stat)}`, value);
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="flex flex-col gap-0 divide-y">
      {/* ===================================================================
          Section 2: 3-across field row — ability, held item, tera type.
          Nature has moved to sit adjacent to EVs (Task 3).
          =================================================================== */}
      <div className="flex gap-0 divide-x px-3 py-2 md:px-4">
        {/* Ability */}
        <div
          className={cn(
            "flex flex-1 flex-col pr-3",
            disabled && "pointer-events-none opacity-50"
          )}
        >
          <p className="text-muted-foreground mb-1 text-[10px] font-semibold tracking-wide uppercase">
            Ability
          </p>
          {activePicker === "ability" ? (
            <AbilityPicker
              species={pokemon.species}
              value={pokemon.ability}
              onSelect={(val) => {
                onUpdate("ability", val);
                closePicker();
              }}
              onClose={closePicker}
            />
          ) : getValidAbilities(pokemon.species).length <= 1 ? (
            /* Single-ability species: static display, no picker */
            <div className="flex min-h-[36px] items-center px-2 py-1.5">
              <span className="text-sm font-medium">{pokemon.ability}</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => openPicker("ability")}
              className={cn(
                "flex min-h-[36px] w-full items-center justify-between rounded border px-2 py-1.5 text-left text-sm",
                "hover:bg-muted/50 transition-colors",
                getFieldError("ability")
                  ? "border-destructive"
                  : "border-transparent"
              )}
            >
              <span className="font-medium">{pokemon.ability}</span>
              <ChevronDown className="text-muted-foreground size-3.5" />
            </button>
          )}
          {renderFieldError("ability")}
        </div>

        {/* Held Item */}
        <div
          className={cn(
            "flex flex-1 flex-col px-3",
            disabled && "pointer-events-none opacity-50"
          )}
        >
          <p className="text-muted-foreground mb-1 text-[10px] font-semibold tracking-wide uppercase">
            Item
          </p>
          {activePicker === "item" ? (
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
          ) : (
            <button
              type="button"
              onClick={() => openPicker("item")}
              className={cn(
                "flex min-h-[36px] w-full items-center justify-between rounded border px-2 py-1.5 text-left text-sm",
                "hover:bg-muted/50 transition-colors",
                getFieldError("item") || getFieldError("heldItem")
                  ? "border-destructive"
                  : "border-transparent"
              )}
            >
              <span
                className={cn(
                  "truncate font-medium",
                  !pokemon.held_item && "text-muted-foreground"
                )}
              >
                {pokemon.held_item ?? "None"}
              </span>
              <ChevronDown className="text-muted-foreground size-3.5 shrink-0" />
            </button>
          )}
          {renderFieldError("item", "heldItem")}
        </div>

        {/* Tera Type */}
        <div
          className={cn(
            "flex flex-1 flex-col pl-3",
            disabled && "pointer-events-none opacity-50"
          )}
        >
          <p className="text-muted-foreground mb-1 text-[10px] font-semibold tracking-wide uppercase">
            Tera Type
          </p>
          {activePicker === "tera" ? (
            <TeraPicker
              value={pokemon.tera_type}
              onSelect={(val) => {
                onUpdate("tera_type", val);
                closePicker();
              }}
              onClose={closePicker}
            />
          ) : (
            <button
              type="button"
              onClick={() => openPicker("tera")}
              className={cn(
                "flex min-h-[36px] w-full items-center justify-between rounded border px-2 py-1.5 text-left text-sm",
                "hover:bg-muted/50 transition-colors",
                "border-transparent"
              )}
            >
              <span
                className={cn(
                  "truncate font-medium",
                  !pokemon.tera_type && "text-muted-foreground"
                )}
              >
                {pokemon.tera_type ?? "None"}
              </span>
              <ChevronDown className="text-muted-foreground size-3.5 shrink-0" />
            </button>
          )}
        </div>
      </div>

      {/* ===================================================================
          Section 3: Moves — single-column list with type/category/BP/accuracy
          =================================================================== */}
      <div
        className={cn(
          "px-3 py-3 md:px-4",
          disabled && "pointer-events-none opacity-50"
        )}
      >
        <div className="mb-2 flex items-center gap-2">
          <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
            Moves
          </p>
          {renderFieldError("moves")}
        </div>
        <div className="flex flex-col gap-1">
          {MOVE_SLOTS.map((slot) => {
            const moveValue = getMoveBySlot(pokemon, slot);
            const pickerKey = `move-${slot}` as const;
            const isOpen = activePicker === pickerKey;
            const moveField = `move${slot}` as `move${typeof slot}`;
            const moveError = getFieldError(moveField);
            const moveData = moveValue ? getMoveData(moveValue) : null;

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
                  <button
                    type="button"
                    onClick={() => openPicker(pickerKey)}
                    className={cn(
                      "flex min-h-[36px] w-full items-center gap-2 rounded border px-2 py-1.5 text-left text-sm",
                      "hover:bg-muted/50 transition-colors",
                      moveError
                        ? "border-destructive"
                        : !moveValue
                          ? "border-dashed"
                          : "border-transparent"
                    )}
                  >
                    {/* Move name */}
                    <span
                      className={cn(
                        "flex-1 truncate text-sm",
                        moveValue
                          ? "font-medium"
                          : "text-muted-foreground text-xs"
                      )}
                    >
                      {moveValue ?? `Move ${slot}`}
                    </span>

                    {/* Move metadata — only shown when a move is selected */}
                    {moveData && (
                      <>
                        {/* Type badge */}
                        <span
                          className={cn(
                            "shrink-0 rounded px-1.5 py-0.5 text-[10px] leading-none font-semibold",
                            TYPE_BG_COLORS[
                              moveData.type as keyof typeof TYPE_BG_COLORS
                            ] ?? "bg-muted text-foreground"
                          )}
                        >
                          {moveData.type}
                        </span>

                        {/* Category */}
                        <span className="text-muted-foreground w-12 shrink-0 text-right text-xs">
                          {moveData.category}
                        </span>

                        {/* Base power */}
                        <span className="text-muted-foreground w-10 shrink-0 text-right font-mono text-xs">
                          {moveData.basePower > 0
                            ? `${moveData.basePower} BP`
                            : "—"}
                        </span>

                        {/* Accuracy */}
                        <span className="text-muted-foreground w-8 shrink-0 text-right font-mono text-xs">
                          {moveData.accuracy === true
                            ? "—"
                            : moveData.accuracy === 0
                              ? "—"
                              : `${moveData.accuracy}%`}
                        </span>
                      </>
                    )}

                    <ChevronDown className="text-muted-foreground ml-auto size-3.5 shrink-0" />
                  </button>
                )}
                {moveError && (
                  <p className="text-destructive mt-0.5 text-xs">
                    {moveError.message}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ===================================================================
          Section 4a: Nature row — sits directly above the EV editor.
          Clicking opens the NaturePicker inline.
          =================================================================== */}
      <div
        className={cn(
          "px-3 py-2 md:px-4",
          disabled && "pointer-events-none opacity-50"
        )}
      >
        {activePicker === "nature" ? (
          <NaturePicker
            value={pokemon.nature}
            onSelect={(val) => {
              onUpdate("nature", val);
              closePicker();
            }}
            onClose={closePicker}
          />
        ) : (
          <button
            type="button"
            onClick={() => openPicker("nature")}
            className="hover:bg-muted/50 flex w-full cursor-pointer items-center gap-2 rounded-md border border-transparent px-3 py-2 text-left transition-colors"
          >
            <span className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
              Nature
            </span>
            <span className="text-sm font-medium">{pokemon.nature}</span>
            {/* Nature stat indicators are hidden for Champions — natures exist
                but don't affect stats in Gen 10 */}
            {!isChampionsFormat &&
              (() => {
                const effect = NATURE_EFFECTS[pokemon.nature];
                if (!effect?.boost && !effect?.reduce) return null;
                return (
                  <>
                    {effect.boost && (
                      <span className="text-xs font-medium text-green-600 dark:text-green-400">
                        +{STAT_LABELS[effect.boost]}
                      </span>
                    )}
                    {effect.reduce && (
                      <span className="text-xs font-medium text-red-500 dark:text-red-400">
                        -{STAT_LABELS[effect.reduce]}
                      </span>
                    )}
                  </>
                );
              })()}
          </button>
        )}
      </div>

      {/* ===================================================================
          Section 4: EV / SP editor
          Champions format uses the Stat Points (SP) system: 0-32 per stat,
          no IVs, no total budget cap. Classic formats use EVs 0-252, cap 510.
          =================================================================== */}
      <div className="px-3 py-3 md:px-4">
        <p className="text-muted-foreground mb-2 text-[10px] font-semibold tracking-wide uppercase">
          {isChampionsFormat ? "Stat Points" : "EVs"}
        </p>
        <EvEditor
          evs={evs}
          ivs={ivs}
          baseStats={baseStats}
          nature={pokemon.nature}
          level={pokemon.level ?? 50}
          isStatPoints={isChampionsFormat}
          onChange={(stat, value) =>
            onUpdate(`ev_${statToDbField(stat)}`, value)
          }
          onPreset={handleEvPreset}
          disabled={disabled}
        />
        {renderFieldError("evs", "evTotal")}
      </div>

      {/* ===================================================================
          Section 5: IV editor (hidden for Champions format)
          =================================================================== */}
      {!isChampionsFormat && (
        <div className="px-3 py-3 md:px-4">
          <IvEditor
            ivs={ivs}
            onChange={(stat, value) =>
              onUpdate(`iv_${statToDbField(stat)}`, value)
            }
            disabled={disabled}
          />
        </div>
      )}

      {/* ===================================================================
          Section 6: Notes — collapsible textarea
          =================================================================== */}
      <div
        className={cn(
          "px-3 py-3 md:px-4",
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
          <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
            Notes
          </p>
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
      </div>
    </div>
  );
}
