"use client";

import { useRef, useState } from "react";

import {
  NATURE_EFFECTS,
  getAbilityShortDesc,
  getCanonicalBaseSpecies,
  getFormsForSpecies,
  getMegaAbilityForSpecies,
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
import { TooltipTrigger } from "@/components/ui/tooltip";

import { type ValidationError } from "../../validation-hooks";
import { NatureChevrons } from "../nature-chevrons";
import { Sprite } from "../sprite";
import { TypeDot } from "../type-dot";
import { formatSupportsTera } from "../format-gating";
import { AbilityPicker } from "../pickers/ability-picker";
import { ItemPicker } from "../pickers/item-picker";
import { NaturePicker } from "../pickers/nature-picker";
import { SpeciesPickerDialog } from "../pickers/species-picker-dialog";
import { TypePicker } from "../pickers/type-picker";
import { FieldErrors } from "../validation/field-error";
import { useContainerCompact } from "../use-container-compact";
import { DescriptionTooltip } from "./description-tooltip";
import { FormChip } from "./form-chip";
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

function errorsForField(
  errors: ValidationError[],
  field: string
): ValidationError[] {
  return errors.filter((e) => e.field === field);
}

function errorsForFields(
  errors: ValidationError[],
  fields: string[]
): ValidationError[] {
  return errors.filter((e) => fields.includes(e.field));
}

// =============================================================================
// IdentityAbilityRow — ability popover with tooltip + mega secondary line
//
// Extracted from the 75-line IIFE in IdentityLaneReal. Keeps the custom
// Tooltip → TooltipTrigger → PopoverTrigger nesting that FormChip cannot
// model (FormChip is a plain Popover with no outer Tooltip).
// =============================================================================

interface IdentityAbilityRowProps {
  pokemon: Tables<"pokemon">;
  format: GameFormat | undefined;
  abilityOpen: boolean;
  setAbilityOpen: (open: boolean) => void;
  onUpdate: (patch: TablesUpdate<"pokemon">) => void;
  abilityErrors: ValidationError[];
}

function IdentityAbilityRow({
  pokemon,
  format,
  abilityOpen,
  setAbilityOpen,
  onUpdate,
  abilityErrors,
}: IdentityAbilityRowProps) {
  const megaAbility = pokemon.species
    ? getMegaAbilityForSpecies(pokemon.species)
    : null;
  const pickerSpecies = pokemon.species
    ? getCanonicalBaseSpecies(pokemon.species)
    : "";
  const displayAbility = megaAbility ?? pokemon.ability;
  const showTooltip = !abilityOpen;
  const displayDesc = displayAbility
    ? getAbilityShortDesc(displayAbility)
    : null;
  const baseDesc = pokemon.ability
    ? getAbilityShortDesc(pokemon.ability)
    : null;
  return (
    <div className="flex flex-col">
      <Popover open={abilityOpen} onOpenChange={setAbilityOpen}>
        <DescriptionTooltip
          title={displayAbility}
          description={displayDesc}
          showContent={showTooltip}
        >
          <TooltipTrigger
            render={
              <PopoverTrigger
                render={
                  <button
                    type="button"
                    className={cn(
                      s.formRow,
                      abilityErrors.length > 0 &&
                        "ring-destructive/40 rounded ring-1"
                    )}
                  />
                }
              />
            }
          >
            <span className={s.formLabel}>Abil</span>
            <span
              className={cn(
                s.formValue,
                !displayAbility && "text-muted-foreground/50 italic"
              )}
            >
              {displayAbility || "—"}
            </span>
          </TooltipTrigger>
        </DescriptionTooltip>
        {megaAbility && (
          <DescriptionTooltip
            title={pokemon.ability}
            description={baseDesc}
            showContent={showTooltip}
          >
            <TooltipTrigger
              render={
                <button
                  type="button"
                  aria-label={`Change base ability (${pokemon.ability || "none"})`}
                  onClick={() => setAbilityOpen(true)}
                  className="text-muted-foreground/70 hover:bg-muted hover:text-foreground self-start rounded px-1 pt-0.5 font-mono text-[9px]"
                />
              }
            >
              base: {pokemon.ability || "—"}
            </TooltipTrigger>
          </DescriptionTooltip>
        )}
        <PopoverContent side="bottom" align="start" className="w-auto p-0">
          <AbilityPicker
            value={pokemon.ability}
            species={pickerSpecies}
            format={format}
            onPick={(ability) => onUpdate({ ability })}
            onClose={() => setAbilityOpen(false)}
          />
        </PopoverContent>
      </Popover>
      <FieldErrors errors={abilityErrors} className="px-1" />
    </div>
  );
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
          <span className="text-muted-foreground/50 min-w-0 flex-1 truncate">
            + Add Pokémon
          </span>
          <span aria-hidden className="text-muted-foreground/30 text-[9px]">
            ▾
          </span>
        </div>
        {/* Sprite ghost — static div, NOT a button */}
        <div className="bg-muted/40 size-[144px] rounded-xl" />
      </div>

      {/* Form column */}
      <div className="flex w-56 min-w-0 shrink-0 flex-col justify-center gap-0.5">
        {/* Banner ghost — same className as real banner */}
        <div className={s.idBanner}>
          <div className="flex h-[22px] items-center">
            <span className="text-muted-foreground/20 text-sm font-normal italic">
              Nickname
            </span>
          </div>
          <div className="flex h-[18px] items-center gap-1">
            <div className="bg-muted/30 h-3.5 w-10 rounded" />
          </div>
        </div>
        {/* Loadout rows ghost — Item / Abil / Nat with em-dashes, static divs */}
        {(["Item", "Abil", "Nat"] as const).map((label) => (
          <div key={label} className={s.formRow}>
            <span className={s.formLabel}>{label}</span>
            <span
              className={cn(s.formValue, "text-muted-foreground/25 italic")}
            >
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
 * Render a row of one-tap chips for switching between a Pokemon's alternate
 * forms (megas + battle-mode forms like Aegislash-Blade). Hidden when the
 * species has only one form.
 *
 * Mega chips are **disabled** unless the held item is the matching mega
 * stone — they need the stone to fire in canon. Disabled chips show a
 * tooltip explaining the requirement; clicking is a no-op.
 *
 * Battle-mode alt forms (Aegislash-Blade, Wishiwashi-School, Greninja-Ash,
 * Mimikyu-Busted) have no item requirement — those chips are always
 * enabled.
 *
 * Toggle-off behavior: clicking the active chip returns to the base form
 * but **does not clear the held item** — leaves the mega stone attached so
 * the user can re-toggle quickly. Holding a mega stone with the base form
 * is not illegal; it simply doesn't do anything until the user toggles
 * back to the mega form.
 */
function FormChips({ currentSpecies, currentItem, onPick }: FormChipsProps) {
  const forms = getFormsForSpecies(currentSpecies);
  if (forms.length <= 1) return null;
  const base = getCanonicalBaseSpecies(currentSpecies);
  const altForms = forms.filter((f) => f !== base);
  return (
    <div className="flex items-center gap-1">
      {altForms.map((form) => {
        const active = form === currentSpecies;
        const requiredStone = getMegaStoneForSpecies(form);
        // Mega chips need their stone held. Non-mega alt forms (Aegislash-
        // Blade etc) have no item requirement.
        const enabled =
          requiredStone === null ? true : currentItem === requiredStone;
        // Common case: alt form is "<base>-<suffix>" (Charizard-Mega-Y,
        // Aegislash-Blade). Strip the base + dash and render the rest.
        // Edge case (Floette): canonical base is "Floette-Eternal" but the
        // alt is "Floette-Mega" — they share a root, not a prefix. Fall
        // back to the substring after the last hyphen so we still render
        // a meaningful chip ("Mega").
        const label = form.startsWith(base + "-")
          ? form.slice(base.length + 1).replace(/-/g, " ")
          : form.slice(form.lastIndexOf("-") + 1);
        const tooltip = !enabled
          ? `Hold ${requiredStone} to use this form`
          : active
            ? `Toggle off — return to ${base}`
            : form;
        // Click an inactive chip → switch to that form (no item change).
        // Click the active chip → toggle back to the base form (item kept).
        const target = active ? base : form;
        return (
          <button
            key={form}
            type="button"
            onClick={enabled ? () => onPick(target) : undefined}
            disabled={!enabled}
            aria-pressed={active}
            aria-disabled={!enabled}
            title={tooltip}
            className={cn(
              "rounded border px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap transition-colors",
              !enabled
                ? "border-border/50 text-muted-foreground/40 cursor-not-allowed border-dashed"
                : active
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
  const rootRef = useRef<HTMLDivElement>(null);
  const isCompact = useContainerCompact(rootRef);
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
  const natureEffect = pokemon.nature
    ? NATURE_EFFECTS[pokemon.nature]
    : undefined;
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
    const next = trimmed === "" || trimmed === pokemon.species ? null : trimmed;
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

  const currentTeam = (teamSiblings ?? []).filter(
    (p): p is { species: string } =>
      typeof p.species === "string" && p.species.length > 0
  );

  // Used by hero mode: determines mega ability display and base-ability cell
  const megaAbility = getMegaAbilityForSpecies(pokemon.species ?? "");
  // True when the held item is the mega stone that matches the current species
  const isMegaStone =
    getMegaStoneForSpecies(pokemon.species ?? "") === pokemon.held_item;

  // Shared species picker — rendered once, opened from both compact and hero
  const speciesPicker = (
    <SpeciesPickerDialog
      open={speciesOpen}
      onOpenChange={setSpeciesOpen}
      value={pokemon.species ?? null}
      format={format}
      currentTeam={currentTeam}
      onPick={(species) => {
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
    />
  );

  return (
    <div ref={rootRef} className="contents">
      {speciesPicker}

      {/* ── COMPACT layout (≥1240px slot) — sprite-left + form-right ── */}
      {isCompact && (
      <div className={s.identCompact}>
        <div className="flex min-w-0 gap-3 p-3">
          {/* Sprite column */}
          <div className="flex shrink-0 flex-col items-center justify-center gap-2 self-center">
            {/* Species pill — typeable control above the sprite */}
            <button
              type="button"
              onClick={() => setSpeciesOpen(true)}
              aria-label={`Change species (${pokemon.species ?? "none"})`}
              className={cn(
                "border-border bg-background hover:border-primary focus-visible:border-primary",
                "flex w-36 items-center gap-1 rounded-md border px-2 py-1.5 text-left text-xs",
                "transition-colors outline-none sm:w-40 md:w-44"
              )}
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
            </button>

            {/* Sprite — 144×144, click to open species picker */}
            <button
              type="button"
              onClick={() => setSpeciesOpen(true)}
              aria-label={`Change species (${pokemon.species ?? "none"})`}
              className="shrink-0 transition-opacity hover:opacity-80"
            >
              <Sprite
                species={pokemon.species ?? ""}
                types={types}
                size={144}
              />
            </button>
          </div>

          {/* Form column */}
          <div className="flex w-56 min-w-0 shrink-0 flex-col justify-center gap-0.5">
        {/* BANNER — nickname + chips rows */}
        <div className={s.idBanner}>
          <div className="flex items-center gap-2">
            <div className="flex min-w-0 flex-1 flex-col">
              <input
                ref={nicknameRef}
                type="text"
                value={nickDraft}
                onChange={(e) => setNickDraft(e.target.value)}
                onBlur={handleNickBlur}
                onKeyDown={(e) => {
                  if (e.key === "Enter") nicknameRef.current?.blur();
                }}
                placeholder="Nickname"
                maxLength={24}
                aria-label="Nickname"
                className={cn(
                  "w-full min-w-0 truncate bg-transparent text-sm font-bold outline-none",
                  "placeholder:text-muted-foreground/50 border-b border-transparent placeholder:font-normal",
                  "hover:border-border focus:border-primary hover:border-dashed focus:border-solid",
                  "py-0.5 leading-snug",
                  nicknameErrors.length > 0 &&
                    "border-destructive focus:border-destructive"
                )}
              />
              <FieldErrors errors={nicknameErrors} />
            </div>

            <div className="flex shrink-0 items-center gap-1">
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
                <FieldErrors errors={genderErrors} />
              </div>

              {/* Shiny toggle */}
              <button
                type="button"
                onClick={handleShinyToggle}
                aria-pressed={isShiny}
                title={
                  isShiny
                    ? "Shiny (click to clear)"
                    : "Not shiny (click to set)"
                }
                className={cn(
                  "border-border rounded border px-1.5 py-0.5 text-[10px] font-medium transition-colors",
                  isShiny
                    ? "border-yellow-400/40 bg-yellow-400/20 text-yellow-600 dark:text-yellow-400"
                    : "bg-muted/60 hover:bg-muted text-muted-foreground"
                )}
              >
                ✦
              </button>
            </div>
          </div>

          {/* Row 2: form chips. Disabled until the matching mega stone is held;
              click → swap species only (no auto-item-attach). */}
          {pokemon.species && speciesHasForms(pokemon.species) && (
            <FormChips
              currentSpecies={pokemon.species}
              currentItem={pokemon.held_item}
              onPick={(nextSpecies) => {
                if (nextSpecies === pokemon.species) return;
                onUpdate({ species: nextSpecies });
              }}
            />
          )}
        </div>

        {/* LOADOUT FORM ROWS */}

        <div className="flex flex-col">
          <FormChip
            label="Item"
            value={pokemon.held_item ?? ""}
            triggerClassName={
              itemErrors.length > 0
                ? "ring-1 ring-destructive/40 rounded"
                : undefined
            }
            open={itemOpen}
            onOpenChange={setItemOpen}
          >
            <ItemPicker
              value={pokemon.held_item}
              format={format}
              teamItems={teamItems}
              onPick={(item) => onUpdate({ held_item: item })}
              onClose={() => setItemOpen(false)}
            />
          </FormChip>
          <FieldErrors errors={itemErrors} className="px-1" />
        </div>

        {/* Ability — when species is a mega, show the post-evolution ability
            as the primary display and the stored base ability as a secondary
            line. The picker is scoped to the BASE form's abilities so the
            user keeps editing what'll get submitted on the team sheet. */}
        <IdentityAbilityRow
          pokemon={pokemon}
          format={format}
          abilityOpen={abilityOpen}
          setAbilityOpen={setAbilityOpen}
          onUpdate={onUpdate}
          abilityErrors={abilityErrors}
        />

        <div className="flex flex-col">
          <FormChip
            label="Nat"
            value={pokemon.nature ?? ""}
            trailing={<NatureChevrons boost={natUp} reduce={natDown} />}
            triggerClassName={
              natureErrors.length > 0
                ? "ring-1 ring-destructive/40 rounded"
                : undefined
            }
            open={natureOpen}
            onOpenChange={setNatureOpen}
          >
            <NaturePicker
              value={pokemon.nature ?? ""}
              onPick={(nature) => onUpdate({ nature })}
              onClose={() => setNatureOpen(false)}
            />
          </FormChip>
          <FieldErrors errors={natureErrors} className="px-1" />
        </div>

        {/* Tera — gen-gated (only when format supports Terastallization) */}
        {showTera && (
          <Popover open={teraOpen} onOpenChange={setTeraOpen}>
            <PopoverTrigger
              render={<button type="button" className={s.formRow} />}
            >
              <span className={s.formLabel}>Tera</span>
              <span className="flex min-w-0 items-center gap-1.5 overflow-hidden">
                {pokemon.tera_type ? (
                  <>
                    <TypeDot t={pokemon.tera_type} size={10} />
                    <span className={s.formValue}>{pokemon.tera_type}</span>
                  </>
                ) : (
                  <span
                    className={cn(
                      s.formValue,
                      "text-muted-foreground/50 italic"
                    )}
                  >
                    —
                  </span>
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
          <FieldErrors errors={speciesErrors} />
          </div>
        </div>
      </div>
      )}

      {/* ── HERO layout (<1240px slot) — full-width centered panel ──── */}
      {!isCompact && (
      <div className={s.identHero}>
        <div className={s.heroPanel}>
          {/* Meta row: gender | shiny | Lv | nickname */}
          <div className={s.heroMetaRow}>
            <span className={s.heroLv}>Lv {pokemon.level ?? 50}</span>
            {/* Duplicate nickname input — shares nickDraft state with compact mode */}
            <input
              type="text"
              value={nickDraft}
              onChange={(e) => setNickDraft(e.target.value)}
              onBlur={handleNickBlur}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
              placeholder="Nickname"
              maxLength={24}
              aria-label="Nickname"
              className={cn(
                s.heroNicknameInput,
                nicknameErrors.length > 0 &&
                  "border-b-destructive focus:border-b-destructive"
              )}
            />
            <button
              type="button"
              onClick={handleGenderToggle}
              title="Toggle gender"
              className={cn(
                s.heroGender,
                genderErrors.length > 0 && "border-destructive"
              )}
            >
              {genderSymbol(gender)}
            </button>
            <button
              type="button"
              onClick={handleShinyToggle}
              aria-pressed={isShiny}
              title={
                isShiny
                  ? "Shiny (click to clear)"
                  : "Not shiny (click to set)"
              }
              className={cn(
                s.heroShiny,
                isShiny
                  ? "border-yellow-400/40 bg-yellow-400/20 text-yellow-600 dark:text-yellow-400"
                  : "text-muted-foreground"
              )}
            >
              ✦
            </button>
          </div>

          {/* Sprite — centered, click to open species picker */}
          <button
            type="button"
            aria-label={`Change species (${pokemon.species ?? "none"})`}
            className={s.heroSpriteBtn}
            onClick={() => setSpeciesOpen(true)}
          >
            <Sprite species={pokemon.species ?? ""} types={types} size={150} />
          </button>

          {/* Species pill below sprite */}
          <button
            type="button"
            aria-label={`Change species (${pokemon.species ?? "none"})`}
            className={s.heroSpeciesPill}
            onClick={() => setSpeciesOpen(true)}
          >
            <span
              className={cn(
                "min-w-0 truncate",
                pokemon.species ? "font-semibold" : "text-muted-foreground"
              )}
              title={pokemon.species ?? undefined}
            >
              {pokemon.species ?? "Choose species…"}
            </span>
            <span aria-hidden className="text-muted-foreground text-[9px]">
              ▾
            </span>
          </button>

          {/* Type pills omitted in hero mode — types are already conveyed
              by the sprite's tinted background and the type dots in the
              rib decorations. Adding pills here clutters the panel. */}

          {/* Form chips deliberately omitted in hero mode — alt-form
              switching happens via the species picker dialog opened by
              clicking the sprite or species pill. The compact-mode
              FormChips strip below the held-item row is still wired. */}

          <hr className={s.heroDivider} />

          {/* Form grid */}
          <div className={s.heroForm}>
            {/* Item — full-width span */}
            <Popover open={itemOpen} onOpenChange={setItemOpen}>
              <PopoverTrigger
                render={
                  <button
                    type="button"
                    className={cn(
                      s.heroFormCell,
                      s.heroFormCellSpan2,
                      itemErrors.length > 0 &&
                        "ring-destructive/40 rounded ring-1"
                    )}
                  />
                }
              >
                <span className={s.heroFormLbl}>ITEM</span>
                <span className={s.heroFormVal}>
                  <span
                    className={cn(
                      "min-w-0 truncate",
                      !pokemon.held_item && "text-muted-foreground/50 italic"
                    )}
                  >
                    {pokemon.held_item || "—"}
                  </span>
                  {isMegaStone && (
                    <span className={s.heroMegaChip}>MEGA</span>
                  )}
                </span>
              </PopoverTrigger>
              <PopoverContent
                side="bottom"
                align="start"
                className="w-auto p-0"
              >
                <ItemPicker
                  value={pokemon.held_item}
                  format={format}
                  teamItems={teamItems}
                  onPick={(item) => onUpdate({ held_item: item })}
                  onClose={() => setItemOpen(false)}
                />
              </PopoverContent>
            </Popover>

            {/* Ability — single cell with main value + optional `base:` sub-
                line, mirroring the compact-mode pattern. The sub-line shows
                the stored base ability when this is a Mega form (where the
                effective in-battle ability is forced to megaAbility). */}
            <Popover open={abilityOpen} onOpenChange={setAbilityOpen}>
              <PopoverTrigger
                render={
                  <button
                    type="button"
                    className={cn(
                      s.heroFormCell,
                      s.heroFormCellSpan2,
                      abilityErrors.length > 0 &&
                        "ring-destructive/40 rounded ring-1"
                    )}
                  />
                }
              >
                <span className={s.heroFormLbl}>ABIL</span>
                <span className={s.heroFormValStack}>
                  <span
                    className={cn(
                      s.heroFormVal,
                      !(megaAbility ?? pokemon.ability) &&
                        "text-muted-foreground/50 italic"
                    )}
                  >
                    {(megaAbility ?? pokemon.ability) || "—"}
                  </span>
                  {megaAbility !== null && (
                    <span className={s.heroFormSubline}>
                      base: {pokemon.ability || "—"}
                    </span>
                  )}
                </span>
              </PopoverTrigger>
              <PopoverContent
                side="bottom"
                align="start"
                className="w-auto p-0"
              >
                <AbilityPicker
                  value={pokemon.ability}
                  species={
                    pokemon.species
                      ? getCanonicalBaseSpecies(pokemon.species)
                      : ""
                  }
                  format={format}
                  onPick={(ability) => onUpdate({ ability })}
                  onClose={() => setAbilityOpen(false)}
                />
              </PopoverContent>
            </Popover>

            {/* Nature */}
            <Popover open={natureOpen} onOpenChange={setNatureOpen}>
              <PopoverTrigger
                render={
                  <button
                    type="button"
                    className={cn(
                      s.heroFormCell,
                      natureErrors.length > 0 &&
                        "ring-destructive/40 rounded ring-1"
                    )}
                  />
                }
              >
                <span className={s.heroFormLbl}>NAT</span>
                <span
                  className={cn(
                    s.heroFormVal,
                    !pokemon.nature && "text-muted-foreground/50 italic"
                  )}
                >
                  {pokemon.nature || "—"}
                  {pokemon.nature && (
                    <NatureChevrons boost={natUp} reduce={natDown} />
                  )}
                </span>
              </PopoverTrigger>
              <PopoverContent
                side="bottom"
                align="start"
                className="w-auto p-0"
              >
                <NaturePicker
                  value={pokemon.nature ?? ""}
                  onPick={(nature) => onUpdate({ nature })}
                  onClose={() => setNatureOpen(false)}
                />
              </PopoverContent>
            </Popover>

            {/* Tera — format-gated, full-width span */}
            {showTera && (
              <Popover open={teraOpen} onOpenChange={setTeraOpen}>
                <PopoverTrigger
                  render={
                    <button
                      type="button"
                      className={cn(s.heroFormCell, s.heroFormCellSpan2)}
                    />
                  }
                >
                  <span className={s.heroFormLbl}>TERA</span>
                  <span className="flex min-w-0 items-center gap-1.5 overflow-hidden">
                    {pokemon.tera_type ? (
                      <>
                        <TypeDot t={pokemon.tera_type} size={10} />
                        <span className={s.heroFormVal}>
                          {pokemon.tera_type}
                        </span>
                      </>
                    ) : (
                      <span
                        className={cn(
                          s.heroFormVal,
                          "text-muted-foreground/50 italic"
                        )}
                      >
                        —
                      </span>
                    )}
                  </span>
                </PopoverTrigger>
                <PopoverContent
                  side="bottom"
                  align="start"
                  className="w-auto p-0"
                >
                  <TypePicker
                    value={pokemon.tera_type}
                    onPick={(type) => onUpdate({ tera_type: type })}
                    onClose={() => setTeraOpen(false)}
                  />
                </PopoverContent>
              </Popover>
            )}
          </div>

          {/* Validation errors */}
          <FieldErrors errors={speciesErrors} />
          <FieldErrors errors={nicknameErrors} />
          <FieldErrors errors={genderErrors} />
          <FieldErrors errors={itemErrors} />
          <FieldErrors errors={abilityErrors} />
          <FieldErrors errors={natureErrors} />
        </div>
      </div>
      )}
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
