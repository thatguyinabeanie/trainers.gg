"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Users } from "lucide-react";

import {
  getCurrentUserAlts,
  getAltsBulkStats,
  getPlayerRatingsBulk,
  getActiveMatch,
} from "@trainers/supabase";
import type { TypedSupabaseClient } from "@trainers/supabase";

import { useAuth } from "@/components/auth/auth-provider";
import { useSupabaseQuery, useSupabase } from "@/lib/supabase";
import {
  DASHBOARD_ALT_COOKIE,
  COOKIE_MAX_AGE,
} from "@/components/dashboard/sidebar-helpers";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { LiveMatchBar } from "./components/live-match-bar";
import { DashboardStats } from "./components/dashboard-stats";
import { AltsTable } from "./components/alts-table";
import { CreateAltForm } from "./components/create-alt-form";

// =============================================================================
// Main Component
// =============================================================================

export function HomeClient({
  selectedAltUsername,
}: {
  selectedAltUsername: string | null;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const supabase = useSupabase();
  const toastShown = useRef(false);
  const [selectedAlt, setSelectedAlt] = useState<string | null>(
    selectedAltUsername
  );
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // ── Queries ──────────────────────────────────────────────────────────────

  // Fetch user's alts
  const {
    data: alts,
    isLoading: altsLoading,
    error: altsError,
    refetch: refetchAlts,
  } = useSupabaseQuery(
    (client) => getCurrentUserAlts(client),
    ["alts", user?.id, refreshKey]
  );

  // Main alt ID from users table
  const mainAltQueryFn = async (client: TypedSupabaseClient) => {
    if (!user) return null;
    const { data, error } = await client
      .from("users")
      .select("main_alt_id")
      .eq("id", user.id)
      .single();
    if (error) throw error;
    return data?.main_alt_id ?? null;
  };
  const { data: mainAltId } = useSupabaseQuery(mainAltQueryFn, [
    "mainAlt",
    user?.id,
    refreshKey,
  ]);

  // Bulk stats for all alts — no N+1
  const altIds = (alts ?? []).map((a) => a.id);
  const { data: bulkStats } = useSupabaseQuery(
    (client) => getAltsBulkStats(client, altIds),
    ["altsBulkStats", ...altIds, refreshKey]
  );

  // Bulk ratings for all alts
  const { data: bulkRatings } = useSupabaseQuery(
    (client) => getPlayerRatingsBulk(client, altIds, "overall"),
    ["altsBulkRatings", ...altIds]
  );

  // Active match (always based on main alt)
  const { data: activeMatch } = useSupabaseQuery(
    (client) =>
      mainAltId ? getActiveMatch(client, mainAltId) : Promise.resolve(null),
    [mainAltId, refreshKey]
  );

  // ── Realtime subscription for active match changes ──────────────────────
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
      .subscribe((status, err) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          if (err) {
            console.error("Dashboard realtime failed:", status, err);
          } else {
            console.warn(
              "Dashboard realtime:",
              status,
              "(no error — likely a local dev WebSocket issue)"
            );
          }
        }
      });

    return () => {
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
      channel.unsubscribe();
    };
  }, [supabase, mainAltId]);

  // ── Welcome toast for temp usernames ────────────────────────────────────
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

  // ── Handlers ────────────────────────────────────────────────────────────

  function handleAltSelect(username: string | null) {
    setSelectedAlt(username);
    // Sync cookie so sidebar alt switcher and page.tsx stay in sync
    if (username) {
      document.cookie = `${DASHBOARD_ALT_COOKIE}=${username}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
    } else {
      document.cookie = `${DASHBOARD_ALT_COOKIE}=; path=/; max-age=0; samesite=lax`;
    }
    // Refresh to sync sidebar alt switcher
    router.refresh();
  }

  function handleRefresh() {
    setRefreshKey((k) => k + 1);
    refetchAlts();
  }

  // ── Stats computation (always aggregate across all alts) ─────────────

  const aggregateWins = bulkStats
    ? Object.values(bulkStats).reduce((sum, s) => sum + s.matchWins, 0)
    : 0;
  const aggregateLosses = bulkStats
    ? Object.values(bulkStats).reduce((sum, s) => sum + s.matchLosses, 0)
    : 0;
  const aggregateTotal = aggregateWins + aggregateLosses;
  const aggregateWinRate =
    aggregateTotal > 0 ? (aggregateWins / aggregateTotal) * 100 : 0;

  const bestRating = bulkRatings
    ? Math.max(...Object.values(bulkRatings).map((r) => r.rating ?? 0), 0)
    : 0;

  const aggregateTournaments = bulkStats
    ? Object.values(bulkStats).reduce((sum, s) => sum + s.tournamentCount, 0)
    : 0;

  const altCount = (alts ?? []).length;

  const winRateStr =
    aggregateTotal > 0 ? `${aggregateWinRate.toFixed(1)}%` : "0.0%";
  const winRateSub =
    aggregateTotal > 0 ? `${aggregateTotal} games` : "across all alts";

  const ratingStr = bestRating > 0 ? bestRating.toLocaleString() : "—";
  const ratingSub = bestRating > 0 ? "best across alts" : "across all alts";

  const recordStr =
    aggregateTotal > 0 ? `${aggregateWins}-${aggregateLosses}` : "0-0";
  const recordSub = "across all alts";

  const tournamentsStr = `${aggregateTournaments}`;
  const tournamentsSub = `${altCount} alt${altCount !== 1 ? "s" : ""}`;
  const tournamentsSubAccent = false;

  // ── Loading state ───────────────────────────────────────────────────────
  if (altsLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    );
  }

  // ── Error state ─────────────────────────────────────────────────────────
  if (altsError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-destructive text-sm font-medium">
          Something went wrong
        </p>
        <p className="text-muted-foreground mt-1 text-xs">
          {altsError.message || "Failed to load data. Please try refreshing."}
        </p>
      </div>
    );
  }

  const hasAlts = alts && alts.length > 0;

  // ── Empty state (no alts) ───────────────────────────────────────────────
  if (!hasAlts) {
    return (
      <div className="space-y-4">
        {/* Stats row still rendered with zero values */}
        <DashboardStats
          winRate="0.0%"
          winRateSub="no games played"
          rating="—"
          ratingSub="no rating yet"
          record="0-0"
          recordSub="no matches"
          tournaments="0"
          tournamentsSub="no alts yet"
        />

        {/* Create form if open */}
        {showCreateForm && (
          <div className="animate-in slide-in-from-top-2 duration-200">
            <CreateAltForm
              onCreated={() => {
                setShowCreateForm(false);
                handleRefresh();
              }}
              onCancel={() => setShowCreateForm(false)}
            />
          </div>
        )}

        {/* Empty state card */}
        <Card className="border-2 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="bg-primary/10 flex size-14 items-center justify-center rounded-full">
              <Users className="text-primary size-7" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No alts yet</h3>
            <p className="text-muted-foreground mt-2 max-w-sm text-center text-sm">
              Create your first player identity to register for tournaments and
              track your competitive journey
            </p>
            <Button
              className="mt-6 gap-2"
              onClick={() => setShowCreateForm(true)}
            >
              <Plus className="size-4" />
              Create Your First Alt
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Main render ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Live match bar — conditional */}
      {activeMatch && <LiveMatchBar match={activeMatch} />}

      {/* Adaptive stats row */}
      <DashboardStats
        winRate={winRateStr}
        winRateSub={winRateSub}
        rating={ratingStr}
        ratingSub={ratingSub}
        record={recordStr}
        recordSub={recordSub}
        tournaments={tournamentsStr}
        tournamentsSub={tournamentsSub}
        tournamentsSubAccent={tournamentsSubAccent}
      />

      {/* Alts section */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Your Alts</h2>
          <Button
            size="sm"
            onClick={() => setShowCreateForm(true)}
            disabled={showCreateForm}
          >
            <Plus className="mr-1 size-3.5" /> New Alt
          </Button>
        </div>

        {/* Create form — slides in above the table */}
        {showCreateForm && (
          <div className="animate-in slide-in-from-top-2 mb-3 duration-200">
            <CreateAltForm
              onCreated={() => {
                setShowCreateForm(false);
                handleRefresh();
              }}
              onCancel={() => setShowCreateForm(false)}
            />
          </div>
        )}

        {/* Alts table with inline stats and expand/collapse */}
        <AltsTable
          alts={alts}
          mainAltId={mainAltId ?? null}
          bulkStats={bulkStats}
          bulkRatings={bulkRatings}
          selectedAltUsername={selectedAlt}
          onAltSelect={handleAltSelect}
          onRefresh={handleRefresh}
          refreshKey={refreshKey}
        />
      </div>
    </div>
  );
}
