"use client";

import { useRef, useState } from "react";

import { NATURE_EFFECTS, getSpeciesTypes, type GameFormat } from "@trainers/pokemon";
import { type Tables, type TablesUpdate } from "@trainers/supabase";

import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { type ValidationError } from "../../validation-hooks";
import { Sprite } from "../sprite";
import { TypePill } from "../type-pill";
import { TypeDot } from "../type-dot";
import {
  formatSupportsDynamax,
  formatSupportsLevel,
  formatSupportsTera,
} from "../format-gating";
import { AbilityPicker } from "../pickers/ability-picker";
import { ItemPicker } from "../pickers/item-picker";
import { NaturePicker } from "../pickers/nature-picker";
import { NumberPicker } from "../pickers/number-picker";
import { SpeciesPicker } from "../pickers/species-picker";
import { TypePicker } from "../pickers/type-picker";
import { FieldError } from "../validation/field-error";
import s from "../builder.module.css";

// =============================================================================
// Types
// =============================================================================

interface IdentityLaneProps {
  pokemon: Tables<"pokemon">;
  format: GameFormat | undefined;
  /** Held items from sibling pokemon — passed to ItemPicker for dup warning. */
  teamItems: string[];
  onUpdate: (fields: Partial<TablesUpdate<"pokemon">>) => void;
  /** Validation errors scoped to identity + loadout fields. */
  fieldErrors?: ValidationError[];
}

type GenderValue = "Male" | "Female" | null;

// =============================================================================
// Helpers
// =============================================================================

function genderSymbol(g: GenderValue): string {
  if (g === "Male") return "♂";
  if (g === "Female") return "♀";
  return "—";
}

function nextGender(current: GenderValue): GenderValue {
  if (current === null) return "Male";
  if (current === "Male") return "Female";
  return null;
}

function errorsForField(errors: ValidationError[], field: string): ValidationError[] {
  return errors.filter((e) => e.field === field);
}

function errorsForFields(errors: ValidationError[], fields: string[]): ValidationError[] {
  return errors.filter((e) => fields.includes(e.field));
}

// Short stat label for nature effect display
const STAT_SHORT: Record<string, string> = {
  attack: "Atk",
  defense: "Def",
  specialAttack: "SpA",
  specialDefense: "SpD",
  speed: "Spe",
  hp: "HP",
};

// =============================================================================
// IdentityLane
// =============================================================================

/**
 * Combined IDENTITY + LOADOUT lane — sprite column on the left, form sheet on
 * the right.
 *
 * Sprite column:
 *   - 128×128 sprite with type-tinted background (click → species picker)
 *   - Species pill below (click → species picker, responsive width)
 *
 * Form column:
 *   Banner (2 rows, separated from form rows by a thin border):
 *     Row 1 — nickname input (full-width, dashed-border-on-hover)
 *     Row 2 — type pills + gender chip + shiny chip + dynamax chip (gen-gated)
 *
 *   Labeled form rows for loadout:
 *     Item | Ability | Nature | Level (gen-gated) | Tera (gen-gated)
 */
