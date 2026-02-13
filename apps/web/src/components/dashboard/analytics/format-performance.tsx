"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface FormatPerformanceProps {
  altId?: number | null;
}

interface FormatStats {
  format: string;
  wins: number;
  losses: number;
  winRate: number;
  totalMatches: number;
}

export function FormatPerformance({ altId: _altId }: FormatPerformanceProps) {
  // TODO: Fetch actual format performance data from backend
  // This would come from getDashboardAnalytics(supabase, userId, altId)

  // Mock data
  const formatStats: FormatStats[] = [
    {
      format: "VGC",
      wins: 28,
      losses: 15,
      totalMatches: 43,
      winRate: 65.1,
    },
    {
      format: "Doubles",
      wins: 15,
      losses: 12,
      totalMatches: 27,
      winRate: 55.6,
    },
    {
      format: "Singles",
      wins: 8,
      losses: 7,
      totalMatches: 15,
      winRate: 53.3,
    },
  ];

  const getWinRateColor = (winRate: number) => {
    if (winRate >= 60)
      return "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10";
    if (winRate >= 50) return "text-blue-600 dark:text-blue-400 bg-blue-500/10";
    return "text-rose-600 dark:text-rose-400 bg-rose-500/10";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Performance by Format</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {formatStats.map((stat) => (
            <div
              key={stat.format}
              className="group bg-card hover:bg-muted/50 rounded-lg border p-4 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{stat.format}</h3>
                    <Badge
                      variant="secondary"
                      className={`tabular-nums ${getWinRateColor(stat.winRate)}`}
                    >
                      {stat.winRate.toFixed(1)}%
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {stat.wins}W - {stat.losses}L ({stat.totalMatches} matches)
                  </p>
                </div>

                {/* Win rate bar */}
                <div className="ml-4 w-32">
                  <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                    <div
                      className={`h-full rounded-full transition-all ${
                        stat.winRate >= 60
                          ? "bg-emerald-500"
                          : stat.winRate >= 50
                            ? "bg-blue-500"
                            : "bg-rose-500"
                      }`}
                      style={{ width: `${stat.winRate}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}

          {formatStats.length === 0 && (
            <div className="py-8 text-center">
              <p className="text-muted-foreground text-sm">
                No format data available yet
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                Play some matches to see your format breakdown
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
