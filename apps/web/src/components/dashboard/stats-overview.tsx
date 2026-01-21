"use client";

import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Trophy, Target, Award } from "lucide-react";
import { type DashboardStats } from "@/lib/types/dashboard";

interface StatsOverviewProps {
  stats: DashboardStats;
}

export function StatsOverview({ stats }: StatsOverviewProps) {
  return (
    <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Overall Win Rate</p>
              <p className="mt-2 text-3xl font-bold">{stats.winRate}%</p>
              <p className="mt-1 flex items-center text-xs text-green-500">
                <TrendingUp className="mr-1 size-3" />+{stats.winRateChange}%
                this month
              </p>
            </div>
            <div className="text-green-500">
              <TrendingUp className="size-8" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Current Rating</p>
              <p className="mt-2 text-3xl font-bold">
                {stats.currentRating.toLocaleString()}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                Rank {stats.ratingRank.toLocaleString()}
              </p>
            </div>
            <div className="text-blue-500">
              <Target className="size-8" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Active Tournaments</p>
              <p className="mt-2 text-3xl font-bold">{stats.activeTournaments}</p>
              <p className="text-muted-foreground mt-1 text-xs">
                {stats.totalEnrolled} total enrolled
              </p>
            </div>
            <div className="text-purple-500">
              <Trophy className="size-8" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Champion Points</p>
              <p className="mt-2 text-3xl font-bold">{stats.championPoints}</p>
              <p className="text-muted-foreground mt-1 text-xs">
                Overall Ranking
              </p>
            </div>
            <div className="text-amber-500">
              <Award className="size-8" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
