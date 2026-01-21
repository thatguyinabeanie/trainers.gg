"use client";

import { useState, useCallback } from "react";
import { useSupabaseQuery, useSupabaseMutation } from "@/lib/supabase";
import {
  getMatchDetails,
  reportMatchResult,
  startMatch,
} from "@trainers/supabase";
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
  matchId: string | null;
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
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [player1Score, setPlayer1Score] = useState("2");
  const [player2Score, setPlayer2Score] = useState("0");

  const { data: matchDetails } = useSupabaseQuery(
    useCallback(
      async (supabase) => {
        if (!matchId) return null;
        return getMatchDetails(supabase, matchId);
      },
      [matchId]
    ),
    [matchId]
  );

  const { mutateAsync: reportResultMutation } = useSupabaseMutation(
    (
      supabase,
      args: {
        matchId: string;
        winnerId: string;
        player1Score: number;
        player2Score: number;
      }
    ) =>
      reportMatchResult(
        supabase,
        args.matchId,
        args.winnerId,
        args.player1Score,
        args.player2Score
      )
  );

  const { mutateAsync: startMatchMutation } = useSupabaseMutation(
    (supabase, args: { matchId: string }) => startMatch(supabase, args.matchId)
  );

  const handleStartMatch = async () => {
    if (!matchId) return;

    setIsSubmitting(true);
    try {
      await startMatchMutation({ matchId });
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
      await reportResultMutation({
        matchId,
        winnerId,
        player1Score: score1,
        player2Score: score2,
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

  // Supabase returns arrays for joined relations - get the first item
  const p1 = Array.isArray(player1) ? player1[0] : player1;
  const p2 = Array.isArray(player2) ? player2[0] : player2;

  const isMatchActive = match.status === "active";
  const isMatchPending = match.status === "pending";
  const isMatchCompleted = match.status === "completed";

  // Auto-select winner based on scores
  const updateWinnerFromScores = (p1Score: string, p2Score: string) => {
    const s1 = parseInt(p1Score) || 0;
    const s2 = parseInt(p2Score) || 0;

    if (s1 > s2 && p1) {
      setWinnerId(p1.id);
    } else if (s2 > s1 && p2) {
      setWinnerId(p2.id);
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
            {tournament?.name ?? "Tournament"} • {round?.name ?? "Round"}
            {match.table_number ? ` • Table ${match.table_number}` : ""}
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
                winnerId === p1?.id
                  ? "border-green-500 bg-green-500/10"
                  : match.winner_profile_id === p1?.id
                    ? "border-green-500/50 bg-green-500/5"
                    : ""
              }`}
            >
              <div className="mb-3 flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={p1?.avatar_url ?? undefined} />
                  <AvatarFallback>
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">
                    {p1?.display_name ?? p1?.username ?? "BYE"}
                  </p>
                  <p className="text-muted-foreground text-xs">Player 1</p>
                </div>
                {match.winner_profile_id === p1?.id && (
                  <Badge variant="default" className="bg-green-600">
                    <Trophy className="mr-1 h-3 w-3" />
                    Winner
                  </Badge>
                )}
              </div>

              {!isMatchCompleted && p1 && (
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
                  <p className="text-3xl font-bold">{match.game_wins1 || 0}</p>
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
                winnerId === p2?.id
                  ? "border-green-500 bg-green-500/10"
                  : match.winner_profile_id === p2?.id
                    ? "border-green-500/50 bg-green-500/5"
                    : ""
              }`}
            >
              <div className="mb-3 flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={p2?.avatar_url ?? undefined} />
                  <AvatarFallback>
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">
                    {p2?.display_name ?? p2?.username ?? "BYE"}
                  </p>
                  <p className="text-muted-foreground text-xs">Player 2</p>
                </div>
                {match.winner_profile_id === p2?.id && (
                  <Badge variant="default" className="bg-green-600">
                    <Trophy className="mr-1 h-3 w-3" />
                    Winner
                  </Badge>
                )}
              </div>

              {!isMatchCompleted && p2 && (
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
                  <p className="text-3xl font-bold">{match.game_wins2 || 0}</p>
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
                  onValueChange={(value) => setWinnerId(value)}
                  disabled={isSubmitting}
                >
                  {p1 && (
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value={p1.id} id="winner-1" />
                      <Label
                        htmlFor="winner-1"
                        className="flex-1 cursor-pointer"
                      >
                        {p1.display_name ?? p1.username} wins
                      </Label>
                    </div>
                  )}
                  {p2 && (
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value={p2.id} id="winner-2" />
                      <Label
                        htmlFor="winner-2"
                        className="flex-1 cursor-pointer"
                      >
                        {p2.display_name ?? p2.username} wins
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
