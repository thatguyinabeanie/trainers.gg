"use client";

import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useSupabaseQuery } from "@/lib/supabase";
import { type UnifiedRow, type ExpandedView } from "./external-data-shared";

// ---------------------------------------------------------------------------
// Minimal result types for query shapes
// PostgREST FK embedding relies on FK relationships defined in each schema.
// If the query returns an error about ambiguous/unresolvable relationships,
// the error will surface in the UI via the error display below.
// ---------------------------------------------------------------------------

interface Rk9StandingRow {
  placement: number;
  division: string | null;
  drop_round: number | null;
  players: {
    first_name: string | null;
    last_name: string | null;
    country: string | null;
    trainer_name: string | null;
  } | null;
}

interface LimitlessStandingRow {
  placement: number;
  record_wins: number | null;
  record_losses: number | null;
  record_ties: number | null;
  players: {
    username: string | null;
    display_name: string | null;
    country: string | null;
  } | null;
}

interface TeamPokemon {
  position: number | null;
  species: string | null;
  ability: string | null;
  held_item: string | null;
  tera_type: string | null;
  moves: unknown;
}

interface Rk9TeamRow {
  placement: number;
  division: string | null;
  players: { trainer_name: string | null } | null;
  team_pokemon: TeamPokemon[] | null;
}

interface LimitlessDecklistRow {
  placement: number;
  players: { display_name: string | null } | null;
  team_pokemon: TeamPokemon[] | null;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ExpandedRowDataProps {
  row: UnifiedRow;
}

// ---------------------------------------------------------------------------
// TeamsPanel — RK9 team composition (only mounted when view === "teams")
// ---------------------------------------------------------------------------

function TeamsPanel({ eventId }: { eventId: string }) {
  const { data, isLoading, error } = useSupabaseQuery(
    async (sb) => {
      const { data, error } = await sb
        .schema("rk9")
        .from("standings")
        .select(
          "placement, division, players(trainer_name), team_pokemon(position, species, ability, held_item, tera_type, moves)"
        )
        .eq("event_id", eventId)
        .order("placement", { ascending: true })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as unknown as Rk9TeamRow[];
    },
    [eventId]
  );

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-xs text-red-500">{error.message}</p>;
  }

