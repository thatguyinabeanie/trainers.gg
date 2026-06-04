"use client";

import { Fragment, useState } from "react";
import Image from "next/image";
import { ChevronDown, ChevronRight, Download, ExternalLink, Loader2 } from "lucide-react";

import { getPokemonSprite } from "@trainers/pokemon/sprites";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useSupabaseQuery } from "@/lib/supabase";
import { scrapeRk9TeamForStanding } from "@/actions/rk9";
import { type UnifiedRow } from "./external-data-shared";

// ---------------------------------------------------------------------------
// Type definitions
// ---------------------------------------------------------------------------

export interface TeamPokemonDisplay {
  position: number;
  species: string | null;
  ability: string | null;
  held_item: string | null;
  tera_type: string | null;
  stat_alignment: string | null;
  moves: string[] | null;
}

interface RK9StandingWithTeam {
  id: number;
  placement: number;
  division: string;
  drop_round: number | null;
  player_id: number | null;
  roster_entry_id: string | null;
  trainer_name: string | null;
  players: {
    first_name: string;
    last_name: string;
    country: string;
    player_id_masked: string | null;
  } | null;
  team_pokemon: TeamPokemonDisplay[] | null;
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
  team_pokemon: TeamPokemonDisplay[] | null;
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
  const [showMissingOnly, setShowMissingOnly] = useState(false);
  const [scrapingIds, setScrapingIds] = useState<Set<number>>(new Set());

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

  /* istanbul ignore next */
  async function handleScrapeStanding(standingId: number, rosterEntryId: string) {
    if (!rosterEntryId) return;
    setScrapingIds((prev) => new Set(prev).add(standingId));
    try {
      await scrapeRk9TeamForStanding(row.rk9!.event_id, standingId, rosterEntryId);
    } finally {
      setScrapingIds((prev) => {
        const next = new Set(prev);
        next.delete(standingId);
        return next;
      });
    }
  }

  const { data, isLoading, error } = useSupabaseQuery(
    /* istanbul ignore next */
    async (sb) => {
      if (row.source === "rk9" && row.rk9) {
        const { data, error } = await sb
          .schema("rk9")
          .from("standings")
          .select(
            "id, placement, division, drop_round, player_id, roster_entry_id, trainer_name, players(first_name, last_name, country, player_id_masked), team_pokemon(position, species, ability, held_item, tera_type, stat_alignment, moves)"
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
            "placement, record_wins, record_losses, record_ties, players(username, display_name, country), team_pokemon(position, species, ability, held_item, tera_type, stat_alignment, moves)"
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
          <div className="bg-border h-3 w-px mx-1" />
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={showMissingOnly}
              onChange={(e) => setShowMissingOnly(e.target.checked)}
              className="h-3 w-3 rounded border"
            />
            No team
          </label>
        </div>
      )}
      {row.source === "limitless" && (
        <div className="mb-3 flex items-center gap-1">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={showMissingOnly}
              onChange={(e) => setShowMissingOnly(e.target.checked)}
              className="h-3 w-3 rounded border"
            />
            No team
          </label>
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
                        <th className="py-1 pr-3 text-left font-medium">Name</th>
                        <th className="py-1 pr-3 text-left font-medium">Trainer</th>
                        <th className="py-1 pr-4 text-left font-medium">Country</th>
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
                        .filter((s) => showMissingOnly ? (s.team_pokemon ?? []).length === 0 : (s.team_pokemon ?? []).length > 0)
                        .map((s) => {
                          const expansionKey = `${s.division}-${s.placement}`;
                          const isExpanded = expandedPlacements.has(expansionKey);
                          const pokemon = s.team_pokemon ?? [];
                          return (
                            <Fragment key={s.roster_entry_id ?? s.id}>
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
                                <div>
                                  <div className="flex items-center gap-1">
                                    <span>{[s.players?.first_name, s.players?.last_name].filter(Boolean).join(" ") || "—"}</span>
                                    {s.players?.player_id_masked && (
                                      <span className="text-muted-foreground ml-1 text-xs">({s.players.player_id_masked})</span>
                                    )}
                                    {s.roster_entry_id && (
                                      <a
                                        href={`https://rk9.gg/teamlist/public/${row.rk9!.event_id}/${s.roster_entry_id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-muted-foreground hover:text-foreground shrink-0"
                                        aria-label="View team on RK9"
                                      >
                                        <ExternalLink className="h-3 w-3" />
                                      </a>
                                    )}
                                    {s.roster_entry_id && pokemon.length === 0 && (
                                      <button
                                        className="shrink-0 text-muted-foreground hover:text-foreground"
                                        onClick={/* istanbul ignore next */ () => handleScrapeStanding(s.id, s.roster_entry_id!)}
                                        disabled={scrapingIds.has(s.id)}
                                        title="Scrape team list"
                                        aria-label="Scrape team"
                                      >
                                        {scrapingIds.has(s.id) ? (
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                          <Download className="h-3 w-3" />
                                        )}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="py-1.5 pr-3 text-xs text-muted-foreground">
                                {s.trainer_name ?? "—"}
                              </td>
                              <td className="py-1.5 pr-4 font-mono text-xs uppercase">
                                {s.players?.country ?? "—"}
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
                                <td colSpan={6} className="px-2 pb-3">
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
                                              <td className="py-1 pr-3 text-muted-foreground">
                                                {p.stat_alignment ?? "—"}
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
                    : (data as LimitlessStandingWithTeam[])
                        .filter((s) => showMissingOnly ? (s.team_pokemon ?? []).length === 0 : (s.team_pokemon ?? []).length > 0)
                        .map((s) => {
                        const playerName = s.players?.display_name ?? "—";
                        const record =
                          s.record_wins != null
                            ? `${s.record_wins}-${s.record_losses ?? 0}-${s.record_ties ?? 0}`
                            : "—";
                        const expansionKey = `limitless-${s.placement}`;
                        const isExpanded = expandedPlacements.has(expansionKey);
                        const pokemon = s.team_pokemon ?? [];
                        return (
                          <Fragment key={s.placement}>
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
                                              <td className="py-1 pr-3 text-muted-foreground">
                                                {p.stat_alignment ?? "—"}
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
