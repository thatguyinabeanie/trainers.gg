"use client";

import { useState, useCallback } from "react";
import { useSupabaseQuery } from "@/lib/supabase";
import { getTournamentAuditLog } from "@trainers/supabase";
import type { TypedSupabaseClient, Database } from "@trainers/supabase";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  ScrollText,
  RefreshCw,
  Swords,
  ShieldAlert,
  Gavel,
  Trophy,
  Lock,
  UserMinus,
} from "lucide-react";

type AuditAction = Database["public"]["Enums"]["audit_action"];

interface TournamentAuditLogProps {
  tournament: {
    id: number;
  };
}

const actionLabels: Record<string, string> = {
  "match.score_submitted": "Score Submitted",
  "match.score_agreed": "Score Agreed",
  "match.score_disputed": "Score Disputed",
  "match.result_reported": "Match Result Reported",
  "match.staff_requested": "Judge Called",
  "match.staff_resolved": "Judge Resolved",
  "judge.game_reset": "Judge Game Reset",
  "judge.match_reset": "Judge Match Reset",
  "judge.game_override": "Judge Game Override",
  "judge.match_override": "Judge Match Override",
  "tournament.started": "Tournament Started",
  "tournament.round_created": "Round Created",
  "tournament.round_started": "Round Started",
  "tournament.round_completed": "Round Completed",
  "tournament.phase_advanced": "Phase Advanced",
  "tournament.completed": "Tournament Completed",
  "team.submitted": "Team Submitted",
  "team.locked": "Team Locked",
  "team.unlocked": "Team Unlocked",
  "registration.checked_in": "Player Checked In",
  "registration.dropped": "Player Dropped",
  "registration.late_checkin": "Late Check-In",
};

const actionIcons: Record<string, typeof Swords> = {
  "match.score_submitted": Swords,
  "match.score_agreed": Swords,
  "match.score_disputed": ShieldAlert,
  "match.result_reported": Swords,
  "match.staff_requested": ShieldAlert,
  "match.staff_resolved": Gavel,
  "judge.game_reset": Gavel,
  "judge.match_reset": Gavel,
  "judge.game_override": Gavel,
  "judge.match_override": Gavel,
  "tournament.started": Trophy,
  "tournament.round_created": Trophy,
  "tournament.round_started": Trophy,
  "tournament.round_completed": Trophy,
  "tournament.phase_advanced": Trophy,
  "tournament.completed": Trophy,
  "team.submitted": Lock,
  "team.locked": Lock,
  "team.unlocked": Lock,
  "registration.checked_in": UserMinus,
  "registration.dropped": UserMinus,
  "registration.late_checkin": UserMinus,
};

const actionCategories = [
  { value: "all", label: "All Events" },
  { value: "match", label: "Match Events" },
  { value: "judge", label: "Judge Actions" },
  { value: "tournament", label: "Tournament Events" },
];

export function TournamentAuditLog({ tournament }: TournamentAuditLogProps) {
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [refreshKey, setRefreshKey] = useState(0);

  const actionsForFilter: AuditAction[] | undefined =
    categoryFilter === "all"
      ? undefined
      : categoryFilter === "match"
        ? [
            "match.score_submitted",
            "match.score_agreed",
            "match.score_disputed",
            "match.result_reported",
            "match.staff_requested",
            "match.staff_resolved",
          ]
        : categoryFilter === "judge"
          ? [
              "judge.game_reset",
              "judge.match_reset",
              "judge.game_override",
              "judge.match_override",
            ]
          : [
              "tournament.started",
              "tournament.round_created",
              "tournament.round_started",
              "tournament.round_completed",
              "tournament.phase_advanced",
              "tournament.completed",
            ];

  const queryFn = useCallback(
    (client: TypedSupabaseClient) =>
      getTournamentAuditLog(client, tournament.id, {
        limit: 100,
        actions: actionsForFilter,
      }),
    [tournament.id, actionsForFilter]
  );

  const {
    data: entries,
    isLoading,
    refetch,
  } = useSupabaseQuery(queryFn, [tournament.id, categoryFilter, refreshKey]);

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
    refetch();
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Audit Log</h2>
          <p className="text-muted-foreground">
            Chronological record of tournament events and actions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={categoryFilter}
            onValueChange={(v) => {
              if (v) setCategoryFilter(v);
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              {actionCategories.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Audit Log Feed */}
      <Card>
        <CardHeader>
          <CardTitle>Events</CardTitle>
          <CardDescription>
            {entries?.length ?? 0} events
            {categoryFilter !== "all" ? ` (filtered)` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!entries || entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <ScrollText className="text-muted-foreground mb-4 h-12 w-12 opacity-50" />
              <h3 className="mb-2 text-lg font-semibold">No events yet</h3>
              <p className="text-muted-foreground text-sm">
                Events will appear here as actions are taken in the tournament.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {entries.map((entry) => {
                const IconComponent = actionIcons[entry.action] ?? ScrollText;
                const label = actionLabels[entry.action] ?? entry.action;
                const metadata = entry.metadata as Record<
                  string,
                  unknown
                > | null;

                return (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 border-b py-3 last:border-b-0"
                  >
                    <div className="bg-muted mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                      <IconComponent className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {label}
                        </Badge>
                        {entry.match_id && (
                          <span className="text-muted-foreground text-xs">
                            Match #{entry.match_id}
                          </span>
                        )}
                      </div>
                      {metadata?.description != null && (
                        <p className="text-muted-foreground mt-0.5 text-sm">
                          {String(metadata.description)}
                        </p>
                      )}
                      <p className="text-muted-foreground mt-1 text-xs">
                        {formatTimeAgo(entry.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
