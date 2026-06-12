"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { useApiQuery } from "@trainers/supabase/react-query";
import { toast } from "sonner";
import { Trophy } from "lucide-react";
import {
  StatsOverview,
  ActiveMatchCard,
  UpcomingTournaments,
  RecentActivity,
  RecentAchievements,
  WhatsNext,
} from "@/components/dashboard";
import { type ActionResult } from "@trainers/validators";
import { type getMyDashboardData, type getActiveMatch } from "@trainers/supabase";

// =============================================================================
// Types
// =============================================================================

type OverviewMode =
  | "active-competition"
  | "pre-tournament"
  | "post-tournament"
  | "idle";

type DashboardData = NonNullable<Awaited<ReturnType<typeof getMyDashboardData>>>;
type ActiveMatchData = Awaited<ReturnType<typeof getActiveMatch>>;

// =============================================================================
// Helpers
// =============================================================================

/**
 * Determine the current overview mode based on dashboard data.
 */
function getOverviewContext(
  tournaments: Array<{ startDate: number | null; hasTeam: boolean }>,
  recentActivity: Array<{ date: number }>,
  hasActiveMatch: boolean
): OverviewMode {
  if (hasActiveMatch) return "active-competition";

  // Check for urgent actions (tournaments needing team or check-in)
  const needsAction = tournaments.some((t) => !t.hasTeam);
  if (needsAction) return "pre-tournament";

  // Check for recent matches (within last 24 hours)
  const now = Date.now();
  const recentMatches = recentActivity.filter((m) => {
    const hoursSince = (now - m.date) / (1000 * 60 * 60);
    return hoursSince >= 0 && hoursSince < 24;
  });
  if (recentMatches.length > 0) return "post-tournament";

  return "idle";
}

async function fetchDashboardData(
  altId: string
): Promise<ActionResult<DashboardData | null>> {
  const params = new URLSearchParams({ altId });
  const res = await fetch(`/api/v1/me/dashboard?${params.toString()}`);
  return res.json() as Promise<ActionResult<DashboardData | null>>;
}

async function fetchActiveMatch(
  altId: string
): Promise<ActionResult<ActiveMatchData>> {
  const params = new URLSearchParams({ altId });
  const res = await fetch(`/api/v1/me/active-match?${params.toString()}`);
  return res.json() as Promise<ActionResult<ActiveMatchData>>;
}

// =============================================================================
// Component
// =============================================================================

