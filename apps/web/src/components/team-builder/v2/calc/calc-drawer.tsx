"use client";

import { useRef } from "react";

import { type GameFormat } from "@trainers/pokemon";
import { type Tables, type TeamWithPokemon } from "@trainers/supabase";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

import { useCalcStateContext } from "./calc-state-context";
import { CalcDefenderBlock } from "./calc-defender-block";
import { CalcFieldBlock } from "./calc-field-block";
import { CalcResultsBlock } from "./calc-results-block";

const MIN_WIDTH = 320;
const MAX_WIDTH = 640;

interface CalcDrawerProps {
  open: boolean;
  selectedPokemon: Tables<"pokemon"> | null;
  team: TeamWithPokemon;
  format: GameFormat | undefined;
  onClose: () => void;
  calcDrawerWidth: number;
  setCalcDrawerWidth: (n: number) => void;
}

// =============================================================================
// CalcDrawer
// =============================================================================

/**
 * Right-rail Damage Calc drawer for the v2 team builder.
 * Consumes calc state from CalcStateContext (lifted to workspace level in
 * team-workspace-v2.tsx) so the MovesLane can share the same defender state.
 */
export function CalcDrawer({
  open,
  selectedPokemon,
  team,
  format,
  onClose,
  calcDrawerWidth,
  setCalcDrawerWidth,
}: CalcDrawerProps) {
  const isMobile = useIsMobile();

  // Drag state — stored in refs so pointer events don't trigger re-renders
  const dragInitialX = useRef<number>(0);
  const dragInitialWidth = useRef<number>(0);

  if (!open) return null;

  // On mobile: render as a full-screen Sheet from the right.
  // On desktop: render as the inline right-rail aside (existing behaviour).
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
        <SheetContent
          side="right"
          className="w-full max-w-[calc(100vw-1rem)] overflow-y-auto p-0 sm:max-w-[380px]"
          showCloseButton={false}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Damage Calc</SheetTitle>
          </SheetHeader>

          {/* Reuse the same inner layout */}
          <header className="cd-head">
            <div className="cd-head-l">
              <span className="cd-eyebrow cd-eyebrow--sm">DAMAGE CALC</span>
              <span className="cd-head-sub">live · inherits attacker</span>
            </div>
            <button
              type="button"
              className="cd-close"
              onClick={onClose}
              aria-label="Close damage calc"
            >
              ×
            </button>
          </header>

          {!selectedPokemon ? (
            <div className="cd-empty">
              <p className="text-muted-foreground text-xs">
                Select a Pokémon to calc damage.
              </p>
            </div>
          ) : (
            <CalcDrawerContent
              selectedPokemon={selectedPokemon}
              team={team}
              format={format}
            />
          )}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside
      className="cd-drawer"
      aria-label="Damage Calc"
      style={{ width: `${calcDrawerWidth}px` }}
    >
      {/* Drag-resize handle — left edge, desktop only */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-valuemin={MIN_WIDTH}
        aria-valuemax={MAX_WIDTH}
        aria-valuenow={calcDrawerWidth}
        tabIndex={0}
        className={cn(
          "cd-resizer",
          "absolute top-0 bottom-0 left-0 w-1 cursor-col-resize",
          "hover:bg-primary/40 focus-visible:bg-primary/40",
          "pointer-events-auto touch-none outline-none"
        )}
        onPointerDown={(e) => {
          e.preventDefault();
          dragInitialX.current = e.clientX;
          dragInitialWidth.current = calcDrawerWidth;
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!(e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId))
            return;
          // Handle is on the LEFT edge — drag left grows, drag right shrinks
          const delta = e.clientX - dragInitialX.current;
          const next = Math.min(
            MAX_WIDTH,
            Math.max(MIN_WIDTH, dragInitialWidth.current - delta)
          );
          setCalcDrawerWidth(next);
        }}
        onPointerUp={(e) => {
          (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") {
            // Right grows the drawer (handle on left edge, growing = more space)
            setCalcDrawerWidth(
              Math.min(MAX_WIDTH, calcDrawerWidth + 10)
            );
          } else if (e.key === "ArrowLeft") {
            setCalcDrawerWidth(
              Math.max(MIN_WIDTH, calcDrawerWidth - 10)
            );
          } else if (e.key === "Home") {
            setCalcDrawerWidth(MIN_WIDTH);
          } else if (e.key === "End") {
            setCalcDrawerWidth(MAX_WIDTH);
          }
        }}
      />

      {/* Header */}
      <header className="cd-head">
        <div className="cd-head-l">
          <span className="cd-eyebrow cd-eyebrow--sm">DAMAGE CALC</span>
          <span className="cd-head-sub">live · inherits attacker</span>
        </div>
        <button
          type="button"
          className="cd-close"
          onClick={onClose}
          aria-label="Close damage calc"
        >
          ×
        </button>
      </header>

      {/* Empty state — no attacker selected */}
      {!selectedPokemon ? (
        <div className="cd-empty">
          <p className="text-muted-foreground text-xs">
            Select a Pokémon to calc damage.
          </p>
        </div>
      ) : (
        <CalcDrawerContent
          selectedPokemon={selectedPokemon}
          team={team}
          format={format}
        />
      )}
    </aside>
  );
}

