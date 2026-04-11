"use client";

import { type Tables, type TeamWithPokemon } from "@trainers/supabase";
import {
  ALL_TYPES,
  calculateTeamCoverage,
  calculateTeamSynergy,
  getDefensiveMatchups,
  getMoveType,
  getSpeciesTypes,
  getTypeEffectiveness,
  type PokemonType,
} from "@trainers/pokemon";

import { cn } from "@/lib/utils";

import { TYPE_PILL_COLORS } from "./type-colors";

// =============================================================================
// Types
// =============================================================================

interface TypeCoverageTabProps {
  team: TeamWithPokemon;
  selectedPokemon: Tables<"pokemon"> | null;
}

// =============================================================================
// Helpers
// =============================================================================

function multiplierCell(multiplier: number): {
  label: string;
  className: string;
} {
  if (multiplier === 0)
    return { label: "0", className: "text-muted-foreground italic" };
  if (multiplier === 0.25)
    return {
      label: "¼",
      className: "text-emerald-600 dark:text-emerald-400 font-semibold",
    };
  if (multiplier === 0.5)
    return { label: "½", className: "text-green-600 dark:text-green-400" };
  if (multiplier === 2)
    return { label: "2", className: "text-red-600 dark:text-red-400" };
  if (multiplier === 4)
    return {
      label: "4",
      className: "text-red-700 dark:text-red-300 font-bold",
    };
  return { label: "–", className: "text-muted-foreground" };
}

function abbreviate(species: string): string {
  // Shorten common long names, otherwise take first 6 chars
  return species.length > 7 ? species.slice(0, 6) + "…" : species;
}

// =============================================================================
// Sub-components
// =============================================================================

function TypeBadge({ type }: { type: string }) {
  const colors =
    TYPE_PILL_COLORS[type as keyof typeof TYPE_PILL_COLORS] ??
    "bg-stone-400 text-white";
  return (
    <span
      className={cn(
        "inline-block rounded px-1 py-0.5 text-[10px] leading-none font-semibold",
        colors
      )}
    >
      {type}
    </span>
  );
}

// =============================================================================
// Team Overview (no Pokemon selected)
// =============================================================================

