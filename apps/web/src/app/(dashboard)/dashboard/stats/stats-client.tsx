"use client";

import { useState } from "react";
import { useApiQuery } from "@trainers/supabase/react-query";
import type { getUserTournamentHistory } from "@trainers/supabase";
import { type ActionResult } from "@trainers/validators";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TournamentHistoryTable } from "@/components/dashboard/tournament-history-table";
import {
  WinRateTrend,
  FormatPerformance,
  MostUsedPokemon,
} from "@/components/dashboard/analytics";

// =============================================================================
// Types
// =============================================================================

type TournamentHistoryItem = NonNullable<
  Awaited<ReturnType<typeof getUserTournamentHistory>>
>[number];

// =============================================================================
// API fetch helpers
// =============================================================================

async function fetchTournamentHistory(): Promise<
  ActionResult<TournamentHistoryItem[]>
> {
  const res = await fetch("/api/v1/me/tournament-history");
  return res.json() as Promise<ActionResult<TournamentHistoryItem[]>>;
}

// =============================================================================
// Component
// =============================================================================

export function StatsClient() {
  const [selectedAltId, setSelectedAltId] = useState<number | null>(null);

  // Fetch tournament history via the API route (replaces useSupabaseQuery).
  const { data: history } = useApiQuery<TournamentHistoryItem[]>(
    ["me", "tournament-history"],
    fetchTournamentHistory,
    { staleTime: 30_000 }
  );

  // Derive the unique alts from the history rather than a separate alts query.
  // This avoids a second network round-trip and keeps the alt selector in sync
  // with the data we actually have. A dedicated me/alts route (T3k) will
  // replace this when available.
  const alts: Array<{ id: number; username: string }> = [];
  const seenAltIds = new Set<number>();
  for (const entry of history ?? []) {
    if (!seenAltIds.has(entry.altId)) {
      seenAltIds.add(entry.altId);
      alts.push({ id: entry.altId, username: entry.altUsername });
    }
  }

  // Filter history client-side by selected alt
  const filteredHistory = selectedAltId
    ? history?.filter((match) => match.altId === selectedAltId)
    : history;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Stats &amp; History
          </h1>
          <p className="text-muted-foreground text-sm">
            View your performance analytics and tournament history
          </p>
        </div>

        {/* Alt Selector */}
        {alts.length > 0 && (
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
            <span className="text-muted-foreground text-sm">Viewing:</span>
            <Select
              value={selectedAltId?.toString() || "all"}
              onValueChange={(value) =>
                setSelectedAltId(value === "all" ? null : Number(value))
              }
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="All Alts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Alts</SelectItem>
                {alts.map((alt) => (
                  <SelectItem key={alt.id} value={alt.id.toString()}>
                    @{alt.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Analytics Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <WinRateTrend altId={selectedAltId} />
        <FormatPerformance altId={selectedAltId} />
      </div>

      <MostUsedPokemon altId={selectedAltId} />

      {/* Tournament History */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Match History</h2>
        <TournamentHistoryTable data={filteredHistory || []} />
      </div>
    </div>
  );
}
