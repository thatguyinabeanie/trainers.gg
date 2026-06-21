"use client";

import { useState } from "react";

import {
  getSpeciesTypes,
  getTypeColor,
  getMoveData,
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
import { useIsClient } from "@/hooks/use-is-client";
import { useIsMobile } from "@/hooks/use-mobile";

import { useTargetAsPokemon } from "../calc/use-target-as-pokemon";
import { FieldControlSurface } from "../calc/field-control-surface";
import { formatSupportsTera } from "../format-gating";
import { StatBoostsRow } from "../calc/stat-boosts-row";
import { MovesLane } from "../lanes/moves-lane";
import { RadialStatEditor } from "../stats/radial-stat-editor";
import { SpeciesPickerDialog } from "../pickers/species-picker-dialog";
import { AbilityCell } from "../shared/fields/ability";
import { ItemCell } from "../shared/fields/item";
import { SpriteSection } from "../shared/sprite-section";
import { useIdentityState } from "../shared/use-identity-state";
import { type UseCalcStateReturn, type CalcOutput } from "../use-calc-state";
import { getDisplayRangeAndKoTier } from "../lanes/calc-display-helpers";

// =============================================================================
// Types
// =============================================================================

/**
 * The subset of CalcStateContext fields that CalcVersusView reads beyond the
 * base UseCalcStateReturn. In production the `calc` prop is always a full
 * CalcStateContextValue (which extends UseCalcStateReturn with these fields),
 * so the intersection is safe without importing CalcStateContext here.
 */
interface CalcFieldExtras {
  calcEnabled: boolean;
  field: { foesAlive: number; allyAlive: boolean };
}

export interface CalcVersusViewProps {
  /** Your active Pokémon (left side — the attacker). */
  pokemon: Tables<"pokemon">;
  format: GameFormat | undefined;
  /** Sibling item names — for item deduplication hint in ItemCell. */
  teamItems?: string[];
  onUpdate: (fields: Partial<TablesUpdate<"pokemon">>) => void;
  calc: UseCalcStateReturn & CalcFieldExtras;
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
  /** Sprite size in px. Desktop two-up passes a large hero size; mobile keeps the default. */
  size?: number;
  /** Active format — used to hide the Tera chip in formats without Tera (e.g. Champions). */
  format: GameFormat | undefined;
  /** Patch handler — drives the editable item/ability cells. */
  onUpdate: (fields: Partial<TablesUpdate<"pokemon">>) => void;
  /** Sibling item names for the item-dedup hint (your mon only; [] for the target). */
  teamItems?: string[];
  /** Whether the held item is a mega stone (shows the MEGA toggle chip). */
  isMegaStone?: boolean;
}

function MonHeroContent({
  pokemon,
  onSpeciesClick,
  isShiny = false,
  size = 96,
  format,
  onUpdate,
  teamItems = [],
  isMegaStone = false,
}: MonHeroContentProps) {
  const types = getSpeciesTypes(pokemon.species ?? "");
  const showTera = formatSupportsTera(format);

  return (
    <div className="flex items-start gap-3">
      {/* SpriteSection returns a fragment, so wrap it to keep sprite + pill
          together as a single flex item (left column). */}
      <div className="flex shrink-0 flex-col items-center">
        <SpriteSection
          pokemon={pokemon}
          onSpeciesClick={onSpeciesClick}
          variant="pill-bottom"
          types={types}
          isShiny={isShiny}
          size={size}
        />
      </div>

      {/* Right column: type chips + item + ability */}
      <div className="flex min-w-0 flex-1 flex-col gap-2 pt-1">
        {/* Type + Tera chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          {types.map((t) => (
            <span
              key={t}
              className="rounded px-2 py-0.5 font-mono text-xs font-semibold text-white"
              style={{ background: getTypeColor(t) }}
            >
              {t}
            </span>
          ))}
          {showTera && pokemon.tera_type && (
            <span className="border-primary/50 bg-primary/14 text-primary rounded border px-2 py-0.5 font-mono text-xs font-semibold">
              <span className="text-primary/70">T·</span>
              {pokemon.tera_type}
            </span>
          )}
        </div>

        {/* Item + Ability */}
        <div className="w-full space-y-1">
          <ItemCell
            pokemon={pokemon}
            format={format}
            teamItems={teamItems}
            errors={[]}
            isMegaStone={isMegaStone}
            onUpdate={onUpdate}
            variant="grid"
          />
          <AbilityCell
            pokemon={pokemon}
            format={format}
            errors={[]}
            onUpdate={onUpdate}
            variant="grid"
          />
        </div>
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
  format: GameFormat | undefined;
  onUpdate: (fields: Partial<TablesUpdate<"pokemon">>) => void;
  teamItems?: string[];
  isMegaStone?: boolean;
}

function MonHero({
  pokemon,
  sideLabel,
  sideLabelClassName,
  onSpeciesClick,
  isShiny = false,
  format,
  onUpdate,
  teamItems = [],
  isMegaStone = false,
}: MonHeroProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      {/* Side label */}
      <div className="flex h-3.5 items-center justify-center">
        <span
          className={cn(
            "font-mono text-xs font-bold tracking-[0.12em] uppercase",
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
        format={format}
        onUpdate={onUpdate}
        teamItems={teamItems}
        isMegaStone={isMegaStone}
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
        <span className="text-muted-foreground font-mono text-xs font-semibold tracking-[0.08em] uppercase">
          {headerLabel}
        </span>
        {natureLabel && (
          <span className="text-muted-foreground font-mono text-xs">
            {natureLabel}
          </span>
        )}
      </div>

      {/* Radial stat editor — NOT given boosts: stat-stage boosts live solely
          in the dedicated Boosts row below. Passing them here would also render
          the boost steppers inside the radial fine-tune expander, giving two
          ways to edit the same boosts. The fine-tune stays IV-only. */}
      <RadialStatEditor
        pokemon={pokemon}
        format={format}
        onUpdate={onUpdate}
        compact={compact}
      />

      {/* Boosts row — the single place to edit stat-stage boosts (no label;
          the colored per-stat steppers are self-explanatory) */}
      <div className="border-border/50 mt-3 border-t border-dashed pt-2.5">
        <StatBoostsRow boosts={boosts} onChange={onBoostChange} />
      </div>
    </div>
  );
}

// =============================================================================
// MobileMoveRow — compact single-move row for the mobile moves stack
// =============================================================================

/**
 * KO colors used on mobile move rows — mirrors the values in moves-lane.tsx
 * so the two layouts stay visually consistent.
 */
const MOBILE_KO_COLORS: Record<string, string> = {
  "1": "text-[var(--ko-red)]",
  "2": "text-[var(--ko-amber2-fg)]",
  "3": "text-[var(--ko-yellow-fg)]",
  "4": "text-muted-foreground",
};

const MOBILE_KO_LABELS: Record<string, string> = {
  "1": "OHKO",
  "2": "2HKO",
  "3": "3HKO",
  "4": "4HKO+",
};

interface MobileMoveRowProps {
  moveName: string | null;
  output: CalcOutput | null;
  format: GameFormat | undefined;
  calcEnabled: boolean;
  foesAlive: number;
  allyAlive: boolean;
}

function MobileMoveRow({
  moveName,
  output,
  format,
  calcEnabled,
  foesAlive,
  allyAlive,
}: MobileMoveRowProps) {
  const moveData = moveName ? getMoveData(moveName, format?.id) : null;
  const isStatus = moveData?.category === "Status";
  const hasCalc = calcEnabled && output !== null && !isStatus && !!moveName;

  const { koTier, displayMin, displayMax } = getDisplayRangeAndKoTier({
    moveName,
    output,
    hasCalc,
    foesAlive,
    allyAlive,
  });

  const koChance = output?.koChance ?? null;
  const showChance = koChance != null && koChance > 0 && koChance < 100;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded-md px-2 py-1.5",
        koTier === "1" &&
          "bg-[color-mix(in_oklch,var(--ko-red)_8%,transparent)]",
        koTier === "2" &&
          "bg-[color-mix(in_oklch,var(--ko-amber2-fg)_8%,transparent)]",
        koTier === "3" &&
          "bg-[color-mix(in_oklch,var(--ko-yellow-fg)_8%,transparent)]",
        koTier === "4" && "bg-muted/30",
        !koTier && "bg-transparent"
      )}
    >
      {/* Move name — left side */}
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-xs font-medium",
          !moveName && "text-muted-foreground/50"
        )}
      >
        {moveName ?? "+ Add move"}
      </span>

      {/* Calc results — right side (only when calc is on and move exists) */}
      {hasCalc && koTier ? (
        <div className="flex shrink-0 items-center gap-2">
          {/* Damage % range */}
          <span className="text-muted-foreground font-mono text-xs tabular-nums">
            {displayMin.toFixed(1)}–{displayMax.toFixed(1)}%
          </span>
          {/* KO tier */}
          <span
            className={cn(
              "font-mono text-xs font-extrabold tracking-wide uppercase",
              MOBILE_KO_COLORS[koTier] ?? "text-muted-foreground"
            )}
          >
            {showChance
              ? `${koChance % 1 === 0 ? koChance.toFixed(0) : koChance.toFixed(1)}% ${MOBILE_KO_LABELS[koTier] ?? "4HKO+"}`
              : (MOBILE_KO_LABELS[koTier] ?? "4HKO+")}
          </span>
        </div>
      ) : moveName && isStatus ? (
        <span className="text-muted-foreground shrink-0 font-mono text-xs">
          Status
        </span>
      ) : null}
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
  /** Whether calc-derived info should be surfaced in move rows. */
  calcEnabled: boolean;
  /** Number of live foes — drives spread-damage halving in mobile rows. */
  foesAlive: number;
  /** Whether an ally is alive — affects spread-damage halving in mobile rows. */
  allyAlive: boolean;
}

