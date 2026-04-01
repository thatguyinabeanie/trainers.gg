"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { useAuth, getUserDisplayName } from "@/components/auth/auth-provider";
import { useSupabaseQuery, useSupabase } from "@/lib/supabase";
import {
  getMyDashboardData,
  getActiveMatch,
  getUserTournamentHistory,
  getCurrentUserAlts,
} from "@trainers/supabase";
import { getPokemonSprite } from "@trainers/pokemon/sprites";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type ActiveMatch = Awaited<ReturnType<typeof getActiveMatch>>;
type TournamentHistoryItem = Awaited<
  ReturnType<typeof getUserTournamentHistory>
>[number];

// ─── Subcomponents ────────────────────────────────────────────────────────────

function LiveMatchBar({ match }: { match: NonNullable<ActiveMatch> }) {
  return (
    <div className="mb-3.5 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs">
      {/* Green pulse dot */}
      <span className="relative flex size-1.5 shrink-0">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
        <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
      </span>

      {/* Match info */}
      <span className="min-w-0 flex-1 text-emerald-800">
        <strong className="font-semibold">{match.tournamentName}</strong>
        {" — "}
        Round {match.roundNumber}
        {match.opponent && (
          <>
            {" · You vs "}
            <span className="font-medium">{match.opponent.username}</span>
          </>
        )}
        {match.table != null && ` · Table ${match.table}`}
      </span>

      <Link
        href={`/tournaments/${match.tournamentSlug}`}
        className="shrink-0 font-medium text-emerald-700 underline underline-offset-2 hover:text-emerald-900"
      >
        Go to match →
      </Link>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
}

function StatCard({ label, value, sub }: StatCardProps) {
  return (
    <div className="bg-muted/50 rounded-md px-2.5 py-2">
      <p className="text-muted-foreground mb-0.5 text-[9px] font-semibold tracking-widest uppercase">
        {label}
      </p>
      <p className="font-mono text-base leading-none font-bold">{value}</p>
      {sub && <p className="text-muted-foreground mt-0.5 text-[8px]">{sub}</p>}
    </div>
  );
}

function PokemonSprite({ species }: { species: string }) {
  const sprite = getPokemonSprite(species);
  return (
    <Image
      src={sprite.url}
      alt={species}
      width={18}
      height={18}
      className="shrink-0 object-contain"
      style={{ imageRendering: sprite.pixelated ? "pixelated" : undefined }}
      unoptimized
    />
  );
}

function ResultRow({ item }: { item: TournamentHistoryItem }) {
  const isFirst = item.placement === 1;
  const placementText =
    item.placement != null
      ? `${item.placement}${isFirst ? " 🏆" : ""}${item.placement != null ? ` / ${item.wins + item.losses + item.ties}` : ""}`
      : "—";

  // Format date as "Mar 28"
  const dateText = item.endDate
    ? new Date(item.endDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : item.startDate
      ? new Date(item.startDate).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
      : "";

  return (
    <div className="border-border/50 flex items-center gap-2 border-b py-1.5 text-xs last:border-0">
      {/* Tournament name */}
      <Link
        href={`/tournaments/${item.tournamentSlug}`}
        className="min-w-0 shrink-0 font-medium hover:underline"
      >
        {item.tournamentName}
      </Link>

      {/* Pokemon sprites — push to the right */}
      {item.teamPokemon.length > 0 && (
        <div className="ml-auto flex shrink-0 items-center">
          {item.teamPokemon.slice(0, 6).map((species, i) => (
            <PokemonSprite key={i} species={species} />
          ))}
        </div>
      )}

      {/* Placement */}
      <span
        className={cn(
          "shrink-0 font-mono text-[11px]",
          isFirst ? "font-semibold text-teal-600" : "text-muted-foreground"
        )}
      >
        {placementText}
      </span>

      {/* Date */}
      {dateText && (
        <span className="text-muted-foreground shrink-0 text-[10px]">
          {dateText}
        </span>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function HomeClient({
  selectedAltUsername,
}: {
  selectedAltUsername: string | null;
}) {
  const { user } = useAuth();
  const supabase = useSupabase();
  const toastShown = useRef(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Fetch user's alts early — needed for mainAltId
  const { data: userAlts } = useSupabaseQuery(
    (client) => getCurrentUserAlts(client),
    [user?.id]
  );
  const mainAltId = userAlts?.[0]?.id ?? null;

  // ── Realtime subscription for active match changes ──
  useEffect(() => {
    if (!mainAltId) return;

    const channel = supabase
      .channel(`dashboard-matches-${mainAltId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "tournament_matches",
          filter: `alt1_id=eq.${mainAltId}`,
        },
        () => {
          if (refreshTimeoutRef.current)
            clearTimeout(refreshTimeoutRef.current);
          refreshTimeoutRef.current = setTimeout(
            () => setRefreshKey((k) => k + 1),
            500
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "tournament_matches",
          filter: `alt2_id=eq.${mainAltId}`,
        },
        () => {
          if (refreshTimeoutRef.current)
            clearTimeout(refreshTimeoutRef.current);
          refreshTimeoutRef.current = setTimeout(
            () => setRefreshKey((k) => k + 1),
            500
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tournament_matches",
          filter: `alt1_id=eq.${mainAltId}`,
        },
        () => {
          if (refreshTimeoutRef.current)
            clearTimeout(refreshTimeoutRef.current);
          refreshTimeoutRef.current = setTimeout(
            () => setRefreshKey((k) => k + 1),
            500
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tournament_matches",
          filter: `alt2_id=eq.${mainAltId}`,
        },
        () => {
          if (refreshTimeoutRef.current)
            clearTimeout(refreshTimeoutRef.current);
          refreshTimeoutRef.current = setTimeout(
            () => setRefreshKey((k) => k + 1),
            500
          );
        }
      )
      .subscribe();

    return () => {
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
      channel.unsubscribe();
    };
  }, [supabase, mainAltId]);

  // ── Welcome toast for temp usernames ──
  useEffect(() => {
    if (toastShown.current) return;
    const username = (user?.user_metadata?.username as string) ?? "";
    if (username.startsWith("temp_") || username.startsWith("user_")) {
      toastShown.current = true;
      toast.info(
        "Welcome to trainers.gg! You can set your username and profile details in Settings.",
        { duration: 8000 }
      );
    }
  }, [user]);

  // ── Queries ──

  // Resolve the selected alt's database ID for filtered queries
  const selectedAltId = selectedAltUsername
    ? (userAlts?.find((a) => a.username === selectedAltUsername)?.id ?? null)
    : null;

  // When an alt is selected, use that alt's ID; otherwise fall back to main alt
  const dashboardAltId = selectedAltId ?? mainAltId;

  const { data: dashboardData } = useSupabaseQuery(
    (client) =>
      dashboardAltId
        ? getMyDashboardData(client, dashboardAltId)
        : Promise.resolve(null),
    [dashboardAltId]
  );

  const { data: activeMatch } = useSupabaseQuery(
    (client) =>
      mainAltId ? getActiveMatch(client, mainAltId) : Promise.resolve(null),
    [mainAltId, refreshKey]
  );

  const { data: recentHistory } = useSupabaseQuery(
    (client) => getUserTournamentHistory(client),
    [mainAltId]
  );

  // ── Derived values ──
  const stats = dashboardData?.stats ?? {
    winRate: 0,
    winRateChange: 0,
    currentRating: 0,
    ratingRank: 0,
    activeTournaments: 0,
    totalEnrolled: 0,
    championPoints: 0,
  };

  const winRatePct =
    stats.winRate > 0 ? `${stats.winRate.toFixed(1)}%` : "0.0%";

  // Compute W-L record from recentActivity or fall back to myTournaments player stats
  const recentWins =
    dashboardData?.recentActivity.filter((a) => a.result === "won").length ?? 0;
  const recentTotal = dashboardData?.recentActivity.length ?? 0;
  const recordStr =
    recentTotal > 0 ? `${recentWins}-${recentTotal - recentWins}` : "0-0";

  const ratingStr =
    stats.currentRating > 0 ? stats.currentRating.toLocaleString() : "—";
  const tournamentsStr =
    stats.totalEnrolled > 0 ? `${stats.totalEnrolled}` : "0";

  // Recent results: last 5 completed tournaments, optionally filtered by selected alt
  const filteredHistory = selectedAltUsername
    ? (recentHistory ?? []).filter((r) => r.altUsername === selectedAltUsername)
    : (recentHistory ?? []);
  const recentResults = filteredHistory.slice(0, 5);

  const displayName = getUserDisplayName(user);

  return (
    <div className="flex flex-col gap-0">
      {/* Welcome heading */}
      <h1 className="mb-3 text-base font-bold">Welcome back, {displayName}</h1>

      {/* Live match bar (conditional) */}
      {activeMatch && <LiveMatchBar match={activeMatch} />}

      {/* Stats row */}
      <div className="mb-3.5 grid grid-cols-4 gap-2">
        <StatCard
          label="Win Rate"
          value={winRatePct}
          sub={
            stats.winRateChange !== 0
              ? `${stats.winRateChange > 0 ? "+" : ""}${stats.winRateChange.toFixed(1)}% this month`
              : undefined
          }
        />
        <StatCard
          label="Rating"
          value={ratingStr}
          sub={stats.ratingRank > 0 ? `Rank #${stats.ratingRank}` : undefined}
        />
        <StatCard
          label="Record"
          value={recordStr}
          sub={
            selectedAltUsername
              ? `as ${selectedAltUsername}`
              : "across all alts"
          }
        />
        <StatCard
          label="Tournaments"
          value={tournamentsStr}
          sub={
            stats.activeTournaments > 0
              ? `${stats.activeTournaments} active`
              : undefined
          }
        />
      </div>

      {/* Recent results */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
            Recent results
          </span>
          <Link
            href="/dashboard/tournaments"
            className="text-[11px] text-teal-600 hover:underline"
          >
            View history →
          </Link>
        </div>

        {recentResults.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-xs">
            No tournament history yet.
          </p>
        ) : (
          <div>
            {recentResults.map((item) => (
              <ResultRow key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
