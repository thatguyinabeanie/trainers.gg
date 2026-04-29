"use client";

import { type GameFormat } from "@trainers/pokemon";
import { type Tables, type TeamWithPokemon } from "@trainers/supabase";

import { useCalcState } from "../../use-calc-state";
import { type FieldState } from "../use-builder-state";
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
  field: FieldState;
  setField: (field: FieldState) => void;
  onClose: () => void;
}

// =============================================================================
// CalcDrawer
// =============================================================================

/**
 * Right-rail Damage Calc drawer for the v2 team builder.
 * Internally calls useCalcState; state resets on attacker switch via key prop
 * on CalcDrawerInner (per react-patterns.md state-reset pattern).
 */
export function CalcDrawer({
  open,
  selectedPokemon,
  team,
  setActiveIdx,
  format,
  activeIdx,
  field,
  setField,
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
        <CalcDrawerInner
          key={selectedPokemon.id}
          selectedPokemon={selectedPokemon}
          team={team}
          setActiveIdx={setActiveIdx}
          format={format}
          activeIdx={activeIdx}
          field={field}
          setField={setField}
        />
      )}
    </aside>
  );
}

// =============================================================================
// CalcDrawerInner — keyed by attacker.id so all calc state resets cleanly
// =============================================================================

interface CalcDrawerInnerProps {
  selectedPokemon: Tables<"pokemon">;
  team: TeamWithPokemon;
  setActiveIdx: (idx: number) => void;
  format: GameFormat | undefined;
  activeIdx: number;
  field: FieldState;
  setField: (field: FieldState) => void;
}

function CalcDrawerInner({
  selectedPokemon,
  team,
  setActiveIdx,
  format,
  activeIdx,
  field,
  setField,
}: CalcDrawerInnerProps) {
  const calc = useCalcState({ selectedPokemon, format });

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
  // useCalcState owns its own gameType state — we initialize it from field
  // on mount (key-reset handles attacker switch). For user toggles inside
  // the drawer, we update both calc.setGameType and field.doubles together.
  function handleGameTypeChange(v: "Doubles" | "Singles") {
    calc.setGameType(v);
    setField({ ...field, doubles: v === "Doubles" });
  }

  // Field state setters that pipe foesAlive / allyAlive through builder field
  function handleSetFoesAlive(v: 1 | 2) {
    setField({ ...field, foesAlive: v });
  }

  function handleSetAllyAlive(v: boolean) {
    setField({ ...field, allyAlive: v });
  }

  // Tera toggle
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