export function OverviewClient() {
  const { user } = useAuth();
  const profileId = user?.profile?.id;
  const toastShown = useRef(false);

  // TanStack Query for dashboard data (replaces useSupabaseQuery).
  // staleTime=30_000: dashboard data changes infrequently; don't hammer the API.
  // refetchOnWindowFocus: true (default) covers the visibilitychange pattern —
  // when the user tabs back the query refetches if data is stale.
  const { data: dashboardData } = useApiQuery<DashboardData | null>(
    ["me", "dashboard", profileId],
    () =>
      profileId
        ? fetchDashboardData(String(profileId))
        : Promise.resolve({ success: true, data: null } as ActionResult<null>),
    {
      enabled: !!profileId,
      staleTime: 30_000,
    }
  );

  // TanStack Query for the active match.
  // refetchOnWindowFocus: true handles the visibilitychange refetch
  // (replaces the old realtime subscription on tournament_matches).
  const { data: activeMatch } = useApiQuery<ActiveMatchData>(
    ["me", "active-match", profileId],
    () =>
      profileId
        ? fetchActiveMatch(String(profileId))
        : Promise.resolve({ success: true, data: null } as ActionResult<null>),
    {
      enabled: !!profileId,
      // Active match data should be near-real-time. 0 means always refetch
      // from the server when the window regains focus (visibilitychange).
      staleTime: 0,
      refetchOnWindowFocus: true,
    }
  );

  // Show welcome toast for users with placeholder usernames.
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

  // Transform API data to match expected component formats
  const transformedTournaments =
    dashboardData?.myTournaments.map((t) => ({
      id: t.id,
      name: t.name,
      startDate: t.startDate ? new Date(t.startDate).getTime() : null,
      status: t.status,
      hasTeam: t.hasTeam,
      registrationStatus: t.registrationStatus,
      registrationId: t.registrationId,
      lateCheckInMaxRound: t.lateCheckInMaxRound ?? null,
    })) || [];

  const transformedActivities =
    dashboardData?.recentActivity.map((a) => ({
      id: a.id,
      tournamentName: a.tournamentName,
      opponentName: a.opponentName,
      result: a.result,
      date: a.date,
    })) || [];

  // Determine overview mode
  const mode = getOverviewContext(
    transformedTournaments,
    transformedActivities,
    !!activeMatch
  );

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back,{" "}
            {user?.profile?.displayName ||
              (user?.user_metadata?.full_name as string | undefined) ||
              (user?.user_metadata?.name as string | undefined) ||
              "Trainer"}
          </h1>
          <p className="text-muted-foreground text-sm">
            Here&apos;s your competitive overview
          </p>
        </div>
      </div>

      {/* Active Match - Hero section (only in active-competition mode) */}
      {mode === "active-competition" && activeMatch && (
        <div className="animate-in slide-in-from-top-4 duration-500">
          <ActiveMatchCard match={activeMatch} />
        </div>
      )}

      {/* Stats Overview - Always present */}
      <StatsOverview
        stats={
          dashboardData?.stats || {
            winRate: 0,
            winRateChange: 0,
            currentRating: 0,
            ratingRank: 0,
            activeTournaments: 0,
            totalEnrolled: 0,
            championPoints: 0,
          }
        }
      />

      {/* What's Next? - Smart actions (always present) */}
      <WhatsNext mode={mode} tournaments={transformedTournaments} />

      {/* Main Content Grid - Layout adapts based on mode */}
      {mode === "active-competition" && (
        // Active Competition: Tournaments + Activity sidebar
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-8">
            <UpcomingTournaments myTournaments={transformedTournaments} />
          </div>
          <div className="space-y-6 lg:col-span-4">
            <RecentActivity activities={transformedActivities} />
            <RecentAchievements
              achievements={dashboardData?.achievements || []}
            />
          </div>
        </div>
      )}

      {mode === "pre-tournament" && (
        // Pre-Tournament: Tournaments (prominent) + Activity sidebar
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-8">
            <UpcomingTournaments myTournaments={transformedTournaments} />
          </div>
          <div className="space-y-6 lg:col-span-4">
            <RecentActivity activities={transformedActivities} />
          </div>
        </div>
      )}

      {mode === "post-tournament" && (
        // Post-Tournament: Recent Activity (expanded) + Achievements sidebar
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-8">
            <RecentActivity activities={transformedActivities} />
            {transformedTournaments.length > 0 && (
              <UpcomingTournaments myTournaments={transformedTournaments} />
            )}
          </div>
          <div className="space-y-6 lg:col-span-4">
            <RecentAchievements
              achievements={dashboardData?.achievements || []}
            />
          </div>
        </div>
      )}

      {mode === "idle" && (
        // Idle/Discovery: Empty state guidance
        <div className="space-y-6">
          {transformedTournaments.length === 0 ? (
            <div className="rounded-xl border p-10 text-center">
              <div className="mx-auto max-w-sm space-y-3">
                <div className="bg-primary/10 mx-auto flex size-12 items-center justify-center rounded-xl">
                  <Trophy className="text-primary size-6" />
                </div>
                <h3 className="text-lg font-semibold">Ready to compete?</h3>
                <p className="text-muted-foreground text-sm">
                  Join tournaments, build teams, and compete with trainers
                  around the world. Your journey starts here.
                </p>
              </div>
            </div>
          ) : (
            <UpcomingTournaments myTournaments={transformedTournaments} />
          )}
        </div>
      )}
    </div>
  );
}
