"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { useSupabaseQuery } from "@/lib/supabase";
import { getMyDashboardData, getActiveMatch } from "@trainers/supabase";
import { toast } from "sonner";
import {
  StatsOverview,
  ActiveMatchCard,
  UpcomingTournaments,
  RecentActivity,
  RecentAchievements,
  WhatsNext,
} from "@/components/dashboard";

type OverviewMode =
  | "active-competition"
  | "pre-tournament"
  | "post-tournament"
  | "idle";

/**
 * Determine the current overview mode based on dashboard data
 */
function getOverviewContext(
  tournaments: Array<{ startDate: number | null; hasTeam: boolean }>,
  recentActivity: Array<{ date: number }>,
  hasActiveMatch: boolean
): OverviewMode {
  if (hasActiveMatch) return "active-competition";

  // Check for urgent actions (tournaments needing team or check-in)
  const now = Date.now();
  const needsAction = tournaments.some((t) => !t.hasTeam);

  if (needsAction) return "pre-tournament";

  // Check for recent matches (within last 24 hours)
  const recentMatches = recentActivity.filter((m) => {
    const hoursSince = (now - m.date) / (1000 * 60 * 60);
    return hoursSince >= 0 && hoursSince < 24;
  });

  if (recentMatches.length > 0) return "post-tournament";

  return "idle";
}

export function OverviewClient() {
  const { user } = useAuth();
  const profileId = user?.profile?.id;
  const toastShown = useRef(false);

  // Show welcome toast for users with placeholder usernames
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

  const dashboardDataQueryFn = (
    supabase: Parameters<typeof getMyDashboardData>[0]
  ) =>
    profileId
      ? getMyDashboardData(supabase, profileId)
      : Promise.resolve({
          myTournaments: [],
          recentActivity: [],
          achievements: [],
          stats: {
            winRate: 0,
            winRateChange: 0,
            currentRating: 0,
            ratingRank: 0,
            activeTournaments: 0,
            totalEnrolled: 0,
            championPoints: 0,
          },
        });

  const { data: dashboardData } = useSupabaseQuery(dashboardDataQueryFn, [
    profileId,
  ]);

  // Fetch active match
  const activeMatchQueryFn = (
    supabase: Parameters<typeof getActiveMatch>[0]
  ) =>
    profileId ? getActiveMatch(supabase, profileId) : Promise.resolve(null);

  const { data: activeMatch } = useSupabaseQuery(activeMatchQueryFn, [
    profileId,
  ]);

  // Transform Supabase data to match expected component formats
  const transformedTournaments =
    dashboardData?.myTournaments.map((t) => ({
      id: t.id,
      name: t.name,
      startDate: t.startDate ? new Date(t.startDate).getTime() : null,
      status: t.status,
      hasTeam: t.hasTeam,
      registrationStatus: t.registrationStatus,
      registrationId: t.registrationId,
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
      {/* Header with battle-ready styling */}
      <div className="relative">
        <div className="from-primary/5 absolute inset-0 rounded-lg bg-gradient-to-r via-transparent to-transparent" />
        <div className="relative px-6 py-8">
          <h2 className="text-3xl font-bold tracking-tight">
            Welcome back,{" "}
            <span className="text-primary">
              {user?.profile?.displayName ||
                (user?.user_metadata?.full_name as string | undefined) ||
                (user?.user_metadata?.name as string | undefined) ||
                "Trainer"}
            </span>
          </h2>
          <p className="text-muted-foreground mt-1 font-medium">
            Battle Status • Competitive Overview
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
            <div className="border-muted-foreground/25 bg-muted/20 rounded-lg border-2 border-dashed p-12 text-center">
              <div className="mx-auto max-w-md space-y-4">
                <h3 className="text-xl font-semibold">Ready to compete?</h3>
                <p className="text-muted-foreground">
                  Join tournaments, build teams, and compete with trainers
                  around the world. Your competitive journey starts here.
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
