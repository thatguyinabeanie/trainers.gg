"use client";

import { Hash, Mail, Shield, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const EVENT_TYPE_LABELS: Record<string, string> = {
  // Channel event types (from ALL_CHANNEL_EVENT_TYPES)
  tournament_created: "Tournament Created",
  registration_opens: "Registration Opens",
  registration_closing_soon: "Registration Closing",
  tournament_ended: "Tournament Ended",
  match_result_reported: "Match Result",
  round_posted: "Round Posted",
  standings_posted: "Standings Posted",
  check_in_opened: "Check-in Opened",
  // DM event types (from ALL_DM_EVENT_TYPES)
  match_ready: "Match Ready",
  check_in_reminder: "Check-in Reminder",
};

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
  switch (activity.type) {
    case "channel":
      return `Sent ${EVENT_TYPE_LABELS[activity.eventType] ?? activity.eventType.replace(/_/g, " ")} to #${activity.target}`;
    case "dm":
      return `DM'd ${EVENT_TYPE_LABELS[activity.eventType] ?? activity.eventType.replace(/_/g, " ")} to @${activity.target}`;
    case "role_sync":
      return `Synced role ${EVENT_TYPE_LABELS[activity.eventType] ?? activity.eventType.replace(/_/g, " ")} for ${activity.target}`;
    default:
      return `${EVENT_TYPE_LABELS[activity.eventType] ?? activity.eventType.replace(/_/g, " ")} → ${activity.target}`;
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
