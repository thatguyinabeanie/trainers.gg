"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getPlayerName, type PlayerRef } from "@trainers/utils";
import { useApiQuery } from "@trainers/supabase/react-query";
import {
  type TournamentPairingsData,
  type PhaseRoundsWithMatchesRow,
} from "@/lib/data/tournament-pairings-endpoint";
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
  AlertTriangle,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { BracketVisualization } from "@/components/tournament/bracket-visualization";
import { transformPhaseData } from "@/lib/tournament-utils";

const UNINITIALIZED = Symbol();

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

/** A single match row from allPhaseRounds[n].matches */
type PhaseMatch = PhaseRoundsWithMatchesRow["matches"][number];

/**
 * Derive a winner player object from the flat match data.
 *
 * `getPhaseRoundsWithMatches` returns `winner_alt_id` via `select("*")` but
 * does not join the winner alt row. We reconstruct it from the available
 * player1/player2 objects so `getPlayerName` continues to work.
 */
function deriveWinner(match: PhaseMatch): PlayerRef | null {
  if (!match.winner_alt_id) return null;
  const p1 = match.player1 as { id: number; username: string } | null;
  const p2 = match.player2 as { id: number; username: string } | null;
  if (p1 && p1.id === match.winner_alt_id) {
    return { username: p1.username, display_name: undefined };
  }
  if (p2 && p2.id === match.winner_alt_id) {
    return { username: p2.username, display_name: undefined };
  }
  return null;
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

  // Fetch all pairings data from the API in a single request.
  const {
    data: pairings,
    isLoading: pairingsLoading,
    isError,
    error,
  } = useApiQuery<TournamentPairingsData>(
    ["tournament", tournament.id, "pairings"],
    () =>
      fetch(`/api/v1/tournaments/${tournament.id}/pairings`).then((r) =>
        r.json()
      ),
    { staleTime: 30_000 }
  );

  const phases = pairings?.phases ?? null;

  // Derive the selected phase index for allPhaseRounds lookups.
  const selectedPhaseIndex =
    phases && selectedPhaseId != null
      ? phases.findIndex((p) => p.id === selectedPhaseId)
      : -1;

  // roundsWithStats is only for the first phase from the API shape.
  // For other phases use allPhaseRounds[phaseIndex] rounds (without stats).
  const roundsForSelectedPhase: Array<{
    id: number;
    round_number: number;
    status: string | null;
    matchCount?: number;
  }> =
    selectedPhaseIndex === 0
      ? (pairings?.roundsWithStats ?? [])
      : selectedPhaseIndex > 0
        ? (pairings?.allPhaseRounds[selectedPhaseIndex] ?? []).map((r) => ({
            id: r.id,
            round_number: r.round_number,
            status: r.status,
            matchCount: r.matches.length,
          }))
        : [];

  // Initialize selectedPhaseId from phases — render-time adjustment
  const [prevPhases, setPrevPhases] = useState<typeof phases | symbol>(
    UNINITIALIZED
  );
  if (phases !== prevPhases) {
    setPrevPhases(phases);
    if (!selectedPhaseId && phases && phases.length > 0 && phases[0]) {
      setSelectedPhaseId(phases[0].id);
    }
  }

  // Initialize selectedRoundId from rounds — render-time adjustment
  const [prevRounds, setPrevRounds] = useState<
    typeof roundsForSelectedPhase | symbol
  >(UNINITIALIZED);
  if (roundsForSelectedPhase !== prevRounds) {
    setPrevRounds(roundsForSelectedPhase);
    if (
      selectedRoundId == null ||
      !roundsForSelectedPhase.some((r) => r.id === selectedRoundId)
    ) {
      if (roundsForSelectedPhase.length > 0 && roundsForSelectedPhase[0]) {
        setSelectedRoundId(roundsForSelectedPhase[0].id);
      } else {
        setSelectedRoundId(null);
      }
    }
  }

  // Matches for the selected round — from allPhaseRounds.
  const matchesForSelectedRound: PhaseMatch[] =
    selectedPhaseIndex >= 0 && selectedRoundId != null
      ? ((pairings?.allPhaseRounds[selectedPhaseIndex] ?? []).find(
          (r) => r.id === selectedRoundId
        )?.matches ?? [])
      : [];

  // Bracket rounds for the selected phase.
  const bracketRounds =
    viewMode === "bracket" && selectedPhaseIndex >= 0
      ? (pairings?.allPhaseRounds[selectedPhaseIndex] ?? [])
      : [];

  const unpairedPlayers = pairings?.unpairedPlayers ?? [];

  const currentRound = roundsForSelectedPhase.find(
    (r) => r.id === selectedRoundId
  );
  const currentPhase = phases?.find((p) => p.id === selectedPhaseId);

  const openReportDialog = (match: PhaseMatch) => {
    const p1 = match.player1 as { id: number; username: string } | null;
    const p2 = match.player2 as { id: number; username: string } | null;
    setMatchToReport({
      id: match.id,
      player1: p1 ? { id: p1.id, name: p1.username } : null,
      player2: p2 ? { id: p2.id, name: p2.username } : null,
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
        // Freshness is driven by mutation-triggered cache invalidation
        // (invalidateTournamentCaches in the server action).
      } else {
        toast.error(result.error);
      }
    });
  };

  if (pairingsLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="size-4" />
        <AlertDescription>
          {error instanceof Error ? error.message : "Failed to load pairings"}
        </AlertDescription>
      </Alert>
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
          {roundsForSelectedPhase.length > 0 && (
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
                {roundsForSelectedPhase.map((round) => (
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
      {viewMode === "bracket" && phases && bracketRounds.length >= 0 ? (
        <BracketVisualization
          phases={phases
            .filter((phase) => phase.id === selectedPhaseId)
            .map((phase) => transformPhaseData(phase, bracketRounds))}
          canManage={true}
          onMatchClick={(matchId) => {
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
        (roundsForSelectedPhase.length === 0 ? (
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
                {currentRound?.matchCount ?? matchesForSelectedRound.length}{" "}
                matches
                {currentRound?.status && (
                  <>
                    {" "}
                    &middot;{" "}
                    <StatusBadge status={currentRound.status as Status} />
                  </>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {matchesForSelectedRound.length === 0 ? (
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
                    {matchesForSelectedRound.map((match) => {
                      const isBye = !match.alt2_id;
                      const winner = deriveWinner(match);

                      return (
                        <TableRow
                          key={match.id}
                          className="cursor-pointer"
                          onClick={() =>
                            router.push(
                              `/tournaments/${tournament.slug}/r/${currentRound?.round_number ?? 0}/t/${match.table_number ?? 0}`
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
                                {getPlayerName(match.player1 as PlayerRef)}
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
                                  {getPlayerName(match.player2 as PlayerRef)}
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
                            <StatusBadge
                              status={(match.status ?? "pending") as Status}
                            />
                          </TableCell>
                          <TableCell>
                            {match.status === "completed" ? (
                              <div>
                                <div className="font-medium">
                                  {getPlayerName(winner, "Unknown")}
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
      {unpairedPlayers.length > 0 && (
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
