"use client";

import { useState } from "react";
import {
  calculate,
  Field,
  Generations,
  Move,
  Pokemon,
  Side,
} from "@smogon/calc";

import { type Tables, type TeamWithPokemon } from "@trainers/supabase";
import { type GameFormat } from "@trainers/pokemon";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import { GEN9_VGC_META_THREATS, type MetaThreat } from "./meta-threats";

// =============================================================================
// Types
// =============================================================================

interface DamageCalcTabProps {
  team: TeamWithPokemon;
  selectedPokemon: Tables<"pokemon"> | null;
  format: GameFormat | undefined;
}

interface CalcResult {
  moveName: string;
  attackerName: string;
  defenderName: string;
  minPercent: number;
  maxPercent: number;
  desc: string;
}

type WeatherOption = "none" | "Sun" | "Rain" | "Sand" | "Snow";
type TerrainOption = "none" | "Electric" | "Grassy" | "Psychic" | "Misty";

// =============================================================================
// Smogon helpers
// =============================================================================

const gen9 = Generations.get(9);

function toSmogonPokemon(dbPokemon: Tables<"pokemon">): Pokemon {
  return new Pokemon(gen9, dbPokemon.species, {
    level: dbPokemon.level ?? 50,
    nature: dbPokemon.nature ?? "Hardy",
    ability: dbPokemon.ability,
    item: dbPokemon.held_item ?? undefined,
    ivs: {
      hp: dbPokemon.iv_hp ?? 31,
      atk: dbPokemon.iv_attack ?? 31,
      def: dbPokemon.iv_defense ?? 31,
      spa: dbPokemon.iv_special_attack ?? 31,
      spd: dbPokemon.iv_special_defense ?? 31,
      spe: dbPokemon.iv_speed ?? 31,
    },
    evs: {
      hp: dbPokemon.ev_hp ?? 0,
      atk: dbPokemon.ev_attack ?? 0,
      def: dbPokemon.ev_defense ?? 0,
      spa: dbPokemon.ev_special_attack ?? 0,
      spd: dbPokemon.ev_special_defense ?? 0,
      spe: dbPokemon.ev_speed ?? 0,
    },
    moves: [
      dbPokemon.move1,
      dbPokemon.move2,
      dbPokemon.move3,
      dbPokemon.move4,
    ].filter((m): m is string => Boolean(m)) as unknown as string[],
  });
}

function toSmogonThreat(threat: MetaThreat): Pokemon {
  return new Pokemon(gen9, threat.species, {
    level: 50,
    nature: threat.nature,
    ability: threat.ability,
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    evs: {
      hp: threat.evs.hp,
      atk: threat.evs.atk,
      def: threat.evs.def,
      spa: threat.evs.spa,
      spd: threat.evs.spd,
      spe: threat.evs.spe,
    },
    moves: threat.moves as unknown as string[],
  });
}

function buildSmogonField(
  weather: WeatherOption,
  terrain: TerrainOption,
  lightScreen: boolean,
  reflect: boolean,
  helpingHand: boolean,
  isAttackerSide: boolean
): Field {
  const attackerSide = new Side({
    isHelpingHand: helpingHand,
    isLightScreen: isAttackerSide ? false : lightScreen,
    isReflect: isAttackerSide ? false : reflect,
  });
  const defenderSide = new Side({
    isLightScreen: lightScreen,
    isReflect: reflect,
  });

  return new Field({
    weather: weather === "none" ? undefined : weather,
    terrain: terrain === "none" ? undefined : terrain,
    gameType: "Doubles",
    attackerSide,
    defenderSide,
  });
}

function runCalc(
  attacker: Pokemon,
  defender: Pokemon,
  moveName: string,
  field: Field
): CalcResult | null {
  try {
    const move = new Move(gen9, moveName);
    const result = calculate(gen9, attacker, defender, move, field);
    const [minDmg, maxDmg] = result.range();
    const defenderHP = defender.maxHP();
    if (defenderHP === 0) return null;
    const minPercent = Math.floor((minDmg / defenderHP) * 1000) / 10;
    const maxPercent = Math.floor((maxDmg / defenderHP) * 1000) / 10;
    return {
      moveName,
      attackerName: attacker.name,
      defenderName: defender.name,
      minPercent,
      maxPercent,
      desc: result.desc(),
    };
  } catch (err) {
    console.warn("Damage calculation failed:", err);
    return null;
  }
}

// =============================================================================
// DamageBar
// =============================================================================

