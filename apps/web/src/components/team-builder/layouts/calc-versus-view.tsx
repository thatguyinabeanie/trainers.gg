"use client";

import { useState } from "react";

import {
  getSpeciesTypes,
  getTypeColor,
  type GameFormat,
} from "@trainers/pokemon";
import { type Tables, type TablesUpdate } from "@trainers/supabase";

import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { useTargetAsPokemon } from "../calc/use-target-as-pokemon";
import { FieldControlSurface } from "../calc/field-control-surface";
import { StatBoostsRow } from "../calc/stat-boosts-row";
import { MovesLane } from "../lanes/moves-lane";
import { RadialStatEditor } from "../stats/radial-stat-editor";
import { SpeciesPickerDialog } from "../pickers/species-picker-dialog";
import { SpriteSection } from "../shared/sprite-section";
import { useIdentityState } from "../shared/use-identity-state";
import { type UseCalcStateReturn } from "../use-calc-state";

// =============================================================================
// Types
// =============================================================================

export interface CalcVersusViewProps {
  /** Your active Pokémon (left side — the attacker). */
  pokemon: Tables<"pokemon">;
  format: GameFormat | undefined;
  /** Sibling item names — for item deduplication hint in ItemCell. */
  teamItems?: string[];
  onUpdate: (fields: Partial<TablesUpdate<"pokemon">>) => void;
  calc: UseCalcStateReturn;
}

// =============================================================================
// Helpers — desktop hero content (sprite + chips, NO label)
// =============================================================================

/**
 * The inner content of the hero band: sprite + species pill + type/tera/item/ability chips.
 * Label is rendered separately in the label band for 3-column row alignment.
 */
interface MonHeroContentProps {
  pokemon: Tables<"pokemon">;
  onSpeciesClick: () => void;
  isShiny?: boolean;
  isFoe?: boolean;
}

