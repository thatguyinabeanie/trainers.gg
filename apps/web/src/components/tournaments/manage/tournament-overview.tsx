"use client";

import { useState, useTransition, useEffect, useCallback, useRef } from "react";
import { useSupabase, useSupabaseQuery } from "@/lib/supabase";
import {
  getTournamentPhases,
  getPhaseRoundsWithStats,
} from "@trainers/supabase";
import {
  prepareRound,
  confirmAndStartRound,
  cancelPreparedRound,
  completeRound,
} from "@/actions/tournaments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Play, AlertCircle, Loader2, CheckCircle, X } from "lucide-react";
import { toast } from "sonner";
import {
  RealtimeStatusBadge,
  type RealtimeStatus,
} from "./realtime-status-badge";

// -- Types --

interface TournamentOverviewProps {
  tournament: {
    id: number;
    name: string;
    status: string;
    currentPhaseId?: number | null;
    registrations?: Array<unknown>;
    maxParticipants?: number;
    startDate?: number;
    endDate?: number;
    tournamentFormat: string;
    format: string;
    currentRound?: number;
    roundTimeMinutes?: number;
    swissRounds?: number;
    topCutSize?: number;
  };
}

type RoundState =
  | "idle" // No rounds yet, or last round completed — ready to start next
  | "generating" // Generating pairings (spinner)
  | "preview" // Pairings generated, TO reviews before confirming
  | "pending_resume" // Round was prepared but start failed — offer to resume or cancel
  | "starting" // Confirming & starting round (spinner)
  | "active" // Round in progress
  | "completing" // Completing round (spinner)
  | "completed"; // Round just completed, ready for next

interface PreviewData {
  roundId: number;
  roundNumber: number;
  matchesCreated: number;
  byePlayer: string | null;
  matches: Array<{
    tableNumber: number | null;
    player1Name: string;
    player2Name: string | null;
  }>;
}

// -- Component --