function getVerdict(minPercent: number, maxPercent: number): string {
  if (minPercent >= 100) return "OHKO";
  if (maxPercent >= 100) return "roll";
  if (maxPercent >= 50) return "2HKO";
  if (maxPercent >= 33) return "3HKO";
  return "";
}

function DamageBar({
  minPercent,
  maxPercent,
}: {
  minPercent: number;
  maxPercent: number;
}) {
  const cappedMax = Math.min(maxPercent, 100);
  const verdict = getVerdict(minPercent, maxPercent);
  const barColor =
    maxPercent >= 66
      ? "bg-red-500"
      : maxPercent >= 33
        ? "bg-amber-500"
        : "bg-green-500";

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <div className="bg-muted relative h-3 flex-1 overflow-hidden rounded-full">
        <div
          className={cn("h-full rounded-full", barColor)}
          style={{ width: `${cappedMax}%` }}
        />
      </div>
      <span className="text-muted-foreground w-20 text-right font-mono text-xs">
        {minPercent}–{maxPercent}%
      </span>
      {verdict && (
        <span
          className={cn(
            "w-10 text-right text-xs font-bold",
            verdict === "OHKO"
              ? "text-red-600 dark:text-red-400"
              : verdict === "roll"
                ? "text-amber-600 dark:text-amber-400"
                : "text-muted-foreground"
          )}
        >
          {verdict}
        </span>
      )}
    </div>
  );
}

// =============================================================================
// CalcRow
// =============================================================================

function CalcRow({ result }: { result: CalcResult }) {
  return (
    <div className="group hover:bg-muted/40 flex items-center gap-2 rounded-md px-2 py-1.5">
      <div className="flex w-48 shrink-0 flex-col">
        <span className="truncate text-xs font-medium">{result.moveName}</span>
        <span className="text-muted-foreground truncate text-[10px]">
          {result.attackerName} → {result.defenderName}
        </span>
      </div>
      <DamageBar
        minPercent={result.minPercent}
        maxPercent={result.maxPercent}
      />
    </div>
  );
}

// =============================================================================
// FieldControls
// =============================================================================

interface FieldControlsProps {
  weather: WeatherOption;
  terrain: TerrainOption;
  lightScreen: boolean;
  reflect: boolean;
  helpingHand: boolean;
  onWeatherChange: (v: WeatherOption) => void;
  onTerrainChange: (v: TerrainOption) => void;
  onLightScreenChange: (v: boolean) => void;
  onReflectChange: (v: boolean) => void;
  onHelpingHandChange: (v: boolean) => void;
}

