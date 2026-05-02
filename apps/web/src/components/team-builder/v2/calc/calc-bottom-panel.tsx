"use client";

import {
  calculateHP,
  calculateChampionsHP,
  getBaseStats,
  isChampionsFormat,
  type GameFormat,
} from "@trainers/pokemon";
import { type Tables } from "@trainers/supabase";

import { useCalcStateContext } from "./calc-state-context";
import { CalcAttackerBlock } from "./calc-attacker-block";
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
  /** Setter for the active attacker slot. */
  onPickAttacker: (idx: number) => void;
  /** Fainted count on YOUR team (0..5) — for Last Respects BP and Sides stepper. */
  faintedYours: number;
  setFaintedYours: (n: number) => void;
  /** Fainted count on THEIR team (0..5) — for Last Respects BP and Sides stepper. */
  faintedTheirs: number;
  setFaintedTheirs: (n: number) => void;
}

// =============================================================================
// Helpers
// =============================================================================

/** Compute the HP of a pokemon row for the attacker HP readout. */
function computeAttackerHP(pokemon: Tables<"pokemon"> | null, format: GameFormat | undefined): number | null {
  if (!pokemon?.species) return null;
  const rawBase = getBaseStats(pokemon.species);
  if (!rawBase) return null;
  const isChampions = isChampionsFormat(format);
  const iv = pokemon.iv_hp ?? 31;
  const ev = pokemon.ev_hp ?? 0;
  const level = pokemon.level ?? 50;
  if (isChampions) return calculateChampionsHP(rawBase.hp, ev);
  return calculateHP(rawBase.hp, iv, ev, level);
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
  onPickAttacker,
  faintedYours,
  setFaintedYours,
  faintedTheirs,
  setFaintedTheirs,
}: CalcBottomPanelProps) {
  const calc = useCalcStateContext();

  const attacker = teamSlots[attackerIdx] ?? null;
  const attackerName = attacker?.nickname ?? attacker?.species ?? "—";
  const attackerHP = computeAttackerHP(attacker, format);

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
      {/* Panel header — mono uppercase eyebrow + close */}
      <header className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Damage calc
          </span>
          <span className="font-mono text-[11px] text-muted-foreground">
            live · 2-way
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close damage calc"
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          ×
        </button>
      </header>

      {/* 3-column grid — equal sizes */}
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-3 overflow-y-auto p-3">
        <CalcAttackerBlock
          teamSlots={teamSlots}
          attackerIdx={attackerIdx}
          onPickAttacker={onPickAttacker}
          attackerBoosts={calc.attackerBoosts}
          setAttackerBoost={calc.setAttackerBoost}
        />
        <div className="min-h-0 overflow-y-auto rounded-lg border bg-card p-3 shadow-sm">
          <CalcFieldBlock
            gameType={calc.gameType}
            setGameType={calc.setGameType}
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
            fairyAura={calc.fairyAura}
            setFairyAura={calc.setFairyAura}
            foesAlive={calc.field.foesAlive}
            allyAlive={calc.field.allyAlive}
            setFoesAlive={(v) => calc.setField({ foesAlive: v })}
            setAllyAlive={(v) => calc.setField({ allyAlive: v })}
            inferredWeather={calc.inferredWeather}
            inferredTerrain={calc.inferredTerrain}
            attackerAbility={attacker?.ability ?? null}
            faintedYours={faintedYours}
            setFaintedYours={setFaintedYours}
            faintedTheirs={faintedTheirs}
            setFaintedTheirs={setFaintedTheirs}
          />
        </div>

        {/* Defender column */}
        <div className="flex flex-col rounded-lg border bg-card shadow-sm">
          {/* Col head — "vs Attacker · HP" badge on the right */}
          <div className="flex items-center justify-between border-b px-3 py-2">
            <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.1em] text-destructive">
              Defender
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">
              vs {attackerName}
              {attackerHP !== null ? ` · ${attackerHP} HP` : ""}
            </span>
          </div>

          {/* Identity (left) + Stats (right) — adjacent lanes, matching the editor pattern */}
          <div className="flex min-w-0 border-b">
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
            />
            <div className="min-w-0 flex-1 overflow-hidden p-2">
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
          </div>

          {/* Their moves → your atk — full width at bottom */}
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <CalcDefenderMoves
              effectiveMoves={effectiveMoves}
              computeReverseOutput={calc.computeReverseOutput}
              attackerHP={attackerHP}
              defenderSpecies={calc.defenderSpecies}
              format={format}
              onPick={(slotIdx, moveName) =>
                calc.setDefenderMove(slotIdx, moveName)
              }
            />
          </div>
        </div>
      </div>
    </section>
  );
}
