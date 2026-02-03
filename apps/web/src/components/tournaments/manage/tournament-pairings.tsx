"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseQuery } from "@/lib/supabase";
import {
  getTournamentPhases,
  getPhaseRoundsWithStats,
  getPhaseRoundsWithMatches,
  getRoundMatchesWithStats,
  getUnpairedCheckedInPlayers,
} from "@trainers/supabase";
import { reportMatchResult } from "@/actions/tournaments";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Clock,
  Trophy,
  Loader2,
  LayoutGrid,
  Table as TableIcon,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { BracketVisualization } from "@/components/tournament/bracket-visualization";
import { transformPhaseData } from "@/lib/tournament-utils";

interface TournamentPairingsProps {
  tournament: {
    id: number;
    slug: string;
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
  const router = useRouter();
  const [selectedPhaseId, setSelectedPhaseId] = useState<number | null>(
    tournament.currentPhaseId ?? null
  );
  const [selectedRoundId, setSelectedRoundId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "bracket">("table");
  const [isPending, startTransition] = useTransition();
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [matchToReport, setMatchToReport] = useState<MatchForReport | null>(
    null
  );
  const [player1Score, setPlayer1Score] = useState("0");
  const [player2Score, setPlayer2Score] = useState("0");

  // Fetch phases
  const phasesQueryFn = (supabase: Parameters<typeof getTournamentPhases>[0]) =>
    getTournamentPhases(supabase, tournament.id);

  const { data: phases, isLoading: phasesLoading } = useSupabaseQuery(
    phasesQueryFn,
    [tournament.id, "phases"]
  );

  // Set initial phase when phases load
  useEffect(() => {
    if (!selectedPhaseId && phases && phases.length > 0 && phases[0]) {
      setSelectedPhaseId(phases[0].id);
    }
  }, [phases, selectedPhaseId]);

  // Fetch rounds for selected phase
  const roundsQueryFn = (
    supabase: Parameters<typeof getPhaseRoundsWithStats>[0]
  ) =>
    selectedPhaseId
      ? getPhaseRoundsWithStats(supabase, selectedPhaseId)
      : Promise.resolve([]);

  const {
    data: rounds,
    isLoading: roundsLoading,
    refetch: refetchRounds,
  } = useSupabaseQuery(roundsQueryFn, [selectedPhaseId, "rounds"]);

  // Set initial round when rounds load, or reset when phase changes
  useEffect(() => {
    if (rounds && rounds.length > 0 && rounds[0]) {
      setSelectedRoundId(rounds[0].id);
    } else {
      setSelectedRoundId(null);
    }
  }, [rounds]);

  // Fetch matches for selected round
  const matchesQueryFn = (
    supabase: Parameters<typeof getRoundMatchesWithStats>[0]
  ) =>
    selectedRoundId
      ? getRoundMatchesWithStats(supabase, selectedRoundId, tournament.id)
      : Promise.resolve([]);

  const {
    data: matches,
    isLoading: matchesLoading,
    refetch: refetchMatches,
  } = useSupabaseQuery(matchesQueryFn, [selectedRoundId, "matches"]);

  // Fetch all rounds with matches for bracket view (only when bracket mode is active)
  const bracketQueryFn = (
    supabase: Parameters<typeof getPhaseRoundsWithMatches>[0]
  ) =>
    selectedPhaseId && viewMode === "bracket"
      ? getPhaseRoundsWithMatches(supabase, selectedPhaseId, tournament.id)
      : Promise.resolve([]);

  const { data: bracketRounds } = useSupabaseQuery(bracketQueryFn, [
    selectedPhaseId,
    viewMode,
    "bracket-rounds",
  ]);

  // Fetch unpaired checked-in players for the selected round
  const unpairedQueryFn = (
    supabase: Parameters<typeof getUnpairedCheckedInPlayers>[0]
  ) =>
    selectedRoundId
      ? getUnpairedCheckedInPlayers(supabase, tournament.id, selectedRoundId)
      : Promise.resolve([]);

  const { data: unpairedPlayers } = useSupabaseQuery(unpairedQueryFn, [
    selectedRoundId,
    "unpaired-players",
  ]);

  const currentRound = rounds?.find((r) => r.id === selectedRoundId);
  const currentPhase = phases?.find((p) => p.id === selectedPhaseId);

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
            View tournament rounds and player pairings
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
      {/* Header with selectors */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Pairings & Matches</h2>
          <p className="text-muted-foreground">
            View tournament rounds and player pairings
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* View toggle */}
          <div className="bg-muted flex rounded-md p-1">
            <Button
              variant={viewMode === "table" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2"
              onClick={() => setViewMode("table")}
            >
              <TableIcon className="mr-1 h-3.5 w-3.5" />
              Table
            </Button>
            <Button
              variant={viewMode === "bracket" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2"
              onClick={() => setViewMode("bracket")}
            >
              <LayoutGrid className="mr-1 h-3.5 w-3.5" />
              Bracket
            </Button>
          </div>
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
        </div>
      </div>

      {/* Bracket View */}
      {viewMode === "bracket" && phases && bracketRounds ? (
        <BracketVisualization
          phases={phases
            .filter((phase) => phase.id === selectedPhaseId)
            .map((phase) => transformPhaseData(phase, bracketRounds))}
          canManage={true}
          onMatchClick={(matchId) => {
            // Find match across all bracket rounds
            for (const round of bracketRounds) {
              const match = round.matches.find((m) => String(m.id) === matchId);
              if (match) {
                openReportDialog(match);
                return;
              }
            }
          }}
        />
      ) : null}

      {/* Table View */}
      {viewMode === "table" &&
        (roundsLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </CardContent>
          </Card>
        ) : !rounds || rounds.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Trophy className="text-muted-foreground mb-4 h-12 w-12 opacity-50" />
              <h3 className="mb-2 text-lg font-semibold">No rounds yet</h3>
              <p className="text-muted-foreground text-sm">
                Start the first round from the Overview tab.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>
                {currentPhase?.name ?? "Phase"} - Round{" "}
                {currentRound?.round_number ?? "?"}
              </CardTitle>
              <CardDescription>
                {currentRound?.matchCount ?? 0} matches
                {currentRound?.status && (
                  <>
                    {" "}
                    &middot;{" "}
                    <Badge className={getStatusColor(currentRound.status)}>
                      {currentRound.status.toUpperCase()}
                    </Badge>
                  </>
                )}
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
                    Pairings will appear here once the round is started from the
                    Overview tab.
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
                        <TableRow
                          key={match.id}
                          className="cursor-pointer"
                          onClick={() =>
                            router.push(
                              `/tournaments/${tournament.slug}/matches/${match.id}`
                            )
                          }
                        >
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
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openReportDialog(match);
                                }}
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
        ))}

      {/* Unpaired Players Banner */}
      {unpairedPlayers && unpairedPlayers.length > 0 && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {unpairedPlayers.length} checked-in{" "}
                  {unpairedPlayers.length === 1 ? "player" : "players"} not
                  paired in this round
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  These players checked in after pairings were generated. They
                  will be included in the next round.
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {unpairedPlayers.map((player) => (
                    <Badge
                      key={player.altId}
                      variant="secondary"
                      className="text-xs"
                    >
                      {player.displayName ?? player.username}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
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
