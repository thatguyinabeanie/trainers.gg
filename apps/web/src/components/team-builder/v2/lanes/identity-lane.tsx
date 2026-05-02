"use client";

import { useRef, useState } from "react";

import {
  NATURE_EFFECTS,
  getCanonicalBaseSpecies,
  getFormsForSpecies,
  getMegaStoneForSpecies,
  getSpeciesTypes,
  speciesHasForms,
  type GameFormat,
} from "@trainers/pokemon";
import { type Tables, type TablesUpdate } from "@trainers/supabase";

import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { STAT_LABELS } from "../../stat-types";
import { type ValidationError } from "../../validation-hooks";
import { Sprite } from "../sprite";
import { TypeDot } from "../type-dot";
import {
  formatSupportsTera,
} from "../format-gating";
import { AbilityPicker } from "../pickers/ability-picker";
import { ItemPicker } from "../pickers/item-picker";
import { NaturePicker } from "../pickers/nature-picker";
import { SpeciesPicker } from "../pickers/species-picker";
import { TypePicker } from "../pickers/type-picker";
import { FieldError } from "../validation/field-error";
import s from "../builder.module.css";

// =============================================================================
// Types
// =============================================================================

interface IdentityLaneProps {
  pokemon: Tables<"pokemon"> | null;
  format?: GameFormat;
  /** Held items from sibling pokemon — passed to ItemPicker for dup warning. */
  teamItems?: string[];
  onUpdate?: (fields: Partial<TablesUpdate<"pokemon">>) => void;
  /** Validation errors scoped to identity + loadout fields. */
  fieldErrors?: ValidationError[];
  /** Sibling pokemon on the same team — used for species-picker synergy hints. */
  teamSiblings?: { species: string }[];
}

