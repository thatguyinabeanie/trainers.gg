import { PokemonSprite } from "@/components/tournament/pokemon-sprite";
import { ItemSprite } from "@/components/tournament/item-sprite";
import { TeraTypeBadge } from "@/components/tournament/tera-type-badge";
import { cn } from "@/lib/utils";

export interface PokemonData {
  species: string;
  nickname: string | null;
  ability: string;
  held_item: string | null;
  tera_type: string | null;
  move1: string;
  move2: string | null;
  move3: string | null;
  move4: string | null;
  nature: string;
  gender: string | null;
  is_shiny: boolean;
  position: number;
}

interface PokemonCardProps {
  pokemon: PokemonData;
  className?: string;
}

export function PokemonCard({ pokemon, className }: PokemonCardProps) {
  const moves = [
    pokemon.move1,
    pokemon.move2,
    pokemon.move3,
    pokemon.move4,
  ].filter((m): m is string => m !== null);

  return (
    <div
      className={cn(
        "bg-muted/30 ring-foreground/5 flex gap-3 rounded-lg p-3 ring-1",
        className
      )}
    >
      <div className="flex shrink-0 flex-col items-center">
        <PokemonSprite species={pokemon.species} size={48} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium">
            {pokemon.species}
          </span>
          {pokemon.nickname && pokemon.nickname !== pokemon.species && (
            <span className="text-muted-foreground truncate text-[10px]">
              ({pokemon.nickname})
            </span>
          )}
        </div>

        <div className="text-muted-foreground mt-0.5 text-xs">
          {pokemon.ability}
        </div>

        {pokemon.held_item && (
          <div className="mt-0.5 flex items-center gap-1">
            <ItemSprite item={pokemon.held_item} size={16} />
            <span className="text-muted-foreground text-xs">
              {pokemon.held_item}
            </span>
          </div>
        )}

        {pokemon.tera_type && (
          <div className="mt-1">
            <TeraTypeBadge type={pokemon.tera_type} />
          </div>
        )}

        {moves.length > 0 && (
          <div className="border-foreground/5 mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5 border-t pt-1.5">
            {moves.map((move) => (
              <span
                key={move}
                className="text-muted-foreground truncate text-[11px]"
              >
                {move}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