// =============================================================================
// CalcDrawerContent — consumes context, no local useCalcState call
// =============================================================================

interface CalcDrawerContentProps {
  selectedPokemon: Tables<"pokemon">;
  team: TeamWithPokemon;
  format: GameFormat | undefined;
}

function CalcDrawerContent({
  selectedPokemon,
  team,
  format,
}: CalcDrawerContentProps) {
  const calc = useCalcStateContext();
  const { field, setField } = calc;

  // Teammates (other than selected attacker) for defender picker
  const teammates = (team.team_pokemon ?? [])
    .map((tp) => tp.pokemon)
    .filter(
      (p): p is Tables<"pokemon"> => p !== null && p.id !== selectedPokemon.id
    );

  // Defender max HP from calc output (from any non-null output)
  const defenderHp =
    calc.moveCalcOutputs.find((o) => o !== null)?.defenderMaxHP ?? 0;

  // Resolve gameType from builder field.doubles so both stay in sync.
  function handleGameTypeChange(v: "Doubles" | "Singles") {
    calc.setGameType(v);
    setField({ ...field, doubles: v === "Doubles" });
  }

  function handleSetFoesAlive(v: 1 | 2) {
    setField({ ...field, foesAlive: v });
  }

  function handleSetAllyAlive(v: boolean) {
    setField({ ...field, allyAlive: v });
  }

  return (
    <div className="cd-content">
      <CalcDefenderBlock
        defenderSpecies={calc.defenderSpecies}
        defenderAbility={calc.defenderAbility}
        defenderItem={calc.defenderItem}
        defenderNature={calc.defenderNature}
        defenderEvs={calc.defenderEvs}
        defenderBoosts={calc.defenderBoosts}
        defenderHpPercent={calc.defenderHpPercent}
        setDefenderSpecies={calc.setDefenderSpecies}
        setDefenderAbility={calc.setDefenderAbility}
        setDefenderItem={calc.setDefenderItem}
        setDefenderNature={calc.setDefenderNature}
        setDefenderEv={calc.setDefenderEv}
        setDefenderBoost={calc.setDefenderBoost}
        setDefenderHpPercent={calc.setDefenderHpPercent}
        resetDefenderForSpecies={calc.resetDefenderForSpecies}
        format={format}
        teammates={teammates}
      />

      <CalcFieldBlock
        gameType={calc.gameType}
        setGameType={handleGameTypeChange}
        attackerSide={calc.attackerSide}
        setAttackerSide={calc.setAttackerSide}
        defenderSide={calc.defenderSide}
        setDefenderSide={calc.setDefenderSide}
        weather={calc.weather}
        setWeather={calc.setWeather}
        terrain={calc.terrain}
        setTerrain={calc.setTerrain}
        gravity={calc.gravity}
        setGravity={calc.setGravity}
        foesAlive={field.foesAlive}
        allyAlive={field.allyAlive}
        setFoesAlive={handleSetFoesAlive}
        setAllyAlive={handleSetAllyAlive}
      />

      <CalcResultsBlock
        moves={calc.moves}
        moveCalcOutputs={calc.moveCalcOutputs}
        defenderHp={defenderHp}
        gameType={calc.gameType}
        foesAlive={field.foesAlive}
      />
    </div>
  );
}
