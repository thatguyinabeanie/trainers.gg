"use client";

import {
  type GameFormat,
} from "@trainers/pokemon";
import { type Tables } from "@trainers/supabase";

import { useCalcStateContext } from "./calc-state-context";
import { CalcDefenderStats } from "./calc-defender-stats";
import { CalcDefenderMoves } from "./calc-defender-moves";
import { CalcFieldBlock } from "./calc-field-block";
import { DefenderMonHeader } from "./calc-defender-header";
import { useDefenderMoves } from "./use-defender-moves";

// =============================================================================
// Types
// =============================================================================

interface CalcBottomPanelProps {
  /** Pre-built 6-slot array (team_position aligned), passed from the workspace. */
  teamSlots: (Tables<"pokemon"> | null)[];
  format: GameFormat | undefined;
  onClose: () => void;
  /** Active attacker slot index (0..5). */
  attackerIdx: number;
  /** Fainted count on YOUR team (0..5) — for Last Respects BP and Sides stepper. */
  faintedYours: number;
  setFaintedYours: (n: number) => void;
  /** Fainted count on THEIR team (0..5) — for Last Respects BP and Sides stepper. */
  faintedTheirs: number;
  setFaintedTheirs: (n: number) => void;
}

// =============================================================================
// CalcBottomPanel
// =============================================================================

/**
 * Bottom-dock damage calc panel for the v2 team builder.
 *
 * 3-column layout: Attacker (your team slot) | Field conditions | Defender
 * (opponent). Opens as a dock-pill-triggered inline panel below the team rows.
 * Ownership is asymmetric — attacker inherits the active row's data while the
 * defender is independently configured in this panel.
 */
export function CalcBottomPanel({
  teamSlots,
  format,
  onClose,
  attackerIdx,
  faintedYours,
  setFaintedYours,
  faintedTheirs,
  setFaintedTheirs,
}: CalcBottomPanelProps) {
  const calc = useCalcStateContext();

  const attacker = teamSlots[attackerIdx] ?? null;

  // Build the flat teammates list (non-null pokemon slots)
  const teammates = teamSlots.filter(
    (p): p is NonNullable<typeof p> => p !== null
  );

  // Resolve effective defender moves (preset default → teammate default → empty)
  const { effectiveMoves } = useDefenderMoves({
    defenderSpecies: calc.defenderSpecies,
    defenderMoves: calc.defenderMoves,
    teammates,
  });

  return (
    <section className="flex min-h-0 flex-1 flex-col" aria-label="Damage Calc">
      {/* PokeRow-style card — teal rib + rounded border */}
      <div
        className="flex min-h-0 flex-1 items-stretch overflow-hidden rounded-lg border border-primary/60 bg-card shadow-[0_0_0_1px_hsl(var(--primary)/0.3),0_8px_28px_-16px_hsl(var(--primary)/0.4)]"
      >
        {/* Left rib — teal accent, vertical label */}
        <div className="flex w-7 shrink-0 flex-col items-center justify-between border-r border-border/60 border-dashed bg-primary/10 py-2">
          <span className="font-mono text-[9px] font-bold tracking-[0.1em] text-primary [writing-mode:vertical-rl] rotate-180">
            CALC
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close damage calc"
            className="text-muted-foreground hover:bg-destructive/15 hover:text-destructive flex size-5 items-center justify-center rounded transition-colors"
          >
            ×
          </button>
        </div>

        {/* Content — mirrors vertical PokeRow: identity → stats → moves | field */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
          {/* Defender identity (sprite + meta) */}
          <DefenderMonHeader
            defenderSpecies={calc.defenderSpecies}
            defenderAbility={calc.defenderAbility}
            defenderItem={calc.defenderItem}
            defenderNature={calc.defenderNature}
            defenderTera={calc.defenderTera}
            format={format}
            setDefenderSpecies={calc.setDefenderSpecies}
            setDefenderAbility={calc.setDefenderAbility}
            setDefenderItem={calc.setDefenderItem}
            setDefenderNature={calc.setDefenderNature}
            setDefenderTera={calc.setDefenderTera}
            defenderMegaActive={calc.defenderMegaActive}
            setDefenderMegaActive={calc.setDefenderMegaActive}
          />

          {/* Defender stats */}
          <div className="border-b border-dashed border-border px-2 py-1.5">
            <CalcDefenderStats
              defenderSpecies={calc.defenderSpecies}
              defenderNature={calc.defenderNature}
              defenderEvs={calc.defenderEvs}
              defenderIvs={calc.defenderIvs}
              defenderBoosts={calc.defenderBoosts}
              defenderHpPercent={calc.defenderHpPercent}
              format={format}
              setDefenderEv={calc.setDefenderEv}
              setDefenderBoost={calc.setDefenderBoost}
              setDefenderHpPercent={calc.setDefenderHpPercent}
            />
          </div>

          {/* Defender moves */}
          <div className="border-b border-dashed border-border p-2">
            <CalcDefenderMoves
              effectiveMoves={effectiveMoves}
              defenderSpecies={calc.defenderSpecies}
              format={format}
              onPick={(slotIdx, moveName) =>
                calc.setDefenderMove(slotIdx, moveName)
              }
            />
          </div>

          {/* Field conditions */}
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <CalcFieldBlock
              gameType={calc.gameType}
              setGameType={calc.setGameType}
              attackerSide={calc.attackerSide}
              setAttackerSide={calc.setAttackerSide}
              defenderSide={calc.defenderSide}
              setDefenderSide={calc.setDefenderSide}
              field={{
                weather: calc.weather,
                terrain: calc.terrain,
                gravity: calc.gravity,
                fairyAura: calc.fairyAura,
              }}
              setField={{
                setWeather: calc.setWeather,
                setTerrain: calc.setTerrain,
                setGravity: calc.setGravity,
                setFairyAura: calc.setFairyAura,
              }}
              doubles={{
                foesAlive: calc.field.foesAlive,
                allyAlive: calc.field.allyAlive,
              }}
              setDoubles={{
                setFoesAlive: (v) => calc.setField({ foesAlive: v }),
                setAllyAlive: (v) => calc.setField({ allyAlive: v }),
              }}
              fainted={{ yours: faintedYours, theirs: faintedTheirs }}
              setFainted={{ setYours: setFaintedYours, setTheirs: setFaintedTheirs }}
              inferred={{
                weather: calc.inferredWeather,
                terrain: calc.inferredTerrain,
                attackerAbility: attacker?.ability ?? null,
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
