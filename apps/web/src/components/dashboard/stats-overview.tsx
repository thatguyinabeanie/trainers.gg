"use client";

import { Card, CardContent } from "@/components/ui/card";
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
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Win Rate - Featured stat */}
      <Card className="from-background via-background to-primary/5 group relative overflow-hidden bg-gradient-to-br transition-all hover:scale-[1.02] hover:shadow-lg">
        <div className="absolute right-0 top-0 h-32 w-32 -translate-y-8 translate-x-8 opacity-10">
          <div className="bg-primary h-full w-full rotate-45" />
        </div>
        <CardContent className="relative p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Zap className="text-primary size-4" />
                <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                  Win Rate
                </p>
              </div>
              <p className="mt-3 font-mono text-4xl font-bold tabular-nums">
                {stats.winRate.toFixed(1)}
                <span className="text-muted-foreground text-2xl">%</span>
              </p>
              <div className="mt-2 flex items-center gap-1">
                {isWinRateUp ? (
                  <TrendingUp className="size-3 text-emerald-500" />
                ) : (
                  <TrendingDown className="size-3 text-red-500" />
                )}
                <p
                  className={`font-mono text-xs font-medium tabular-nums ${
                    isWinRateUp ? "text-emerald-500" : "text-red-500"
                  }`}
                >
                  {isWinRateUp ? "+" : ""}
                  {stats.winRateChange.toFixed(1)}% this month
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rating */}
      <Card className="group relative overflow-hidden transition-all hover:scale-[1.02] hover:shadow-lg">
        <div className="absolute right-0 top-0 h-full w-1 bg-gradient-to-b from-blue-500/50 to-transparent transition-all group-hover:w-2" />
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Target className="size-4 text-blue-500" />
                <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                  Rating
                </p>
              </div>
              {stats.currentRating > 0 ? (
                <>
                  <p className="mt-3 font-mono text-4xl font-bold tabular-nums">
                    {stats.currentRating.toLocaleString()}
                  </p>
                  <p className="text-muted-foreground mt-2 text-xs">
                    Global Rank{" "}
                    <span className="text-foreground font-mono font-semibold">
                      #{stats.ratingRank.toLocaleString()}
                    </span>
                  </p>
                </>
              ) : (
                <>
                  <p className="text-muted-foreground mt-3 font-mono text-4xl font-bold">
                    —
                  </p>
                  <p className="text-muted-foreground mt-2 text-xs">
                    Complete a tournament to earn a rating
                  </p>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Tournaments */}
      <Card className="group relative overflow-hidden transition-all hover:scale-[1.02] hover:shadow-lg">
        <div className="absolute right-0 top-0 h-full w-1 bg-gradient-to-b from-purple-500/50 to-transparent transition-all group-hover:w-2" />
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Trophy className="size-4 text-purple-500" />
                <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                  Tournaments
                </p>
              </div>
              <p className="mt-3 font-mono text-4xl font-bold tabular-nums">
                {stats.activeTournaments}
              </p>
              <p className="text-muted-foreground mt-2 text-xs">
                <span className="text-foreground font-mono font-semibold">
                  {stats.totalEnrolled}
                </span>{" "}
                total enrolled
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Champion Points */}
      <Card className="from-background via-background group relative overflow-hidden bg-gradient-to-br to-amber-500/5 transition-all hover:scale-[1.02] hover:shadow-lg">
        <div className="absolute -right-4 -top-4 size-24 opacity-10">
          <Award className="size-full text-amber-500" />
        </div>
        <CardContent className="relative p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Award className="size-4 text-amber-500" />
                <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                  Champion Points
                </p>
              </div>
              <p className="mt-3 font-mono text-4xl font-bold tabular-nums text-amber-500">
                {stats.championPoints.toLocaleString()}
              </p>
              <p className="text-muted-foreground mt-2 text-xs">
                Season standing
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
