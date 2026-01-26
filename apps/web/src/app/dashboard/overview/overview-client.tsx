"use client";

import { useCallback } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { useSupabaseQuery } from "@/lib/supabase";
import { getMyDashboardData } from "@trainers/supabase";
import {
  QuickActions,
  UpcomingTournaments,
  RecentActivity,
  StatsOverview,
  RecentAchievements,
} from "@/components/dashboard";

export function OverviewClient() {
  const { user } = useAuth();
  const profileId = user?.profile?.id;

  const dashboardDataQueryFn = useCallback(
    (supabase: Parameters<typeof getMyDashboardData>[0]) =>
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
          }),
    [profileId]
  );

  const { data: dashboardData } = useSupabaseQuery(dashboardDataQueryFn, [
    profileId,
  ]);

  // Transform Supabase data to match expected component formats
  const transformedTournaments =
    dashboardData?.myTournaments.map((t) => ({
      id: t.id,
      name: t.name,
      startDate: t.startDate ? new Date(t.startDate).getTime() : null,
      status: t.status,
    })) || [];

  const transformedActivities =
    dashboardData?.recentActivity.map((a) => ({
      id: a.id,
      tournamentName: a.tournamentName,
      opponentName: a.opponentName,
      result: a.result,
      date: a.date,
    })) || [];

  return (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-bold">
          Welcome back,{" "}
          {user?.profile?.displayName ||
            (user?.user_metadata?.full_name as string | undefined) ||
            (user?.user_metadata?.name as string | undefined) ||
            "Trainer"}
          !
        </h2>
        <p className="text-muted-foreground text-sm">
          Here&apos;s your competitive overview across all profiles
        </p>
      </div>

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

      <QuickActions />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <UpcomingTournaments myTournaments={transformedTournaments} />
        </div>
        <div>
          <RecentActivity activities={transformedActivities} />
          <RecentAchievements
            achievements={dashboardData?.achievements || []}
          />
        </div>
      </div>
    </>
  );
}
