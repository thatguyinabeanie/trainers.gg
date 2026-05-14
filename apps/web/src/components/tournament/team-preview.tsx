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
    <div className={cn("space-y-2", className)}>
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
              <div className="flex shrink-0 flex-col items-center gap-1.5">
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
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold">
                    {mon.species}
                  </span>
                  {mon.held_item && (
                    <span className="text-muted-foreground inline-flex shrink-0 items-center gap-1 truncate text-xs">
                      <ItemSprite item={mon.held_item} size={16} />
                      {mon.held_item}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  {mon.ability && (
                    <Badge
                      variant="secondary"
                      className="gap-1 px-1.5 py-0 text-[11px] font-normal"
                    >
                      {megaAbility
                        ? `${mon.ability} → ${megaAbility}`
                        : mon.ability}
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                  {moves.map((move, mi) => (
                    <MoveRow key={mi} move={move} />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