function TeamOverview({ team }: { team: TeamWithPokemon }) {
  const teamPokemon = team.team_pokemon
    .filter((tp) => tp.pokemon !== null)
    .sort((a, b) => a.team_position - b.team_position)
    .map((tp) => tp.pokemon!);

  const synergy = calculateTeamSynergy(
    teamPokemon.map((p) => ({ species: p.species }))
  );

  const teamCoverage = calculateTeamCoverage(
    teamPokemon.map((p) => ({
      species: p.species,
      moves: [p.move1, p.move2, p.move3, p.move4].filter((m): m is string =>
        Boolean(m)
      ),
    }))
  );

  const pokemonMatchups = teamPokemon.map((p) => ({
    pokemon: p,
    matchups: getDefensiveMatchups(getSpeciesTypes(p.species)),
  }));

  // Types where team has 3+ resistances
  const resistanceCountByType: Partial<Record<PokemonType, number>> = {};
  for (const { matchups } of pokemonMatchups) {
    for (const type of ALL_TYPES) {
      const mult =
        matchups.resistances[type] !== undefined
          ? matchups.resistances[type]
          : matchups.immunities.includes(type)
            ? 0
            : null;
      if (mult !== null && mult < 1) {
        resistanceCountByType[type] = (resistanceCountByType[type] ?? 0) + 1;
      }
    }
  }

  const goodResistances = ALL_TYPES.filter(
    (t) => (resistanceCountByType[t] ?? 0) >= 3
  );

  const sharedWeaknessWarnings = ALL_TYPES.filter(
    (t) => (synergy.sharedWeaknesses[t] ?? 0) >= 2
  );

  if (teamPokemon.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <p className="text-muted-foreground text-sm">
          Add Pokemon to see type coverage
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-3">
      {/* Defensive Matrix */}
      <section>
        <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
          Defensive Coverage
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-muted-foreground w-16 pr-2 text-left font-medium">
                  Type
                </th>
                {teamPokemon.map((p) => (
                  <th
                    key={p.id}
                    className="text-muted-foreground px-1 text-center font-medium"
                    title={p.species}
                  >
                    {abbreviate(p.species)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ALL_TYPES.map((attackType) => (
                <tr
                  key={attackType}
                  className="border-border/40 border-b last:border-0"
                >
                  <td className="py-0.5 pr-2">
                    <TypeBadge type={attackType} />
                  </td>
                  {pokemonMatchups.map(({ pokemon, matchups }) => {
                    const isImmune = matchups.immunities.includes(attackType);
                    const mult = isImmune
                      ? 0
                      : (matchups.weaknesses[attackType] ??
                        matchups.resistances[attackType] ??
                        1);
                    const { label, className } = multiplierCell(mult);
                    // Build descriptive aria-label for screen readers
                    const effectiveness =
                      mult === 0
                        ? "immune"
                        : mult === 0.25
                          ? "4x resistant"
                          : mult === 0.5
                            ? "2x resistant"
                            : mult === 2
                              ? "2x weak"
                              : mult === 4
                                ? "4x weak"
                                : "neutral";
                    return (
                      <td
                        key={pokemon.id}
                        className={cn(
                          "py-0.5 text-center font-mono",
                          className
                        )}
                        aria-label={`${attackType} vs ${pokemon.species}: ${effectiveness}`}
                      >
                        {label}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Insights */}
      {(sharedWeaknessWarnings.length > 0 || goodResistances.length > 0) && (
        <section>
          <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
            Insights
          </p>
          <div className="flex flex-col gap-1.5">
            {sharedWeaknessWarnings.map((type) => {
              const weakCount = synergy.sharedWeaknesses[type] ?? 0;
              const resistCount = resistanceCountByType[type] ?? 0;
              return (
                <div
                  key={type}
                  className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-2 py-1 dark:border-red-900/50 dark:bg-red-950/30"
                >
                  <span className="text-red-600 dark:text-red-400">⚠</span>
                  <TypeBadge type={type} />
                  <span className="text-xs text-red-700 dark:text-red-300">
                    {weakCount} weak, {resistCount} resist
                  </span>
                </div>
              );
            })}
            {goodResistances.map((type) => (
              <div
                key={type}
                className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-2 py-1 dark:border-green-900/50 dark:bg-green-950/30"
              >
                <span className="text-green-600 dark:text-green-400">✓</span>
                <TypeBadge type={type} />
                <span className="text-xs text-green-700 dark:text-green-300">
                  {resistanceCountByType[type]}+ resistances
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Offensive Coverage */}
      {teamCoverage.coverage.size > 0 && (
        <section>
          <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
            Super-Effective Coverage
          </p>
          <div className="flex flex-wrap gap-1">
            {ALL_TYPES.filter((t) => teamCoverage.coverage.has(t)).map(
              (type) => (
                <TypeBadge key={type} type={type} />
              )
            )}
          </div>
          {teamCoverage.notVeryEffective.size > 0 && (
            <div className="mt-2">
              <p className="text-muted-foreground mb-1 text-xs">Not covered:</p>
              <div className="flex flex-wrap gap-1">
                {ALL_TYPES.filter((t) =>
                  teamCoverage.notVeryEffective.has(t)
                ).map((type) => (
                  <TypeBadge key={type} type={type} />
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

// =============================================================================
// Per-Pokemon View (Pokemon selected)
// =============================================================================

function PokemonView({ pokemon }: { pokemon: Tables<"pokemon"> }) {
  const types = getSpeciesTypes(pokemon.species);
  const matchups = getDefensiveMatchups(types);

  const teraType = pokemon.tera_type as PokemonType | null;
  const teraMatchups = teraType ? getDefensiveMatchups([teraType]) : null;

  const moves = [
    pokemon.move1,
    pokemon.move2,
    pokemon.move3,
    pokemon.move4,
  ].filter((m): m is string => Boolean(m));

  return (
    <div className="flex flex-col gap-4 p-3">
      {/* Defensive Profile */}
      <section>
        <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
          Defensive Matchups
        </p>
        <div className="flex flex-col gap-2">
          {matchups.immunities.length > 0 && (
            <div>
              <p className="text-muted-foreground mb-1 text-xs">Immune (0×)</p>
              <div className="flex flex-wrap gap-1">
                {matchups.immunities.map((t) => (
                  <TypeBadge key={t} type={t} />
                ))}
              </div>
            </div>
          )}
          {Object.entries(matchups.weaknesses).length > 0 && (
            <div>
              <p className="mb-1 text-xs text-red-600 dark:text-red-400">
                Weak
              </p>
              <div className="flex flex-wrap gap-1">
                {Object.entries(matchups.weaknesses)
                  .sort(([, a], [, b]) => b - a)
                  .map(([type, mult]) => (
                    <span key={type} className="flex items-center gap-0.5">
                      <TypeBadge type={type} />
                      <span className="text-muted-foreground text-xs">
                        {mult}×
                      </span>
                    </span>
                  ))}
              </div>
            </div>
          )}
          {Object.entries(matchups.resistances).length > 0 && (
            <div>
              <p className="mb-1 text-xs text-green-600 dark:text-green-400">
                Resist
              </p>
              <div className="flex flex-wrap gap-1">
                {Object.entries(matchups.resistances)
                  .sort(([, a], [, b]) => a - b)
                  .map(([type, mult]) => (
                    <span key={type} className="flex items-center gap-0.5">
                      <TypeBadge key={type} type={type} />
                      <span className="text-muted-foreground text-xs">
                        {mult}×
                      </span>
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Tera Comparison */}
      {teraMatchups && teraType && (
        <section>
          <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
            Tera {teraType} Comparison
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="text-muted-foreground w-20 pr-2 text-left font-medium">
                    Type
                  </th>
                  <th className="text-muted-foreground px-1 text-center font-medium">
                    Current
                  </th>
                  <th className="text-muted-foreground px-1 text-center font-medium">
                    After Tera
                  </th>
                </tr>
              </thead>
              <tbody>
                {ALL_TYPES.map((attackType) => {
                  const curImmune = matchups.immunities.includes(attackType);
                  const curMult = curImmune
                    ? 0
                    : (matchups.weaknesses[attackType] ??
                      matchups.resistances[attackType] ??
                      1);
                  const teraImmune =
                    teraMatchups.immunities.includes(attackType);
                  const teraMult = teraImmune
                    ? 0
                    : (teraMatchups.weaknesses[attackType] ??
                      teraMatchups.resistances[attackType] ??
                      1);

                  if (curMult === 1 && teraMult === 1) return null;
                  const curCell = multiplierCell(curMult);
                  const teraCell = multiplierCell(teraMult);

                  // Effectiveness descriptions for aria-labels
                  function describeMultiplier(m: number): string {
                    if (m === 0) return "immune";
                    if (m === 0.25) return "4x resistant";
                    if (m === 0.5) return "2x resistant";
                    if (m === 2) return "2x weak";
                    if (m === 4) return "4x weak";
                    return "neutral";
                  }

                  return (
                    <tr
                      key={attackType}
                      className="border-border/40 border-b last:border-0"
                    >
                      <td className="py-0.5 pr-2">
                        <TypeBadge type={attackType} />
                      </td>
                      <td
                        className={cn(
                          "py-0.5 text-center font-mono",
                          curCell.className
                        )}
                        aria-label={`Current: ${attackType} ${describeMultiplier(curMult)}`}
                      >
                        {curCell.label}
                      </td>
                      <td
                        className={cn(
                          "py-0.5 text-center font-mono",
                          teraCell.className
                        )}
                        aria-label={`After Tera: ${attackType} ${describeMultiplier(teraMult)}`}
                      >
                        {teraCell.label}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Move Coverage */}
      {moves.length > 0 && (
        <section>
          <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
            Move Coverage
          </p>
          <div className="flex flex-col gap-2">
            {moves.map((moveName) => {
              const moveTypeStr = getMoveType(moveName);
              if (!moveTypeStr) return null;
              const moveType = moveTypeStr as PokemonType;
              const seTypes = ALL_TYPES.filter(
                (t) => getTypeEffectiveness(moveType, [t]) >= 2
              );
              return (
                <div
                  key={moveName}
                  className="flex flex-wrap items-center gap-1"
                >
                  <span className="min-w-0 shrink-0 text-xs font-medium">
                    {moveName}
                  </span>
                  <TypeBadge type={moveType} />
                  {seTypes.length > 0 && (
                    <>
                      <span className="text-muted-foreground text-xs">→</span>
                      {seTypes.map((t) => (
                        <TypeBadge key={t} type={t} />
                      ))}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

// =============================================================================
// TypeCoverageTab
// =============================================================================

export function TypeCoverageTab({
  team,
  selectedPokemon,
}: TypeCoverageTabProps) {
  if (selectedPokemon) {
    return <PokemonView pokemon={selectedPokemon} />;
  }
  return <TeamOverview team={team} />;
}