function FieldControls({
  weather,
  terrain,
  lightScreen,
  reflect,
  helpingHand,
  onWeatherChange,
  onTerrainChange,
  onLightScreenChange,
  onReflectChange,
  onHelpingHandChange,
}: FieldControlsProps) {
  return (
    <div className="border-border border-t pt-3">
      <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
        Field Conditions
      </p>
      <div className="flex flex-col gap-2">
        {/* Weather */}
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground w-16 shrink-0 text-xs">
            Weather
          </span>
          <ToggleGroup
            variant="outline"
            size="sm"
            value={[weather]}
            onValueChange={(vals) => {
              const v = vals[vals.length - 1] as WeatherOption | undefined;
              if (v) onWeatherChange(v);
            }}
          >
            {(["none", "Sun", "Rain", "Sand", "Snow"] as const).map((w) => (
              <ToggleGroupItem key={w} value={w} className="text-xs">
                {w === "none" ? "–" : w}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        {/* Terrain */}
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground w-16 shrink-0 text-xs">
            Terrain
          </span>
          <ToggleGroup
            variant="outline"
            size="sm"
            value={[terrain]}
            onValueChange={(vals) => {
              const v = vals[vals.length - 1] as TerrainOption | undefined;
              if (v) onTerrainChange(v);
            }}
          >
            {(["none", "Electric", "Grassy", "Psychic", "Misty"] as const).map(
              (t) => (
                <ToggleGroupItem key={t} value={t} className="text-xs">
                  {t === "none" ? "–" : t.slice(0, 4)}
                </ToggleGroupItem>
              )
            )}
          </ToggleGroup>
        </div>
        {/* Screens + Helping Hand */}
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex cursor-pointer items-center gap-1.5">
            <Checkbox
              checked={lightScreen}
              onCheckedChange={(v) => onLightScreenChange(Boolean(v))}
            />
            <span className="text-xs">Light Screen</span>
          </label>
          <label className="flex cursor-pointer items-center gap-1.5">
            <Checkbox
              checked={reflect}
              onCheckedChange={(v) => onReflectChange(Boolean(v))}
            />
            <span className="text-xs">Reflect</span>
          </label>
          <label className="flex cursor-pointer items-center gap-1.5">
            <Checkbox
              checked={helpingHand}
              onCheckedChange={(v) => onHelpingHandChange(Boolean(v))}
            />
            <span className="text-xs">Helping Hand</span>
          </label>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// ManualCalc
// =============================================================================

interface ManualCalcState {
  attackerSpecies: string;
  defenderSpecies: string;
  moveName: string;
  result: CalcResult | null;
}

function ManualCalcForm({
  weather,
  terrain,
  lightScreen,
  reflect,
  helpingHand,
}: {
  weather: WeatherOption;
  terrain: TerrainOption;
  lightScreen: boolean;
  reflect: boolean;
  helpingHand: boolean;
}) {
  const [state, setState] = useState<ManualCalcState>({
    attackerSpecies: "",
    defenderSpecies: "",
    moveName: "",
    result: null,
  });
  const [calcError, setCalcError] = useState<string | null>(null);

  function handleCalc() {
    if (!state.attackerSpecies || !state.defenderSpecies || !state.moveName)
      return;
    setCalcError(null);
    try {
      const attacker = new Pokemon(gen9, state.attackerSpecies, { level: 50 });
      const defender = new Pokemon(gen9, state.defenderSpecies, { level: 50 });
      const field = buildSmogonField(
        weather,
        terrain,
        lightScreen,
        reflect,
        helpingHand,
        false
      );
      const result = runCalc(attacker, defender, state.moveName, field);
      setState((s) => ({ ...s, result }));
    } catch (err) {
      console.warn("Damage calculation failed:", err);
      setState((s) => ({ ...s, result: null }));
      setCalcError("Calculation failed — check your inputs");
    }
  }

  return (
    <div className="border-border flex flex-col gap-2 border-t pt-3">
      <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        Manual Calc
      </p>
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-[10px] uppercase">
            Attacker
          </label>
          <input
            className="border-border bg-background rounded-md border px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-teal-500"
            placeholder="e.g. Charizard"
            value={state.attackerSpecies}
            onChange={(e) =>
              setState((s) => ({ ...s, attackerSpecies: e.target.value }))
            }
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-[10px] uppercase">
            Move
          </label>
          <input
            className="border-border bg-background rounded-md border px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-teal-500"
            placeholder="e.g. Flamethrower"
            value={state.moveName}
            onChange={(e) =>
              setState((s) => ({ ...s, moveName: e.target.value }))
            }
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-[10px] uppercase">
            Defender
          </label>
          <input
            className="border-border bg-background rounded-md border px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-teal-500"
            placeholder="e.g. Kingambit"
            value={state.defenderSpecies}
            onChange={(e) =>
              setState((s) => ({ ...s, defenderSpecies: e.target.value }))
            }
          />
        </div>
      </div>
      <Button size="sm" variant="outline" onClick={handleCalc}>
        Calculate
      </Button>
      {calcError && !state.result && (
        <p className="text-destructive text-xs">{calcError}</p>
      )}
      {state.result && <CalcRow result={state.result} />}
    </div>
  );
}

// =============================================================================
// Auto Suggestions (Pokemon selected)
// =============================================================================

function AutoSuggestions({
  pokemon,
  weather,
  terrain,
  lightScreen,
  reflect,
  helpingHand,
}: {
  pokemon: Tables<"pokemon">;
  weather: WeatherOption;
  terrain: TerrainOption;
  lightScreen: boolean;
  reflect: boolean;
  helpingHand: boolean;
}) {
  const attackerSmogon = toSmogonPokemon(pokemon);
  const offensiveField = buildSmogonField(
    weather,
    terrain,
    lightScreen,
    reflect,
    helpingHand,
    true
  );
  const defensiveField = buildSmogonField(
    weather,
    terrain,
    lightScreen,
    reflect,
    helpingHand,
    false
  );

  const moves = [
    pokemon.move1,
    pokemon.move2,
    pokemon.move3,
    pokemon.move4,
  ].filter((m): m is string => Boolean(m));

  const offensiveResults: CalcResult[] = [];
  const defensiveResults: CalcResult[] = [];
  let failedCalcCount = 0;

  for (const threat of GEN9_VGC_META_THREATS) {
    const threatSmogon = toSmogonThreat(threat);

    // Offensive: our moves vs threat
    for (const moveName of moves) {
      const result = runCalc(
        attackerSmogon,
        threatSmogon,
        moveName,
        offensiveField
      );
      if (result === null) {
        failedCalcCount++;
      } else if (result.maxPercent > 0) {
        offensiveResults.push(result);
      }
    }

    // Defensive: threat moves vs us
    for (const moveName of threat.moves) {
      const result = runCalc(
        threatSmogon,
        attackerSmogon,
        moveName,
        defensiveField
      );
      if (result === null) {
        failedCalcCount++;
      } else if (result.maxPercent > 0) {
        defensiveResults.push(result);
      }
    }
  }

  // Sort: OHKOs first, then rolls, then 2HKOs
  function sortCalcResults(results: CalcResult[]): CalcResult[] {
    return [...results].sort((a, b) => {
      const aVerdict = getVerdict(a.minPercent, a.maxPercent);
      const bVerdict = getVerdict(b.minPercent, b.maxPercent);
      const order = ["OHKO", "roll", "2HKO", "3HKO", ""];
      return order.indexOf(aVerdict) - order.indexOf(bVerdict);
    });
  }

  const topOffensive = sortCalcResults(offensiveResults).slice(0, 10);
  const topDefensive = sortCalcResults(defensiveResults).slice(0, 10);

  return (
    <div className="flex flex-col gap-4">
      {/* Offensive */}
      <section>
        <p className="text-muted-foreground mb-1.5 text-xs font-semibold tracking-wide uppercase">
          {pokemon.species} attacks
        </p>
        {topOffensive.length === 0 ? (
          <p className="text-muted-foreground text-xs">
            No damage calcs available
          </p>
        ) : (
          <div className="flex flex-col gap-0.5">
            {topOffensive.map((r, i) => (
              <CalcRow key={i} result={r} />
            ))}
          </div>
        )}
      </section>

      {/* Defensive */}
      <section>
        <p className="text-muted-foreground mb-1.5 text-xs font-semibold tracking-wide uppercase">
          Taking hits
        </p>
        {topDefensive.length === 0 ? (
          <p className="text-muted-foreground text-xs">
            No damage calcs available
          </p>
        ) : (
          <div className="flex flex-col gap-0.5">
            {topDefensive.map((r, i) => (
              <CalcRow key={i} result={r} />
            ))}
          </div>
        )}
      </section>

      {/* Failed calculations indicator */}
      {failedCalcCount > 0 && (
        <p className="text-muted-foreground text-xs">
          {failedCalcCount} calculation
          {failedCalcCount === 1 ? "" : "s"} could not be computed
        </p>
      )}
    </div>
  );
}

// =============================================================================
// DamageCalcTab
// =============================================================================

export function DamageCalcTab({
  team: _team,
  selectedPokemon,
  format: _format,
}: DamageCalcTabProps) {
  const [weather, setWeather] = useState<WeatherOption>("none");
  const [terrain, setTerrain] = useState<TerrainOption>("none");
  const [lightScreen, setLightScreen] = useState(false);
  const [reflect, setReflect] = useState(false);
  const [helpingHand, setHelpingHand] = useState(false);
  const [manualCalcOpen, setManualCalcOpen] = useState(false);

  if (!selectedPokemon) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <p className="text-muted-foreground text-sm">
          Select a Pokémon to see damage calculations
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{selectedPokemon.species}</p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setManualCalcOpen((v) => !v)}
        >
          {manualCalcOpen ? "Close" : "Manual Calc"}
        </Button>
      </div>

      <AutoSuggestions
        pokemon={selectedPokemon}
        weather={weather}
        terrain={terrain}
        lightScreen={lightScreen}
        reflect={reflect}
        helpingHand={helpingHand}
      />

      <FieldControls
        weather={weather}
        terrain={terrain}
        lightScreen={lightScreen}
        reflect={reflect}
        helpingHand={helpingHand}
        onWeatherChange={setWeather}
        onTerrainChange={setTerrain}
        onLightScreenChange={setLightScreen}
        onReflectChange={setReflect}
        onHelpingHandChange={setHelpingHand}
      />

      {manualCalcOpen && (
        <ManualCalcForm
          weather={weather}
          terrain={terrain}
          lightScreen={lightScreen}
          reflect={reflect}
          helpingHand={helpingHand}
        />
      )}
    </div>
  );
}
