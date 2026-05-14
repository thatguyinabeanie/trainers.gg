"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PokemonSprite } from "./pokemon-sprite";
import { ItemSprite } from "./item-sprite";
import { TypeSprite } from "./type-sprite";
import { cn } from "@/lib/utils";
import {
  getMegaSpeciesForBaseAndItem,
  getMegaAbilityForSpecies,
  getSpeciesTypes,
  getMoveType,
} from "@trainers/pokemon";

interface TeamPokemon {
  species: string;
  nickname?: string | null;
  held_item?: string | null;
  ability?: string | null;
  tera_type?: string | null;
  move1?: string | null;
  move2?: string | null;
  move3?: string | null;
  move4?: string | null;
}

interface TeamPreviewProps {
  pokemon: TeamPokemon[];
  className?: string;
}

function MoveRow({ move }: { move: string }) {
  const moveType = getMoveType(move);

  return (
    <span className="inline-flex items-center gap-1.5 truncate text-xs">
      {moveType && <TypeSprite type={moveType} className="shrink-0" />}
      <span className="truncate">{move}</span>
    </span>
  );
}

export function TeamPreview({
  pokemon,
  className,
}: TeamPreviewProps) {
  if (pokemon.length === 0) return null;

  return (
    <div className={cn("grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {pokemon.map((mon, i) => {
        const megaSpecies = mon.held_item
          ? getMegaSpeciesForBaseAndItem(mon.species, mon.held_item)
          : null;
        const megaAbility = megaSpecies
          ? getMegaAbilityForSpecies(megaSpecies)
          : null;
        const displaySpecies = megaSpecies ?? mon.species;
        const types = getSpeciesTypes(displaySpecies);
        const moves = [mon.move1, mon.move2, mon.move3, mon.move4].filter(
          (m): m is string => !!m
        );

        return (
          <Card key={i} size="sm" className="bg-muted/50 py-0">
            <CardContent className="flex gap-3 py-2.5">
              <div className="flex shrink-0 flex-col items-center gap-1">
                <PokemonSprite
                  species={displaySpecies}
                  size={56}
                  className="shrink-0"
                />
                <div className="flex gap-0.5">
                  {types.map((t) => (
                    <TypeSprite key={t} type={t} className="h-3 w-[18px]" />
                  ))}
                </div>
                <span className="max-w-14 truncate text-center text-[11px] font-semibold leading-tight">
                  {mon.species}
                </span>
                {mon.held_item && (
                  <span className="text-muted-foreground inline-flex max-w-14 items-center justify-center gap-0.5 truncate text-[10px]">
                    <ItemSprite item={mon.held_item} size={10} />
                    <span className="truncate">{mon.held_item}</span>
                  </span>
                )}
                {mon.ability && (
                  <Badge
                    variant="secondary"
                    className="max-w-14 truncate px-1 py-0 text-[9px] font-normal"
                  >
                    {megaAbility
                      ? `${mon.ability} → ${megaAbility}`
                      : mon.ability}
                  </Badge>
                )}
              </div>
              <div className="grid min-w-0 flex-1 grid-cols-2 gap-1 self-center">
                {moves.map((move, mi) => (
                  <MoveRow key={mi} move={move} />
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
