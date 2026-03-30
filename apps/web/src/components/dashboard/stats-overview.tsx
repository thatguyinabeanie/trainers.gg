"use client";

import { cn } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Trophy,
  Target,
  Award,
  Zap,
} from "lucide-react";

interface StatsOverviewProps {
  stats: {
    winRate: number;
    winRateChange: number;
    currentRating: number;
    ratingRank: number;
    activeTournaments: number;
    totalEnrolled: number;
    championPoints: number;
  };
}

export function StatsOverview({ stats }: StatsOverviewProps) {
  const isWinRateUp = stats.winRateChange >= 0;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {/* Win Rate */}
      <div className="bg-card rounded-xl p-5 shadow-sm transition-shadow hover:shadow-md">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 flex size-7 items-center justify-center rounded-lg">
            <Zap className="text-primary size-3.5" />
          </div>
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            Win Rate
          </p>
        </div>
        <p className="mt-3 font-mono text-3xl font-bold tabular-nums">
          {stats.winRate.toFixed(1)}
          <span className="text-muted-foreground text-xl">%</span>
        </p>
        <div className="mt-1.5 flex items-center gap-1">
          {isWinRateUp ? (
            <TrendingUp className="size-3 text-emerald-500" />
          ) : (
            <TrendingDown className="size-3 text-red-500" />
          )}
          <p
            className={cn(
              "font-mono text-xs font-medium tabular-nums",
              isWinRateUp ? "text-emerald-500" : "text-red-500"
            )}
          >
            {isWinRateUp ? "+" : ""}
            {stats.winRateChange.toFixed(1)}% this month
          </p>
        </div>
      </div>

      {/* Rating */}
      <div className="bg-card rounded-xl p-5 shadow-sm transition-shadow hover:shadow-md">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-blue-500/10">
            <Target className="size-3.5 text-blue-500" />
          </div>
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            Rating
          </p>
        </div>
        {stats.currentRating > 0 ? (
          <>
            <p className="mt-3 font-mono text-3xl font-bold tabular-nums">
              {stats.currentRating.toLocaleString()}
            </p>
            <p className="text-muted-foreground mt-1.5 text-xs">
              Global Rank{" "}
              <span className="text-foreground font-mono font-semibold">
                #{stats.ratingRank.toLocaleString()}
              </span>
            </p>
          </>
        ) : (
          <>
            <p className="text-muted-foreground/50 mt-3 font-mono text-3xl font-bold">
              —
            </p>
            <p className="text-muted-foreground mt-1.5 text-xs">
              Play a rated tournament to get started
            </p>
          </>
        )}
      </div>

      {/* Active Tournaments */}
      <div className="bg-card rounded-xl p-5 shadow-sm transition-shadow hover:shadow-md">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-purple-500/10">
            <Trophy className="size-3.5 text-purple-500" />
          </div>
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            Tournaments
          </p>
        </div>
        <p className="mt-3 font-mono text-3xl font-bold tabular-nums">
          {stats.activeTournaments}
        </p>
        <p className="text-muted-foreground mt-1.5 text-xs">
          <span className="text-foreground font-mono font-semibold">
            {stats.totalEnrolled}
          </span>{" "}
          total enrolled
        </p>
      </div>

      {/* Champion Points */}
      <div className="bg-card rounded-xl p-5 shadow-sm transition-shadow hover:shadow-md">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10">
            <Award className="size-3.5 text-amber-500" />
          </div>
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            Champion Pts
          </p>
        </div>
        <p className="mt-3 font-mono text-3xl font-bold tabular-nums text-amber-500">
          {stats.championPoints.toLocaleString()}
        </p>
        <p className="text-muted-foreground mt-1.5 text-xs">Season standing</p>
      </div>
    </div>
  );
}
