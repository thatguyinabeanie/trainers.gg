"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { useSupabaseQuery } from "@/lib/supabase";
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
import {
  Trophy,
  Calendar,
  Play,
  AlertCircle,
  TrendingUp,
  ChevronRight,
  Loader2,
  CheckCircle,
  X,
} from "lucide-react";
import { toast } from "sonner";

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
    _creationTime?: number;
  };
}

type RoundState =
  | "idle" // No rounds yet, or last round completed — ready to start next
  | "generating" // Generating pairings (spinner)
  | "preview" // Pairings generated, TO reviews before confirming
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
  const [roundState, setRoundState] = useState<RoundState>("idle");
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [isPending, startTransition] = useTransition();

  const registrationCount = tournament.registrations?.length || 0;
  const maxParticipants = tournament.maxParticipants || 0;
  const isActive = tournament.status === "active";

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
  } = useSupabaseQuery(roundsQueryFn, [activePhaseId, "overview-rounds"]);

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
    } else if (lastRoundCompleted || !lastRound) {
      setRoundState("idle");
    }
  }, [hasActiveRound, lastRoundCompleted, lastRound, roundState]);

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
    if (!timestamp) return "Not set";
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  // -- Attention items --

  const attentionItems: Array<{
    id: string;
    message: string;
    action: string;
  }> = [];

  if (tournament.status === "draft") {
    attentionItems.push({
      id: "publish",
      message: "Tournament is still in draft mode",
      action: "Publish",
    });
  }

  if (tournament.status === "upcoming" && !tournament.startDate) {
    attentionItems.push({
      id: "start-date",
      message: "No start date set",
      action: "Set Date",
    });
  }

  // -- Render --

  return (
    <div className="space-y-6">
      {/* Round Command Center — only for active tournaments */}
      {isActive && (
        <RoundCommandCenter
          roundState={roundState}
          previewData={previewData}
          activeRound={activeRound}
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
        />
      )}

      {/* Attention Needed */}
      {attentionItems.length > 0 && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              Needs Attention
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {attentionItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between py-2"
              >
                <span className="text-sm">{item.message}</span>
                <Button size="sm" variant="ghost" className="gap-1">
                  {item.action}
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* At a Glance - Compact metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="bg-muted/50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold">{registrationCount}</div>
          <div className="text-muted-foreground text-xs">
            {maxParticipants ? `of ${maxParticipants}` : "Registered"}
          </div>
        </div>
        <div className="bg-muted/50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold">
            {currentDisplayRound?.round_number ?? 0}
          </div>
          <div className="text-muted-foreground text-xs">
            {plannedRounds ? `of ${plannedRounds} rounds` : "Current Round"}
          </div>
        </div>
        <div className="bg-muted/50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold">
            {tournament.roundTimeMinutes || 50}m
          </div>
          <div className="text-muted-foreground text-xs">Round Time</div>
        </div>
        <div className="bg-muted/50 rounded-lg p-4 text-center">
          <div className="text-lg font-bold">
            <Badge variant="secondary" className="text-xs">
              {tournament.format || "Custom"}
            </Badge>
          </div>
          <div className="text-muted-foreground mt-1 text-xs">Format</div>
        </div>
      </div>

      {/* Registration Progress - Only if cap set */}
      {maxParticipants > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">
                Registration
              </CardTitle>
              <span className="text-muted-foreground text-sm">
                {registrationCount} / {maxParticipants}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <Progress
              value={
                maxParticipants > 0
                  ? (registrationCount / maxParticipants) * 100
                  : 0
              }
              className="h-2"
            />
            <p className="text-muted-foreground mt-2 text-xs">
              {maxParticipants - registrationCount} spots remaining
            </p>
          </CardContent>
        </Card>
      )}

      {/* Schedule & Details - Condensed */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Calendar className="h-4 w-4" />
              Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Start</span>
              <span>{formatDate(tournament.startDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">End</span>
              <span>{formatDate(tournament.endDate)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Trophy className="h-4 w-4" />
              Format
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type</span>
              <span>
                {tournament.tournamentFormat?.replace(/_/g, " ") || "Swiss"}
              </span>
            </div>
            {tournament.swissRounds && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Swiss Rounds</span>
                <span>{tournament.swissRounds}</span>
              </div>
            )}
            {tournament.topCutSize && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Top Cut</span>
                <span>Top {tournament.topCutSize}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity - Compact */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <TrendingUp className="h-4 w-4" />
            Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-sm">
              <div className="h-2 w-2 shrink-0 rounded-full bg-green-500" />
              <span className="flex-1">Tournament created</span>
              <span className="text-muted-foreground text-xs">
                {tournament._creationTime
                  ? new Date(tournament._creationTime).toLocaleDateString()
                  : "—"}
              </span>
            </div>
            {tournament.status !== "draft" && (
              <div className="flex items-center gap-3 text-sm">
                <div className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                <span className="flex-1">Registration opened</span>
                <span className="text-muted-foreground text-xs">Recently</span>
              </div>
            )}
            {registrationCount > 0 && (
              <div className="flex items-center gap-3 text-sm">
                <div className="h-2 w-2 shrink-0 rounded-full bg-purple-500" />
                <span className="flex-1">
                  {registrationCount} players registered
                </span>
                <span className="text-muted-foreground text-xs">Ongoing</span>
              </div>
            )}
            {activeRound && (
              <div className="flex items-center gap-3 text-sm">
                <div className="h-2 w-2 shrink-0 rounded-full bg-teal-500" />
                <span className="flex-1">
                  Round {activeRound.round_number} in progress
                </span>
                <span className="text-muted-foreground text-xs">
                  {activeRound.completedCount}/{activeRound.matchCount} matches
                </span>
              </div>
            )}
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
}

function RoundCommandCenter({
  roundState,
  previewData,
  activeRound,
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
              <thead className="bg-muted/50 sticky top-0">
                <tr>
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
