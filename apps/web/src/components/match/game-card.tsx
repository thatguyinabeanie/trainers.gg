"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertCircle,
  Check,
  Gavel,
  Loader2,
  RotateCcw,
  Trophy,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  submitGameSelectionAction,
  judgeOverrideGameAction,
  judgeResetGameAction,
} from "@/actions/matches";

// ============================================================================
// Types
// ============================================================================

export interface GameData {
  id: number;
  game_number: number;
  status: string;
  winner_alt_id: number | null;
  // Player view (redacted)
  my_selection?: number | null;
  opponent_submitted?: boolean;
  // Staff view (raw) — also revealed after agreed/disputed/resolved
  alt1_selection?: number | null;
  alt2_selection?: number | null;
  resolved_by?: number | null;
}

interface GameCardProps {
  game: GameData;
  myAltId: number | null;
  opponentAltId: number | null;
  myName: string;
  opponentName: string;
  isParticipant: boolean;
  isStaff: boolean;
  isPlayer1: boolean;
  matchStatus: string;
  tournamentId: number;
  userAltId?: number | null;
  onGameUpdated: () => void;
}

// ============================================================================
// Compact Resolved Game (collapsed line)
// ============================================================================

function ResolvedGameLine({
  gameNumber,
  iWon,
  isDisputed,
  isResolved,
}: {
  gameNumber: number;
  iWon: boolean | null;
  isDisputed: boolean;
  isResolved: boolean;
}) {
  return (
    <div className="bg-muted/30 ring-foreground/5 flex items-center justify-between rounded-lg px-3 py-2 ring-1">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-xs font-medium">
          Game {gameNumber}
        </span>
        {iWon === true && (
          <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <Trophy className="h-3 w-3" />
            Won
          </span>
        )}
        {iWon === false && (
          <span className="text-muted-foreground flex items-center gap-1 text-xs font-medium">
            <X className="h-3 w-3" />
            Lost
          </span>
        )}
        {iWon === null && (
          <span className="text-muted-foreground text-xs">No result</span>
        )}
      </div>
      <div className="flex items-center gap-1">
        {isResolved && (
          <Badge variant="secondary" className="text-[10px]">
            <Gavel className="mr-0.5 h-2.5 w-2.5" />
            Judge
          </Badge>
        )}
        {isDisputed && (
          <Badge variant="destructive" className="text-[10px]">
            Disputed
          </Badge>
        )}
        <Check className="h-3.5 w-3.5 text-emerald-500" />
      </div>
    </div>
  );
}

// ============================================================================
// Active Game Card (expanded with scoring buttons)
// ============================================================================

