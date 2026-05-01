"use client";

import { type GameFormat } from "@trainers/pokemon";
import { type Tables, type TeamWithPokemon } from "@trainers/supabase";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { useCalcStateContext } from "./calc-state-context";
import { CalcDefenderBlock } from "./calc-defender-block";
import { CalcFieldBlock } from "./calc-field-block";

interface CalcDrawerProps {
  open: boolean;
  selectedPokemon: Tables<"pokemon"> | null;
  team: TeamWithPokemon;
  format: GameFormat | undefined;
  onClose: () => void;
}

/**
 * Mobile-only Damage Calc Sheet.
 *
 * The desktop layout uses the bottom-panel calc (rendered from the dockbar)
 * as the primary calc surface. This drawer remains as the mobile fallback —
 * a full-screen Sheet sliding from the right.
 */
export function CalcDrawer({
  open,
  selectedPokemon,
  team,
  format,
  onClose,
}: CalcDrawerProps) {
  if (!open) return null;

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

        <header className="flex items-center justify-between border-b px-4 py-2.5">
          <div className="flex flex-col gap-px">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Damage calc
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">
              live · inherits attacker
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

        {!selectedPokemon ? (
          <div className="p-4 text-center">
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

interface CalcDrawerContentProps {
  selectedPokemon: Tables<"pokemon">;
  team: TeamWithPokemon;
  format: GameFormat | undefined;
}

function CalcDrawerContent({
  selectedPokemon: _selectedPokemon,
  team,
  format,
}: CalcDrawerContentProps) {
  const calc = useCalcStateContext();
  const { field, setField } = calc;

  const teammates = (team.team_pokemon ?? [])
    .map((tp) => tp.pokemon)
    .filter(
      (p): p is Tables<"pokemon"> =>
        p !== null && p.id !== _selectedPokemon.id
    );

  function handleGameTypeChange(v: "Doubles" | "Singles") {
    calc.setGameType(v);
    setField({ doubles: v === "Doubles" });
  }

  function handleSetFoesAlive(v: 1 | 2) {
    setField({ foesAlive: v });
  }

  function handleSetAllyAlive(v: boolean) {
    setField({ allyAlive: v });
  }

  return (
    <div className="flex flex-col">
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
        faintedYours={0}
        setFaintedYours={() => {}}
        faintedTheirs={0}
        setFaintedTheirs={() => {}}
      />
    </div>
  );
}
