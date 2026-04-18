"use client";

import { type GameFormat } from "@trainers/pokemon";
import { type Tables, type TeamWithPokemon } from "@trainers/supabase";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

import { CalcDefenderForm } from "./calc-defender-form";
import { CalcFieldForm, CalcSidesForm } from "./calc-field-form";
import { CalcMoveList } from "./calc-move-list";
import { CalcResultPinned } from "./calc-result-pinned";
import { useCalcState } from "./use-calc-state";

// =============================================================================
// Types
// =============================================================================

interface CalcPanelProps {
  team: TeamWithPokemon;
  selectedPokemon: Tables<"pokemon"> | null;
  format: GameFormat | undefined;
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Right-rail "Calc" tab content. Pinned damage-calc result band at the top
 * with scrollable accordion sections beneath. State persists per attacker
 * via the {@link CalcPanelInner} `key` prop — switching pokemon mounts a
 * fresh inner component (per `react-patterns.md`'s state-reset pattern).
 *
 * When `selectedPokemon` is null, the panel renders a friendly empty state.
 */
export function CalcPanel({
  team,
  selectedPokemon,
  format,
  className,
}: CalcPanelProps) {
  if (!selectedPokemon) {
    return (
      <div
        data-testid="calc-panel-empty"
        className={cn(
          "bg-card overflow-hidden rounded-lg shadow-sm",
          className
        )}
      >
        <div className="px-4 py-6 text-center">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Damage calc
          </p>
          <p className="text-muted-foreground mt-2 text-sm">
            Select a Pokémon to calculate damage.
          </p>
        </div>
      </div>
    );
  }

  return (
    <CalcPanelInner
      key={selectedPokemon.id}
      team={team}
      selectedPokemon={selectedPokemon}
      format={format}
      className={className}
    />
  );
}

// =============================================================================
// CalcPanelInner — keyed by attacker so all calc state resets cleanly
// =============================================================================

interface CalcPanelInnerProps {
  team: TeamWithPokemon;
  selectedPokemon: Tables<"pokemon">;
  format: GameFormat | undefined;
  className?: string;
}

function CalcPanelInner({
  team,
  selectedPokemon,
  format,
  className,
}: CalcPanelInnerProps) {
  const calc = useCalcState({ selectedPokemon });

  const attackerName = selectedPokemon.species ?? "—";
  const defenderName = calc.defenderSpecies || "—";

  // Direction-aware display names for the pinned result.
  const displayedAttacker =
    calc.direction === "offense" ? attackerName : defenderName;
  const displayedDefender =
    calc.direction === "offense" ? defenderName : attackerName;

  // Teammates other than the selected pokemon — surfaced in the defender picker.
  const teammates = (team.team_pokemon ?? [])
    .map((tp) => tp.pokemon)
    .filter(
      (p): p is Tables<"pokemon"> => p !== null && p.id !== selectedPokemon.id
    );

  return (
    <div
      className={cn("bg-card overflow-hidden rounded-lg shadow-sm", className)}
    >
      {/* Pinned result */}
      <CalcResultPinned
        attackerName={displayedAttacker}
        defenderName={displayedDefender}
        moveName={calc.selectedMoveName}
        output={calc.selectedMoveOutput}
      />

      {/* Accordion sections — multiple sections can be open simultaneously */}
      <Accordion multiple defaultValue={["move", "attacker", "defender"]}>
        <AccordionItem value="move" className="px-4">
          <AccordionTrigger>Move</AccordionTrigger>
          <AccordionContent>
            <CalcMoveList
              moves={calc.moves}
              calcOutputs={calc.moveCalcOutputs}
              selectedMoveIdx={calc.selectedMoveIdx}
              critMoves={calc.critMoves}
              onSelect={calc.setSelectedMoveIdx}
              onToggleCrit={calc.toggleCrit}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="attacker" className="px-4">
          <AccordionTrigger>Attacker · {attackerName}</AccordionTrigger>
          <AccordionContent>
            <AttackerSection
              status={calc.attackerStatus}
              onStatusChange={calc.setAttackerStatus}
              boostAtk={calc.attackerBoosts.atk}
              boostSpa={calc.attackerBoosts.spa}
              boostSpe={calc.attackerBoosts.spe}
              onBoostAtk={(v) => calc.setAttackerBoost("atk", v)}
              onBoostSpa={(v) => calc.setAttackerBoost("spa", v)}
              onBoostSpe={(v) => calc.setAttackerBoost("spe", v)}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="defender" className="px-4">
          <AccordionTrigger>Defender · {defenderName}</AccordionTrigger>
          <AccordionContent>
            <CalcDefenderForm
              species={calc.defenderSpecies}
              ability={calc.defenderAbility}
              item={calc.defenderItem}
              nature={calc.defenderNature}
              teraType={calc.defenderTera}
              evs={calc.defenderEvs}
              boosts={calc.defenderBoosts}
              status={calc.defenderStatus}
              hpPercent={calc.defenderHpPercent}
              format={format}
              teammates={teammates}
              onSpeciesChange={(s) => calc.resetDefenderForSpecies(s)}
              onAbilityChange={calc.setDefenderAbility}
              onItemChange={calc.setDefenderItem}
              onNatureChange={calc.setDefenderNature}
              onTeraChange={calc.setDefenderTera}
              onEvChange={calc.setDefenderEv}
              onBoostChange={calc.setDefenderBoost}
              onStatusChange={calc.setDefenderStatus}
              onHpPercentChange={calc.setDefenderHpPercent}
              onPresetCustom={() =>
                calc.resetDefenderForSpecies(calc.defenderSpecies)
              }
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="field" className="px-4">
          <AccordionTrigger>Field</AccordionTrigger>
          <AccordionContent>
            <CalcFieldForm
              gameType={calc.gameType}
              weather={calc.weather}
              terrain={calc.terrain}
              gravity={calc.gravity}
              onGameTypeChange={calc.setGameType}
              onWeatherChange={calc.setWeather}
              onTerrainChange={calc.setTerrain}
              onGravityChange={calc.setGravity}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="sides" className="px-4">
          <AccordionTrigger>Sides</AccordionTrigger>
          <AccordionContent>
            <CalcSidesForm
              attackerSide={calc.attackerSide}
              defenderSide={calc.defenderSide}
              onAttackerSideChange={calc.setAttackerSide}
              onDefenderSideChange={calc.setDefenderSide}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

// =============================================================================
// AttackerSection — compact status + 3 boost steppers (Atk, SpA, Spe)
// =============================================================================

const ATTACKER_STATUS_OPTIONS = [
  "Healthy",
  "Burned",
  "Poisoned",
  "Badly Poisoned",
  "Paralyzed",
  "Asleep",
  "Frozen",
];

interface AttackerSectionProps {
  status: string;
  boostAtk: number;
  boostSpa: number;
  boostSpe: number;
  onStatusChange: (v: string) => void;
  onBoostAtk: (v: number) => void;
  onBoostSpa: (v: number) => void;
  onBoostSpe: (v: number) => void;
}

function AttackerSection({
  status,
  boostAtk,
  boostSpa,
  boostSpe,
  onStatusChange,
  onBoostAtk,
  onBoostSpa,
  onBoostSpe,
}: AttackerSectionProps) {
  return (
    <div className="flex flex-col gap-2.5">
      {/* Status */}
      <div className="flex items-center gap-2">
        <label className="text-muted-foreground w-14 shrink-0 text-xs font-medium tracking-wide uppercase">
          Status
        </label>
        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
          aria-label="Attacker status"
          className="border-border bg-background focus:ring-primary h-7 flex-1 rounded border px-1 text-xs focus:ring-1 focus:outline-none"
        >
          {ATTACKER_STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s === "Burned"
                ? "Burn (×½ Atk)"
                : s.replace("Badly Poisoned", "Toxic")}
            </option>
          ))}
        </select>
      </div>

      {/* Boost steppers */}
      <div className="grid grid-cols-3 gap-2">
        <BoostStepper label="Atk" value={boostAtk} onChange={onBoostAtk} />
        <BoostStepper label="SpA" value={boostSpa} onChange={onBoostSpa} />
        <BoostStepper label="Spe" value={boostSpe} onChange={onBoostSpe} />
      </div>
    </div>
  );
}

interface BoostStepperProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
}

function BoostStepper({ label, value, onChange }: BoostStepperProps) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-muted-foreground w-7 text-[11px] font-medium">
        {label}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.max(-6, value - 1))}
        aria-label={`Decrease attacker ${label} boost`}
        className="border-border hover:bg-muted size-6 rounded border text-xs"
      >
        −
      </button>
      <span
        className={cn(
          "min-w-[26px] text-center font-mono text-xs tabular-nums",
          value > 0 && "text-stat-good font-semibold",
          value < 0 && "text-destructive font-semibold"
        )}
      >
        {value > 0 ? `+${value}` : value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(6, value + 1))}
        aria-label={`Increase attacker ${label} boost`}
        className="border-border hover:bg-muted size-6 rounded border text-xs"
      >
        +
      </button>
    </div>
  );
}
