"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSupabase, useSupabaseQuery } from "@/lib/supabase";
import { getPhaseRoundsWithStats, getRoundMatches } from "@trainers/supabase";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge, type Status } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Gavel, Users } from "lucide-react";
import {
  RealtimeStatusBadge,
  type RealtimeStatus,
} from "./realtime-status-badge";

interface TournamentPairingsJudgeProps {
  tournament: {
    id: number;
    currentPhaseId?: number | null;
  };
}

export function TournamentPairingsJudge({
  tournament,
}: TournamentPairingsJudgeProps) {
  const supabase = useSupabase();
  const [activeTab, setActiveTab] = useState<"pairings" | "judge">("pairings");
  const [refreshKey, setRefreshKey] = useState(0);
  const [realtimeStatus, setRealtimeStatus] =
    useState<RealtimeStatus>("connected");
  const refreshTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Debounced refresh trigger
  const triggerRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    refreshTimeoutRef.current = setTimeout(() => {
      setRefreshKey((k) => k + 1);
    }, 500);
  }, []);

  // Fetch rounds to determine active round
  const { data: rounds } = useSupabaseQuery(
    (supabase) =>
      tournament.currentPhaseId
        ? getPhaseRoundsWithStats(supabase, tournament.currentPhaseId)
        : Promise.resolve([]),
    [tournament.currentPhaseId, refreshKey]
  );

  const activeRound = rounds?.find((r) => r.status === "active");
  const activeRoundId = activeRound?.id ?? null;

  // Fetch matches for active round
  const { data: matches = [] } = useSupabaseQuery(
    (supabase) =>
      activeRoundId
        ? getRoundMatches(supabase, activeRoundId)
        : Promise.resolve([]),
    [activeRoundId, refreshKey]
  );

  // Real-time subscription to tournament_matches
  useEffect(() => {
    if (!activeRoundId) return;

    const channel = supabase
      .channel(`pairings-${activeRoundId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tournament_matches",
          filter: `round_id=eq.${activeRoundId}`,
        },
        () => {
          triggerRefresh();
        }
      )
      .subscribe((status, err) => {
        if (status === "SUBSCRIBED") {
          setRealtimeStatus("connected");
        } else if (status === "CLOSED") {
          setRealtimeStatus("disconnected");
        } else if (err) {
          console.error("[Realtime] pairings error:", err);
          setRealtimeStatus("error");
        }
      });

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      channel.unsubscribe();
    };
  }, [supabase, activeRoundId, triggerRefresh]);

  // Filter matches for judge queue (staff_requested = true)
  const judgeQueue = matches?.filter((m) => m.staff_requested === true) ?? [];

  if (!activeRound) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pairings</CardTitle>
          <CardDescription>
            No active round. Pairings will appear when a round starts.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            Round {activeRound.round_number} Pairings
          </h2>
          <p className="text-muted-foreground">
            Manage pairings and judge requests for this round
          </p>
        </div>
        <RealtimeStatusBadge status={realtimeStatus} />
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as typeof activeTab)}
      >
        <TabsList>
          <TabsTrigger value="pairings">
            <Users className="mr-2 h-4 w-4" />
            Pairings
          </TabsTrigger>
          <TabsTrigger value="judge">
            <Gavel className="mr-2 h-4 w-4" />
            Judge Queue
            {judgeQueue.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {judgeQueue.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pairings">
          <Card>
            <CardHeader>
              <CardTitle>All Matches</CardTitle>
              <CardDescription>
                {matches?.length || 0} matches in Round{" "}
                {activeRound.round_number}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!matches || matches.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center">
                  No matches found for this round.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Table</TableHead>
                      <TableHead>Player 1</TableHead>
                      <TableHead>Player 2</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matches.map((match) => (
                      <TableRow key={match.id}>
                        <TableCell>{match.table_number ?? "—"}</TableCell>
                        <TableCell>
                          {(match.player1 as { display_name?: string })
                            ?.display_name ?? "BYE"}
                        </TableCell>
                        <TableCell>
                          {(match.player2 as { display_name?: string })
                            ?.display_name ?? "BYE"}
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            status={(match.status ?? "pending") as Status}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="judge">
          <Card>
            <CardHeader>
              <CardTitle>Judge Queue</CardTitle>
              <CardDescription>
                Matches requesting staff assistance
              </CardDescription>
            </CardHeader>
            <CardContent>
              {judgeQueue.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center">
                  No pending judge requests.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Table</TableHead>
                      <TableHead>Player 1</TableHead>
                      <TableHead>Player 2</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {judgeQueue.map((match) => (
                      <TableRow key={match.id}>
                        <TableCell>{match.table_number ?? "—"}</TableCell>
                        <TableCell>
                          {(match.player1 as { display_name?: string })
                            ?.display_name ?? "BYE"}
                        </TableCell>
                        <TableCell>
                          {(match.player2 as { display_name?: string })
                            ?.display_name ?? "BYE"}
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            status={(match.status ?? "pending") as Status}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