function MonHeroContent({
  pokemon,
  onSpeciesClick,
  isShiny = false,
}: MonHeroContentProps) {
  const types = getSpeciesTypes(pokemon.species ?? "");

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Sprite — 136px to fit the hero band comfortably */}
      <SpriteSection
        pokemon={pokemon}
        onSpeciesClick={onSpeciesClick}
        variant="pill-bottom"
        types={types}
        isShiny={isShiny}
        size={136}
      />

      {/* Type + Tera chips */}
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {types.map((t) => (
          <span
            key={t}
            className="rounded px-2 py-0.5 font-mono text-[10px] font-semibold text-white"
            style={{ background: getTypeColor(t) }}
          >
            {t}
          </span>
        ))}
        {pokemon.tera_type && (
          <span className="border-primary/50 bg-primary/14 text-primary rounded border px-2 py-0.5 font-mono text-[10px] font-semibold">
            <span className="text-primary/70">T·</span>
            {pokemon.tera_type}
          </span>
        )}
      </div>

      {/* Item + Ability chips */}
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {pokemon.held_item && (
          <span className="border-border bg-card text-foreground rounded border px-2 py-0.5 font-mono text-[10px]">
            <span className="text-muted-foreground">ITEM·</span>
            {pokemon.held_item}
          </span>
        )}
        {pokemon.ability && (
          <span className="border-border bg-card text-foreground rounded border px-2 py-0.5 font-mono text-[10px]">
            <span className="text-muted-foreground">ABIL·</span>
            {pokemon.ability}
          </span>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// MonHero — used in mobile layout (label + hero together, stacked vertically)
// =============================================================================

interface MonHeroProps {
  pokemon: Tables<"pokemon">;
  /** Label for the side tag (e.g., "Your Pokémon"). */
  sideLabel: string;
  /** Color class for the side label text. */
  sideLabelClassName?: string;
  onSpeciesClick: () => void;
  isShiny?: boolean;
}

function MonHero({
  pokemon,
  sideLabel,
  sideLabelClassName,
  onSpeciesClick,
  isShiny = false,
}: MonHeroProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      {/* Side label */}
      <div className="flex h-3.5 items-center justify-center">
        <span
          className={cn(
            "font-mono text-[9px] font-bold tracking-[0.12em] uppercase",
            sideLabelClassName ?? "text-muted-foreground"
          )}
        >
          {sideLabel}
        </span>
      </div>

      <MonHeroContent
        pokemon={pokemon}
        onSpeciesClick={onSpeciesClick}
        isShiny={isShiny}
      />
    </div>
  );
}

// =============================================================================
// MonStatsCard — stats card: RadialStatEditor + StatBoostsRow
// =============================================================================

interface MonStatsCardProps {
  pokemon: Tables<"pokemon">;
  format: GameFormat | undefined;
  onUpdate: (fields: Partial<TablesUpdate<"pokemon">>) => void;
  boosts:
    | UseCalcStateReturn["attackerBoosts"]
    | UseCalcStateReturn["defenderBoosts"];
  onBoostChange: (
    stat: keyof UseCalcStateReturn["attackerBoosts"],
    v: number
  ) => void;
  headerLabel: string;
  natureLabel?: string;
  /** Pass compact=true to shrink the hexagon for two-up layouts. */
  compact?: boolean;
}

function MonStatsCard({
  pokemon,
  format,
  onUpdate,
  boosts,
  onBoostChange,
  headerLabel,
  natureLabel,
  compact = false,
}: MonStatsCardProps) {
  return (
    <div
      className={cn(
        "border-border/60 bg-card/60 w-full rounded-xl border backdrop-blur-sm",
        compact ? "p-2.5" : "p-3"
      )}
    >
      {/* Card header */}
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-muted-foreground font-mono text-[9px] font-semibold tracking-[0.08em] uppercase">
          {headerLabel}
        </span>
        {natureLabel && (
          <span className="text-muted-foreground font-mono text-[9px]">
            {natureLabel}
          </span>
        )}
      </div>

      {/* Radial stat editor */}
      <RadialStatEditor
        pokemon={pokemon}
        format={format}
        onUpdate={onUpdate}
        boosts={boosts}
        onBoostChange={onBoostChange}
        compact={compact}
      />

      {/* Boosts row */}
      <div className="border-border/50 mt-3 border-t border-dashed pt-2.5">
        <span className="text-muted-foreground mb-1.5 block font-mono text-[8px] font-bold tracking-[0.10em] uppercase">
          Boosts
        </span>
        <StatBoostsRow boosts={boosts} onChange={onBoostChange} />
      </div>
    </div>
  );
}

// =============================================================================
// MonMovesCard — moves card with directional label
// =============================================================================

interface MonMovesCardProps {
  pokemon: Tables<"pokemon">;
  format: GameFormat | undefined;
  onUpdate: (fields: Partial<TablesUpdate<"pokemon">>) => void;
  direction: "outgoing" | "incoming";
  outputs: readonly ReturnType<
    UseCalcStateReturn["computeForwardOutputsForRow"]
  >[0][];
  opponent: { species: string; ability: string; item: string; nature: string };
  headerLabel: string;
  /** Pass compact=true to tighten move rows for two-up layouts. */
  compact?: boolean;
}

function MonMovesCard({
  pokemon,
  format,
  onUpdate,
  direction,
  outputs,
  opponent,
  headerLabel,
  compact = false,
}: MonMovesCardProps) {
  return (
    <div
      className={cn(
        "border-border/60 bg-card/60 w-full rounded-xl border backdrop-blur-sm",
        compact ? "p-2.5" : "p-3"
      )}
    >
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-muted-foreground font-mono text-[9px] font-semibold tracking-[0.08em] uppercase">
          {headerLabel}
        </span>
        <span className="text-muted-foreground font-mono text-[9px]">
          % · KO
        </span>
      </div>
      <MovesLane
        pokemon={pokemon}
        format={format}
        onUpdate={onUpdate}
        direction={direction}
        outputs={outputs}
        opponent={opponent}
        compact={compact}
      />
    </div>
  );
}

// =============================================================================
// MobileFieldSheet — bottom sheet wrapping FieldControlSurface for mobile
// =============================================================================

interface MobileFieldSheetProps {
  calc: UseCalcStateReturn;
}

function MobileFieldSheet({ calc }: MobileFieldSheetProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <button
            type="button"
            className="border-border bg-card hover:bg-muted text-muted-foreground w-full rounded-lg border px-4 py-2 font-mono text-xs transition-colors"
          />
        }
      >
        Field ▾
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="flex max-h-[80vh] flex-col overflow-hidden"
        showCloseButton
      >
        <SheetHeader className="shrink-0">
          <SheetTitle className="font-mono text-xs tracking-widest uppercase">
            Field Conditions
          </SheetTitle>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
            <FieldControlSurface calc={calc} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// =============================================================================
// MobileStatsSheet — bottom sheet for a single mon's radial editor + boosts
// =============================================================================

interface MobileStatsSheetProps {
  pokemon: Tables<"pokemon">;
  format: GameFormat | undefined;
  onUpdate: (fields: Partial<TablesUpdate<"pokemon">>) => void;
  boosts:
    | UseCalcStateReturn["attackerBoosts"]
    | UseCalcStateReturn["defenderBoosts"];
  onBoostChange: (
    stat: keyof UseCalcStateReturn["attackerBoosts"],
    v: number
  ) => void;
  triggerLabel: string;
}

function MobileStatsSheet({
  pokemon,
  format,
  onUpdate,
  boosts,
  onBoostChange,
  triggerLabel,
}: MobileStatsSheetProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <button
            type="button"
            className="border-border bg-card hover:bg-muted text-muted-foreground w-full rounded-lg border px-4 py-2 font-mono text-xs transition-colors"
          />
        }
      >
        {triggerLabel}
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="flex max-h-[85vh] flex-col overflow-hidden"
        showCloseButton
      >
        <SheetHeader className="shrink-0">
          <SheetTitle className="font-mono text-xs tracking-widest uppercase">
            {pokemon.species ?? "Pokémon"} · Stats
          </SheetTitle>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-6">
            <RadialStatEditor
              pokemon={pokemon}
              format={format}
              onUpdate={onUpdate}
              boosts={boosts}
              onBoostChange={onBoostChange}
            />
            <div className="border-border/50 border-t border-dashed pt-3">
              <span className="text-muted-foreground mb-2 block font-mono text-[8px] font-bold tracking-[0.10em] uppercase">
                Boosts
              </span>
              <StatBoostsRow boosts={boosts} onChange={onBoostChange} />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// =============================================================================
// CalcVersusView — main export
// =============================================================================

/**
 * Three-column versus layout for the damage calc.
 *
 * Desktop (≥md): three fixed-height bands so rows align across all three columns:
 *   (a) label band  — "Your Pokémon" (teal/muted) | empty spacer | "Calc Target · click to edit ▾" (rose)
 *   (b) hero band   — sprite + chips | VS badge (same h-56 height) | sprite + chips
 *   (c) content row — stats card | FieldControlSurface | stats card (all tops aligned)
 *   (d) moves row   — outgoing moves | empty | incoming moves
 *
 * Mobile (<md): vertical stack:
 *   Your mon → VS divider → Field ▾ bottom-sheet trigger → Target mon
 *   Stats on each side collapse to "⬡ Stats … edit ▾" → bottom sheet.
 */
export function CalcVersusView({
  pokemon,
  format,
  teamItems: _teamItems = [],
  onUpdate,
  calc,
}: CalcVersusViewProps) {
  // ── Target adapter ───────────────────────────────────────────────────────
  const target = useTargetAsPokemon(calc);

  // ── Identity state for target (drives species picker) ───────────────────
  const [targetSpeciesOpen, setTargetSpeciesOpen] = useState(false);
  const [yourSpeciesOpen, setYourSpeciesOpen] = useState(false);

  // Pull handleSpeciesPick for the target from useIdentityState
  const targetIdentity = useIdentityState(
    target.pokemon,
    format,
    [],
    target.onUpdate
  );

  // Pull handleSpeciesPick for your mon from useIdentityState
  const yourIdentity = useIdentityState(pokemon, format, [], onUpdate);

  // ── Mirror damage outputs ─────────────────────────────────────────────────
  // Outgoing: your moves → target (forward)
  const outgoingOutputs = calc.computeForwardOutputsForRow(pokemon);

  // Incoming: target's moves → you (reverse)
  // The target's effective moves are the defenderMoves on calc state.
  const targetMovesTuple = calc.defenderMoves;
  const incomingOutputs = calc.computeReverseOutputsForRow(
    pokemon,
    targetMovesTuple
  );

  // ── Opponent descriptors for popovers ─────────────────────────────────────
  const yourDescriptor = {
    species: pokemon.species ?? "",
    ability: pokemon.ability ?? "",
    item: pokemon.held_item ?? "",
    nature: pokemon.nature ?? "Hardy",
  };

  const targetDescriptor = {
    species: calc.defenderSpecies,
    ability: calc.defenderAbility,
    item: calc.defenderItem,
    nature: calc.defenderNature,
  };

  // ── Nature labels ─────────────────────────────────────────────────────────
  const yourNatureLabel = pokemon.nature ?? "";
  const targetNatureLabel = target.pokemon.nature ?? "";

  return (
    <>
      {/* ── Species pickers ──────────────────────────────────────────────── */}
      <SpeciesPickerDialog
        open={yourSpeciesOpen}
        onOpenChange={setYourSpeciesOpen}
        format={format}
        value={pokemon.species ?? null}
        onPick={(species) => {
          yourIdentity.handleSpeciesPick(species);
          setYourSpeciesOpen(false);
        }}
      />
      <SpeciesPickerDialog
        open={targetSpeciesOpen}
        onOpenChange={setTargetSpeciesOpen}
        format={format}
        value={target.pokemon.species ?? null}
        onPick={(species) => {
          targetIdentity.handleSpeciesPick(species);
          setTargetSpeciesOpen(false);
        }}
      />

      {/* ═══════════════════ DESKTOP LAYOUT (≥ md) ═══════════════════════ */}
      {/*
        Three-column grid: 1fr | 18rem center | 1fr
        Four row-bands so columns align:
          (a) label band   h-3.5  — labels + empty center spacer
          (b) hero band    h-56   — sprites + VS badge (same height keeps VS centered)
          (c) content row         — stats cards + field panel (tops aligned by grid)
          (d) moves row           — moves cards + empty center cell
        The whole arena is vertically centered within the canvas to avoid a dead
        gap below the moves on tall viewports (matches the solo single-focus feel).
      */}
      <div className="hidden md:flex md:flex-1 md:items-center md:justify-center">
        <div className="grid w-full grid-cols-[1fr_18rem_1fr] items-start gap-4">
          {/* ── (a) LABEL BAND ──────────────────────────────────────────── */}
          {/* Left: "Your Pokémon" */}
          <div className="flex h-3.5 items-center justify-center">
            <span className="text-muted-foreground font-mono text-[9px] font-bold tracking-[0.12em] uppercase">
              Your Pokémon
            </span>
          </div>
          {/* Center: empty spacer (same height keeps rows in sync) */}
          <div className="h-3.5" />
          {/* Right: "Calc Target · click to edit ▾" */}
          <div className="flex h-3.5 items-center justify-center">
            <span className="font-mono text-[9px] font-bold tracking-[0.12em] text-rose-400/80 uppercase">
              Calc Target · click to edit ▾
            </span>
          </div>

          {/* ── (b) HERO BAND ───────────────────────────────────────────── */}
          {/* Left: your mon sprite + chips */}
          <div className="flex h-56 items-center justify-center">
            <MonHeroContent
              pokemon={pokemon}
              onSpeciesClick={() => setYourSpeciesOpen(true)}
              isShiny={pokemon.is_shiny ?? false}
            />
          </div>
          {/* Center: VS badge — same h-56 so it aligns with the hero band */}
          <div className="flex h-56 items-center justify-center">
            <div className="border-border bg-card/60 flex size-12 items-center justify-center rounded-full border backdrop-blur-sm">
              <span className="text-muted-foreground font-mono text-sm font-extrabold">
                VS
              </span>
            </div>
          </div>
          {/* Right: target sprite + chips */}
          <div className="flex h-56 items-center justify-center">
            <MonHeroContent
              pokemon={target.pokemon}
              onSpeciesClick={() => setTargetSpeciesOpen(true)}
              isFoe
            />
          </div>

          {/* ── (c) CONTENT ROW (stats cards + field panel) ─────────────── */}
          {/* Left: your stats card — compact=true for the two-up versus layout */}
          <MonStatsCard
            pokemon={pokemon}
            format={format}
            onUpdate={onUpdate}
            boosts={calc.attackerBoosts}
            onBoostChange={calc.setAttackerBoost}
            headerLabel="Stats · EVs"
            natureLabel={yourNatureLabel}
            compact
          />
          {/* Center: field panel — top aligns with stats cards via grid items-start */}
          <div className="border-border/60 bg-card/60 w-full rounded-xl border p-3 backdrop-blur-sm">
            <FieldControlSurface calc={calc} />
          </div>
          {/* Right: target stats card — compact=true for the two-up versus layout */}
          <MonStatsCard
            pokemon={target.pokemon}
            format={format}
            onUpdate={target.onUpdate}
            boosts={calc.defenderBoosts}
            onBoostChange={calc.setDefenderBoost}
            headerLabel="Stats · EVs"
            natureLabel={targetNatureLabel}
            compact
          />

          {/* ── (d) MOVES ROW ───────────────────────────────────────────── */}
          {/* Left: outgoing moves — compact=true for denser rows in two-up layout */}
          <MonMovesCard
            pokemon={pokemon}
            format={format}
            onUpdate={onUpdate}
            direction="outgoing"
            outputs={outgoingOutputs}
            opponent={targetDescriptor}
            headerLabel="Moves → damage dealt"
            compact
          />
          {/* Center: empty — field panel above already fills the center column */}
          <div />
          {/* Right: incoming moves — compact=true for denser rows in two-up layout */}
          <MonMovesCard
            pokemon={target.pokemon}
            format={format}
            onUpdate={target.onUpdate}
            direction="incoming"
            outputs={incomingOutputs}
            opponent={yourDescriptor}
            headerLabel="Moves → damage taken"
            compact
          />
        </div>
      </div>

      {/* ═══════════════════ MOBILE LAYOUT (< md) ═══════════════════════ */}
      <div className="flex flex-col gap-4 md:hidden">
        {/* YOUR MON */}
        <div className="flex flex-col gap-3">
          <MonHero
            pokemon={pokemon}
            sideLabel="Your Pokémon"
            sideLabelClassName="text-muted-foreground"
            onSpeciesClick={() => setYourSpeciesOpen(true)}
            isShiny={pokemon.is_shiny ?? false}
          />

          {/* Stats collapse trigger */}
          <MobileStatsSheet
            pokemon={pokemon}
            format={format}
            onUpdate={onUpdate}
            boosts={calc.attackerBoosts}
            onBoostChange={calc.setAttackerBoost}
            triggerLabel={`⬡ Stats · ${yourNatureLabel || "Hardy"} … edit ▾`}
          />

          {/* Moves — outgoing */}
          <MonMovesCard
            pokemon={pokemon}
            format={format}
            onUpdate={onUpdate}
            direction="outgoing"
            outputs={outgoingOutputs}
            opponent={targetDescriptor}
            headerLabel="Moves → damage dealt"
          />
        </div>

        {/* VS divider */}
        <div className="flex items-center gap-3">
          <div className="border-border/40 flex-1 border-t border-dashed" />
          <div className="border-border bg-card flex size-9 items-center justify-center rounded-full border">
            <span className="text-muted-foreground font-mono text-xs font-extrabold">
              VS
            </span>
          </div>
          <div className="border-border/40 flex-1 border-t border-dashed" />
        </div>

        {/* Field bottom-sheet trigger */}
        <MobileFieldSheet calc={calc} />

        {/* TARGET MON */}
        <div className="flex flex-col gap-3">
          <MonHero
            pokemon={target.pokemon}
            sideLabel="Calc Target · click to edit ▾"
            sideLabelClassName="text-rose-400/80"
            onSpeciesClick={() => setTargetSpeciesOpen(true)}
          />

          {/* Stats collapse trigger */}
          <MobileStatsSheet
            pokemon={target.pokemon}
            format={format}
            onUpdate={target.onUpdate}
            boosts={calc.defenderBoosts}
            onBoostChange={calc.setDefenderBoost}
            triggerLabel={`⬡ Stats · ${targetNatureLabel || "Hardy"} … edit ▾`}
          />

          {/* Moves — incoming */}
          <MonMovesCard
            pokemon={target.pokemon}
            format={format}
            onUpdate={target.onUpdate}
            direction="incoming"
            outputs={incomingOutputs}
            opponent={yourDescriptor}
            headerLabel="Moves → damage taken"
          />
        </div>
      </div>
    </>
  );
}
