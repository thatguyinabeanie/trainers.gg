"use client";

import { type GameFormat } from "@trainers/pokemon";
import { type Tables, type TeamWithPokemon } from "@trainers/supabase";

import { useCalcStateContext } from "./calc-state-context";
import { CalcAttackerBlock } from "./calc-attacker-block";
import { CalcDefenderBlock } from "./calc-defender-block";
import { CalcFieldBlock } from "./calc-field-block";
import { CalcResultsBlock } from "./calc-results-block";

interface CalcDrawerProps {
  open: boolean;
  selectedPokemon: Tables<"pokemon"> | null;
  team: TeamWithPokemon;
  setActiveIdx: (idx: number) => void;
  format: GameFormat | undefined;
  /** Active row index — needed for team pip highlighting */
  activeIdx: number;
  onClose: () => void;
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
  setActiveIdx,
  format,
  activeIdx,
  onClose,
}: CalcDrawerProps) {
  if (!open) return null;

  return (
    <aside className="cd-drawer" aria-label="Damage Calc">
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
          setActiveIdx={setActiveIdx}
          format={format}
          activeIdx={activeIdx}
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
  setActiveIdx: (idx: number) => void;
  format: GameFormat | undefined;
  activeIdx: number;
}

function CalcDrawerContent({
  selectedPokemon,
  team,
  setActiveIdx,
  format,
  activeIdx,
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

  function handleToggleAtkTera() {
    setField({ ...field, atkTera: !field.atkTera });
  }

  return (
    <div className="cd-content">
      <CalcAttackerBlock
        attacker={selectedPokemon}
        attackerIdx={activeIdx}
        team={team}
        format={format}
        setActiveIdx={setActiveIdx}
        atkTera={field.atkTera}
        onToggleAtkTera={handleToggleAtkTera}
      />

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
