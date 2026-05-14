"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PokemonSprite } from "./pokemon-sprite";
import { cn } from "@/lib/utils";

interface TeamPokemon {
  species: string;
  nickname?: string | null;
  held_item?: string | null;
  ability?: string;
  tera_type?: string | null;
  move1?: string;
  move2?: string | null;
  move3?: string | null;
  move4?: string | null;
}

interface TeamPreviewProps {
  pokemon: TeamPokemon[];
  compact?: boolean;
  className?: string;
}

export function TeamPreview({
  pokemon,
  compact = false,
  className,
}: TeamPreviewProps) {
  if (pokemon.length === 0) return null;

  return (
    <div className={cn("grid grid-cols-2 gap-2 sm:grid-cols-3", className)}>
      {pokemon.map((mon, i) => (
        <Card
          key={i}
          size={compact ? "sm" : "default"}
          className="bg-muted/50 py-0"
        >
          <CardContent className={cn("flex items-center gap-2 py-3", compact && "py-2")}>
            <PokemonSprite species={mon.species} size={compact ? 36 : 48} className="shrink-0" />
            <div className="min-w-0">
              <div className={cn("truncate font-semibold", compact ? "text-sm" : "text-sm")}>
                {mon.species}
              </div>
              {mon.nickname && mon.nickname !== mon.species && (
                <div className="text-muted-foreground truncate text-xs italic">
                  &quot;{mon.nickname}&quot;
                </div>
              )}
              {!compact && (
                <div className="mt-1 space-y-0.5">
                  {mon.held_item && (
                    <div className="text-muted-foreground truncate text-xs">
                      {mon.held_item}
                    </div>
                  )}
                  {mon.ability && (
                    <div className="text-muted-foreground truncate text-xs">
                      {mon.ability}
                    </div>
                  )}
                  {mon.tera_type && (
                    <Badge variant="outline" className="px-1.5 py-0 text-xs">
                      Tera: {mon.tera_type}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
