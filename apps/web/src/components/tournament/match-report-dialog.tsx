"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/lib/convex/api";
import type { Id } from "@trainers/backend/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Trophy,
  Swords,
  AlertCircle,
  Loader2,
  CheckCircle2,
  User,
} from "lucide-react";
import { toast } from "sonner";

interface MatchReportDialogProps {
  matchId: Id<"tournamentMatches"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReportSubmitted?: () => void;
}

export function MatchReportDialog({
  matchId,
  open,
  onOpenChange,
  onReportSubmitted,
}: MatchReportDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [winnerId, setWinnerId] = useState<Id<"profiles"> | null>(null);
  const [player1Score, setPlayer1Score] = useState("2");
  const [player2Score, setPlayer2Score] = useState("0");

  const matchDetails = useQuery(
    api.tournaments.matches.getMatchDetails,
    matchId ? { matchId } : "skip"
  );

  const reportResult = useMutation(api.tournaments.matches.reportMatchResult);
  const startMatch = useMutation(api.tournaments.matches.startMatch);

  const handleStartMatch = async () => {
    if (!matchId) return;

    setIsSubmitting(true);
    try {
      await startMatch({ matchId });
      toast.success("Match started", {
        description: "The match timer has begun",
      });
    } catch (error) {
      toast.error("Failed to start match", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!matchId || !winnerId) {
      toast.error("Invalid submission", {
        description: "Please select a winner",
      });
      return;
    }

    const score1 = parseInt(player1Score) || 0;
    const score2 = parseInt(player2Score) || 0;

    if (score1 === score2) {
      toast.error("Invalid scores", {
        description: "Scores cannot be tied",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await reportResult({
        data: {
          matchId,
          winnerId,
          player1Score: score1,
          player2Score: score2,
        },
      });

      toast.success("Match reported", {
        description: "The match result has been recorded",
      });

      // Reset form
      setWinnerId(null);
      setPlayer1Score("2");
      setPlayer2Score("0");

      onReportSubmitted?.();
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to report match", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!matchDetails) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const { match, player1, player2, round, tournament } = matchDetails;
  const isMatchActive = match.status === "active";
  const isMatchPending = match.status === "pending";
  const isMatchCompleted = match.status === "completed";

  // Auto-select winner based on scores
  const updateWinnerFromScores = (p1Score: string, p2Score: string) => {
    const s1 = parseInt(p1Score) || 0;
    const s2 = parseInt(p2Score) || 0;

    if (s1 > s2 && player1) {
      setWinnerId(player1.id);
    } else if (s2 > s1 && player2) {
      setWinnerId(player2.id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Swords className="h-5 w-5" />
            {isMatchCompleted ? "Match Result" : "Report Match Result"}
          </DialogTitle>
          <DialogDescription>
            {tournament.name} • {round.name} • Table {match.matchNumber}
          </DialogDescription>
        </DialogHeader>

        {isMatchCompleted && (
          <Alert className="border-green-500/50 bg-green-500/10">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-600">
              This match has already been reported
            </AlertDescription>
          </Alert>
        )}

        {isMatchPending && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This match needs to be started before reporting results
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          {/* Players */}
          <div className="grid grid-cols-2 gap-4">
            {/* Player 1 */}
            <div
              className={`rounded-lg border p-4 transition-colors ${
                winnerId === player1?.id
                  ? "border-green-500 bg-green-500/10"
                  : match.winnerProfileId === player1?.id
                    ? "border-green-500/50 bg-green-500/5"
                    : ""
              }`}
            >
              <div className="mb-3 flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={player1?.avatarUrl} />
                  <AvatarFallback>
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{player1?.name || "BYE"}</p>
                  <p className="text-muted-foreground text-xs">Player 1</p>
                </div>
                {match.winnerProfileId === player1?.id && (
                  <Badge variant="default" className="bg-green-600">
                    <Trophy className="mr-1 h-3 w-3" />
                    Winner
                  </Badge>
                )}
              </div>

              {!isMatchCompleted && player1 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="player1-score">Games Won</Label>
                    <Input
                      id="player1-score"
                      type="number"
                      min="0"
                      max="3"
                      value={player1Score}
                      onChange={(e) => {
                        setPlayer1Score(e.target.value);
                        updateWinnerFromScores(e.target.value, player2Score);
                      }}
                      disabled={!isMatchActive || isSubmitting}
                    />
                  </div>
                </>
              )}

              {isMatchCompleted && (
                <div className="text-center">
                  <p className="text-3xl font-bold">{match.gameWins1 || 0}</p>
                  <p className="text-muted-foreground text-xs">Games Won</p>
                </div>
              )}
            </div>

            {/* VS Divider */}
            <div className="flex items-center justify-center">
              <div className="text-center">
                <Badge variant="outline">VS</Badge>
              </div>
            </div>

            {/* Player 2 */}
            <div
              className={`rounded-lg border p-4 transition-colors ${
                winnerId === player2?.id
                  ? "border-green-500 bg-green-500/10"
                  : match.winnerProfileId === player2?.id
                    ? "border-green-500/50 bg-green-500/5"
                    : ""
              }`}
            >
              <div className="mb-3 flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={player2?.avatarUrl} />
                  <AvatarFallback>
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{player2?.name || "BYE"}</p>
                  <p className="text-muted-foreground text-xs">Player 2</p>
                </div>
                {match.winnerProfileId === player2?.id && (
                  <Badge variant="default" className="bg-green-600">
                    <Trophy className="mr-1 h-3 w-3" />
                    Winner
                  </Badge>
                )}
              </div>

              {!isMatchCompleted && player2 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="player2-score">Games Won</Label>
                    <Input
                      id="player2-score"
                      type="number"
                      min="0"
                      max="3"
                      value={player2Score}
                      onChange={(e) => {
                        setPlayer2Score(e.target.value);
                        updateWinnerFromScores(player1Score, e.target.value);
                      }}
                      disabled={!isMatchActive || isSubmitting}
                    />
                  </div>
                </>
              )}

              {isMatchCompleted && (
                <div className="text-center">
                  <p className="text-3xl font-bold">{match.gameWins2 || 0}</p>
                  <p className="text-muted-foreground text-xs">Games Won</p>
                </div>
              )}
            </div>
          </div>

          {/* Winner Selection */}
          {!isMatchCompleted && isMatchActive && (
            <>
              <Separator />
              <div className="space-y-3">
                <Label>Select Winner</Label>
                <RadioGroup
                  value={winnerId || ""}
                  onValueChange={(value) =>
                    setWinnerId(value as Id<"profiles">)
                  }
                  disabled={isSubmitting}
                >
                  {player1 && (
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value={player1.id} id="winner-1" />
                      <Label
                        htmlFor="winner-1"
                        className="flex-1 cursor-pointer"
                      >
                        {player1.name} wins
                      </Label>
                    </div>
                  )}
                  {player2 && (
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value={player2.id} id="winner-2" />
                      <Label
                        htmlFor="winner-2"
                        className="flex-1 cursor-pointer"
                      >
                        {player2.name} wins
                      </Label>
                    </div>
                  )}
                </RadioGroup>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isMatchCompleted ? "Close" : "Cancel"}
          </Button>

          {isMatchPending && (
            <Button onClick={handleStartMatch} disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Start Match
            </Button>
          )}

          {isMatchActive && (
            <Button onClick={handleSubmit} disabled={!winnerId || isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Report Result
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