export function TournamentOverview({ tournament }: TournamentOverviewProps) {
  const supabase = useSupabase();
  const [roundState, setRoundState] = useState<RoundState>("idle");
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [isPending, startTransition] = useTransition();
  const [refreshKey, setRefreshKey] = useState(0);
  const [realtimeStatus, setRealtimeStatus] =
    useState<RealtimeStatus>("connected");
  const refreshTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const isActive = tournament.status === "active";

  // Debounced refresh trigger (500ms delay to batch bulk operations)
  const triggerRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    refreshTimeoutRef.current = setTimeout(() => {
      setRefreshKey((k) => k + 1);
    }, 500);
  }, []);

  // -- Data Fetching --

  // Fetch phases
  const phasesQueryFn = useCallback(
    (supabase: Parameters<typeof getTournamentPhases>[0]) =>
      getTournamentPhases(supabase, tournament.id),
    [tournament.id]
  );

  const { data: phases } = useSupabaseQuery(phasesQueryFn, [
    tournament.id,
    "overview-phases",
  ]);

  // Determine active phase ID
  const activePhaseId =
    tournament.currentPhaseId ??
    (phases && phases.length > 0 ? phases[0]?.id : null) ??
    null;

  // Fetch rounds for active phase
  const roundsQueryFn = useCallback(
    (supabase: Parameters<typeof getPhaseRoundsWithStats>[0]) =>
      activePhaseId
        ? getPhaseRoundsWithStats(supabase, activePhaseId)
        : Promise.resolve([]),
    [activePhaseId]
  );

  const {
    data: rounds,
    isLoading: roundsLoading,
    refetch: refetchRounds,
  } = useSupabaseQuery(roundsQueryFn, [
    activePhaseId,
    "overview-rounds",
    refreshKey,
  ]);

  // Derive current round state from data
  const lastRound =
    rounds && rounds.length > 0 ? rounds[rounds.length - 1] : null;
  const activeRound = rounds?.find((r) => r.status === "active") ?? null;
  const currentDisplayRound = activeRound ?? lastRound;

  // Determine the "next" round number
  const nextRoundNumber = (lastRound?.round_number ?? 0) + 1;

  // Determine which swiss round we're on vs total planned
  const activePhase = phases?.find((p) => p.id === activePhaseId);
  const plannedRounds = activePhase?.planned_rounds ?? tournament.swissRounds;

  // Is the last round completed? (ready for next round)
  const lastRoundCompleted = lastRound?.status === "completed";
  const hasActiveRound = activeRound !== null;
  const allMatchesDone =
    activeRound &&
    activeRound.matchCount > 0 &&
    activeRound.completedCount === activeRound.matchCount;

  // Detect a pending round with matches (stale from a failed start attempt)
  const pendingRound =
    lastRound?.status === "pending" && lastRound.matchCount > 0
      ? lastRound
      : null;

  // Real-time subscriptions for overview data
  useEffect(() => {
    const channels: ReturnType<typeof supabase.channel>[] = [];

    // Registration changes (for check-in count)
    const regChannel = supabase
      .channel(`overview-registrations-${tournament.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tournament_registrations",
          filter: `tournament_id=eq.${tournament.id}`,
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
          console.error("[Realtime] overview registrations error:", err);
          setRealtimeStatus("error");
        }
      });
    channels.push(regChannel);

    // Match changes (for completion count)
    const matchChannel = supabase
      .channel(`overview-matches-${tournament.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tournament_matches",
          filter: `tournament_id=eq.${tournament.id}`,
        },
        () => {
          triggerRefresh();
        }
      )
      .subscribe();
    channels.push(matchChannel);

    // Round changes (for round status)
    if (activePhaseId) {
      const roundChannel = supabase
        .channel(`overview-rounds-${activePhaseId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "tournament_rounds",
            filter: `phase_id=eq.${activePhaseId}`,
          },
          () => {
            triggerRefresh();
          }
        )
        .subscribe();
      channels.push(roundChannel);
    }

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      channels.forEach((ch) => ch.unsubscribe());
    };
  }, [supabase, tournament.id, activePhaseId, triggerRefresh]);

  // Sync roundState from fetched data
  useEffect(() => {
    // Don't override user-initiated states (generating, preview, starting, completing)
    if (
      roundState === "generating" ||
      roundState === "preview" ||
      roundState === "starting" ||
      roundState === "completing"
    ) {
      return;
    }

    if (hasActiveRound) {
      setRoundState("active");
    } else if (pendingRound) {
      // A round was prepared but never started — show resume UI
      setRoundState("pending_resume");
    } else if (lastRoundCompleted || !lastRound) {
      setRoundState("idle");
    }
  }, [hasActiveRound, lastRoundCompleted, lastRound, pendingRound, roundState]);

  // -- Handlers --

  const handlePrepareRound = () => {
    if (!activePhaseId) return;
    setRoundState("generating");

    startTransition(async () => {
      const result = await prepareRound(tournament.id, activePhaseId);
      if (result.success) {
        setPreviewData(result.data);
        setRoundState("preview");
      } else {
        toast.error(result.error);
        setRoundState("idle");
      }
    });
  };

  const handleConfirmStart = () => {
    if (!previewData) return;
    setRoundState("starting");

    startTransition(async () => {
      const result = await confirmAndStartRound(
        previewData.roundId,
        tournament.id
      );
      if (result.success) {
        toast.success(`Round ${previewData.roundNumber} started`);
        setPreviewData(null);
        setRoundState("active");
        await refetchRounds();
      } else {
        toast.error(result.error);
        setRoundState("preview");
      }
    });
  };

  const handleCancelPreview = () => {
    if (!previewData) return;
    setRoundState("generating");

    startTransition(async () => {
      const result = await cancelPreparedRound(
        previewData.roundId,
        tournament.id
      );
      if (result.success) {
        setPreviewData(null);
        setRoundState("idle");
        await refetchRounds();
      } else {
        toast.error(result.error);
        setRoundState("preview");
      }
    });
  };

  const handleResumePendingRound = () => {
    if (!pendingRound) return;
    setRoundState("starting");

    startTransition(async () => {
      const result = await confirmAndStartRound(pendingRound.id, tournament.id);
      if (result.success) {
        toast.success(`Round ${pendingRound.round_number} started`);
        setRoundState("active");
        await refetchRounds();
      } else {
        toast.error(result.error);
        setRoundState("pending_resume");
      }
    });
  };

  const handleCancelPendingRound = () => {
    if (!pendingRound) return;
    setRoundState("generating");

    startTransition(async () => {
      const result = await cancelPreparedRound(pendingRound.id, tournament.id);
      if (result.success) {
        toast.success("Round cancelled");
        setRoundState("idle");
        await refetchRounds();
      } else {
        toast.error(result.error);
        setRoundState("pending_resume");
      }
    });
  };

  const handleCompleteRound = () => {
    if (!activeRound) return;
    setRoundState("completing");

    startTransition(async () => {
      const result = await completeRound(activeRound.id, tournament.id);
      if (result.success) {
        toast.success("Round completed, standings updated");
        setRoundState("idle");
        await refetchRounds();
      } else {
        toast.error(result.error);
        setRoundState("active");
      }
    });
  };

  // -- Formatting helpers --

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "—";
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatType = (fmt?: string) =>
    fmt?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ?? "Swiss";

  const maxParticipants = tournament.maxParticipants ?? 0;

  // Calculate registration stats
  const registrations = (tournament.registrations ?? []) as Array<{
    status?: string;
  }>;

  const checkedInCount = registrations.filter(
    (r) => r.status === "checked_in"
  ).length;

  const registeredCount = registrations.filter(
    (r) =>
      r.status === "registered" ||
      r.status === "confirmed" ||
      r.status === "checked_in"
  ).length;

  const droppedCount = registrations.filter(
    (r) => r.status === "dropped"
  ).length;

  const registrationProgress =
    registeredCount > 0 ? (checkedInCount / registeredCount) * 100 : 0;

  const capacityProgress = maxParticipants
    ? (registeredCount / maxParticipants) * 100
    : 0;

  // -- Render --

  return (
    <div className="space-y-6">
      <RealtimeStatusBadge status={realtimeStatus} />

      {/* Round Command Center — only for active tournaments */}
      {isActive && (
        <RoundCommandCenter
          roundState={roundState}
          previewData={previewData}
          activeRound={activeRound}
          pendingRound={pendingRound}
          nextRoundNumber={nextRoundNumber}
          plannedRounds={plannedRounds ?? null}
          allMatchesDone={!!allMatchesDone}
          isPending={isPending}
          roundsLoading={roundsLoading}
          hasPhase={!!activePhaseId}
          onPrepareRound={handlePrepareRound}
          onConfirmStart={handleConfirmStart}
          onCancelPreview={handleCancelPreview}
          onCompleteRound={handleCompleteRound}
          onResumePendingRound={handleResumePendingRound}
          onCancelPendingRound={handleCancelPendingRound}
        />
      )}

      {/* Key Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Registration Progress Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Registration Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-3xl font-bold">{registeredCount}</div>
                <p className="text-muted-foreground text-xs">
                  {maxParticipants > 0
                    ? `of ${maxParticipants} spots`
                    : "registered"}
                </p>
              </div>
              {maxParticipants > 0 && (
                <div className="text-right">
                  <div className="text-lg font-semibold">
                    {Math.round(capacityProgress)}%
                  </div>
                  <p className="text-muted-foreground text-xs">capacity</p>
                </div>
              )}
            </div>
            {maxParticipants > 0 && (
              <Progress value={capacityProgress} className="h-2" />
            )}
            {isActive && (
              <>
                <div className="border-muted-foreground/20 border-t pt-3">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <div className="text-xl font-semibold">
                        {checkedInCount}
                      </div>
                      <p className="text-muted-foreground text-xs">
                        checked in
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {Math.round(registrationProgress)}%
                      </div>
                      <p className="text-muted-foreground text-xs">ready</p>
                    </div>
                  </div>
                  <Progress
                    value={registrationProgress}
                    className="mt-2 h-1.5"
                  />
                </div>
                {droppedCount > 0 && (
                  <p className="text-muted-foreground text-xs">
                    {droppedCount} dropped
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Round Progress Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Round Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-3xl font-bold">
                  {currentDisplayRound?.round_number ?? 0}
                </div>
                <p className="text-muted-foreground text-xs">
                  {plannedRounds
                    ? `of ${plannedRounds} rounds`
                    : "current round"}
                </p>
              </div>
              {plannedRounds && (
                <div className="text-right">
                  <div className="text-lg font-semibold">
                    {Math.round(
                      ((currentDisplayRound?.round_number ?? 0) /
                        plannedRounds) *
                        100
                    )}
                    %
                  </div>
                  <p className="text-muted-foreground text-xs">complete</p>
                </div>
              )}
            </div>
            {plannedRounds && (
              <Progress
                value={
                  ((currentDisplayRound?.round_number ?? 0) / plannedRounds) *
                  100
                }
                className="h-2"
              />
            )}
            {activeRound && (
              <div className="border-muted-foreground/20 border-t pt-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-lg font-semibold text-blue-600">
                      {activeRound.inProgressCount}
                    </div>
                    <p className="text-muted-foreground text-xs">active</p>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-emerald-600">
                      {activeRound.completedCount}
                    </div>
                    <p className="text-muted-foreground text-xs">done</p>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">
                      {activeRound.pendingCount}
                    </div>
                    <p className="text-muted-foreground text-xs">pending</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tournament Type Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Tournament Format
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Badge variant="secondary" className="text-sm">
                {tournament.format || "Custom"}
              </Badge>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type</span>
                <span className="font-medium">
                  {formatType(tournament.tournamentFormat)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Round Time</span>
                <span className="font-medium">
                  {tournament.roundTimeMinutes || 50}m
                </span>
              </div>
              {tournament.topCutSize && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Top Cut</span>
                  <span className="font-medium">
                    Top {tournament.topCutSize}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tournament Timing Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground mb-1 text-xs">Start Time</p>
              <p className="font-medium">{formatDate(tournament.startDate)}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1 text-xs">End Time</p>
              <p className="font-medium">{formatDate(tournament.endDate)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// -- Round Command Center Sub-Component --

interface RoundCommandCenterProps {
  roundState: RoundState;
  previewData: PreviewData | null;
  activeRound: {
    id: number;
    round_number: number;
    matchCount: number;
    completedCount: number;
    inProgressCount: number;
    pendingCount: number;
  } | null;
  pendingRound: {
    id: number;
    round_number: number;
    matchCount: number;
  } | null;
  nextRoundNumber: number;
  plannedRounds: number | null;
  allMatchesDone: boolean;
  isPending: boolean;
  roundsLoading: boolean;
  hasPhase: boolean;
  onPrepareRound: () => void;
  onConfirmStart: () => void;
  onCancelPreview: () => void;
  onCompleteRound: () => void;
  onResumePendingRound: () => void;
  onCancelPendingRound: () => void;
}

function RoundCommandCenter({
  roundState,
  previewData,
  activeRound,
  pendingRound,
  nextRoundNumber,
  plannedRounds,
  allMatchesDone,
  isPending,
  roundsLoading,
  hasPhase,
  onPrepareRound,
  onConfirmStart,
  onCancelPreview,
  onCompleteRound,
  onResumePendingRound,
  onCancelPendingRound,
}: RoundCommandCenterProps) {
  if (roundsLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!hasPhase) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <AlertCircle className="text-muted-foreground mx-auto mb-3 h-8 w-8 opacity-50" />
          <p className="text-muted-foreground text-sm">
            No phases configured. Set up tournament phases in Settings before
            starting rounds.
          </p>
        </CardContent>
      </Card>
    );
  }

  // -- Idle: Ready to start next round --
  if (roundState === "idle") {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">
                {nextRoundNumber === 1
                  ? "Ready to Start"
                  : `Round ${nextRoundNumber - 1} Complete`}
              </h3>
              <p className="text-muted-foreground text-sm">
                {nextRoundNumber === 1
                  ? "Generate pairings and start the first round"
                  : plannedRounds && nextRoundNumber > plannedRounds
                    ? "All Swiss rounds completed"
                    : `Generate pairings for Round ${nextRoundNumber}`}
              </p>
            </div>
            {/* Show Start Round button unless all planned rounds are done */}
            {!(plannedRounds && nextRoundNumber > plannedRounds) && (
              <Button onClick={onPrepareRound} disabled={isPending}>
                <Play className="mr-2 h-4 w-4" />
                Start Round {nextRoundNumber}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // -- Pending Resume: round was prepared but start failed --
  if (roundState === "pending_resume" && pendingRound) {
    return (
      <Card className="border-amber-500/50">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">
                Round {pendingRound.round_number} Ready
              </h3>
              <p className="text-muted-foreground text-sm">
                {pendingRound.matchCount} matches generated — start or cancel
                this round
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancelPendingRound}
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <X className="mr-1 h-3.5 w-3.5" />
                )}
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={onResumePendingRound}
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="mr-1 h-3.5 w-3.5" />
                )}
                Start Round {pendingRound.round_number}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // -- Generating: spinner --
  if (roundState === "generating") {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-3 py-8">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm font-medium">Generating pairings...</span>
        </CardContent>
      </Card>
    );
  }

  // -- Preview: pairings generated, TO reviews --
  if (roundState === "preview" && previewData) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">
                Round {previewData.roundNumber} Preview
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                {previewData.matchesCreated} matches
                {previewData.byePlayer && ` (1 bye: ${previewData.byePlayer})`}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancelPreview}
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <X className="mr-1 h-3.5 w-3.5" />
                )}
                Cancel
              </Button>
              <Button size="sm" onClick={onConfirmStart} disabled={isPending}>
                {isPending ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle className="mr-1 h-3.5 w-3.5" />
                )}
                Confirm & Start
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="max-h-64 overflow-y-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-muted">
                  <th className="px-3 py-2 text-left font-medium">Table</th>
                  <th className="px-3 py-2 text-left font-medium">Player 1</th>
                  <th className="px-3 py-2 text-left font-medium">Player 2</th>
                </tr>
              </thead>
              <tbody>
                {previewData.matches.map((match, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="px-3 py-1.5 font-medium">
                      {match.player2Name === null
                        ? "BYE"
                        : `Table ${match.tableNumber ?? idx + 1}`}
                    </td>
                    <td className="px-3 py-1.5">{match.player1Name}</td>
                    <td className="px-3 py-1.5">
                      {match.player2Name ?? (
                        <span className="text-muted-foreground italic">
                          BYE
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    );
  }

  // -- Starting: confirming round start --
  if (roundState === "starting") {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-3 py-8">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm font-medium">Starting round...</span>
        </CardContent>
      </Card>
    );
  }

  // -- Active: round in progress --
  if (roundState === "active" && activeRound) {
    const progressPercent =
      activeRound.matchCount > 0
        ? Math.round(
            (activeRound.completedCount / activeRound.matchCount) * 100
          )
        : 0;

    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">
                Round {activeRound.round_number} in Progress
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                {activeRound.completedCount} of {activeRound.matchCount} matches
                completed
              </p>
            </div>
            <Button
              onClick={onCompleteRound}
              disabled={!allMatchesDone || isPending}
              variant={allMatchesDone ? "default" : "outline"}
            >
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="mr-2 h-4 w-4" />
              )}
              Complete Round
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress bar */}
          <Progress value={progressPercent} className="h-2" />

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {activeRound.inProgressCount}
              </div>
              <div className="text-muted-foreground text-xs">In Progress</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {activeRound.completedCount}
              </div>
              <div className="text-muted-foreground text-xs">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {activeRound.matchCount - activeRound.completedCount}
              </div>
              <div className="text-muted-foreground text-xs">Remaining</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // -- Completing: spinner --
  if (roundState === "completing") {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-3 py-8">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm font-medium">
            Completing round and updating standings...
          </span>
        </CardContent>
      </Card>
    );
  }

  // Fallback — shouldn't reach here
  return null;
}