const MOVE_SLOTS_KEYS = [
  "move1",
  "move2",
  "move3",
  "move4",
] as const satisfies ReadonlyArray<keyof Tables<"pokemon">>;

function MonMovesCard({
  pokemon,
  format,
  onUpdate,
  direction,
  outputs,
  opponent,
  headerLabel,
  compact = false,
  calcEnabled,
  foesAlive,
  allyAlive,
}: MonMovesCardProps) {
  const isClient = useIsClient();
  const isMobile = useIsMobile();

  // On mobile (post-hydration), render a compact stacked-row layout instead
  // of the full multi-column table, which overflows a 390px viewport.
  const showMobileLayout = isClient && isMobile;

  return (
    <div
      className={cn(
        "border-border/60 bg-card/60 w-full rounded-xl border backdrop-blur-sm",
        compact ? "p-2.5" : "p-3"
      )}
    >
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-muted-foreground font-mono text-xs font-semibold tracking-[0.08em] uppercase">
          {headerLabel}
        </span>
        {!showMobileLayout && (
          <span className="text-muted-foreground font-mono text-xs">
            % · KO
          </span>
        )}
      </div>

      {/* Skeleton while client hydrates — prevents layout shift */}
      {!isClient && (
        <div
          aria-hidden
          className="bg-muted/30 animate-pulse rounded-lg"
          style={{ height: "116px" }}
        />
      )}

      {/* Mobile: compact stacked rows, one per move — fits a 390px viewport */}
      {showMobileLayout && (
        <div
          data-testid={`mobile-moves-${direction}`}
          className="flex flex-col gap-0.5"
        >
          {MOVE_SLOTS_KEYS.map((slot, idx) => (
            <MobileMoveRow
              key={slot}
              moveName={(pokemon[slot] as string | null) || null}
              output={outputs[idx] ?? null}
              format={format}
              calcEnabled={calcEnabled}
              foesAlive={foesAlive}
              allyAlive={allyAlive}
            />
          ))}
        </div>
      )}

      {/* Desktop: full moves table (unchanged) */}
      {isClient && !isMobile && (
        <MovesLane
          pokemon={pokemon}
          format={format}
          onUpdate={onUpdate}
          direction={direction}
          outputs={outputs}
          opponent={opponent}
          compact={compact}
        />
      )}
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
              <span className="text-muted-foreground mb-2 block font-mono text-xs font-bold tracking-[0.10em] uppercase">
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
  teamItems = [],
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

  // ── Field extras (from CalcStateContext superset) ─────────────────────────
  // CalcVersusView is always rendered with a full CalcStateContextValue (which
  // extends UseCalcStateReturn with calcEnabled + field). Read them here so
  // MonMovesCard stays context-free and test-friendly.
  const { calcEnabled, field } = calc;
  const foesAlive = field.foesAlive;
  const allyAlive = field.allyAlive;

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
        {/* Side columns capped at 28rem (≈ mock's 440px) and the whole grid
            centered, so the compact cards don't stretch across the full 1fr
            width and leave the small hexagon floating in a too-wide card. */}
        <div className="grid w-full grid-cols-[minmax(0,28rem)_18rem_minmax(0,28rem)] items-start justify-center gap-4">
          {/* ── (a) LABEL BAND ──────────────────────────────────────────── */}
          {/* Left: "Your Pokémon" */}
          <div className="flex h-3.5 items-center justify-center">
            <span className="text-muted-foreground font-mono text-xs font-bold tracking-[0.12em] uppercase">
              Your Pokémon
            </span>
          </div>
          {/* Center: empty spacer (same height keeps rows in sync) */}
          <div className="h-3.5" />
          {/* Right: "Calc Target · click to edit ▾" */}
          <div className="flex h-3.5 items-center justify-center">
            <span className="font-mono text-xs font-bold tracking-[0.12em] text-rose-400/80 uppercase">
              Calc Target · click to edit ▾
            </span>
          </div>

          {/* ── (b) HERO BAND ───────────────────────────────────────────── */}
          {/* Left: your mon sprite + chips */}
          <div className="flex h-72 items-center justify-center">
            <MonHeroContent
              pokemon={pokemon}
              onSpeciesClick={() => setYourSpeciesOpen(true)}
              isShiny={pokemon.is_shiny ?? false}
              size={200}
              format={format}
              onUpdate={onUpdate}
              teamItems={teamItems}
              isMegaStone={yourIdentity.isMegaStone}
            />
          </div>
          {/* Center: VS badge — same h-56 so it aligns with the hero band */}
          <div className="flex h-72 items-center justify-center">
            <div className="border-border bg-card/60 flex size-12 items-center justify-center rounded-full border backdrop-blur-sm">
              <span className="text-muted-foreground font-mono text-sm font-extrabold">
                VS
              </span>
            </div>
          </div>
          {/* Right: target sprite + chips */}
          <div className="flex h-72 items-center justify-center">
            <MonHeroContent
              pokemon={target.pokemon}
              onSpeciesClick={() => setTargetSpeciesOpen(true)}
              isFoe
              size={200}
              format={format}
              onUpdate={target.onUpdate}
              isMegaStone={targetIdentity.isMegaStone}
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
          {/* Center: field panel — spans the stats + moves bands so the shorter
              stats cards don't force a tall content row (which left a gap above
              the moves). self-stretch matches its height to stats+moves. */}
          <div className="border-border/60 bg-card/60 w-full self-stretch rounded-xl border p-3 backdrop-blur-sm md:row-span-2">
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
            calcEnabled={calcEnabled}
            foesAlive={foesAlive}
            allyAlive={allyAlive}
          />
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
            calcEnabled={calcEnabled}
            foesAlive={foesAlive}
            allyAlive={allyAlive}
          />
        </div>
      </div>

      {/* ═══════════════════ MOBILE LAYOUT (< md) ═══════════════════════ */}
      <div className="flex flex-col gap-3 md:hidden">
        {/* YOUR MON */}
        <div className="flex flex-col gap-3">
          <MonHero
            pokemon={pokemon}
            sideLabel="Your Pokémon"
            sideLabelClassName="text-muted-foreground"
            onSpeciesClick={() => setYourSpeciesOpen(true)}
            isShiny={pokemon.is_shiny ?? false}
            format={format}
            onUpdate={onUpdate}
            teamItems={teamItems}
            isMegaStone={yourIdentity.isMegaStone}
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
            calcEnabled={calcEnabled}
            foesAlive={foesAlive}
            allyAlive={allyAlive}
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
            format={format}
            onUpdate={target.onUpdate}
            isMegaStone={targetIdentity.isMegaStone}
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
            calcEnabled={calcEnabled}
            foesAlive={foesAlive}
            allyAlive={allyAlive}
          />
        </div>
      </div>
    </>
  );
}