  if (!data || data.length === 0) {
    return (
      <p className="text-muted-foreground text-xs">No team data available.</p>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((standing, i) => {
        const trainerName =
          standing.players?.trainer_name ??
          `Player #${standing.placement}`;
        const pokemon = standing.team_pokemon ?? [];
        return (
          <div key={i} className="space-y-1.5">
            <p className="text-sm">
              <span className="font-mono font-semibold">
                #{standing.placement}
              </span>{" "}
              {trainerName}
            </p>
            {pokemon.length === 0 ? (
              <p className="text-muted-foreground text-xs">No team data</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {pokemon.map((p, j) => (
                  <span
                    key={j}
                    className="bg-background rounded border px-2 py-1 text-xs"
                  >
                    <span className="block font-medium">
                      {p.species ?? "Unknown"}
                    </span>
                    <span className="text-muted-foreground block">
                      {[p.ability, p.held_item].filter(Boolean).join(" · ") ||
                        "—"}
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DecklistsPanel — Limitless team composition (only mounted when view === "decklists")
// ---------------------------------------------------------------------------

function DecklistsPanel({ tournamentId }: { tournamentId: string }) {
  const { data, isLoading, error } = useSupabaseQuery(
    async (sb) => {
      const { data, error } = await sb
        .schema("limitless")
        .from("standings")
        .select(
          "placement, players(display_name), team_pokemon(position, species, ability, held_item, tera_type, moves)"
        )
        .eq("tournament_id", tournamentId)
        .order("placement", { ascending: true })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as unknown as LimitlessDecklistRow[];
    },
    [tournamentId]
  );

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-xs text-red-500">{error.message}</p>;
  }

  if (!data || data.length === 0) {
    return (
      <p className="text-muted-foreground text-xs">No decklist data available.</p>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((standing, i) => {
        const displayName =
          standing.players?.display_name ?? `Player #${standing.placement}`;
        const pokemon = standing.team_pokemon ?? [];
        return (
          <div key={i} className="space-y-1.5">
            <p className="text-sm">
              <span className="font-mono font-semibold">
                #{standing.placement}
              </span>{" "}
              {displayName}
            </p>
            {pokemon.length === 0 ? (
              <p className="text-muted-foreground text-xs">No team data</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {pokemon.map((p, j) => (
                  <span
                    key={j}
                    className="bg-background rounded border px-2 py-1 text-xs"
                  >
                    <span className="block font-medium">
                      {p.species ?? "Unknown"}
                    </span>
                    <span className="text-muted-foreground block">
                      {[p.ability, p.held_item].filter(Boolean).join(" · ") ||
                        "—"}
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ExpandedRowData — main exported component
// ---------------------------------------------------------------------------

export function ExpandedRowData({ row }: ExpandedRowDataProps) {
  const [view, setView] = useState<ExpandedView>("standings");
  const [standingsLimit, setStandingsLimit] = useState(50);

  // Determine which views are available for this source
  const secondaryLabel = row.source === "rk9" ? "Teams" : "Decklists";
  const secondaryView: ExpandedView =
    row.source === "rk9" ? "teams" : "decklists";

  // ---------------------------------------------------------------------------
  // Standings query — always mounted regardless of view
  // ---------------------------------------------------------------------------

  const {
    data: standingsData,
    isLoading: standingsLoading,
    error: standingsError,
  } = useSupabaseQuery(
    async (sb) => {
      if (row.source === "rk9" && row.rk9) {
        const { data, error } = await sb
          .schema("rk9")
          .from("standings")
          .select(
            "placement, division, drop_round, players(first_name, last_name, country, trainer_name)"
          )
          .eq("event_id", row.rk9.event_id)
          .order("placement", { ascending: true })
          .limit(standingsLimit);
        if (error) throw error;
        return (data ?? []) as unknown as Rk9StandingRow[];
      } else if (row.source === "limitless" && row.limitless) {
        const { data, error } = await sb
          .schema("limitless")
          .from("standings")
          .select(
            "placement, record_wins, record_losses, record_ties, players(username, display_name, country)"
          )
          .eq("tournament_id", row.limitless.tournament_id)
          .order("placement", { ascending: true })
          .limit(standingsLimit);
        if (error) throw error;
        return (data ?? []) as unknown as LimitlessStandingRow[];
      }
      return [];
    },
    [row.id, standingsLimit]
  );

  return (
    <div className="border-t bg-muted/20 p-4">
      {/* View toggle */}
      <div className="mb-3 flex items-center gap-1">
        <button
          className={
            view === "standings"
              ? "rounded px-3 py-1 text-xs font-medium bg-muted text-foreground"
              : "rounded px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          }
          onClick={() => setView("standings")}
        >
          Standings
        </button>
        <button
          className={
            view === secondaryView
              ? "rounded px-3 py-1 text-xs font-medium bg-muted text-foreground"
              : "rounded px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          }
          onClick={() => setView(secondaryView)}
        >
          {secondaryLabel}
        </button>
      </div>

      {/* Content area */}
      <div className="max-h-96 overflow-auto">
        {view === "standings" && (
          <>
            {standingsLoading && (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            )}
            {standingsError && (
              <p className="text-xs text-red-500">{standingsError.message}</p>
            )}
            {!standingsLoading && !standingsError && standingsData && (
              <>
                {standingsData.length === 0 ? (
                  <p className="text-muted-foreground text-xs">
                    No standings data available.
                  </p>
                ) : row.source === "rk9" ? (
                  <RK9StandingsTable
                    data={standingsData as Rk9StandingRow[]}
                  />
                ) : (
                  <LimitlessStandingsTable
                    data={standingsData as LimitlessStandingRow[]}
                  />
                )}
                {standingsData.length === standingsLimit && (
                  <button
                    className="mt-2 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setStandingsLimit((l) => l + 50)}
                  >
                    Load more…
                  </button>
                )}
              </>
            )}
          </>
        )}

        {view === "teams" && row.rk9 && (
          <TeamsPanel eventId={row.rk9.event_id} />
        )}

        {view === "decklists" && row.limitless && (
          <DecklistsPanel tournamentId={row.limitless.tournament_id} />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RK9 standings table
// ---------------------------------------------------------------------------

function RK9StandingsTable({ data }: { data: Rk9StandingRow[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-xs text-muted-foreground">
          <th className="py-1 pr-4 text-left font-medium">#</th>
          <th className="py-1 pr-4 text-left font-medium">Player</th>
          <th className="py-1 pr-4 text-left font-medium">Division</th>
          <th className="py-1 text-left font-medium">Dropped</th>
        </tr>
      </thead>
      <tbody>
        {data.map((s, i) => {
          const fullName =
            [s.players?.first_name, s.players?.last_name]
              .filter(Boolean)
              .join(" ") || null;
          const playerName = s.players?.trainer_name ?? fullName ?? "—";
          const division = s.division
            ? s.division.charAt(0).toUpperCase() + s.division.slice(1)
            : "—";
          return (
            <tr key={i} className="border-b last:border-0">
              <td className="py-1.5 pr-4 font-mono text-xs">{s.placement}</td>
              <td className="py-1.5 pr-4 text-xs">{playerName}</td>
              <td className="py-1.5 pr-4 text-xs">{division}</td>
              <td className="py-1.5 text-xs">
                {s.drop_round != null ? s.drop_round : "—"}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ---------------------------------------------------------------------------
// Limitless standings table
// ---------------------------------------------------------------------------

function LimitlessStandingsTable({ data }: { data: LimitlessStandingRow[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-xs text-muted-foreground">
          <th className="py-1 pr-4 text-left font-medium">#</th>
          <th className="py-1 pr-4 text-left font-medium">Player</th>
          <th className="py-1 pr-4 text-left font-medium">Record</th>
          <th className="py-1 text-left font-medium">Country</th>
        </tr>
      </thead>
      <tbody>
        {data.map((s, i) => {
          const playerName = s.players?.display_name ?? "—";
          const record =
            s.record_wins != null
              ? `${s.record_wins}-${s.record_losses ?? 0}-${s.record_ties ?? 0}`
              : "—";
          return (
            <tr key={i} className="border-b last:border-0">
              <td className="py-1.5 pr-4 font-mono text-xs">{s.placement}</td>
              <td className="py-1.5 pr-4 text-xs">{playerName}</td>
              <td className="py-1.5 pr-4 font-mono text-xs">{record}</td>
              <td className="py-1.5 text-xs">{s.players?.country ?? "—"}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
