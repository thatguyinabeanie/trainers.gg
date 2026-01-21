"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { useQuery } from "convex/react";
import { api } from "@/lib/convex/api";
import {
  QuickActions,
  UpcomingTournaments,
  RecentActivity,
  StatsOverview,
  OrganizerAccess,
  RecentAchievements,
} from "@/components/dashboard";

export function OverviewClient() {
  const { user } = useAuth();
  const myOrganizations = useQuery(
    api.organizations.queries.getMyOrganizations
  );
  const dashboardData = useQuery(
    api.tournaments.queries.getMyDashboardData,
    {}
  );

  return (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-bold">
          Welcome back, {user?.name || user?.profile?.displayName || "Trainer"}!
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
          <UpcomingTournaments
            myTournaments={dashboardData?.myTournaments || []}
          />
        </div>
        <div>
          <OrganizerAccess
            organizations={
              myOrganizations?.map((org: (typeof myOrganizations)[number]) => ({
                _id: org._id,
                name: org.name,
                role: org.isOwner ? "Owner" : "Staff",
              })) || []
            }
          />
          <RecentActivity activities={dashboardData?.recentActivity || []} />
          <RecentAchievements
            achievements={dashboardData?.achievements || []}
          />
        </div>
      </div>
    </>
  );
}