export function IdentityLane({
  pokemon,
  format,
  teamItems,
  onUpdate,
  fieldErrors = [],
}: IdentityLaneProps) {
  const types = getSpeciesTypes(pokemon.species ?? "");
  const nicknameRef = useRef<HTMLInputElement>(null);
  const [nickDraft, setNickDraft] = useState(pokemon.nickname ?? "");
  const [levelOpen, setLevelOpen] = useState(false);
  const [dmaxOpen, setDmaxOpen] = useState(false);
  const [speciesOpen, setSpeciesOpen] = useState(false);
  const [itemOpen, setItemOpen] = useState(false);
  const [abilityOpen, setAbilityOpen] = useState(false);
  const [natureOpen, setNatureOpen] = useState(false);
  const [teraOpen, setTeraOpen] = useState(false);

  const level = pokemon.level ?? 50;
  const gender = pokemon.gender as GenderValue;
  const isShiny = pokemon.is_shiny ?? false;
  const showDynamax = formatSupportsDynamax(format);
  const showLevel = formatSupportsLevel(format);
  const showTera = formatSupportsTera(format);

  // Nature effect labels for the mini suffix
  const natureEffect = pokemon.nature ? NATURE_EFFECTS[pokemon.nature] : undefined;
  const natUp = natureEffect?.boost;
  const natDown = natureEffect?.reduce;

  // Error partitions
  const nicknameErrors = errorsForField(fieldErrors, "nickname");
  const speciesErrors = errorsForField(fieldErrors, "species");
  const genderErrors = errorsForField(fieldErrors, "gender");
  const itemErrors = errorsForFields(fieldErrors, ["item", "heldItem"]);
  const abilityErrors = errorsForField(fieldErrors, "ability");
  const natureErrors = errorsForField(fieldErrors, "nature");

  function handleNickBlur() {
    const trimmed = nickDraft.trim();
    // Treat "empty" OR "matches species" as "no nickname" so the displayed
    // name falls back to the species without storing a redundant override.
    const next =
      trimmed === "" || trimmed === pokemon.species ? null : trimmed;
    if (next !== pokemon.nickname) {
      onUpdate({ nickname: next });
      // Reflect the canonical state — if the user typed the species name, snap
      // the field back to empty so future edits start clean.
      if (next === null && nickDraft !== "") {
        setNickDraft("");
      }
    }
  }

  function handleGenderToggle() {
    onUpdate({ gender: nextGender(gender) });
  }

  function handleShinyToggle() {
    onUpdate({ is_shiny: !isShiny });
  }

  // TODO: pass team siblings for synergy hints
  const currentTeam: Array<{ species: string }> = [];

  return (
    <Popover open={speciesOpen} onOpenChange={setSpeciesOpen}>
    <div className="flex min-w-0 gap-3 p-3">
      {/* ── Sprite column ─────────────────────────────────────────── */}
        <div className="flex shrink-0 flex-col items-center justify-center gap-1 self-center">
          {/* "Pokemon" eyebrow label, centered above the sprite */}
          <span className={s.formLabel}>Pokemon</span>

          {/* Sprite — 144×144, click to open species picker */}
          <PopoverTrigger
            render={
              <button
                type="button"
                aria-label={`Change species (${pokemon.species ?? "none"})`}
                className="shrink-0 transition-opacity hover:opacity-80"
              />
            }
          >
            <Sprite species={pokemon.species ?? ""} types={types} size={144} />
          </PopoverTrigger>
        </div>

        <PopoverContent
          side="bottom"
          align="start"
          sideOffset={6}
          className="w-[920px] max-w-[calc(100vw-2rem)] p-0"
          style={{ maxHeight: "min(70vh, 640px)" }}
        >
          <SpeciesPicker
            value={pokemon.species ?? null}
            format={format}
            currentTeam={currentTeam}
            onPick={(species) => {
              setSpeciesOpen(false);
              if (species === pokemon.species) return;
              setNickDraft("");
              onUpdate({
                species,
                nickname: null,
                held_item: null,
                ability: "",
                nature: "Serious",
                tera_type: null,
                gender: null,
                is_shiny: false,
                move1: "",
                move2: null,
                move3: null,
                move4: null,
                ev_hp: 0,
                ev_attack: 0,
                ev_defense: 0,
                ev_special_attack: 0,
                ev_special_defense: 0,
                ev_speed: 0,
                iv_hp: 31,
                iv_attack: 31,
                iv_defense: 31,
                iv_special_attack: 31,
                iv_special_defense: 31,
                iv_speed: 31,
              });
            }}
            onClose={() => setSpeciesOpen(false)}
          />
        </PopoverContent>

      {/* ── Form column ───────────────────────────────────────────── */}
      <div className="flex min-w-0 w-56 shrink-0 flex-col justify-center gap-0.5">

        {/* BANNER — species pill + nickname + chips */}
        <div className={s.idBanner}>
          {/* Row 0: Species pill — typeable control that opens the picker */}
          <PopoverTrigger
            render={
              <button
                type="button"
                aria-label={`Change species (${pokemon.species ?? "none"})`}
                className={cn(
                  "border-border bg-background hover:border-primary focus-visible:border-primary",
                  "flex w-full items-center gap-1 rounded-md border px-2 py-1.5 text-left text-xs",
                  "outline-none transition-colors"
                )}
              />
            }
          >
            <span
              className={cn(
                "min-w-0 flex-1 truncate",
                pokemon.species
                  ? "text-foreground font-medium"
                  : "text-muted-foreground"
              )}
              title={pokemon.species ?? undefined}
            >
              {pokemon.species ?? "Choose species…"}
            </span>
            <span aria-hidden className="text-muted-foreground text-[9px]">
              ▾
            </span>
          </PopoverTrigger>

          {/* Row 1: Nickname input */}
          <div className="flex flex-col">
            <input
              ref={nicknameRef}
              type="text"
              value={nickDraft}
              onChange={(e) => setNickDraft(e.target.value)}
              onBlur={handleNickBlur}
              onKeyDown={(e) => {
                if (e.key === "Enter") nicknameRef.current?.blur();
              }}
              placeholder="Nickname (optional)"
              maxLength={24}
              aria-label="Nickname"
              className={cn(
                "bg-transparent w-full min-w-0 truncate text-sm font-bold outline-none",
                "border-b border-transparent placeholder:text-muted-foreground/50 placeholder:font-normal",
                "hover:border-dashed hover:border-border focus:border-solid focus:border-primary",
                "leading-snug py-0.5",
                nicknameErrors.length > 0 &&
                  "border-destructive focus:border-destructive"
              )}
            />
            {nicknameErrors.map((err, i) => (
              <FieldError key={i} message={err.message} severity={err.severity} />
            ))}
          </div>

          {/* Row 2: Type pills + gender + shiny + dynamax */}
          <div className="flex flex-wrap items-center gap-1">
            {/* Type pills */}
            {types.map((t) => (
              <TypePill key={t} t={t} />
            ))}

            {/* Gender 3-way toggle: ♂ / ♀ / — */}
            <div className="flex flex-col">
              <button
                type="button"
                onClick={handleGenderToggle}
                title="Toggle gender"
                className={cn(
                  "bg-muted/60 hover:bg-muted border-border rounded border px-1.5 py-0.5 text-[10px] font-medium",
                  genderErrors.length > 0 && "border-destructive"
                )}
              >
                {genderSymbol(gender)}
              </button>
              {genderErrors.map((err, i) => (
                <FieldError key={i} message={err.message} severity={err.severity} />
              ))}
            </div>

            {/* Shiny toggle */}
            <button
              type="button"
              onClick={handleShinyToggle}
              aria-pressed={isShiny}
              title={isShiny ? "Shiny (click to clear)" : "Not shiny (click to set)"}
              className={cn(
                "border-border rounded border px-1.5 py-0.5 text-[10px] font-medium transition-colors",
                isShiny
                  ? "bg-yellow-400/20 text-yellow-600 border-yellow-400/40 dark:text-yellow-400"
                  : "bg-muted/60 hover:bg-muted text-muted-foreground"
              )}
            >
              ✦
            </button>

            {/* Dynamax chip — only when format supports it */}
            {showDynamax && (
              <Popover open={dmaxOpen} onOpenChange={setDmaxOpen}>
                <PopoverTrigger
                  render={
                    <button
                      type="button"
                      className="bg-muted/60 hover:bg-muted border-border rounded border px-1.5 py-0.5 font-mono text-[10px] font-medium"
                    />
                  }
                >
                  DMax{" "}
                  {((pokemon as Record<string, unknown>)["dynamax_level"] as number) ?? 10}
                </PopoverTrigger>
                <PopoverContent side="bottom" align="start" className="w-auto p-0">
                  <NumberPicker
                    title="Dynamax Level"
                    value={
                      ((pokemon as Record<string, unknown>)["dynamax_level"] as number) ?? 10
                    }
                    min={0}
                    max={10}
                    onChange={(v) =>
                      onUpdate({
                        ["dynamax_level" as keyof TablesUpdate<"pokemon">]: v as never,
                      })
                    }
                    onClose={() => setDmaxOpen(false)}
                  />
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>

        {/* LOADOUT FORM ROWS */}

        {/* Item */}
        <div className="flex flex-col">
          <Popover open={itemOpen} onOpenChange={setItemOpen}>
            <PopoverTrigger
              render={
                <button
                  type="button"
                  className={cn(
                    s.formRow,
                    itemErrors.length > 0 && "ring-1 ring-destructive/40 rounded"
                  )}
                />
              }
            >
              <span className={s.formLabel}>Item</span>
              <span
                className={cn(
                  s.formValue,
                  !pokemon.held_item && "text-muted-foreground/50 italic"
                )}
              >
                {pokemon.held_item ?? "—"}
              </span>
            </PopoverTrigger>
            <PopoverContent side="bottom" align="start" className="w-auto p-0">
              <ItemPicker
                value={pokemon.held_item}
                format={format}
                teamItems={teamItems}
                onPick={(item) => onUpdate({ held_item: item })}
                onClose={() => setItemOpen(false)}
              />
            </PopoverContent>
          </Popover>
          {itemErrors.map((err, i) => (
            <FieldError key={i} message={err.message} severity={err.severity} className="px-1" />
          ))}
        </div>

        {/* Ability */}
        <div className="flex flex-col">
          <Popover open={abilityOpen} onOpenChange={setAbilityOpen}>
            <PopoverTrigger
              render={
                <button
                  type="button"
                  className={cn(
                    s.formRow,
                    abilityErrors.length > 0 && "ring-1 ring-destructive/40 rounded"
                  )}
                />
              }
            >
              <span className={s.formLabel}>Abil</span>
              <span
                className={cn(
                  s.formValue,
                  !pokemon.ability && "text-muted-foreground/50 italic"
                )}
              >
                {pokemon.ability || "—"}
              </span>
            </PopoverTrigger>
            <PopoverContent side="bottom" align="start" className="w-auto p-0">
              <AbilityPicker
                value={pokemon.ability}
                species={pokemon.species ?? ""}
                format={format}
                onPick={(ability) => onUpdate({ ability })}
                onClose={() => setAbilityOpen(false)}
              />
            </PopoverContent>
          </Popover>
          {abilityErrors.map((err, i) => (
            <FieldError key={i} message={err.message} severity={err.severity} className="px-1" />
          ))}
        </div>

        {/* Nature */}
        <div className="flex flex-col">
          <Popover open={natureOpen} onOpenChange={setNatureOpen}>
            <PopoverTrigger
              render={
                <button
                  type="button"
                  className={cn(
                    s.formRow,
                    natureErrors.length > 0 && "ring-1 ring-destructive/40 rounded"
                  )}
                />
              }
            >
              <span className={s.formLabel}>Nat</span>
              <span className="flex flex-col leading-tight">
                <span
                  className={cn(
                    "text-foreground text-[11.5px]",
                    !pokemon.nature && "text-muted-foreground/50 italic"
                  )}
                >
                  {pokemon.nature || "—"}
                </span>
                {natUp && natDown && (
                  <span className="text-muted-foreground font-mono text-[9px] leading-tight">
                    +{STAT_SHORT[natUp] ?? natUp} / −
                    {STAT_SHORT[natDown] ?? natDown}
                  </span>
                )}
              </span>
            </PopoverTrigger>
            <PopoverContent side="bottom" align="start" className="w-auto p-0">
              <NaturePicker
                value={pokemon.nature ?? ""}
                onPick={(nature) => onUpdate({ nature })}
                onClose={() => setNatureOpen(false)}
              />
            </PopoverContent>
          </Popover>
          {natureErrors.map((err, i) => (
            <FieldError key={i} message={err.message} severity={err.severity} className="px-1" />
          ))}
        </div>

        {/* Level — gen-gated (hidden for Champions formats) */}
        {showLevel && (
          <Popover open={levelOpen} onOpenChange={setLevelOpen}>
            <PopoverTrigger
              render={
                <button type="button" className={s.formRow} />
              }
            >
              <span className={s.formLabel}>Lv</span>
              <span className={s.formValue}>{level}</span>
            </PopoverTrigger>
            <PopoverContent side="bottom" align="start" className="w-auto p-0">
              <NumberPicker
                title="Level"
                value={level}
                min={1}
                max={100}
                onChange={(v) => onUpdate({ level: v })}
                onClose={() => setLevelOpen(false)}
              />
            </PopoverContent>
          </Popover>
        )}

        {/* Tera — gen-gated (only when format supports Terastallization) */}
        {showTera && (
          <Popover open={teraOpen} onOpenChange={setTeraOpen}>
            <PopoverTrigger
              render={
                <button type="button" className={s.formRow} />
              }
            >
              <span className={s.formLabel}>Tera</span>
              <span className="flex min-w-0 items-center gap-1.5 overflow-hidden">
                {pokemon.tera_type ? (
                  <>
                    <TypeDot t={pokemon.tera_type} size={10} />
                    <span className={s.formValue}>{pokemon.tera_type}</span>
                  </>
                ) : (
                  <span className={cn(s.formValue, "text-muted-foreground/50 italic")}>—</span>
                )}
              </span>
            </PopoverTrigger>
            <PopoverContent side="bottom" align="start" className="w-auto p-0">
              <TypePicker
                value={pokemon.tera_type}
                onPick={(type) => onUpdate({ tera_type: type })}
                onClose={() => setTeraOpen(false)}
              />
            </PopoverContent>
          </Popover>
        )}

        {/* Species validation errors */}
        {speciesErrors.map((err, i) => (
          <FieldError key={i} message={err.message} severity={err.severity} />
        ))}
      </div>
    </div>
    </Popover>
  );
}
