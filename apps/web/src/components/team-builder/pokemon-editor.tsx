"use client";

import { useState } from "react";

import {
  type GameFormat,
  getBaseStats,
  getSpeciesTypes,
} from "@trainers/pokemon";
import { type Tables } from "@trainers/supabase";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, Star } from "lucide-react";

import { type StatKey } from "./stat-types";
import { AbilityPicker } from "./ability-picker";
import { EvEditor } from "./ev-editor";
import { ItemPicker } from "./item-picker";
import { IvEditor } from "./iv-editor";
import { MovePicker } from "./move-picker";
import { NaturePicker } from "./nature-picker";
import { TeraPicker } from "./tera-picker";
import { TYPE_PILL_COLORS } from "./type-colors";

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
  | "nature"
  | "tera"
  | `move-${number}`
  | null;

interface PokemonEditorProps {
  pokemon: Tables<"pokemon">;
  format: GameFormat | undefined;
  /** All team_pokemon entries — used to collect held items for duplicate detection. */
  teamPokemon: Array<{ pokemon: Tables<"pokemon"> | null }>;
  onUpdate: (field: string, value: unknown) => void;
  onSpeciesClick: () => void;
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
 *   1. Species header with type pills and level input
 *   2. 2-column field grid: ability, item, nature, tera type
 *   3. Optional fields row: nickname, gender, shiny toggle
 *   4. Moves: 2x2 grid of move slots
 *   5. EV editor
 *   6. IV editor (hidden for Champions format)
 *   7. Notes collapsible textarea
 */
export function PokemonEditor({
  pokemon,
  format,
  teamPokemon,
  onUpdate,
  onSpeciesClick,
}: PokemonEditorProps) {
  const [activePicker, setActivePicker] = useState<ActivePicker>(null);
  const [notesOpen, setNotesOpen] = useState(false);

  // -------------------------------------------------------------------------
  // Derived values
  // -------------------------------------------------------------------------

  const types = getSpeciesTypes(pokemon.species);
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
  const isChampionsFormat = format?.id === "champions";

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  function openPicker(picker: ActivePicker) {
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
          Section 1: Species header
          =================================================================== */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Species name — clickable to open species picker */}
        <button
          type="button"
          onClick={onSpeciesClick}
          className={cn(
            "flex items-center gap-1 text-lg font-bold",
            "hover:text-primary transition-colors"
          )}
        >
          {pokemon.species}
          <ChevronDown className="text-muted-foreground size-4" />
        </button>

        {/* Type pills */}
        <div className="flex gap-1">
          {types.map((type) => (
            <span
              key={type}
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] leading-none font-semibold",
                TYPE_PILL_COLORS[type] ?? "bg-muted text-foreground"
              )}
            >
              {type}
            </span>
          ))}
        </div>

        {/* Level input */}
        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-muted-foreground text-xs">Lv</span>
          <Input
            type="number"
            min={1}
            max={100}
            value={pokemon.level ?? 50}
            onChange={(e) => {
              const raw = parseInt(e.target.value, 10);
              if (!isNaN(raw)) {
                onUpdate("level", Math.max(1, Math.min(100, raw)));
              }
            }}
            className="h-7 w-14 px-1 text-center text-sm"
            aria-label="Pokemon level"
          />
        </div>
      </div>

      {/* ===================================================================
          Section 2: 2-column field grid (ability, item, nature, tera type)
          =================================================================== */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-0 divide-y px-4">
        {/* Ability */}
        <div className="col-span-2 py-2">
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
          ) : (
            <button
              type="button"
              onClick={() => openPicker("ability")}
              className={cn(
                "flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm",
                "hover:bg-muted/50 transition-colors"
              )}
            >
              <span className="font-medium">{pokemon.ability}</span>
              <ChevronDown className="text-muted-foreground size-3.5" />
            </button>
          )}
        </div>

        {/* Item */}
        <div className="col-span-2 py-2">
          <p className="text-muted-foreground mb-1 text-[10px] font-semibold tracking-wide uppercase">
            Held Item
          </p>
          {activePicker === "item" ? (
            <ItemPicker
              value={pokemon.held_item}
              teamItems={teamItems}
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
                "flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm",
                "hover:bg-muted/50 transition-colors"
              )}
            >
              <span
                className={cn(
                  "font-medium",
                  !pokemon.held_item && "text-muted-foreground"
                )}
              >
                {pokemon.held_item ?? "None"}
              </span>
              <ChevronDown className="text-muted-foreground size-3.5" />
            </button>
          )}
        </div>

        {/* Nature + Tera Type side-by-side */}
        <div className="py-2">
          <p className="text-muted-foreground mb-1 text-[10px] font-semibold tracking-wide uppercase">
            Nature
          </p>
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
              className={cn(
                "flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm",
                "hover:bg-muted/50 transition-colors"
              )}
            >
              <span className="font-medium">{pokemon.nature}</span>
              <ChevronDown className="text-muted-foreground size-3.5" />
            </button>
          )}
        </div>

        <div className="py-2">
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
                "flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm",
                "hover:bg-muted/50 transition-colors"
              )}
            >
              <span
                className={cn(
                  "font-medium",
                  !pokemon.tera_type && "text-muted-foreground"
                )}
              >
                {pokemon.tera_type ?? "None"}
              </span>
              <ChevronDown className="text-muted-foreground size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ===================================================================
          Section 3: Optional fields — nickname, gender, shiny toggle
          =================================================================== */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Nickname */}
        <Input
          placeholder="Nickname"
          value={pokemon.nickname ?? ""}
          onChange={(e) => onUpdate("nickname", e.target.value || null)}
          className="h-7 flex-1 text-sm"
          aria-label="Pokemon nickname"
        />

        {/* Gender selector — only when species has gender differences */}
        {pokemon.gender !== null && (
          <div className="flex gap-0.5 rounded border p-0.5">
            {(["Male", "Female"] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => onUpdate("gender", g)}
                className={cn(
                  "rounded px-2 py-0.5 text-xs font-medium transition-colors",
                  pokemon.gender === g
                    ? g === "Male"
                      ? "bg-blue-500 text-white"
                      : "bg-pink-500 text-white"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                {g === "Male" ? "♂" : "♀"}
              </button>
            ))}
          </div>
        )}

        {/* Shiny toggle */}
        <button
          type="button"
          onClick={() => onUpdate("is_shiny", !(pokemon.is_shiny ?? false))}
          aria-label="Toggle shiny"
          aria-pressed={pokemon.is_shiny ?? false}
          className={cn(
            "flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors",
            pokemon.is_shiny
              ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
              : "text-muted-foreground hover:bg-muted"
          )}
        >
          <Star
            className={cn(
              "size-3.5",
              pokemon.is_shiny && "fill-yellow-500 text-yellow-500"
            )}
          />
          Shiny
        </button>
      </div>

      {/* ===================================================================
          Section 4: Moves — 2x2 grid
          =================================================================== */}
      <div className="px-4 py-3">
        <p className="text-muted-foreground mb-2 text-[10px] font-semibold tracking-wide uppercase">
          Moves
        </p>
        <div className="grid grid-cols-2 gap-2">
          {MOVE_SLOTS.map((slot) => {
            const moveValue = getMoveBySlot(pokemon, slot);
            const pickerKey = `move-${slot}` as const;
            const isOpen = activePicker === pickerKey;

            return (
              <div key={slot}>
                {isOpen ? (
                  <MovePicker
                    species={pokemon.species}
                    value={moveValue}
                    onSelect={(val) => {
                      onUpdate(`move${slot}`, val);
                      closePicker();
                    }}
                    onClose={closePicker}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => openPicker(pickerKey)}
                    className={cn(
                      "flex w-full items-center justify-between rounded border px-2 py-1.5 text-left text-sm",
                      "hover:bg-muted/50 transition-colors",
                      !moveValue && "border-dashed"
                    )}
                  >
                    <span
                      className={cn(
                        "truncate text-sm",
                        moveValue
                          ? "font-medium"
                          : "text-muted-foreground text-xs"
                      )}
                    >
                      {moveValue ?? `Move ${slot}`}
                    </span>
                    <ChevronDown className="text-muted-foreground ml-1 size-3.5 shrink-0" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ===================================================================
          Section 5: EV editor
          =================================================================== */}
      <div className="px-4 py-3">
        <p className="text-muted-foreground mb-2 text-[10px] font-semibold tracking-wide uppercase">
          EVs
        </p>
        <EvEditor
          evs={evs}
          ivs={ivs}
          baseStats={baseStats}
          nature={pokemon.nature}
          level={pokemon.level ?? 50}
          onChange={(stat, value) =>
            onUpdate(`ev_${statToDbField(stat)}`, value)
          }
          onPreset={handleEvPreset}
        />
      </div>

      {/* ===================================================================
          Section 6: IV editor (hidden for Champions format)
          =================================================================== */}
      {!isChampionsFormat && (
        <div className="px-4 py-3">
          <IvEditor
            ivs={ivs}
            onChange={(stat, value) =>
              onUpdate(`iv_${statToDbField(stat)}`, value)
            }
          />
        </div>
      )}

      {/* ===================================================================
          Section 7: Notes — collapsible textarea
          =================================================================== */}
      <div className="px-4 py-3">
        <button
          type="button"
          onClick={() => setNotesOpen((prev) => !prev)}
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
          />
        )}
      </div>
    </div>
  );
}
