"use client";

import { Fragment, useState } from "react";
import Image from "next/image";
import { ChevronDown, ChevronRight } from "lucide-react";

import { getPokemonSprite } from "@trainers/pokemon/sprites";

import { Skeleton } from "@/components/ui/skeleton";
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

export function ExpandedRowData({ row }: ExpandedRowDataProps) {
  const [standingsLimit, setStandingsLimit] = useState(50);
  const [expandedPlacements, setExpandedPlacements] = useState<Set<number>>(
    new Set()
  );

  function togglePlacement(placement: number) {
    setExpandedPlacements((prev) => {
      const next = new Set(prev);
      if (next.has(placement)) {
        next.delete(placement);
      } else {
        next.add(placement);
      }
      return next;
    });
  }

  const { data, isLoading, error } = useSupabaseQuery(
    /* istanbul ignore next */
    async (sb) => {
      if (row.source === "rk9" && row.rk9) {
        const { data, error } = await sb
          .schema("rk9")
          .from("standings")
          .select(
            "placement, division, drop_round, players(first_name, last_name, country, trainer_name), team_pokemon(position, species, ability, held_item, tera_type, moves)"
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
                    <th className="py-1 pr-4 text-left font-medium">Player</th>
                    <th className="py-1 pr-4 text-left font-medium">Team</th>
                    {row.source === "rk9" ? (
                      <th className="py-1 text-left font-medium">Division</th>
                    ) : (
                      <th className="py-1 text-left font-medium">Record</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {row.source === "rk9"
                    ? (data as RK9StandingWithTeam[]).map((s, i) => {
                        const fullName =
                          [s.players?.first_name, s.players?.last_name]
                            .filter(Boolean)
                            .join(" ") || null;
                        const playerName =
                          s.players?.trainer_name ?? fullName ?? "—";
                        const division = s.division
                          ? s.division.charAt(0).toUpperCase() +
                            s.division.slice(1)
                          : "—";
                        const isExpanded = expandedPlacements.has(s.placement);
                        const pokemon = s.team_pokemon ?? [];
                        return (
                          <Fragment key={i}>
                            <tr className="border-b last:border-0">
                              <td className="py-1.5">
                                <button
                                  aria-label="Toggle team details"
                                  onClick={/* istanbul ignore next */ () => togglePlacement(s.placement)}
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
                              <td className="py-1.5 text-xs">{division}</td>
                            </tr>
                            {isExpanded && (
                              <tr>
                                <td colSpan={5} className="px-2 pb-3">
                                  <div className="flex flex-wrap gap-2 pt-1">
                                    {pokemon.map(/* istanbul ignore next */ (p, j) => {
                                      const sprite = getPokemonSprite(
                                        p.species ?? ""
                                      );
                                      return (
                                        <div
                                          key={j}
                                          className="flex items-start gap-1.5 rounded border bg-background px-2 py-1.5"
                                        >
                                          <Image
                                            src={sprite.url}
                                            alt={p.species ?? "Pokemon"}
                                            width={36}
                                            height={36}
                                            unoptimized
                                            style={
                                              sprite.pixelated
                                                ? {
                                                    imageRendering: "pixelated",
                                                  }
                                                : undefined
                                            }
                                          />
                                          <div className="text-xs">
                                            <p className="font-medium">
                                              {p.species ?? "Unknown"}
                                            </p>
                                            <p className="text-muted-foreground">
                                              {p.ability ?? "—"}
                                            </p>
                                            <p className="text-muted-foreground">
                                              {p.held_item ?? "—"}
                                            </p>
                                            {p.tera_type && (
                                              <p className="text-muted-foreground">
                                                Tera: {p.tera_type}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                    {pokemon.length === 0 && (
                                      <p className="text-muted-foreground text-xs">
                                        No team data
                                      </p>
                                    )}
                                  </div>
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
                        const isExpanded = expandedPlacements.has(s.placement);
                        const pokemon = s.team_pokemon ?? [];
                        return (
                          <Fragment key={i}>
                            <tr className="border-b last:border-0">
                              <td className="py-1.5">
                                <button
                                  aria-label="Toggle team details"
                                  onClick={/* istanbul ignore next */ () => togglePlacement(s.placement)}
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
                                  <div className="flex flex-wrap gap-2 pt-1">
                                    {pokemon.map(/* istanbul ignore next */ (p, j) => {
                                      const sprite = getPokemonSprite(
                                        p.species ?? ""
                                      );
                                      return (
                                        <div
                                          key={j}
                                          className="flex items-start gap-1.5 rounded border bg-background px-2 py-1.5"
                                        >
                                          <Image
                                            src={sprite.url}
                                            alt={p.species ?? "Pokemon"}
                                            width={36}
                                            height={36}
                                            unoptimized
                                            style={
                                              sprite.pixelated
                                                ? {
                                                    imageRendering: "pixelated",
                                                  }
                                                : undefined
                                            }
                                          />
                                          <div className="text-xs">
                                            <p className="font-medium">
                                              {p.species ?? "Unknown"}
                                            </p>
                                            <p className="text-muted-foreground">
                                              {p.ability ?? "—"}
                                            </p>
                                            <p className="text-muted-foreground">
                                              {p.held_item ?? "—"}
                                            </p>
                                            {p.tera_type && (
                                              <p className="text-muted-foreground">
                                                Tera: {p.tera_type}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                    {pokemon.length === 0 && (
                                      <p className="text-muted-foreground text-xs">
                                        No team data
                                      </p>
                                    )}
                                  </div>
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
