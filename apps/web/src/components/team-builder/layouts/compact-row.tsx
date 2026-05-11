"use client";

import { useState } from "react";

import {
  type DraggableAttributes,
  type DraggableSyntheticListeners,
} from "@dnd-kit/core";

import {
  getSpeciesTypes,
  getTypeColor,
  type GameFormat,
} from "@trainers/pokemon";
import {
  type Tables,
  type TablesUpdate,
  type TeamWithPokemon,
} from "@trainers/supabase";

import { cn } from "@/lib/utils";

import { useCalcEnabled } from "../calc/calc-state-context";
import { CalcReverseColumn } from "../lanes/calc-reverse-card";
import { MovesLane } from "../lanes/moves-lane";
import { StatsLane } from "../lanes/stats-lane";
import { SpeciesPickerDialog } from "../pickers/species-picker-dialog";
import { FormCells } from "../shared/fields";
import { filterCurrentTeam } from "../shared/identity-layout-props";
import { MetaBar } from "../shared/meta-bar";
import { SpriteSection } from "../shared/sprite-section";
import { useIdentityState } from "../shared/use-identity-state";
import { errorsForFields, type ValidationError } from "../validation-hooks";
import { FieldErrors } from "../validation/field-error";

// =============================================================================
// CompactRow — filled active-row in COMPACT (1×6) layout mode
//
// Replaces the container-query + ResizeObserver mess in active-row.tsx +
// IdentityLane dispatcher with three internal Tailwind viewport breakpoints:
//
//   <md  (<768px)   — identity vertical (meta-bar above sprite+form-grid),
//                     stats+moves stacked vertically below identity, full width
//   md   (≥768)     — identity mid-stack (basis-[380px]), stats+moves stacked
//                     vertically in the right column
//   lg+  (≥1024)    — identity single-row (sprite-col + form-col, variant="row"),
//                     stats+moves side-by-side as direct flex children;
//                     right-rib remove button appears here only
//
// Implementation: three sibling JSX trees gated by `hidden md:flex` /
// `flex md:hidden lg:hidden` / `hidden lg:flex` because the three layouts
// have meaningfully different DOM structure (meta-bar position, sprite size,
// FormCells variant). One `useIdentityState` + one `SpeciesPickerDialog` are
// shared across all three trees.
// =============================================================================

interface CompactRowProps {
  idx: number;
  pokemon: Tables<"pokemon">;
  teamPokemon: TeamWithPokemon["team_pokemon"];
  format: GameFormat | undefined;
  onUpdate: (fields: Partial<TablesUpdate<"pokemon">>) => void;
  onRemove: () => void;
  fieldErrors?: ValidationError[];
  dragAttributes?: DraggableAttributes;
  dragListeners?: DraggableSyntheticListeners;
  isDragging?: boolean;
}

