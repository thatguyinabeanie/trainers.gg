"use client";

import { Card, CardContent } from "@/components/ui/card";
import { PokemonSprite } from "./pokemon-sprite";
import { cn } from "@/lib/utils";
import {
  getMegaSpeciesForBaseAndItem,
  getMegaAbilityForSpecies,
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

        return (
          <Card key={i} size="sm" className="bg-muted/50 py-0">
            <CardContent className="py-2">
              <div className="flex items-start gap-2">
                <PokemonSprite species={displaySpecies} size={44} className="mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="truncate text-sm font-semibold">
                      {mon.species}
                    </span>
                    {mon.held_item && (
                      <span className="text-muted-foreground shrink-0 truncate text-xs">
                        @ {mon.held_item}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
                    {mon.ability && (
                      <span className="text-muted-foreground truncate">
                        {megaAbility
                          ? `${mon.ability} → ${megaAbility}`
                          : mon.ability}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
                    {[mon.move1, mon.move2, mon.move3, mon.move4].filter(Boolean).map((move, mi) => (
                      <span key={mi} className="truncate">
                        {move}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
