"use client";

import { Fragment, useState } from "react";
import Image from "next/image";
import { ChevronDown, ChevronRight } from "lucide-react";

import { getPokemonSprite } from "@trainers/pokemon/sprites";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useSupabaseQuery } from "@/lib/supabase";
import { type UnifiedRow } from "./external-data-shared";

// ---------------------------------------------------------------------------
// Type definitions
// ---------------------------------------------------------------------------

interface PokemonSlot {
  position: number;
  species: string | null;
  ability: string | null;
  held_item: string | null;
  tera_type: string | null;
  moves: string[] | null;
}

interface RK9StandingWithTeam {
  placement: number;
  division: string;
  drop_round: number | null;
  player_id: number | null;
  players: {
    first_name: string;
    last_name: string;
    country: string;
    trainer_name: string | null;
  } | null;
  team_pokemon: PokemonSlot[] | null;
}

interface LimitlessStandingWithTeam {
  placement: number;
  record_wins: number;
  record_losses: number;
  record_ties: number;
  players: {
    username: string;
    display_name: string;
    country: string | null;
  } | null;
  team_pokemon: PokemonSlot[] | null;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ExpandedRowDataProps {
  row: UnifiedRow;
}

// ---------------------------------------------------------------------------
// ExpandedRowData — main exported component
// ---------------------------------------------------------------------------

const DIVISIONS = ["masters", "seniors", "juniors"] as const;
type DivisionFilter = (typeof DIVISIONS)[number];

export function ExpandedRowData({ row }: ExpandedRowDataProps) {
  const [standingsLimit, setStandingsLimit] = useState(50);
  const [expandedPlacements, setExpandedPlacements] = useState<Set<string>>(
    new Set()
  );
  const [divisionFilter, setDivisionFilter] = useState<DivisionFilter>("masters");

  function togglePlacement(key: string) {
    setExpandedPlacements((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function handleDivisionFilter(div: DivisionFilter) {
    setDivisionFilter(div);
    setExpandedPlacements(new Set());
  }

  const { data, isLoading, error } = useSupabaseQuery(
    /* istanbul ignore next */
    async (sb) => {
      if (row.source === "rk9" && row.rk9) {
        const { data, error } = await sb
          .schema("rk9")
          .from("standings")
          .select(
            "placement, division, drop_round, player_id, players(first_name, last_name, country, trainer_name), team_pokemon(position, species, ability, held_item, tera_type, moves)"
          )
          .eq("event_id", row.rk9.event_id)
          .order("placement", { ascending: true })
          .limit(standingsLimit);
        if (error) throw error;
        return (data ?? []) as unknown as RK9StandingWithTeam[];
      } else if (row.source === "limitless" && row.limitless) {
        const { data, error } = await sb
          .schema("limitless")
          .from("standings")
          .select(
            "placement, record_wins, record_losses, record_ties, players(username, display_name, country), team_pokemon(position, species, ability, held_item, tera_type, moves)"
          )
          .eq("tournament_id", row.limitless.tournament_id)
          .gt("placement", 0)
          .order("placement", { ascending: true })
          .limit(standingsLimit);
        if (error) throw error;
        return (data ?? []) as unknown as LimitlessStandingWithTeam[];
      }
      return [];
    },
    [row.id, standingsLimit]
  );

  return (
    <div className="border-t bg-muted/20 p-4">
      {row.source === "rk9" && (
        <div className="mb-3 flex items-center gap-1">
          {DIVISIONS.map((div) => (
            <button
              key={div}
              onClick={() => handleDivisionFilter(div)}
              className={cn(
                "rounded px-3 py-1 text-xs font-medium",
                divisionFilter === div
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {div.charAt(0).toUpperCase() + div.slice(1)}
            </button>
          ))}
        </div>
      )}
      <div className="max-h-96 overflow-auto">
        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
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
              <p className="text-muted-foreground text-xs">
                No data available.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="w-6 py-1" />
                    <th className="py-1 pr-3 text-left font-medium">#</th>
                    {row.source === "rk9" ? (
                      <>
                        <th className="py-1 pr-3 text-left font-medium">Trainer</th>
                        <th className="py-1 pr-3 text-left font-medium">First</th>
                        <th className="py-1 pr-3 text-left font-medium">Last</th>
                        <th className="py-1 pr-3 text-left font-medium">Country</th>
                        <th className="py-1 pr-4 text-left font-medium">ID</th>
                      </>
                    ) : (
                      <th className="py-1 pr-4 text-left font-medium">Player</th>
                    )}
                    <th className="py-1 pr-4 text-left font-medium">Team</th>
                    {row.source === "limitless" && (
                      <th className="py-1 text-left font-medium">Record</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {row.source === "rk9"
                    ? (data as RK9StandingWithTeam[])
                        .filter((s) => s.division === divisionFilter)
                        .map((s, i) => {
                          const expansionKey = `${s.division}-${s.placement}`;
                          const isExpanded = expandedPlacements.has(expansionKey);
                          const pokemon = s.team_pokemon ?? [];
                          return (
                            <Fragment key={i}>
                            <tr className="border-b last:border-0">
                              <td className="py-1.5">
                                <button
                                  aria-label="Toggle team details"
                                  onClick={/* istanbul ignore next */ () => togglePlacement(expansionKey)}
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="size-3.5 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="size-3.5 text-muted-foreground" />
                                  )}
                                </button>
                              </td>
                              <td className="py-1.5 pr-3 font-mono text-xs">
                                {s.placement}
                              </td>
                              <td className="py-1.5 pr-3 text-xs">
                                {s.players?.trainer_name ?? "—"}
                              </td>
                              <td className="py-1.5 pr-3 text-xs">
                                {s.players?.first_name ?? "—"}
                              </td>
                              <td className="py-1.5 pr-3 text-xs">
                                {s.players?.last_name ?? "—"}
                              </td>
                              <td className="py-1.5 pr-3 font-mono text-xs uppercase">
                                {s.players?.country ?? "—"}
                              </td>
                              <td className="py-1.5 pr-4 font-mono text-xs text-muted-foreground">
                                {s.player_id ?? "—"}
                              </td>
                              <td className="py-1.5 pr-4">
                                {pokemon.length > 0 ? (
                                  <div className="flex items-center">
                                    {pokemon.map(/* istanbul ignore next */ (p, j) => {
                                      const sprite = getPokemonSprite(
                                        p.species ?? ""
                                      );
                                      return (
                                        <Image
                                          key={j}
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
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-xs">
                                    —
                                  </span>
                                )}
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr>
                                <td colSpan={8} className="px-2 pb-3">
                                  {pokemon.length === 0 ? (
                                    <p className="text-muted-foreground pt-1 text-xs">
                                      No team data
                                    </p>
                                  ) : (
                                    <table className="mt-1 w-full text-xs">
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
                                                        ? {
                                                            imageRendering:
                                                              "pixelated",
                                                          }
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
                                              <td className="py-1 text-muted-foreground">
                                                {p.moves?.filter(Boolean).join(", ") || "—"}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  )}
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })
                    : (data as LimitlessStandingWithTeam[]).map((s, i) => {
                        const playerName = s.players?.display_name ?? "—";
                        const record =
                          s.record_wins != null
                            ? `${s.record_wins}-${s.record_losses ?? 0}-${s.record_ties ?? 0}`
                            : "—";
                        const expansionKey = `limitless-${s.placement}`;
                        const isExpanded = expandedPlacements.has(expansionKey);
                        const pokemon = s.team_pokemon ?? [];
                        return (
                          <Fragment key={i}>
                            <tr className="border-b last:border-0">
                              <td className="py-1.5">
                                <button
                                  aria-label="Toggle team details"
                                  onClick={/* istanbul ignore next */ () => togglePlacement(expansionKey)}
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="size-3.5 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="size-3.5 text-muted-foreground" />
                                  )}
                                </button>
                              </td>
                              <td className="py-1.5 pr-3 font-mono text-xs">
                                {s.placement}
                              </td>
                              <td className="py-1.5 pr-4 text-xs">
                                {playerName}
                              </td>
                              <td className="py-1.5 pr-4">
                                {pokemon.length > 0 ? (
                                  <div className="flex items-center">
                                    {pokemon.map(/* istanbul ignore next */ (p, j) => {
                                      const sprite = getPokemonSprite(
                                        p.species ?? ""
                                      );
                                      return (
                                        <Image
                                          key={j}
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
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-xs">
                                    —
                                  </span>
                                )}
                              </td>
                              <td className="py-1.5 font-mono text-xs">
                                {record}
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr>
                                <td colSpan={5} className="px-2 pb-3">
                                  {pokemon.length === 0 ? (
                                    <p className="text-muted-foreground pt-1 text-xs">
                                      No team data
                                    </p>
                                  ) : (
                                    <table className="mt-1 w-full text-xs">
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
                                                        ? {
                                                            imageRendering:
                                                              "pixelated",
                                                          }
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
                                              <td className="py-1 text-muted-foreground">
                                                {p.moves?.filter(Boolean).join(", ") || "—"}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  )}
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>

      {/* Load more */}
      {data && data.length === standingsLimit && (
        <button
          className="mt-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setStandingsLimit((l) => l + 50)}
        >
          Load more…
        </button>
      )}
    </div>
  );
}