export function CompactRow({
  idx,
  pokemon,
  teamPokemon,
  format,
  onUpdate,
  onRemove,
  fieldErrors = [],
  dragAttributes,
  dragListeners,
  isDragging = false,
}: CompactRowProps) {
  // ── Field-error partitions (mirror active-row.tsx) ─────────────────────────
  const identityErrors = errorsForFields(fieldErrors, [
    "species",
    "nickname",
    "gender",
    "level",
    "item",
    "heldItem",
    "ability",
    "nature",
    "tera_type",
  ]);
  const movesErrors = errorsForFields(fieldErrors, [
    "move1",
    "move2",
    "move3",
    "move4",
    "moves",
  ]);
  const statsErrors = errorsForFields(fieldErrors, [
    "evs",
    "evTotal",
    "ev_hp",
    "ev_attack",
    "ev_defense",
    "ev_special_attack",
    "ev_special_defense",
    "ev_speed",
  ]);

  // ── Sibling-derived inputs for identity/loadout pickers ────────────────────
  const teamSiblings = teamPokemon
    .filter((tp) => tp.pokemon && tp.pokemon.id !== pokemon.id)
    .map((tp) => ({ species: tp.pokemon!.species }));
  const teamItems = teamPokemon
    .filter((tp) => tp.pokemon && tp.pokemon.id !== pokemon.id)
    .map((tp) => tp.pokemon!.held_item)
    .filter((item): item is string => item !== null);
  const currentTeam = filterCurrentTeam(teamSiblings);

  // ── Shared identity state (single source for all three trees) ──────────────
  const id = useIdentityState(pokemon, format, identityErrors, onUpdate);
  const [speciesOpen, setSpeciesOpen] = useState(false);
  const calcEnabled = useCalcEnabled();

  // ── Type-derived chrome (rib gradients, border color) ──────────────────────
  const types = getSpeciesTypes(pokemon.species ?? "");
  const ribBackground = (() => {
    if (types.length === 0) return undefined;
    const alpha = "33"; // ~20% opacity
    const c1 = getTypeColor(types[0]!);
    if (types.length === 1) return `${c1}${alpha}`;
    const c2 = getTypeColor(types[1]!);
    return {
      left: `linear-gradient(135deg, ${c1}${alpha}, ${c2}${alpha})`,
      right: `linear-gradient(45deg, ${c1}${alpha}, ${c2}${alpha})`,
    };
  })();
  const leftBg =
    typeof ribBackground === "string" ? ribBackground : ribBackground?.left;
  const rightBg =
    typeof ribBackground === "string" ? ribBackground : ribBackground?.right;

  const borderColor = (() => {
    if (types.length === 0) return undefined;
    const c1 = getTypeColor(types[0]!);
    if (types.length === 1) return c1;
    const c2 = getTypeColor(types[1]!);
    return `color-mix(in oklch, ${c1}, ${c2})`;
  })();

  // ── Common identity bits used by every tree ────────────────────────────────
  const speciesPickerDialog = (
    <SpeciesPickerDialog
      open={speciesOpen}
      onOpenChange={setSpeciesOpen}
      value={pokemon.species ?? null}
      format={format}
      currentTeam={currentTeam}
      onPick={id.handleSpeciesPick}
    />
  );

  // ── Three identity trees ───────────────────────────────────────────────────

  // <md: vertical (mirrors IdentityVertical body)
  const identityVertical = (
    <div className="flex w-full flex-col border-b border-dashed border-border md:hidden">
      <div className="flex flex-auto flex-row items-center justify-center min-w-0">
        <div className="flex shrink-0 grow-0 basis-[140px] flex-col items-center justify-center gap-1.5 px-1 py-2">
          <SpriteSection
            pokemon={pokemon}
            onSpeciesClick={() => setSpeciesOpen(true)}
            variant="pill-bottom"
            speciesHasError={id.speciesErrors.length > 0}
            types={id.types}
            isShiny={id.isShiny}
          />
        </div>
        <div className="flex min-w-0 shrink basis-auto flex-col justify-center gap-1 px-1.5 py-2 [&_input]:text-left">
          <MetaBar
            nickDraft={id.nickDraft}
            setNickDraft={id.setNickDraft}
            nicknameRef={id.nicknameRef}
            gender={id.gender}
            isShiny={id.isShiny}
            level={id.level}
            showLevel={id.showLevel}
            handleNickBlur={id.handleNickBlur}
            handleGenderToggle={id.handleGenderToggle}
            handleShinyToggle={id.handleShinyToggle}
            onUpdate={onUpdate}
            nicknameErrors={id.nicknameErrors}
            genderErrors={id.genderErrors}
            variant="row"
          />
          <FormCells
            pokemon={pokemon}
            format={format}
            teamItems={teamItems}
            isMegaStone={id.isMegaStone}
            natUp={id.natUp}
            natDown={id.natDown}
            types={id.types}
            itemErrors={id.itemErrors}
            abilityErrors={id.abilityErrors}
            natureErrors={id.natureErrors}
            onUpdate={onUpdate}
            variant="grid"
          />
          <FieldErrors errors={id.speciesErrors} />
          <FieldErrors errors={id.nicknameErrors} />
          <FieldErrors errors={id.genderErrors} />
          <FieldErrors errors={id.itemErrors} />
          <FieldErrors errors={id.abilityErrors} />
          <FieldErrors errors={id.natureErrors} />
        </div>
      </div>
    </div>
  );

  // md: mid-stack (mirrors IdentityMidStack)
  const identityMidStack = (
    <div className="hidden md:flex lg:hidden shrink-0 grow-0 basis-[380px] min-w-0 flex-col border-r border-dashed border-border">
      <MetaBar
        nickDraft={id.nickDraft}
        setNickDraft={id.setNickDraft}
        nicknameRef={id.nicknameRef}
        gender={id.gender}
        isShiny={id.isShiny}
        level={id.level}
        showLevel={id.showLevel}
        handleNickBlur={id.handleNickBlur}
        handleGenderToggle={id.handleGenderToggle}
        handleShinyToggle={id.handleShinyToggle}
        onUpdate={onUpdate}
        nicknameErrors={id.nicknameErrors}
        genderErrors={id.genderErrors}
        variant="row"
      />
      <div className="flex flex-auto flex-col items-center justify-center gap-2 min-h-0 min-w-0 px-2 py-3">
        <div className="mx-auto flex w-full max-w-[240px] flex-col items-center gap-1.5">
          <SpriteSection
            pokemon={pokemon}
            onSpeciesClick={() => setSpeciesOpen(true)}
            variant="pill-bottom"
            speciesHasError={id.speciesErrors.length > 0}
            types={id.types}
            isShiny={id.isShiny}
          />
        </div>
        <div className="mx-auto flex w-full min-w-0 max-w-[240px] flex-col gap-1">
          <FormCells
            pokemon={pokemon}
            format={format}
            teamItems={teamItems}
            isMegaStone={id.isMegaStone}
            natUp={id.natUp}
            natDown={id.natDown}
            types={id.types}
            itemErrors={id.itemErrors}
            abilityErrors={id.abilityErrors}
            natureErrors={id.natureErrors}
            onUpdate={onUpdate}
            variant="grid"
          />
          <FieldErrors errors={id.speciesErrors} />
          <FieldErrors errors={id.nicknameErrors} />
          <FieldErrors errors={id.genderErrors} />
          <FieldErrors errors={id.itemErrors} />
          <FieldErrors errors={id.abilityErrors} />
          <FieldErrors errors={id.natureErrors} />
        </div>
      </div>
    </div>
  );

  // lg+: single-row (mirrors IdentitySingleRow)
  const identitySingleRow = (
    <div className="hidden lg:flex">
      <div
        className={cn(
          "flex min-w-0 gap-3 transition-[padding] duration-300 ease-in-out",
          calcEnabled ? "p-3" : "p-2"
        )}
      >
        <div className="flex shrink-0 flex-col items-center justify-center gap-2 self-center">
          <SpriteSection
            pokemon={pokemon}
            onSpeciesClick={() => setSpeciesOpen(true)}
            variant="pill-top"
            speciesHasError={id.speciesErrors.length > 0}
            types={id.types}
            isShiny={id.isShiny}
          />
        </div>
        <div className="flex w-64 min-w-0 shrink-0 flex-col justify-center gap-0.5">
          <div className="mb-1 flex flex-col gap-[3px] border-b border-border pb-1.5">
            <MetaBar
              nickDraft={id.nickDraft}
              setNickDraft={id.setNickDraft}
              nicknameRef={id.nicknameRef}
              gender={id.gender}
              isShiny={id.isShiny}
              level={id.level}
              showLevel={id.showLevel}
              handleNickBlur={id.handleNickBlur}
              handleGenderToggle={id.handleGenderToggle}
              handleShinyToggle={id.handleShinyToggle}
              onUpdate={onUpdate}
              nicknameErrors={id.nicknameErrors}
              genderErrors={id.genderErrors}
              variant="banner"
            />
          </div>
          <FormCells
            pokemon={pokemon}
            format={format}
            teamItems={teamItems}
            isMegaStone={id.isMegaStone}
            natUp={id.natUp}
            natDown={id.natDown}
            types={id.types}
            itemErrors={id.itemErrors}
            abilityErrors={id.abilityErrors}
            natureErrors={id.natureErrors}
            onUpdate={onUpdate}
            variant="row"
          />
          <FieldErrors errors={id.speciesErrors} />
        </div>
      </div>
    </div>
  );

  // ── Stats + Moves block ────────────────────────────────────────────────────
  // <md: stacked full-width below identity
  // md:  stacked vertically in right column (alongside mid-stack identity)
  // lg+: side-by-side as direct flex children of the inner row
  const statsLane = (
    <StatsLane
      pokemon={pokemon}
      format={format}
      onUpdate={onUpdate}
      fieldErrors={statsErrors}
    />
  );
  const movesLane = (
    <MovesLane
      pokemon={pokemon}
      format={format}
      onUpdate={onUpdate}
      fieldErrors={movesErrors}
    />
  );

  return (
    <div
      className={cn(
        "bg-card flex h-full w-full min-w-0 items-stretch self-center overflow-hidden rounded-lg border",
        !borderColor &&
          "border-primary/60 shadow-[0_0_0_1px_hsl(var(--primary)/0.3),0_8px_28px_-16px_hsl(var(--primary)/0.4)]",
        isDragging && "opacity-50"
      )}
      style={
        borderColor
          ? {
              borderColor,
              boxShadow: [
                `0 0 0 1px color-mix(in oklch, ${borderColor} 20%, transparent)`,
                `0 8px 28px -16px color-mix(in oklch, ${borderColor} 40%, transparent)`,
              ].join(", "),
            }
          : undefined
      }
    >
      {/* Shared species picker dialog (single instance) */}
      {speciesPickerDialog}

      {/* RIB LEFT — slot number + drag handle (+ remove button at <lg) */}
      <div
        className={cn(
          "flex flex-col items-center justify-between shrink-0 w-7 border-r transition-[padding] duration-300 ease-in-out",
          "border-border/60 border-dashed",
          calcEnabled ? "py-2" : "py-1",
          !leftBg && "bg-muted/20"
        )}
        style={leftBg ? { background: leftBg } : undefined}
      >
        <span
          {...dragAttributes}
          {...dragListeners}
          className={cn(
            "text-muted-foreground font-mono text-[10px] font-medium tracking-wide",
            dragListeners && "cursor-grab touch-none active:cursor-grabbing"
          )}
          aria-label={`Drag to reorder slot ${idx + 1}`}
        >
          {String(idx + 1).padStart(2, "0")}
        </span>

        {/* Remove fallback — only at <lg (right rib hidden then). */}
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${pokemon.species ?? "Pokémon"} from slot ${idx + 1}`}
          className={cn(
            "lg:hidden",
            "text-muted-foreground hover:bg-destructive/15 hover:text-destructive flex size-5 items-center justify-center rounded transition-colors"
          )}
        >
          ×
        </button>
      </div>

      {/* Center column — flex-col: main row content on top, calc strip below */}
      <div className="flex flex-col min-w-0 flex-1">
        {/*
          Main content. At <lg, identity sits on top and stats+moves stack
          vertically below it (flex-col). At lg+, identity (single-row) is
          the first flex child and stats+moves sit side-by-side beside it.
        */}
        <div className="flex flex-col lg:flex-row lg:items-stretch lg:flex-nowrap min-w-0 overflow-visible">
          {identityVertical}
          {identityMidStack}
          {identitySingleRow}

          {/*
            Right column for stats+moves.
            <md  — full-width flex-col below identity.
            md   — fills remaining width (right of mid-stack identity), flex-col.
            lg+  — direct horizontal sibling of single-row identity, with
                   stats and moves laid out side-by-side as direct children.
          */}
          <div className="flex flex-col min-w-0 flex-1 lg:flex-row lg:items-stretch">
            {statsLane}
            {movesLane}
          </div>
        </div>

        {/* Incoming damage strip — shared across all viewports */}
        {calcEnabled && (
          <CalcReverseColumn
            pokemon={pokemon}
            teammates={teamPokemon
              .map((tp) => tp.pokemon)
              .filter((p): p is NonNullable<typeof p> => p !== null)}
          />
        )}
      </div>

      {/* RIB RIGHT — visible at lg+ only (at <lg the remove lives in left rib) */}
      <div
        className={cn(
          "hidden lg:flex flex-col items-center justify-start shrink-0 w-7 border-l transition-[padding] duration-300 ease-in-out",
          "border-border/60 border-dashed",
          calcEnabled ? "py-2" : "py-1",
          !rightBg && "bg-muted/20"
        )}
        style={rightBg ? { background: rightBg } : undefined}
      >
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${pokemon.species ?? "Pokémon"} from slot ${idx + 1}`}
          className="text-muted-foreground hover:bg-destructive/15 hover:text-destructive flex size-5 items-center justify-center rounded transition-colors"
        >
          ×
        </button>
      </div>
    </div>
  );
}
