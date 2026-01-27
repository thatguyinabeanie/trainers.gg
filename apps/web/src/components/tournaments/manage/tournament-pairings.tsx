"use client";

import { useState, useCallback, useTransition } from "react";
import { useSupabaseQuery } from "@/lib/supabase";
import {
  getTournamentPhases,
  getPhaseRoundsWithStats,
  getRoundMatchesWithStats,
} from "@trainers/supabase";
import {
  generatePairings,
  startRound,
  completeRound,
  createRound,
  reportMatchResult,
} from "@/actions/tournaments";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Shuffle,
  Play,
  Clock,
  Trophy,
  AlertCircle,
  Loader2,
  CheckCircle,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

interface TournamentPairingsProps {
  tournament: {
    id: number;
    status: string;
    currentPhaseId?: number | null;
  };
}

interface MatchForReport {
  id: number;
  player1: { id: number; name: string } | null;
  player2: { id: number; name: string } | null;
}

export function TournamentPairings({ tournament }: TournamentPairingsProps) {
  const [selectedPhaseId, setSelectedPhaseId] = useState<number | null>(
    tournament.currentPhaseId ?? null
  );
  const [selectedRoundId, setSelectedRoundId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [matchToReport, setMatchToReport] = useState<MatchForReport | null>(
    null
  );
  const [player1Score, setPlayer1Score] = useState("0");
  const [player2Score, setPlayer2Score] = useState("0");

  // Fetch phases
  const phasesQueryFn = useCallback(
    (supabase: Parameters<typeof getTournamentPhases>[0]) =>
      getTournamentPhases(supabase, tournament.id),
    [tournament.id]
  );

  const { data: phases, isLoading: phasesLoading } = useSupabaseQuery(
    phasesQueryFn,
    [tournament.id, "phases"]
  );

  // Set initial phase if not set
  if (!selectedPhaseId && phases && phases.length > 0 && phases[0]) {
    setSelectedPhaseId(phases[0].id);
  }

  // Fetch rounds for selected phase
  const roundsQueryFn = useCallback(
    (supabase: Parameters<typeof getPhaseRoundsWithStats>[0]) =>
      selectedPhaseId
        ? getPhaseRoundsWithStats(supabase, selectedPhaseId)
        : Promise.resolve([]),
    [selectedPhaseId]
  );

  const {
    data: rounds,
    isLoading: roundsLoading,
    refetch: refetchRounds,
  } = useSupabaseQuery(roundsQueryFn, [selectedPhaseId, "rounds"]);

  // Set initial round if not set
  if (!selectedRoundId && rounds && rounds.length > 0 && rounds[0]) {
    setSelectedRoundId(rounds[0].id);
  }

  // Fetch matches for selected round
  const matchesQueryFn = useCallback(
    (supabase: Parameters<typeof getRoundMatchesWithStats>[0]) =>
      selectedRoundId
        ? getRoundMatchesWithStats(supabase, selectedRoundId, tournament.id)
        : Promise.resolve([]),
    [selectedRoundId, tournament.id]
  );

  const {
    data: matches,
    isLoading: matchesLoading,
    refetch: refetchMatches,
  } = useSupabaseQuery(matchesQueryFn, [selectedRoundId, "matches"]);

  const currentRound = rounds?.find((r) => r.id === selectedRoundId);
  const currentPhase = phases?.find((p) => p.id === selectedPhaseId);

  const canGeneratePairings =
    tournament.status === "active" && currentRound?.status === "pending";
  const canStartRound =
    currentRound?.status === "pending" && (currentRound?.matchCount ?? 0) > 0;
  const canCompleteRound =
    currentRound?.status === "active" &&
    currentRound?.completedCount === currentRound?.matchCount;
  const canCreateNextRound =
    tournament.status === "active" &&
    rounds &&
    rounds.length > 0 &&
    rounds[rounds.length - 1]?.status === "completed";

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "active":
        return "bg-blue-100 text-blue-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleGeneratePairings = () => {
    if (!selectedRoundId) return;
    startTransition(async () => {
      const result = await generatePairings(selectedRoundId, tournament.id);
      if (result.success) {
        toast.success(`Generated ${result.data.matchesCreated} pairings`);
        if (result.data.warnings.length > 0) {
          result.data.warnings.forEach((w) => toast.warning(w));
        }
        await refetchMatches();
        await refetchRounds();
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleStartRound = () => {
    if (!selectedRoundId) return;
    startTransition(async () => {
      const result = await startRound(selectedRoundId, tournament.id);
      if (result.success) {
        toast.success("Round started");
        await refetchRounds();
        await refetchMatches();
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleCompleteRound = () => {
    if (!selectedRoundId) return;
    startTransition(async () => {
      const result = await completeRound(selectedRoundId, tournament.id);
      if (result.success) {
        toast.success("Round completed, standings updated");
        await refetchRounds();
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleCreateNextRound = () => {
    if (!selectedPhaseId || !rounds) return;
    const nextRoundNumber = rounds.length + 1;
    startTransition(async () => {
      const result = await createRound(
        selectedPhaseId,
        nextRoundNumber,
        tournament.id
      );
      if (result.success) {
        toast.success(`Round ${nextRoundNumber} created`);
        await refetchRounds();
        setSelectedRoundId(result.data.roundId);
      } else {
        toast.error(result.error);
      }
    });
  };

  const openReportDialog = (match: {
    id: number;
    player1: unknown;
    player2: unknown;
    alt1_id: number | null;
    alt2_id: number | null;
  }) => {
    const p1 = match.player1 as {
      id: number;
      display_name?: string;
      username?: string;
    } | null;
    const p2 = match.player2 as {
      id: number;
      display_name?: string;
      username?: string;
    } | null;
    setMatchToReport({
      id: match.id,
      player1: p1
        ? { id: p1.id, name: p1.display_name ?? p1.username ?? "Player 1" }
        : null,
      player2: p2
        ? { id: p2.id, name: p2.display_name ?? p2.username ?? "Player 2" }
        : null,
    });
    setPlayer1Score("0");
    setPlayer2Score("0");
    setReportDialogOpen(true);
  };

  const handleReportResult = () => {
    if (!matchToReport) return;
    const p1Score = parseInt(player1Score) || 0;
    const p2Score = parseInt(player2Score) || 0;

    if (p1Score === p2Score) {
      toast.error("Scores cannot be tied - one player must win");
      return;
    }

    const winnerId =
      p1Score > p2Score ? matchToReport.player1?.id : matchToReport.player2?.id;

    if (!winnerId) {
      toast.error("Could not determine winner");
      return;
    }

    startTransition(async () => {
      const result = await reportMatchResult(
        matchToReport.id,
        tournament.id,
        winnerId,
        p1Score,
        p2Score
      );
      if (result.success) {
        toast.success("Match result reported");
        setReportDialogOpen(false);
        setMatchToReport(null);
        await refetchMatches();
        await refetchRounds();
      } else {
        toast.error(result.error);
      }
    });
  };

  if (phasesLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!phases || phases.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Pairings & Matches</h2>
          <p className="text-muted-foreground">
            Manage tournament rounds and player pairings
          </p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Trophy className="text-muted-foreground mb-4 h-12 w-12 opacity-50" />
            <h3 className="mb-2 text-lg font-semibold">No phases configured</h3>
            <p className="text-muted-foreground text-sm">
              Tournament phases need to be set up before pairings can be
              generated.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Pairings & Matches</h2>
          <p className="text-muted-foreground">
            Manage tournament rounds and player pairings
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {phases.length > 1 && (
            <Select
              value={selectedPhaseId?.toString() ?? ""}
              onValueChange={(value) => {
                if (value) {
                  setSelectedPhaseId(parseInt(value));
                  setSelectedRoundId(null);
                }
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Select phase" />
              </SelectTrigger>
              <SelectContent>
                {phases.map((phase) => (
                  <SelectItem key={phase.id} value={phase.id.toString()}>
                    {phase.name ?? `Phase ${phase.phase_order}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {!roundsLoading && rounds && rounds.length > 0 && (
            <Select
              value={selectedRoundId?.toString() ?? ""}
              onValueChange={(value) =>
                value && setSelectedRoundId(parseInt(value))
              }
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Round" />
              </SelectTrigger>
              <SelectContent>
                {rounds.map((round) => (
                  <SelectItem key={round.id} value={round.id.toString()}>
                    Round {round.round_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {canCreateNextRound && (
            <Button
              variant="outline"
              onClick={handleCreateNextRound}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Next Round
            </Button>
          )}
          {canGeneratePairings && (
            <Button onClick={handleGeneratePairings} disabled={isPending}>
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Shuffle className="mr-2 h-4 w-4" />
              )}
              Generate Pairings
            </Button>
          )}
          {canStartRound && (
            <Button onClick={handleStartRound} disabled={isPending}>
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Start Round
            </Button>
          )}
          {canCompleteRound && (
            <Button onClick={handleCompleteRound} disabled={isPending}>
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="mr-2 h-4 w-4" />
              )}
              Complete Round
            </Button>
          )}
        </div>
      </div>

      {/* Round Status */}
      {roundsLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </CardContent>
        </Card>
      ) : !rounds || rounds.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="text-muted-foreground mb-4 h-12 w-12 opacity-50" />
            <h3 className="mb-2 text-lg font-semibold">No rounds yet</h3>
            <p className="text-muted-foreground mb-4 text-sm">
              Create the first round to start generating pairings.
            </p>
            <Button
              onClick={() => {
                if (!selectedPhaseId) return;
                startTransition(async () => {
                  const result = await createRound(
                    selectedPhaseId,
                    1,
                    tournament.id
                  );
                  if (result.success) {
                    toast.success("Round 1 created");
                    await refetchRounds();
                    setSelectedRoundId(result.data.roundId);
                  } else {
                    toast.error(result.error);
                  }
                });
              }}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Create Round 1
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    {currentPhase?.name ?? "Phase"} - Round{" "}
                    {currentRound?.round_number ?? "?"}
                  </CardTitle>
                  <CardDescription>
                    {currentRound?.matchCount ?? 0} matches in this round
                  </CardDescription>
                </div>
                <Badge className={getStatusColor(currentRound?.status ?? null)}>
                  {(currentRound?.status ?? "pending").toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {currentRound?.status === "pending" &&
                (currentRound?.matchCount ?? 0) === 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      This round hasn&apos;t started yet. Generate pairings to
                      begin.
                    </AlertDescription>
                  </Alert>
                )}

              {currentRound?.status === "pending" &&
                (currentRound?.matchCount ?? 0) > 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Pairings generated. Start the round when ready.
                    </AlertDescription>
                  </Alert>
                )}

              {currentRound?.status === "active" && (
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {currentRound.inProgressCount ?? 0}
                    </div>
                    <div className="text-muted-foreground text-sm">
                      In Progress
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {currentRound.completedCount ?? 0}
                    </div>
                    <div className="text-muted-foreground text-sm">
                      Completed
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {currentRound.matchCount
                        ? Math.round(
                            ((currentRound.completedCount ?? 0) /
                              currentRound.matchCount) *
                              100
                          )
                        : 0}
                      %
                    </div>
                    <div className="text-muted-foreground text-sm">
                      Progress
                    </div>
                  </div>
                </div>
              )}

              {currentRound?.status === "completed" && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    This round is complete. Standings have been updated.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Pairings Table */}
          <Card>
            <CardHeader>
              <CardTitle>Round {currentRound?.round_number} Pairings</CardTitle>
              <CardDescription>
                Match pairings and results for the current round
              </CardDescription>
            </CardHeader>
            <CardContent>
              {matchesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : !matches || matches.length === 0 ? (
                <div className="py-8 text-center">
                  <Trophy className="text-muted-foreground mx-auto mb-4 h-12 w-12 opacity-50" />
                  <h3 className="mb-2 text-lg font-semibold">
                    No pairings yet
                  </h3>
                  <p className="text-muted-foreground">
                    Generate pairings to start this round.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Table</TableHead>
                      <TableHead>Player 1</TableHead>
                      <TableHead>Player 2</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matches.map((match) => {
                      const p1 = match.player1 as {
                        display_name?: string;
                        username?: string;
                      } | null;
                      const p2 = match.player2 as {
                        display_name?: string;
                        username?: string;
                      } | null;
                      const winner = match.winner as {
                        display_name?: string;
                        username?: string;
                      } | null;
                      const isBye = !match.alt2_id;

                      return (
                        <TableRow key={match.id}>
                          <TableCell className="font-medium">
                            {isBye
                              ? "BYE"
                              : `Table ${match.table_number ?? "-"}`}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {p1?.display_name ?? p1?.username ?? "TBD"}
                              </div>
                              {match.player1Stats && (
                                <div className="text-muted-foreground text-sm">
                                  {match.player1Stats.wins}-
                                  {match.player1Stats.losses}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {isBye ? (
                              <span className="text-muted-foreground italic">
                                BYE
                              </span>
                            ) : (
                              <div>
                                <div className="font-medium">
                                  {p2?.display_name ?? p2?.username ?? "TBD"}
                                </div>
                                {match.player2Stats && (
                                  <div className="text-muted-foreground text-sm">
                                    {match.player2Stats.wins}-
                                    {match.player2Stats.losses}
                                  </div>
                                )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(match.status)}>
                              {(match.status ?? "pending").replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {match.status === "completed" ? (
                              <div>
                                <div className="font-medium">
                                  {winner?.display_name ??
                                    winner?.username ??
                                    "Unknown"}
                                </div>
                                <div className="text-muted-foreground text-sm">
                                  {match.game_wins1 ?? 0}-
                                  {match.game_wins2 ?? 0}
                                </div>
                              </div>
                            ) : isBye ? (
                              <span className="text-muted-foreground">
                                Auto-win
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {match.status === "active" && !isBye && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openReportDialog(match)}
                              >
                                <Clock className="mr-2 h-4 w-4" />
                                Report
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Report Result Dialog */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Match Result</DialogTitle>
            <DialogDescription>
              Enter the game scores for each player.
            </DialogDescription>
          </DialogHeader>
          {matchToReport && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="player1Score">
                    {matchToReport.player1?.name ?? "Player 1"} Games Won
                  </Label>
                  <Input
                    id="player1Score"
                    type="number"
                    min="0"
                    max="3"
                    value={player1Score}
                    onChange={(e) => setPlayer1Score(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="player2Score">
                    {matchToReport.player2?.name ?? "Player 2"} Games Won
                  </Label>
                  <Input
                    id="player2Score"
                    type="number"
                    min="0"
                    max="3"
                    value={player2Score}
                    onChange={(e) => setPlayer2Score(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReportDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleReportResult} disabled={isPending}>
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Submit Result
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
