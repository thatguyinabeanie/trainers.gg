"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface WinRateTrendProps {
  altId?: number | null;
}

export function WinRateTrend({ altId }: WinRateTrendProps) {
  // TODO: Fetch actual win rate trend data
  // This would come from a new query like getDashboardAnalytics(supabase, userId, altId)

  // Mock data for visualization
  const currentWinRate = 58.5;
  const previousWinRate = 54.2;
  const change = currentWinRate - previousWinRate;
  const isPositive = change > 0;
  const isNeutral = Math.abs(change) < 0.5;

  // Mock trend data points (last 10 tournaments)
  const trendPoints = [45, 50, 52, 48, 55, 58, 60, 57, 59, 58.5];
  const maxRate = Math.max(...trendPoints);
  const minRate = Math.min(...trendPoints);
  const range = maxRate - minRate;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span>Win Rate Trend</span>
          <div className="flex items-center gap-1 text-sm font-normal">
            {isNeutral ? (
              <Minus className="text-muted-foreground size-4" />
            ) : isPositive ? (
              <TrendingUp className="size-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <TrendingDown className="size-4 text-rose-600 dark:text-rose-400" />
            )}
            <span
              className={
                isNeutral
                  ? "text-muted-foreground"
                  : isPositive
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
              }
            >
              {isPositive ? "+" : ""}
              {change.toFixed(1)}%
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Current Win Rate */}
          <div>
            <div className="text-3xl font-bold tabular-nums">
              {currentWinRate.toFixed(1)}%
            </div>
            <p className="text-muted-foreground text-sm">
              Current win rate{altId ? " for selected alt" : " across all alts"}
            </p>
          </div>

          {/* Sparkline visualization */}
          <div className="relative h-16 w-full">
            <svg
              className="h-full w-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              {/* Grid lines */}
              <line
                x1="0"
                y1="50"
                x2="100"
                y2="50"
                stroke="currentColor"
                strokeWidth="0.5"
                className="text-muted-foreground/20"
                strokeDasharray="2,2"
              />

              {/* Trend line */}
              <polyline
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary"
                points={trendPoints
                  .map((point, i) => {
                    const x = (i / (trendPoints.length - 1)) * 100;
                    const y = 100 - ((point - minRate) / range) * 100;
                    return `${x},${y}`;
                  })
                  .join(" ")}
              />

              {/* Area fill */}
              <polygon
                fill="currentColor"
                className="text-primary/10"
                points={`
                  ${trendPoints
                    .map((point, i) => {
                      const x = (i / (trendPoints.length - 1)) * 100;
                      const y = 100 - ((point - minRate) / range) * 100;
                      return `${x},${y}`;
                    })
                    .join(" ")}
                  100,100 0,100
                `}
              />
            </svg>
          </div>

          {/* Stats summary */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold tabular-nums">
                {maxRate.toFixed(1)}%
              </div>
              <p className="text-muted-foreground text-xs">Peak</p>
            </div>
            <div>
              <div className="text-lg font-semibold tabular-nums">
                {(
                  trendPoints.reduce((a, b) => a + b, 0) / trendPoints.length
                ).toFixed(1)}
                %
              </div>
              <p className="text-muted-foreground text-xs">Average</p>
            </div>
            <div>
              <div className="text-lg font-semibold tabular-nums">
                {minRate.toFixed(1)}%
              </div>
              <p className="text-muted-foreground text-xs">Low</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
