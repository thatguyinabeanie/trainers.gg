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
    <div className={cn("grid grid-cols-2 gap-2", className)}>
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
            <CardContent className="space-y-1.5 py-2">
              <div className="flex flex-col items-center gap-1">
                <PokemonSprite
                  species={displaySpecies}
                  size={48}
                  className="shrink-0"
                />
                <div className="flex gap-0.5">
                  {types.map((t) => (
                    <TypeSprite key={t} type={t} className="h-3 w-[18px]" />
                  ))}
                </div>
              </div>
              <span className="block truncate text-center text-xs font-semibold leading-tight">
                {mon.species}
              </span>
              {mon.held_item && (
                <span className="text-muted-foreground inline-flex w-full items-center justify-center gap-1 truncate text-[11px]">
                  <ItemSprite item={mon.held_item} size={12} />
                  <span className="truncate">{mon.held_item}</span>
                </span>
              )}
              {mon.ability && (
                <div className="flex justify-center">
                  <Badge
                    variant="secondary"
                    className="max-w-full truncate px-1 py-0 text-[10px] font-normal"
                  >
                    {megaAbility
                      ? `${mon.ability} → ${megaAbility}`
                      : mon.ability}
                  </Badge>
                </div>
              )}
              <div className="grid grid-cols-2 gap-x-1 gap-y-0.5 pt-0.5">
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
