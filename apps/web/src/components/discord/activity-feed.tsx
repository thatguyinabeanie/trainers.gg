"use client";

import { Hash, Mail, Shield, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getEventLabel } from "@/components/discord/channel-mapping-shared";

interface Activity {
  id: number;
  type: string;
  eventType: string;
  target: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

interface ActivityFeedProps {
  activities: Activity[];
  isLoading?: boolean;
}

function getActivityIcon(type: string) {
  switch (type) {
    case "channel":
      return Hash;
    case "dm":
      return Mail;
    case "role_sync":
      return Shield;
    default:
      return Hash;
  }
}

function getDescription(activity: Activity): string {
  const label = getEventLabel(activity.eventType);
  const target = activity.target;
  switch (activity.type) {
    case "channel":
      return `Sent ${label} to ${target.startsWith("#") ? target : `#${target}`}`;
    case "dm":
      return `DM'd ${label} to ${target.startsWith("@") ? target : `@${target}`}`;
    case "role_sync":
      return `Synced ${label} for ${target}`;
    default:
      return `${label} → ${target}`;
  }
}

export function ActivityFeed({ activities, isLoading }: ActivityFeedProps) {
  const displayedActivities = activities.slice(0, 20);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="text-muted-foreground size-5 animate-spin" />
          </div>
        ) : activities.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            No recent activity
          </p>
        ) : (
          <div className="space-y-3">
            {displayedActivities.map((activity) => {
              const Icon = getActivityIcon(activity.type);
              return (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 text-sm"
                >
                  <Icon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                  <div className="flex-1 space-y-0.5">
                    <p>{getDescription(activity)}</p>
                    <p className="text-muted-foreground text-xs">
                      {formatDistanceToNow(new Date(activity.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
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
