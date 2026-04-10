"use client";

import { type Tables, type TeamWithPokemon } from "@trainers/supabase";
import {
  type GameFormat,
  type SpeedBenchmark,
  calculateStat,
  compareSpeedTier,
  getBaseStats,
  getFormatSpeedBenchmarks,
  getNatureMultiplier,
} from "@trainers/pokemon";

// =============================================================================
// Types
// =============================================================================

interface SpeedTierTabProps {
  team: TeamWithPokemon;
  selectedPokemon: Tables<"pokemon"> | null;
  format: GameFormat | undefined;
}

interface TeamMemberSpeed {
  pokemon: Tables<"pokemon">;
  speed: number;
}

// =============================================================================
// Helpers
// =============================================================================

function getPokemonActualSpeed(pokemon: Tables<"pokemon">): number {
  const baseStats = getBaseStats(pokemon.species);
  if (!baseStats) return 0;
  const natureMultiplier = getNatureMultiplier(pokemon.nature, "speed");
  return calculateStat(
    baseStats.speed,
    pokemon.iv_speed ?? 31,
    pokemon.ev_speed ?? 0,
    pokemon.level ?? 50,
    natureMultiplier
  );
}

function getSpeedCategory(speed: number): "fast" | "mid" | "tr" {
  if (speed > 150) return "fast";
  if (speed >= 80) return "mid";
  return "tr";
}

function SpeedThresholdDivider({ label }: { label: string }) {
  return (
    <li className="flex items-center gap-2 py-1">
      <div className="border-border h-px flex-1 border-t border-dashed" />
      <span className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
        {label}
      </span>
      <div className="border-border h-px flex-1 border-t border-dashed" />
    </li>
  );
}

// =============================================================================
// Team Overview (no Pokemon selected)
// =============================================================================

