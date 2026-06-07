"use client";

import { useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  ListFilter,
  Search,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useSupabaseQuery } from "@/lib/supabase";

import { PlayerExpandedData } from "./player-expanded-data";

interface PlayersViewProps {
  /** RK9 players sub-view is active — gates the query. */
  active: boolean;
  /** Bump to refetch (parent's refreshKey). */
  refreshKey: number;
}

type PlayerSortCol = "name" | "id" | "country" | "events";

/**
 * RK9 Players sub-view: a searchable, sortable, virtualized table of players
 * across all RK9 events, with expandable per-player detail. Self-contained —
 * owns its own search/sort/expansion state and query.
 */
export function PlayersView({ active, refreshKey }: PlayersViewProps) {
  const [playerSearch, setPlayerSearch] = useState("");
  const [expandedPlayerId, setExpandedPlayerId] = useState<number | null>(null);
  const playerScrollRef = useRef<HTMLDivElement>(null);
  const [playerSort, setPlayerSort] = useState<{
    column: PlayerSortCol;
    direction: "asc" | "desc";
  }>({ column: "name", direction: "asc" });

  // Always called (Rules of Hooks); skips the fetch when the sub-view is inactive.
  const { data: rk9Players, isLoading: rk9PlayersLoading } = useSupabaseQuery(
    /* istanbul ignore next */
    async (sb) => {
      if (!active) return [];
      const { data, error } = await sb
        .schema("rk9")
        .from("players")
        .select(
          "id, player_id_masked, first_name, last_name, country, standings(count)"
        )
        .order("last_name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Array<{
        id: number;
        player_id_masked: string | null;
        first_name: string;
        last_name: string;
        country: string;
        standings: [{ count: number }];
      }>;
    },
    [refreshKey, active ? "load" : "skip"]
  );

  const filteredPlayers = (rk9Players ?? []).filter((p) => {
    if (!playerSearch) return true;
    const q = playerSearch.toLowerCase();
    return (
      p.first_name?.toLowerCase().includes(q) ||
      p.last_name?.toLowerCase().includes(q) ||
      p.player_id_masked?.toLowerCase().includes(q)
    );
  });

  function togglePlayerSort(col: PlayerSortCol) {
    setPlayerSort((prev) =>
      prev.column === col
        ? { column: col, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { column: col, direction: "asc" }
    );
  }

  const sortedPlayers = [...filteredPlayers].sort((a, b) => {
    const dir = playerSort.direction === "asc" ? 1 : -1;
    switch (playerSort.column) {
      case "name":
        return (
          `${a.first_name} ${a.last_name}`.localeCompare(
            `${b.first_name} ${b.last_name}`
          ) * dir
        );
      case "id":
        return (
          (a.player_id_masked ?? "").localeCompare(b.player_id_masked ?? "") *
          dir
        );
      case "country":
        return (a.country ?? "").localeCompare(b.country ?? "") * dir;
      case "events":
        return (
          ((a.standings[0]?.count ?? 0) - (b.standings[0]?.count ?? 0)) * dir
        );
      default:
        return 0;
    }
  });

  const playerVirtualizer = useVirtualizer({
    count: sortedPlayers.length,
    getScrollElement: () => playerScrollRef.current,
    estimateSize: () => 52,
    overscan: 10,
  });

  return (
    <div className="space-y-4">
      {/* Players search input */}
      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
        <Input
          placeholder="Search by name or player ID..."
          value={playerSearch}
          onChange={(e) => setPlayerSearch(e.target.value)}
          className="h-8 pl-8 text-sm"
        />
      </div>

      {/* Players table */}
      <div className="rounded-md border">
        <div className="text-muted-foreground flex items-center gap-2 px-4 py-2 text-xs">
          <ListFilter className="h-3.5 w-3.5" />
          {rk9PlayersLoading
            ? "Loading players…"
            : `Showing ${filteredPlayers.length} players`}
        </div>

        {/* Players table header */}
        <div
          className="grid border-b"
          style={{ gridTemplateColumns: "28px 1fr 120px 60px 60px" }}
        >
          <div className="h-10" />
          {(["name", "id", "country", "events"] as const).map((col) => (
            <div key={col} className="flex h-10 items-center px-2">
              <button
                className="hover:text-foreground inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap capitalize"
                onClick={() => togglePlayerSort(col)}
              >
                {col === "id"
                  ? "RK9 ID"
                  : col.charAt(0).toUpperCase() + col.slice(1)}
                {playerSort.column === col ? (
                  playerSort.direction === "asc" ? (
                    <ArrowUp className="h-3 w-3" />
                  ) : (
                    <ArrowDown className="h-3 w-3" />
                  )
                ) : (
                  <ArrowUpDown className="h-3 w-3 opacity-40" />
                )}
              </button>
            </div>
          ))}
        </div>

        {rk9PlayersLoading ? (
          <div className="space-y-2 p-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </div>
        ) : filteredPlayers.length === 0 ? (
          <div className="text-muted-foreground py-12 text-center text-sm">
            {(rk9Players ?? []).length === 0
              ? "No players found."
              : "No players match your search."}
          </div>
        ) : (
          /* Virtualized body */
          <div
            ref={playerScrollRef}
            className="overflow-auto"
            style={{ maxHeight: "calc(100vh - 300px)" }}
          >
            <div
              style={{
                height: playerVirtualizer.getTotalSize(),
                position: "relative",
              }}
            >
              {playerVirtualizer.getVirtualItems().map((virtualRow) => {
                const p = sortedPlayers[virtualRow.index];
                if (!p) return null;
                const isPlayerExpanded = expandedPlayerId === p.id;
                const eventCount = p.standings[0]?.count ?? 0;
                return (
                  <div
                    key={p.id}
                    ref={playerVirtualizer.measureElement}
                    data-index={virtualRow.index}
                    className="border-b"
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <div
                      className="hover:bg-muted/50 grid transition-colors"
                      style={{
                        gridTemplateColumns: "28px 1fr 120px 60px 60px",
                      }}
                    >
                      {/* Chevron */}
                      <div className="flex items-center justify-center py-3">
                        <button
                          className="hover:bg-muted flex h-5 w-5 items-center justify-center rounded"
                          onClick={() =>
                            setExpandedPlayerId(isPlayerExpanded ? null : p.id)
                          }
                          aria-label={isPlayerExpanded ? "Collapse" : "Expand"}
                        >
                          {isPlayerExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                      {/* Name */}
                      <div className="flex min-w-0 items-center px-3 py-3 text-xs">
                        <span className="truncate">
                          {[p.first_name, p.last_name]
                            .filter(Boolean)
                            .join(" ") || "—"}
                        </span>
                      </div>
                      {/* Player ID */}
                      <div className="text-muted-foreground flex items-center px-3 py-3 font-mono text-xs">
                        {p.player_id_masked ?? "—"}
                      </div>
                      {/* Country */}
                      <div className="flex items-center px-3 py-3 font-mono text-xs uppercase">
                        {p.country ?? "—"}
                      </div>
                      {/* Events */}
                      <div className="flex items-center px-3 py-3 text-xs">
                        {eventCount}
                      </div>
                    </div>
                    {isPlayerExpanded && <PlayerExpandedData playerId={p.id} />}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
