import { PokemonSprite } from "@/components/tournament/pokemon-sprite";
import { ItemSprite } from "@/components/tournament/item-sprite";
import { TypeSprite } from "@/components/tournament/type-sprite";
import { getTypeStyle } from "@/lib/pokemon/type-colors";
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

  const hasNickname = pokemon.nickname && pokemon.nickname !== pokemon.species;

  // Get tera-type color styles (fall back to Normal if no tera type)
  const teraStyle = getTypeStyle(pokemon.tera_type ?? "Normal");

  // Gender icon — Pokemon-style SVG symbols
  const genderIcon =
    pokemon.gender === "Female" ? (
      <svg
        viewBox="0 0 16 16"
        className="h-3.5 w-3.5 shrink-0 text-pink-500"
        fill="currentColor"
        aria-label="Female"
      >
        <circle
          cx="8"
          cy="6"
          r="4.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <line
          x1="8"
          y1="10.5"
          x2="8"
          y2="16"
          stroke="currentColor"
          strokeWidth="2"
        />
        <line
          x1="5.5"
          y1="13"
          x2="10.5"
          y2="13"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
    ) : pokemon.gender === "Male" ? (
      <svg
        viewBox="0 0 16 16"
        className="h-3.5 w-3.5 shrink-0 text-blue-500"
        fill="currentColor"
        aria-label="Male"
      >
        <circle
          cx="6.5"
          cy="9.5"
          r="4.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <line
          x1="10"
          y1="6"
          x2="15"
          y2="1"
          stroke="currentColor"
          strokeWidth="2"
        />
        <line
          x1="11"
          y1="1"
          x2="15"
          y2="1"
          stroke="currentColor"
          strokeWidth="2"
        />
        <line
          x1="15"
          y1="1"
          x2="15"
          y2="5"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
    ) : null;

  return (
    <div
      className={cn(
        "bg-card ring-foreground/10 flex overflow-hidden rounded-xl ring-1",
        className
      )}
    >
      {/* Left column: Info */}
      <div className="flex min-w-0 flex-1 flex-col justify-center space-y-0.5 p-3">
        {/* Species + Gender */}
        <div
          className="flex items-center gap-0.5 text-sm font-semibold"
          title={pokemon.species}
        >
          <span className="truncate">{pokemon.species}</span>
          {genderIcon}
        </div>

        {/* Nickname — always rendered for consistent height */}
        <div className="text-muted-foreground text-[11px]">
          {hasNickname ? (
            <span className="truncate" title={pokemon.nickname ?? undefined}>
              &ldquo;{pokemon.nickname}&rdquo;
            </span>
          ) : (
            <span>&nbsp;</span>
          )}
        </div>

        {/* Ability */}
        <div
          className="text-muted-foreground truncate text-xs"
          title={pokemon.ability}
        >
          {pokemon.ability}
        </div>

        {/* Held item — always rendered for consistent height */}
        <div className="flex items-center gap-1">
          {pokemon.held_item ? (
            <>
              <ItemSprite item={pokemon.held_item} size={16} />
              <span
                className="text-muted-foreground truncate text-xs"
                title={pokemon.held_item}
              >
                {pokemon.held_item}
              </span>
            </>
          ) : (
            <span className="text-xs">&nbsp;</span>
          )}
        </div>
      </div>

      {/* Center column: Tera badge + Sprite */}
      <div className="flex w-[88px] shrink-0 flex-col items-center py-2">
        {pokemon.tera_type ? (
          <TypeSprite type={pokemon.tera_type} tera />
        ) : (
          <div className="h-3.5" />
        )}
        <div
          className={cn(
            "mt-auto mb-auto flex h-[76px] w-[76px] items-center justify-center rounded-full",
            teraStyle.bg
          )}
        >
          <PokemonSprite species={pokemon.species} size={68} />
        </div>
      </div>

      {/* Right column: Moves */}
      {moves.length > 0 && (
        <div className="border-foreground/10 flex w-[164px] shrink-0 flex-col justify-center gap-1 border-l py-3 pr-3 pl-3">
          {moves.map((move) => (
            <span
              key={move}
              className="text-muted-foreground text-[11px] whitespace-nowrap"
            >
              {move}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