interface IdentityLaneRealProps {
  pokemon: Tables<"pokemon">;
  format: GameFormat | undefined;
  teamItems: string[];
  teamSiblings: { species: string }[];
  onUpdate: (fields: Partial<TablesUpdate<"pokemon">>) => void;
  fieldErrors: ValidationError[];
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


// =============================================================================
// IdentityLaneGhost — static visual placeholder (no interactive elements)
// =============================================================================

function IdentityLaneGhost() {
  return (
    <div className="flex min-w-0 gap-3 p-3">
      {/* Sprite column */}
      <div className="flex shrink-0 flex-col items-center justify-center gap-2 self-center">
        {/* Species pill ghost — static div, NOT a button */}
        <div className="border-border bg-background flex w-36 items-center gap-1 rounded-md border border-dashed px-2 py-1.5 text-left text-xs sm:w-40 md:w-44">
          <span className="min-w-0 flex-1 truncate text-muted-foreground/50">
            + Add Pokémon
          </span>
          <span aria-hidden className="text-[9px] text-muted-foreground/30">
            ▾
          </span>
        </div>
        {/* Sprite ghost — static div, NOT a button */}
        <div className="size-[144px] rounded-xl bg-muted/40" />
      </div>

      {/* Form column */}
      <div className="flex w-56 min-w-0 shrink-0 flex-col justify-center gap-0.5">
        {/* Banner ghost — same className as real banner */}
        <div className={s.idBanner}>
          <div className="flex h-[22px] items-center">
            <span className="text-sm font-normal text-muted-foreground/20 italic">
              Nickname (optional)
            </span>
          </div>
          <div className="flex h-[18px] items-center gap-1">
            <div className="h-3.5 w-10 rounded bg-muted/30" />
          </div>
        </div>
        {/* Loadout rows ghost — Item / Abil / Nat with em-dashes, static divs */}
        {(["Item", "Abil", "Nat"] as const).map((label) => (
          <div key={label} className={s.formRow}>
            <span className={s.formLabel}>{label}</span>
            <span className={cn(s.formValue, "text-muted-foreground/25 italic")}>
              —
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// FormChips — species form switcher (regular ↔ mega ↔ alt)
// =============================================================================

interface FormChipsProps {
  currentSpecies: string;
  currentItem: string | null;
  onPick: (species: string) => void;
}

/**
 * Render a row of one-tap chips for selecting between a Pokemon's available
 * forms (regular, megas, battle-mode forms like Aegislash-Blade). Hidden
 * when the species has only one form. Picking a mega form auto-sets the
 * required mega stone via the parent's onPick handler.
 */
function FormChips({ currentSpecies, currentItem, onPick }: FormChipsProps) {
  const forms = getFormsForSpecies(currentSpecies);
  if (forms.length <= 1) return null;
  const base = getCanonicalBaseSpecies(currentSpecies);
  // Drop the base form — chips act as toggles. The "off" state is the base
  // form; clicking an active chip returns to base.
  const altForms = forms.filter((f) => f !== base);
  return (
    <div className="flex flex-wrap gap-1 px-1 pt-0.5">
      {altForms.map((form) => {
        const active = form === currentSpecies;
        const stone = getMegaStoneForSpecies(form);
        // Common case: alt form is "<base>-<suffix>" (Charizard-Mega-Y,
        // Aegislash-Blade). Strip the base + dash and render the rest.
        // Edge case (Floette): canonical base is "Floette-Eternal" but the
        // alt is "Floette-Mega" — they share a root, not a prefix. Fall
        // back to the substring after the last hyphen so we still render
        // a meaningful chip ("Mega").
        const label = form.startsWith(base + "-")
          ? form.slice(base.length + 1).replace(/-/g, " ")
          : form.slice(form.lastIndexOf("-") + 1);
        // Indicate when the chip would auto-attach a mega stone, but only
        // when the current item isn't already that stone.
        const willChangeItem = stone !== null && stone !== currentItem;
        // Click an inactive chip → switch to that form. Click the active
        // chip → toggle back to the base form.
        const target = active ? base : form;
        return (
          <button
            key={form}
            type="button"
            onClick={() => onPick(target)}
            aria-pressed={active}
            title={
              active
                ? `Toggle off — return to ${base}`
                : stone
                  ? `${form}${willChangeItem ? ` — sets item to ${stone}` : ""}`
                  : form
            }
            className={cn(
              "rounded-md border px-2 py-0.5 text-[10.5px] font-semibold transition-colors",
              active
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground"
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

// =============================================================================
// IdentityLaneReal — full interactive lane (existing logic, unchanged)
// =============================================================================

function IdentityLaneReal({
  pokemon,
  format,
  teamItems,
  teamSiblings,
  onUpdate,
  fieldErrors,
}: IdentityLaneRealProps) {
  const types = getSpeciesTypes(pokemon.species ?? "");
  const nicknameRef = useRef<HTMLInputElement>(null);
  const [nickDraft, setNickDraft] = useState(pokemon.nickname ?? "");
  const [speciesOpen, setSpeciesOpen] = useState(false);
  const [itemOpen, setItemOpen] = useState(false);
  const [abilityOpen, setAbilityOpen] = useState(false);
  const [natureOpen, setNatureOpen] = useState(false);
  const [teraOpen, setTeraOpen] = useState(false);

  const gender = pokemon.gender as GenderValue;
  const isShiny = pokemon.is_shiny ?? false;
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

  const currentTeam = (teamSiblings ?? [])
    .filter((p): p is { species: string } => typeof p.species === "string" && p.species.length > 0);

  return (
    <div className="flex min-w-0 gap-3 p-3">
      {/* ── Sprite column + species picker (self-contained Popover) ── */}
      <Popover open={speciesOpen} onOpenChange={setSpeciesOpen}>
        <div className="flex shrink-0 flex-col items-center justify-center gap-2 self-center">
          {/* Species pill — typeable control above the sprite */}
          <PopoverTrigger
            render={
              <button
                type="button"
                aria-label={`Change species (${pokemon.species ?? "none"})`}
                className={cn(
                  "border-border bg-background hover:border-primary focus-visible:border-primary",
                  "flex w-36 items-center gap-1 rounded-md border px-2 py-1.5 text-left text-xs",
                  "outline-none transition-colors sm:w-40 md:w-44"
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
      </Popover>

      {/* ── Form column (sibling of species Popover) ─────────────── */}
      <div className="flex min-w-0 w-56 shrink-0 flex-col justify-center gap-0.5">

        {/* BANNER — nickname + chips rows */}
        <div className={s.idBanner}>
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

          {/* Row 2: gender + shiny (right-aligned since types are no longer here) */}
          <div className="flex items-center justify-end gap-1">
            {/* Gender 3-way toggle */}
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
          </div>
        </div>

        {/* FORM CHIPS — only when species has alternate forms */}
        {pokemon.species && speciesHasForms(pokemon.species) && (
          <FormChips
            currentSpecies={pokemon.species}
            currentItem={pokemon.held_item}
            onPick={(nextSpecies) => {
              if (nextSpecies === pokemon.species) return;
              const fields: Partial<TablesUpdate<"pokemon">> = {
                species: nextSpecies,
              };
              // Auto-set the mega stone when switching to a mega form. If
              // switching away from a mega, clear the stone (only when the
              // current item IS a mega stone — leaves user-set non-mega
              // items alone).
              const nextStone = getMegaStoneForSpecies(nextSpecies);
              const currentStone = pokemon.species
                ? getMegaStoneForSpecies(pokemon.species)
                : null;
              if (nextStone) {
                fields.held_item = nextStone;
              } else if (currentStone && pokemon.held_item === currentStone) {
                fields.held_item = null;
              }
              onUpdate(fields);
            }}
          />
        )}

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
              <span className="flex min-w-0 items-baseline gap-1.5">
                <span
                  className={cn(
                    "text-foreground text-[11.5px]",
                    !pokemon.nature && "text-muted-foreground/50 italic"
                  )}
                >
                  {pokemon.nature || "—"}
                </span>
                {natUp && natDown && (
                  <span className="font-mono text-[9px] whitespace-nowrap">
                    <span className="text-emerald-600 dark:text-emerald-400">
                      +{STAT_LABELS[natUp] ?? natUp}
                    </span>
                    <span className="text-muted-foreground">/</span>
                    <span className="text-rose-600 dark:text-rose-400">
                      −{STAT_LABELS[natDown] ?? natDown}
                    </span>
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
  );
}

// =============================================================================
// IdentityLane — public dispatcher
// =============================================================================

/**
 * Combined IDENTITY + LOADOUT lane — sprite column on the left, form sheet on
 * the right.
 *
 * When `pokemon` is null, renders a purely static ghost placeholder (no
 * buttons, inputs, or popovers) so an outer `<button>` wrapper (EmptyRow) can
 * safely contain it without nested-button violations.
 *
 * Sprite column:
 *   - 128×128 sprite with type-tinted background (click → species picker)
 *   - Species pill below (click → species picker, responsive width)
 *
 * Form column (w-56):
 *   Banner (2 rows):
 *     Row 1 — nickname input
 *     Row 2 — gender + shiny chips
 *
 *   Labeled form rows for loadout:
 *     Item | Ability | Nature | Tera (gen-gated)
 *
 * Note: Type pills and level have moved to RibDecorations inside the
 * active-row rib. Gender and shiny remain here.
 */
export function IdentityLane({
  pokemon,
  format,
  teamItems,
  teamSiblings,
  onUpdate,
  fieldErrors = [],
}: IdentityLaneProps) {
  if (!pokemon) return <IdentityLaneGhost />;
  return (
    <IdentityLaneReal
      pokemon={pokemon}
      format={format}
      teamItems={teamItems ?? []}
      teamSiblings={teamSiblings ?? []}
      onUpdate={onUpdate ?? (() => {})}
      fieldErrors={fieldErrors}
    />
  );
}
