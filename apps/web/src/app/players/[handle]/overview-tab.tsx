"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Target, Award, Gamepad2, Calendar } from "lucide-react";
import type { PlayerLifetimeStats } from "@trainers/supabase/queries";

// ============================================================================
// Types
// ============================================================================

interface TournamentHistoryEntry {
  id: number;
  tournamentId: number;
  tournamentName: string;
  tournamentSlug: string;
  organizationName: string;
  organizationSlug: string;
  startDate: string | null;
  format: string | null;
  playerCount: number | null;
  placement: number | null;
  wins: number;
  losses: number;
  teamPokemon: string[];
}

// ============================================================================
// Query key factories
// ============================================================================

const playerKeys = {
  all: (handle: string) => ["player", handle] as const,
  stats: (handle: string) => [...playerKeys.all(handle), "stats"] as const,
  tournaments: (handle: string) =>
    [...playerKeys.all(handle), "tournaments"] as const,
};

// ============================================================================
// Data fetching hooks
// ============================================================================

function usePlayerStats(altIds: number[], handle: string) {
  return useQuery<PlayerLifetimeStats>({
    queryKey: playerKeys.stats(handle),
    queryFn: async () => {
      const res = await fetch(`/api/players/stats?altIds=${altIds.join(",")}`);
      if (!res.ok) throw new Error("Failed to fetch player stats");
      return res.json();
    },
    enabled: altIds.length > 0,
  });
}

function usePlayerTournaments(altIds: number[], handle: string) {
  return useQuery<TournamentHistoryEntry[]>({
    queryKey: playerKeys.tournaments(handle),
    queryFn: async () => {
      const res = await fetch(
        `/api/players/tournaments?altIds=${altIds.join(",")}`
      );
      if (!res.ok) throw new Error("Failed to fetch tournament history");
      return res.json();
    },
    enabled: altIds.length > 0,
  });
}

// ============================================================================
// Helpers
// ============================================================================

function formatPlacement(rank: number): string {
  const suffixes = ["th", "st", "nd", "rd"];
  const remainder = rank % 100;
  const suffix =
    suffixes[(remainder - 20) % 10] ?? suffixes[remainder] ?? suffixes[0];
  return `${rank}${suffix}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ============================================================================
// Sub-components
// ============================================================================

interface OverviewTabProps {
  altIds: number[];
  handle: string;
}

function StatsCards({ altIds, handle }: OverviewTabProps) {
  const { data: stats, isLoading } = usePlayerStats(altIds, handle);

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="flex items-center gap-4 pt-6">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const mainFormat = stats.formats.length > 0 ? (stats.formats[0] ?? "-") : "-";

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          <div className="bg-primary/10 rounded-full p-3">
            <Trophy className="text-primary h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl font-bold">{stats.tournamentCount}</p>
            <p className="text-muted-foreground text-sm">Tournaments</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          <div className="bg-primary/10 rounded-full p-3">
            <Target className="text-primary h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl font-bold">
              {stats.winRate > 0 ? `${stats.winRate.toFixed(1)}%` : "-"}
            </p>
            <p className="text-muted-foreground text-sm">Win Rate</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          <div className="bg-primary/10 rounded-full p-3">
            <Award className="text-primary h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl font-bold">
              {stats.bestPlacement != null
                ? formatPlacement(stats.bestPlacement)
                : "-"}
            </p>
            <p className="text-muted-foreground text-sm">Best Placement</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          <div className="bg-primary/10 rounded-full p-3">
            <Gamepad2 className="text-primary h-6 w-6" />
          </div>
          <div>
            <p className="max-w-[120px] truncate text-2xl font-bold">
              {mainFormat}
            </p>
            <p className="text-muted-foreground text-sm">Main Format</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RecentTournaments({ altIds, handle }: OverviewTabProps) {
  const { data: tournaments, isLoading } = usePlayerTournaments(altIds, handle);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Recent Tournaments</h2>
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="flex items-center gap-4 pt-6">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-6 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const recent = (tournaments ?? []).slice(0, 5);

  if (recent.length === 0) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Recent Tournaments</h2>
        <div className="text-muted-foreground py-8 text-center text-sm">
          No completed tournaments yet.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Recent Tournaments</h2>
      {recent.map((entry) => (
        <Card key={entry.id}>
          <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 mt-0.5 rounded-full p-2">
                <Trophy className="text-primary h-4 w-4" />
              </div>
              <div className="min-w-0">
                <Link
                  href={`/tournaments/${entry.tournamentSlug}`}
                  className="hover:text-primary font-medium transition-colors"
                >
                  {entry.tournamentName}
                </Link>
                <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
                  {entry.organizationName && (
                    <Link
                      href={`/organizations/${entry.organizationSlug}`}
                      className="hover:underline"
                    >
                      {entry.organizationName}
                    </Link>
                  )}
                  {entry.startDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(entry.startDate)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm sm:text-right">
              <div>
                <span className="text-muted-foreground">Record: </span>
                <span className="font-medium">
                  {entry.wins}-{entry.losses}
                </span>
              </div>
              {entry.placement != null && (
                <div className="bg-muted rounded-md px-2.5 py-1 text-xs font-semibold">
                  {formatPlacement(entry.placement)}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ============================================================================
// Main component
// ============================================================================

export function OverviewTab({ altIds, handle }: OverviewTabProps) {
  return (
    <div className="space-y-8">
      <StatsCards altIds={altIds} handle={handle} />
      <RecentTournaments altIds={altIds} handle={handle} />
    </div>
  );
}
