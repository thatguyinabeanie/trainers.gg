"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { type DashboardActivity } from "@/lib/types/dashboard";

interface RecentActivityProps {
  activities: DashboardActivity[];
}

export function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your latest matches and results</CardDescription>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground text-sm">No recent activity</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((activity) => (
                <div
                  key={activity._id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {activity.tournamentName}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      vs {activity.opponentName}
                    </p>
                  </div>
                  <Badge
                    variant={activity.result === "won" ? "default" : "secondary"}
                    className={
                      activity.result === "won"
                        ? "bg-green-500 hover:bg-green-600"
                        : ""
                    }
                  >
                    {activity.result === "won" ? "Won" : "Lost"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
