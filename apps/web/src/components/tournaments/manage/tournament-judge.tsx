"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { formatTimeAgo, getPlayerName, type PlayerRef } from "@trainers/utils";
import { useSupabaseQuery } from "@/lib/supabase";
import { getTournamentMatchesForStaff } from "@trainers/supabase";
import type { TypedSupabaseClient } from "@trainers/supabase";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge, type Status } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  ShieldAlert,
  Swords,
  ExternalLink,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TournamentJudgeProps {
  tournament: {
    id: number;
    slug: string;
    status: string;
  };
  tournamentSlug: string;
}

type MatchStatusFilter = "all" | "active" | "pending" | "completed";

export function TournamentJudge({
  tournament,
  tournamentSlug,
}: TournamentJudgeProps) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<MatchStatusFilter>("active");
  const [showOnlyJudgeCalls, setShowOnlyJudgeCalls] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch matches for staff view
  const matchesQueryFn = useCallback(
    (client: TypedSupabaseClient) =>
      getTournamentMatchesForStaff(client, tournament.id, {
        status:
          statusFilter === "all"
            ? undefined
            : (statusFilter as "active" | "pending" | "completed"),
        staffRequested: showOnlyJudgeCalls ? true : undefined,
      }),
    [tournament.id, statusFilter, showOnlyJudgeCalls]
  );

  const {
    data: matches,
    isLoading,
    refetch,
  } = useSupabaseQuery(matchesQueryFn, [
    tournament.id,
    statusFilter,
    showOnlyJudgeCalls,
    refreshKey,
  ]);

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
    refetch();
  };

  const judgeCallCount = matches?.filter((m) => m.staff_requested).length ?? 0;

  const navigateToMatch = (matchId: number) => {
    router.push(`/tournaments/${tournamentSlug}/matches/${matchId}`);
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
          <h2 className="text-2xl font-bold">Judge & Match Management</h2>
          <p className="text-muted-foreground">
            Monitor active matches and respond to judge calls
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as MatchStatusFilter)}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={showOnlyJudgeCalls ? "default" : "outline"}
            size="sm"
            onClick={() => setShowOnlyJudgeCalls(!showOnlyJudgeCalls)}
            className="gap-2"
          >
            <ShieldAlert className="h-4 w-4" />
            Judge Calls
            {judgeCallCount > 0 && !showOnlyJudgeCalls && (
              <Badge
                variant="destructive"
                className="ml-1 h-5 min-w-5 px-1 text-[10px]"
              >
                {judgeCallCount}
              </Badge>
            )}
          </Button>
          <Button variant="outline" size="icon" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Judge Call Queue — only show when there are active calls */}
      {judgeCallCount > 0 && !showOnlyJudgeCalls && (
        <Card className="border-red-200 dark:border-red-900/50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-red-500" />
              <CardTitle className="text-lg">
                Judge Calls ({judgeCallCount})
              </CardTitle>
            </div>
            <CardDescription>
              Matches requesting staff assistance, ordered by request time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {matches
                ?.filter((m) => m.staff_requested)
                .map((match) => {
                  return (
                    <div
                      key={match.id}
                      className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/50 dark:bg-red-950/20"
                    >
                      <div className="flex items-center gap-3">
                        <ShieldAlert className="h-4 w-4 text-red-500" />
                        <div>
                          <div className="text-sm font-medium">
                            {getPlayerName(match.player1 as PlayerRef)} vs{" "}
                            {getPlayerName(match.player2 as PlayerRef)}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            Round {match.roundInfo?.round_number ?? "?"} · Table{" "}
                            {match.table_number ?? "-"}
                            {match.staff_requested_at && (
                              <>
                                {" "}
                                · Requested{" "}
                                {formatTimeAgo(match.staff_requested_at)}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => navigateToMatch(match.id)}
                      >
                        <Swords className="mr-2 h-4 w-4" />
                        Respond
                      </Button>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Matches Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {showOnlyJudgeCalls ? "Judge Call Queue" : "All Matches"}
          </CardTitle>
          <CardDescription>
            {showOnlyJudgeCalls
              ? "Matches with active judge calls"
              : `${matches?.length ?? 0} matches${statusFilter !== "all" ? ` (${statusFilter})` : ""}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!matches || matches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              {showOnlyJudgeCalls ? (
                <>
                  <ShieldAlert className="text-muted-foreground mb-4 h-12 w-12 opacity-50" />
                  <h3 className="mb-2 text-lg font-semibold">No judge calls</h3>
                  <p className="text-muted-foreground text-sm">
                    No matches are currently requesting judge assistance.
                  </p>
                </>
              ) : (
                <>
                  <Swords className="text-muted-foreground mb-4 h-12 w-12 opacity-50" />
                  <h3 className="mb-2 text-lg font-semibold">No matches</h3>
                  <p className="text-muted-foreground text-sm">
                    No matches found with the selected filters.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Round</TableHead>
                    <TableHead className="w-16">Table</TableHead>
                    <TableHead>Player 1</TableHead>
                    <TableHead>Player 2</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                    <TableHead className="w-24">Judge</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matches.map((match) => {
                    const isBye = !match.alt2_id;

                    return (
                      <TableRow
                        key={match.id}
                        className={cn(
                          match.staff_requested &&
                            "bg-red-50/50 dark:bg-red-950/10"
                        )}
                      >
                        <TableCell className="text-muted-foreground text-sm">
                          R{match.roundInfo?.round_number ?? "?"}
                        </TableCell>
                        <TableCell className="font-medium">
                          {isBye ? "BYE" : (match.table_number ?? "-")}
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">
                            {getPlayerName(match.player1 as PlayerRef)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {isBye ? (
                            <span className="text-muted-foreground italic">
                              BYE
                            </span>
                          ) : (
                            <span className="font-medium">
                              {getPlayerName(match.player2 as PlayerRef)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            status={(match.status ?? "pending") as Status}
                          />
                        </TableCell>
                        <TableCell>
                          {match.staff_requested ? (
                            <Badge
                              variant="destructive"
                              className="gap-1 text-xs"
                            >
                              <AlertCircle className="h-3 w-3" />
                              Called
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              —
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigateToMatch(match.id)}
                            className="h-8 gap-1 px-2"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">View</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
