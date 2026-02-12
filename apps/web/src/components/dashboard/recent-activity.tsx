"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Clock, Swords, ChevronDown } from "lucide-react";

interface RecentActivityProps {
  activities: Array<{
    id: number;
    tournamentName: string;
    opponentName: string;
    result: string;
    date: number;
  }>;
}

export function RecentActivity({ activities }: RecentActivityProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="text-muted-foreground size-5" />
          Recent Activity
        </CardTitle>
        <CardDescription>Latest match results</CardDescription>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="bg-muted/30 flex flex-col items-center justify-center rounded-lg py-12">
            <Swords className="text-muted-foreground size-8" />
            <p className="text-muted-foreground mt-2 text-sm">
              No recent battles
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {activities.map((activity) => {
              const isWin = activity.result === "won";
              const isExpanded = expandedId === activity.id;

              return (
                <div
                  key={activity.id}
                  className="group bg-card relative cursor-pointer overflow-hidden rounded-lg border transition-all hover:shadow-md"
                  onClick={() => setExpandedId(isExpanded ? null : activity.id)}
                >
                  {/* Result indicator line */}
                  <div
                    className={`absolute top-0 left-0 h-full w-1 ${
                      isWin ? "bg-emerald-500" : "bg-red-500"
                    }`}
                  />

                  <div className="p-3">
                    <div className="flex items-center justify-between gap-3 pl-2">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium">
                            {activity.tournamentName}
                          </p>
                        </div>
                        <p className="text-muted-foreground text-xs">
                          vs{" "}
                          <span className="font-medium">
                            {activity.opponentName}
                          </span>
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <div className="flex flex-col items-end gap-1">
                          <div
                            className={`rounded px-2 py-0.5 font-mono text-xs font-bold uppercase ${
                              isWin
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-red-500/10 text-red-600 dark:text-red-400"
                            }`}
                          >
                            {isWin ? "W" : "L"}
                          </div>
                          <p className="text-muted-foreground text-xs">
                            {formatDate(activity.date)}
                          </p>
                        </div>
                        <ChevronDown
                          className={`text-muted-foreground size-4 transition-transform ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="text-muted-foreground mt-3 space-y-2 border-t pt-3 pl-2 text-xs">
                        <p>
                          Match ID:{" "}
                          <span className="text-foreground font-mono">
                            {activity.id}
                          </span>
                        </p>
                        <p className="text-xs italic">
                          Click match row to view full details (feature coming
                          soon)
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