function TeamSpeedOverview({
  team,
  format,
}: {
  team: TeamWithPokemon;
  format: GameFormat | undefined;
}) {
  const formatId = format?.id ?? "gen9vgc2026regi";

  const teamPokemon = team.team_pokemon
    .filter((tp) => tp.pokemon !== null)
    .sort((a, b) => a.team_position - b.team_position)
    .map((tp) => tp.pokemon!);

  const teamSpeeds: TeamMemberSpeed[] = teamPokemon.map((p) => ({
    pokemon: p,
    speed: getPokemonActualSpeed(p),
  }));

  const benchmarks = getFormatSpeedBenchmarks(formatId);

  // Find min/max team speed for relevance window
  const minTeamSpeed = Math.min(...teamSpeeds.map((t) => t.speed), 0);
  const maxTeamSpeed = Math.max(...teamSpeeds.map((t) => t.speed), 0);
  const WINDOW = 30;

  const relevantBenchmarks = benchmarks
    .filter(
      (b) =>
        b.maxSpeed >= minTeamSpeed - WINDOW &&
        b.maxSpeed <= maxTeamSpeed + WINDOW
    )
    .slice(0, 30);

  // Build interleaved list of team members + benchmarks sorted desc by speed
  type ListItem =
    | { kind: "team"; speed: number; pokemon: Tables<"pokemon"> }
    | { kind: "benchmark"; speed: number; benchmark: SpeedBenchmark };

  const items: ListItem[] = [
    ...teamSpeeds.map(
      (t): ListItem => ({
        kind: "team",
        speed: t.speed,
        pokemon: t.pokemon,
      })
    ),
    ...relevantBenchmarks.map(
      (b): ListItem => ({
        kind: "benchmark",
        speed: b.maxSpeed,
        benchmark: b,
      })
    ),
  ].sort((a, b) => b.speed - a.speed);

  // Check for >30 speed gap between consecutive team members (sorted desc)
  const sortedTeamSpeeds = [...teamSpeeds].sort((a, b) => b.speed - a.speed);
  const speedGapWarnings: Array<{ a: string; b: string; gap: number }> = [];
  for (let i = 0; i < sortedTeamSpeeds.length - 1; i++) {
    const gap =
      (sortedTeamSpeeds[i]?.speed ?? 0) - (sortedTeamSpeeds[i + 1]?.speed ?? 0);
    if (gap > 30) {
      speedGapWarnings.push({
        a: sortedTeamSpeeds[i]?.pokemon.species ?? "",
        b: sortedTeamSpeeds[i + 1]?.pokemon.species ?? "",
        gap,
      });
    }
  }

  if (teamPokemon.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <p className="text-muted-foreground text-sm">
          Add Pokemon to see speed tiers
        </p>
      </div>
    );
  }

  // Pre-compute divider visibility (avoids mutation during render)
  const seenCategories = new Set<string>();
  const itemsWithDivider = items.map((item) => {
    const category = getSpeedCategory(item.speed);
    const showDivider = !seenCategories.has(category);
    seenCategories.add(category);
    const categoryLabel =
      category === "fast"
        ? "Fast (150+)"
        : category === "mid"
          ? "Mid (80–150)"
          : "Trick Room (<80)";
    return { item, showDivider, categoryLabel };
  });

  return (
    <div className="flex flex-col gap-3 p-3">
      {speedGapWarnings.length > 0 && (
        <div className="flex flex-col gap-1">
          {speedGapWarnings.map((w) => (
            <div
              key={`${w.a}-${w.b}`}
              className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 dark:border-amber-900/50 dark:bg-amber-950/30"
            >
              <span className="text-xs text-amber-600 dark:text-amber-400">
                ⚠ {w.a} and {w.b} have a {w.gap}-point speed gap
              </span>
            </div>
          ))}
        </div>
      )}

      <ul className="flex flex-col">
        {itemsWithDivider.map(({ item, showDivider, categoryLabel }, idx) => {
          if (item.kind === "team") {
            const p = item.pokemon;
            const evNote = p.ev_speed ? `${p.ev_speed} EVs` : "0 EVs";
            const nateParts = p.nature ? [p.nature] : [];
            const note = [...nateParts, evNote].join(", ");
            return (
              <li key={`team-${p.id}-${idx}`} className="contents">
                {showDivider && <SpeedThresholdDivider label={categoryLabel} />}
                <div className="flex items-center gap-2 rounded-md bg-teal-50 px-2 py-1.5 dark:bg-teal-950/30">
                  <span className="w-8 text-right font-mono text-sm font-semibold text-teal-700 dark:text-teal-300">
                    {item.speed}
                  </span>
                  <span className="flex-1 truncate text-sm font-semibold text-teal-700 dark:text-teal-400">
                    {p.species}
                  </span>
                  <span className="text-muted-foreground text-xs">{note}</span>
                </div>
              </li>
            );
          }

          const b = item.benchmark;
          return (
            <li key={`bench-${b.species}-${idx}`} className="contents">
              {showDivider && <SpeedThresholdDivider label={categoryLabel} />}
              <div className="flex items-center gap-2 px-2 py-1">
                <span className="text-muted-foreground w-8 text-right font-mono text-xs">
                  {b.maxSpeed}
                </span>
                <span className="text-muted-foreground flex-1 truncate text-xs">
                  {b.species}
                </span>
                <span className="text-muted-foreground text-[10px]">+Spe</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// =============================================================================
// Per-Pokemon View (Pokemon selected)
// =============================================================================

function PokemonSpeedView({
  pokemon,
  format,
}: {
  pokemon: Tables<"pokemon">;
  format: GameFormat | undefined;
}) {
  const formatId = format?.id ?? "gen9vgc2026regi";
  const actualSpeed = getPokemonActualSpeed(pokemon);
  const tailwindSpeed = actualSpeed * 2;
  const scarfSpeed = Math.floor(actualSpeed * 1.5);

  const { outspeeds, outspedBy } = compareSpeedTier(
    pokemon.species,
    actualSpeed,
    formatId
  );

  const benchmarks = getFormatSpeedBenchmarks(formatId);

  // Smart suggestion: find if +4/8/12/16 EVs would outspeed a nearby benchmark
  const baseStats = getBaseStats(pokemon.species);
  const natureMultiplier = getNatureMultiplier(pokemon.nature, "speed");
  const currentEvs = pokemon.ev_speed ?? 0;
  let suggestion: string | null = null;

  if (baseStats) {
    for (const evStep of [4, 8, 12, 16]) {
      const newEvs = currentEvs + evStep;
      if (newEvs > 252) break;
      const newSpeed = calculateStat(
        baseStats.speed,
        pokemon.iv_speed ?? 31,
        newEvs,
        pokemon.level ?? 50,
        natureMultiplier
      );
      const newlyOutspeeds = benchmarks.filter(
        (b) => b.maxSpeed < newSpeed && b.maxSpeed >= actualSpeed
      );
      if (newlyOutspeeds.length > 0) {
        const topTarget = newlyOutspeeds[newlyOutspeeds.length - 1];
        if (topTarget) {
          suggestion = `+${evStep} Spe EVs (→${newSpeed}) outspeeds max ${topTarget.species}`;
        }
        break;
      }
    }
  }

  const topOutspeeds = [...outspeeds].reverse().slice(0, 15);
  const topOutspedBy = outspedBy.slice(0, 15);

  return (
    <div className="flex flex-col gap-4 p-3">
      {/* Speed summary */}
      <section className="grid grid-cols-3 gap-2">
        <div className="bg-muted/50 flex flex-col items-center rounded-md p-2">
          <span className="text-muted-foreground text-[10px] font-medium uppercase">
            Base
          </span>
          <span className="font-mono text-lg font-bold">{actualSpeed}</span>
        </div>
        <div className="bg-muted/50 flex flex-col items-center rounded-md p-2">
          <span className="text-muted-foreground text-[10px] font-medium uppercase">
            Tailwind
          </span>
          <span className="font-mono text-lg font-bold">{tailwindSpeed}</span>
        </div>
        <div className="bg-muted/50 flex flex-col items-center rounded-md p-2">
          <span className="text-muted-foreground text-[10px] font-medium uppercase">
            Scarf
          </span>
          <span className="font-mono text-lg font-bold">{scarfSpeed}</span>
        </div>
      </section>

      {/* EV suggestion */}
      {suggestion && (
        <div className="flex items-center gap-2 rounded-md border border-teal-200 bg-teal-50 px-2 py-1.5 dark:border-teal-900/50 dark:bg-teal-950/30">
          <span className="text-xs text-teal-600 dark:text-teal-400">
            💡 {suggestion}
          </span>
        </div>
      )}

      {/* Outspeeds */}
      <section>
        <p className="text-muted-foreground mb-1.5 text-xs font-semibold tracking-wide uppercase">
          You outspeed
        </p>
        {topOutspeeds.length === 0 ? (
          <p className="text-muted-foreground text-xs">Nothing at max speed</p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {topOutspeeds.map((b) => {
              const delta = actualSpeed - b.maxSpeed;
              return (
                <li key={b.species} className="flex items-center gap-2 px-1">
                  <span className="text-muted-foreground w-8 text-right font-mono text-xs">
                    {b.maxSpeed}
                  </span>
                  <span className="flex-1 truncate text-xs">{b.species}</span>
                  <span className="font-mono text-xs text-emerald-600 dark:text-emerald-400">
                    +{delta}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Outsped by */}
      <section>
        <p className="text-muted-foreground mb-1.5 text-xs font-semibold tracking-wide uppercase">
          You&apos;re outsped by
        </p>
        {topOutspedBy.length === 0 ? (
          <p className="text-muted-foreground text-xs">
            Nothing outspeeds you at max speed
          </p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {topOutspedBy.map((b) => {
              const delta = b.maxSpeed - actualSpeed;
              return (
                <li key={b.species} className="flex items-center gap-2 px-1">
                  <span className="text-muted-foreground w-8 text-right font-mono text-xs">
                    {b.maxSpeed}
                  </span>
                  <span className="flex-1 truncate text-xs">{b.species}</span>
                  <span className="font-mono text-xs text-red-600 dark:text-red-400">
                    -{delta}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

// =============================================================================
// SpeedTierTab
// =============================================================================

export function SpeedTierTab({
  team,
  selectedPokemon,
  format,
}: SpeedTierTabProps) {
  if (selectedPokemon) {
    return <PokemonSpeedView pokemon={selectedPokemon} format={format} />;
  }
  return <TeamSpeedOverview team={team} format={format} />;
}
