import { type PokemonData, PokemonCard } from "./pokemon-card";
import { cn } from "@/lib/utils";

export interface TeamData {
  teamId: number;
  teamName: string | null;
  pokemon: PokemonData[];
}

interface TeamSheetProps {
  team: TeamData;
  playerName: string;
  isOwnTeam?: boolean;
  className?: string;
}

export function TeamSheet({
  team,
  playerName,
  isOwnTeam = false,
  className,
}: TeamSheetProps) {
  const sortedPokemon = [...team.pokemon].sort(
    (a, b) => a.position - b.position
  );

  return (
    <div className={cn("space-y-2", className)}>
      <h3 className="text-sm font-medium">
        {isOwnTeam ? "Your Team" : `${playerName}'s Team`}
      </h3>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {sortedPokemon.map((pokemon) => (
          <PokemonCard key={pokemon.position} pokemon={pokemon} />
        ))}
      </div>
    </div>
  );
}
