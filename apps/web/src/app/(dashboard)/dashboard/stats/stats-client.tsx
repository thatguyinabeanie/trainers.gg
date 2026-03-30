"use client";

import { useState, useCallback } from "react";
import { useSupabaseQuery } from "@/lib/supabase";
import {
  getCurrentUserAlts,
  getUserTournamentHistory,
} from "@trainers/supabase";
import type { TypedSupabaseClient } from "@trainers/supabase";
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

export function StatsClient() {
  const [selectedAltId, setSelectedAltId] = useState<number | null>(null);

  // Fetch user's alts
  const altsQueryFn = useCallback(
    (client: TypedSupabaseClient) => getCurrentUserAlts(client),
    []
  );
  const { data: alts } = useSupabaseQuery(altsQueryFn, []);

  // Fetch tournament history (filtered by alt if selected)
  const historyQueryFn = useCallback(
    (client: TypedSupabaseClient) => {
      if (selectedAltId) {
        // Filter by specific alt (would need a new query function)
        // For now, fetch all and filter client-side
        return getUserTournamentHistory(client);
      }
      return getUserTournamentHistory(client);
    },
    [selectedAltId]
  );
  const { data: history } = useSupabaseQuery(historyQueryFn, [selectedAltId]);

  // Filter history client-side by selected alt
  const filteredHistory = selectedAltId
    ? history?.filter((match) => match.altId === selectedAltId)
    : history;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Stats & History</h1>
          <p className="text-muted-foreground text-sm">
            View your performance analytics and tournament history
          </p>
        </div>

        {/* Alt Selector */}
        {alts && alts.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">Viewing:</span>
            <Select
              value={selectedAltId?.toString() || "all"}
              onValueChange={(value) =>
                setSelectedAltId(value === "all" ? null : Number(value))
              }
            >
              <SelectTrigger className="w-[200px]">
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
