/* istanbul ignore file */
"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronDown, ChevronRight } from "lucide-react";

import { getPokemonSprite } from "@trainers/pokemon/sprites";

import { Skeleton } from "@/components/ui/skeleton";
import { useSupabaseQuery } from "@/lib/supabase";
import { type TeamPokemonDisplay } from "./expanded-row-data";

interface PlayerStanding {
  id: number;
  division: string;
  placement: number | null;
  event_id: string;
  events: { name: string; date_start: string; tier: string } | null;
  team_pokemon: TeamPokemonDisplay[] | null;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PlayerExpandedDataProps {
  playerId: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PlayerExpandedData({ playerId }: PlayerExpandedDataProps) {
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  const { data, isLoading, error } = useSupabaseQuery(
    /* istanbul ignore next */
    async (sb) => {
      const { data, error } = await sb
        .schema("rk9")
        .from("standings")
        .select(
          `
          id,
          division,
          placement,
          event_id,
          events(name, date_start, tier),
          team_pokemon(position, species, ability, held_item, tera_type, stat_alignment, moves)
        `
        )
        .eq("player_id", playerId)
        .order("events(date_start)", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as PlayerStanding[];
    },
    [playerId]
  );

  return (
    <div className="border-t bg-muted/20 p-3">
      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      )}

      {error && (
        <p className="text-xs text-red-500">{error.message}</p>
      )}

      {!isLoading && !error && data && (
        <>
          {data.length === 0 ? (
            <p className="text-muted-foreground text-xs">No events found.</p>
          ) : (
            <div className="space-y-1">
              {data.map((standing) => {
                const eventKey = `${standing.id}`;
                const isExpanded = expandedEventId === eventKey;
                const pokemon = standing.team_pokemon ?? [];
                const eventName = standing.events?.name ?? standing.event_id;
                const dateStr = standing.events?.date_start ?? "";
                const tier = standing.events?.tier ?? "";

                return (
                  <div key={eventKey} className="rounded border">
                    {/* Standing row */}
                    <button
                      className="grid w-full items-center gap-2 px-2 py-1.5 text-left hover:bg-muted/50 transition-colors"
                      style={{ gridTemplateColumns: "16px 1fr 60px 60px 60px auto" }}
                      onClick={() =>
                        setExpandedEventId(isExpanded ? null : eventKey)
                      }
                    >
                      <span className="text-muted-foreground">
                        {isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5" />
                        )}
                      </span>
                      <span className="min-w-0 truncate text-xs font-medium">
                        {eventName}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {dateStr}
                      </span>
                      <span className="text-muted-foreground text-xs capitalize">
                        {tier}
                      </span>
                      <span className="text-muted-foreground text-xs capitalize">
                        {standing.division}
                      </span>
                      <div className="flex items-center">
                        {pokemon.length > 0 ? (
                          <div className="flex items-center">
                            {pokemon.map(/* istanbul ignore next */ (p, j) => {
                              const sprite = getPokemonSprite(p.species ?? "");
                              return (
                                <Image
                                  key={j}
                                  src={sprite.url}
                                  alt={p.species ?? "Pokemon"}
                                  width={20}
                                  height={20}
                                  unoptimized
                                  style={
                                    sprite.pixelated
                                      ? { imageRendering: "pixelated" }
                                      : undefined
                                  }
                                />
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            —
                          </span>
                        )}
                      </div>
                    </button>

                    {/* Expanded team details */}
                    {isExpanded && (
                      <div className="border-t px-2 pb-2 pt-1">
                        {pokemon.length === 0 ? (
                          <p className="text-muted-foreground text-xs">
                            No team data
                          </p>
                        ) : (
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b text-muted-foreground">
                                <th className="py-1 pr-3 text-left font-medium">
                                  Pokémon
                                </th>
                                <th className="py-1 pr-3 text-left font-medium">
                                  Ability
                                </th>
                                <th className="py-1 pr-3 text-left font-medium">
                                  Item
                                </th>
                                <th className="py-1 pr-3 text-left font-medium">
                                  Tera
                                </th>
                                <th className="py-1 pr-3 text-left font-medium">
                                  Nature
                                </th>
                                <th className="py-1 text-left font-medium">
                                  Moves
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {pokemon.map(/* istanbul ignore next */ (p, j) => {
                                const sprite = getPokemonSprite(
                                  p.species ?? ""
                                );
                                return (
                                  <tr
                                    key={j}
                                    className="border-b last:border-0"
                                  >
                                    <td className="py-1 pr-3">
                                      <div className="flex items-center gap-1.5">
                                        <Image
                                          src={sprite.url}
                                          alt={p.species ?? "Pokemon"}
                                          width={28}
                                          height={28}
                                          unoptimized
                                          style={
                                            sprite.pixelated
                                              ? { imageRendering: "pixelated" }
                                              : undefined
                                          }
                                        />
                                        <span className="font-medium">
                                          {p.species ?? "Unknown"}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="py-1 pr-3 text-muted-foreground">
                                      {p.ability ?? "—"}
                                    </td>
                                    <td className="py-1 pr-3 text-muted-foreground">
                                      {p.held_item ?? "—"}
                                    </td>
                                    <td className="py-1 pr-3 text-muted-foreground">
                                      {p.tera_type ?? "—"}
                                    </td>
                                    <td className="py-1 pr-3 text-muted-foreground">
                                      {p.stat_alignment ?? "—"}
                                    </td>
                                    <td className="py-1 text-muted-foreground">
                                      {p.moves?.filter(Boolean).join(", ") ||
                                        "—"}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
