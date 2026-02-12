"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface MostUsedPokemonProps {
  altId?: number | null;
}

interface PokemonUsage {
  species: string;
  usageCount: number;
  totalMatches: number;
  usagePercentage: number;
  winRate: number;
}

export function MostUsedPokemon({ altId: _altId }: MostUsedPokemonProps) {
  // TODO: Fetch actual Pokemon usage data from backend
  // This would come from getDashboardAnalytics(supabase, userId, altId)

  // Mock data - top 12 most used
  const pokemonUsage: PokemonUsage[] = [
    {
      species: "Raging Bolt",
      usageCount: 35,
      totalMatches: 43,
      usagePercentage: 81.4,
      winRate: 62.9,
    },
    {
      species: "Incineroar",
      usageCount: 32,
      totalMatches: 43,
      usagePercentage: 74.4,
      winRate: 65.6,
    },
    {
      species: "Flutter Mane",
      usageCount: 28,
      totalMatches: 43,
      usagePercentage: 65.1,
      winRate: 60.7,
    },
    {
      species: "Ogerpon-Cornerstone",
      usageCount: 25,
      totalMatches: 43,
      usagePercentage: 58.1,
      winRate: 68.0,
    },
    {
      species: "Amoonguss",
      usageCount: 22,
      totalMatches: 43,
      usagePercentage: 51.2,
      winRate: 54.5,
    },
    {
      species: "Tornadus",
      usageCount: 20,
      totalMatches: 43,
      usagePercentage: 46.5,
      winRate: 55.0,
    },
  ];

  const getWinRateColor = (winRate: number) => {
    if (winRate >= 60) return "text-emerald-600 dark:text-emerald-400";
    if (winRate >= 50) return "text-blue-600 dark:text-blue-400";
    return "text-rose-600 dark:text-rose-400";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Most Used Pokémon</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {pokemonUsage.map((pokemon, index) => (
            <div
              key={pokemon.species}
              className="group bg-card hover:bg-muted/50 flex items-center gap-4 rounded-lg border p-3 transition-colors"
            >
              {/* Rank */}
              <div className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
                {index + 1}
              </div>

              {/* Pokemon sprite placeholder */}
              <div className="bg-muted flex size-12 shrink-0 items-center justify-center rounded-lg">
                <span className="text-muted-foreground text-xs">IMG</span>
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="truncate font-semibold">{pokemon.species}</h4>
                  <Badge
                    variant="secondary"
                    className={`tabular-nums ${getWinRateColor(pokemon.winRate)}`}
                  >
                    {pokemon.winRate.toFixed(1)}%
                  </Badge>
                </div>
                <div className="text-muted-foreground mt-1 flex items-center gap-3 text-xs">
                  <span>
                    {pokemon.usageCount}/{pokemon.totalMatches} matches
                  </span>
                  <span>•</span>
                  <span>{pokemon.usagePercentage.toFixed(1)}% usage</span>
                </div>
              </div>

              {/* Usage bar */}
              <div className="hidden w-24 sm:block">
                <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full rounded-full transition-all"
                    style={{ width: `${pokemon.usagePercentage}%` }}
                  />
                </div>
              </div>
            </div>
          ))}

          {pokemonUsage.length === 0 && (
            <div className="py-8 text-center">
              <p className="text-muted-foreground text-sm">
                No Pokémon usage data yet
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                Submit teams and play matches to see your most used Pokémon
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