function ActiveGameContent({
  game,
  myAltId,
  opponentAltId,
  myName,
  opponentName,
  isParticipant,
  isStaff,
  isPlayer1,
  tournamentId,
  userAltId,
  onGameUpdated,
}: Omit<GameCardProps, "matchStatus">) {
  const [isPending, setIsPending] = useState(false);
  const [overrideWinner, setOverrideWinner] = useState<number | null>(null);

  const mySelection = game.my_selection ?? null;
  const hasSubmitted = mySelection !== null;

  const canSubmit =
    isParticipant &&
    !hasSubmitted &&
    ["pending", "awaiting_both", "awaiting_one"].includes(game.status);

  const iReportedWin = mySelection === myAltId;

  // Handle player reporting
  const handleReport = async (iWon: boolean) => {
    if (!myAltId || !opponentAltId) return;
    setIsPending(true);
    const winnerId = iWon ? myAltId : opponentAltId;
    const result = await submitGameSelectionAction(
      game.id,
      winnerId,
      tournamentId
    );
    setIsPending(false);

    if (result.success) {
      toast.success(`Game ${game.game_number} reported`);
      onGameUpdated();
    } else {
      toast.error(result.error);
    }
  };

  // Judge override — uses userAltId (the staff member's actual alt ID)
  const judgeAltId = userAltId ?? myAltId;
  const handleJudgeOverride = async () => {
    if (!overrideWinner || !judgeAltId) return;
    setIsPending(true);
    const result = await judgeOverrideGameAction(
      game.id,
      overrideWinner,
      judgeAltId,
      tournamentId
    );
    setIsPending(false);

    if (result.success) {
      toast.success(`Game ${game.game_number} resolved by judge`);
      setOverrideWinner(null);
      onGameUpdated();
    } else {
      toast.error(result.error);
    }
  };

  // Judge reset
  const handleJudgeReset = async () => {
    setIsPending(true);
    const result = await judgeResetGameAction(game.id, tournamentId);
    setIsPending(false);

    if (result.success) {
      toast.success(`Game ${game.game_number} reset`);
      onGameUpdated();
    } else {
      toast.error(result.error);
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        {/* Game header */}
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium">Game {game.game_number}</span>
          <GameStatusBadge status={game.status} />
        </div>

        {/* Scoring buttons */}
        {canSubmit && (
          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={() => handleReport(true)}
              disabled={isPending}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}I
              Won
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => handleReport(false)}
              disabled={isPending}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}I
              Lost
            </Button>
          </div>
        )}

        {/* Submitted — waiting for opponent */}
        {hasSubmitted &&
          !["agreed", "disputed", "resolved"].includes(game.status) && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-emerald-500" />
                <span>
                  You reported:{" "}
                  <span className="font-medium">
                    {iReportedWin ? "Won" : "Lost"}
                  </span>
                </span>
              </div>
              <div className="text-muted-foreground flex items-center gap-2 text-xs">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                Waiting for {opponentName}...
              </div>
            </div>
          )}

        {/* Disputed state */}
        {game.status === "disputed" && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 rounded-md bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Results don&apos;t match — a judge will resolve this.
            </div>
            {(isStaff || isParticipant) && (
              <div className="text-muted-foreground space-y-0.5 text-xs">
                <p>
                  {myName}:{" "}
                  {game.alt1_selection
                    ? isPlayer1
                      ? game.alt1_selection === myAltId
                        ? "Won"
                        : "Lost"
                      : game.alt2_selection === myAltId
                        ? "Won"
                        : "Lost"
                    : "..."}
                </p>
                <p>
                  {opponentName}:{" "}
                  {game.alt1_selection
                    ? isPlayer1
                      ? game.alt2_selection === opponentAltId
                        ? "Won"
                        : "Lost"
                      : game.alt1_selection === opponentAltId
                        ? "Won"
                        : "Lost"
                    : "..."}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Not a participant — read only */}
        {!isParticipant && !isStaff && game.status === "pending" && (
          <p className="text-muted-foreground text-sm">
            Awaiting player reports
          </p>
        )}

        {/* Judge actions */}
        {isStaff &&
          ["disputed", "awaiting_one", "awaiting_both", "pending"].includes(
            game.status
          ) && (
            <div className="border-foreground/5 mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
              {["disputed", "awaiting_one", "awaiting_both"].includes(
                game.status
              ) && (
                <>
                  <select
                    className="border-input bg-background rounded-md border px-2 py-1 text-sm"
                    value={overrideWinner ?? ""}
                    onChange={(e) =>
                      setOverrideWinner(
                        e.target.value ? parseInt(e.target.value) : null
                      )
                    }
                  >
                    <option value="">Select winner...</option>
                    {myAltId && <option value={myAltId}>{myName}</option>}
                    {opponentAltId && (
                      <option value={opponentAltId}>{opponentName}</option>
                    )}
                  </select>
                  <Button
                    size="sm"
                    disabled={isPending || !overrideWinner}
                    onClick={handleJudgeOverride}
                  >
                    {isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Gavel className="mr-2 h-4 w-4" />
                    )}
                    Override
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={handleJudgeReset}
              >
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="mr-2 h-4 w-4" />
                )}
                Reset
              </Button>
            </div>
          )}

        {/* Staff selections visibility */}
        {isStaff && ["awaiting_one", "awaiting_both"].includes(game.status) && (
          <div className="text-muted-foreground mt-2 space-y-0.5 text-xs">
            <p>
              P1:{" "}
              {game.alt1_selection
                ? game.alt1_selection === myAltId
                  ? myName
                  : opponentName
                : "Not submitted"}
            </p>
            <p>
              P2:{" "}
              {game.alt2_selection
                ? game.alt2_selection === myAltId
                  ? myName
                  : opponentName
                : "Not submitted"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Game Status Badge
// ============================================================================

function GameStatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    pending: "Pending",
    awaiting_both: "Awaiting Reports",
    awaiting_one: "Awaiting 1 Report",
    agreed: "Agreed",
    disputed: "Disputed",
    resolved: "Resolved",
    cancelled: "Cancelled",
  };

  const variants: Record<string, "default" | "secondary" | "destructive"> = {
    pending: "secondary",
    awaiting_both: "secondary",
    awaiting_one: "secondary",
    agreed: "default",
    disputed: "destructive",
    resolved: "default",
    cancelled: "secondary",
  };

  return (
    <Badge variant={variants[status] ?? "secondary"} className="text-[10px]">
      {labels[status] ?? status}
    </Badge>
  );
}

// ============================================================================
// Main GameCard — dispatches between collapsed and expanded views
// ============================================================================

export function GameCard(props: GameCardProps) {
  const { game, myAltId, matchStatus } = props;

  const isResolved = ["agreed", "resolved"].includes(game.status);
  const isDisputed = game.status === "disputed";

  // Resolved/agreed games show as collapsed lines
  if (isResolved && !isDisputed) {
    const iWon =
      game.winner_alt_id !== null ? game.winner_alt_id === myAltId : null;

    return (
      <ResolvedGameLine
        gameNumber={game.game_number}
        iWon={iWon}
        isDisputed={false}
        isResolved={game.status === "resolved"}
      />
    );
  }

  // Pending match — game not yet playable
  if (matchStatus === "pending") {
    return (
      <div className="bg-muted/20 ring-foreground/5 rounded-lg px-3 py-2 ring-1">
        <span className="text-muted-foreground text-xs">
          Game {game.game_number} — waiting for round to start
        </span>
      </div>
    );
  }

  // Active or disputed — show full card
  return <ActiveGameContent {...props} />;
}
