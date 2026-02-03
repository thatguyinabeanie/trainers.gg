"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertCircle,
  Check,
  Gavel,
  Loader2,
  RotateCcw,
  Swords,
  Trophy,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  submitGameSelectionAction,
  judgeOverrideGameAction,
  judgeResetGameAction,
  clearJudgeRequestAction,
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

interface GameRowProps {
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
  isCurrentGame: boolean;
  onGameUpdated: () => void;
}

interface GamesListProps {
  games: GameData[] | null;
  gamesLoading: boolean;
  matchId: number;
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
  staffRequested: boolean;
  onGameUpdated: () => void;
}

// ============================================================================
// Reporting Status (subtle)
// ============================================================================

function ReportingStatus({
  game,
  isParticipant,
  isStaff,
  myName,
  opponentName,
  myAltId,
  isPlayer1,
}: {
  game: GameData;
  isParticipant: boolean;
  isStaff: boolean;
  myName: string;
  opponentName: string;
  myAltId: number | null;
  isPlayer1: boolean;
}) {
  const mySubmitted =
    game.my_selection !== null && game.my_selection !== undefined;
  const oppSubmitted = game.opponent_submitted === true;

  // Staff view: show explicit detail
  if (isStaff) {
    const p1Submitted =
      game.alt1_selection !== null && game.alt1_selection !== undefined;
    const p2Submitted =
      game.alt2_selection !== null && game.alt2_selection !== undefined;
    const count = (p1Submitted ? 1 : 0) + (p2Submitted ? 1 : 0);

    if (count === 0) return null;

    return (
      <div className="text-muted-foreground flex items-center gap-2 text-xs">
        <span>{count} of 2 reported</span>
        <span className="text-muted-foreground/50">&middot;</span>
        <span>
          {myName}:{" "}
          {p1Submitted
            ? game.alt1_selection ===
              (isPlayer1 ? myAltId : game.alt1_selection)
              ? "submitted"
              : "submitted"
            : "waiting"}
        </span>
        <span>
          {opponentName}: {p2Submitted ? "submitted" : "waiting"}
        </span>
      </div>
    );
  }

  // Player view: subtle count
  if (!isParticipant) return null;

  if (mySubmitted && !oppSubmitted) {
    return (
      <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
        <span>1 of 2 reported</span>
      </div>
    );
  }

  if (!mySubmitted && oppSubmitted) {
    return (
      <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
        <span>1 of 2 reported</span>
      </div>
    );
  }

  return null;
}

// ============================================================================
// Resolved Game Row (compact)
// ============================================================================

function ResolvedGameRow({
  game,
  myAltId,
}: {
  game: GameData;
  myAltId: number | null;
}) {
  const iWon =
    game.winner_alt_id !== null ? game.winner_alt_id === myAltId : null;
  const isJudgeResolved = game.status === "resolved";

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground w-16 text-xs font-medium">
          Game {game.game_number}
        </span>
        {iWon === true && (
          <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <Trophy className="h-3 w-3" />
            Won
          </span>
        )}
        {iWon === false && (
          <span className="text-muted-foreground flex items-center gap-1 text-xs">
            <X className="h-3 w-3" />
            Lost
          </span>
        )}
        {iWon === null && (
          <span className="text-muted-foreground text-xs">No result</span>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        {isJudgeResolved && (
          <Badge variant="secondary" className="text-[10px]">
            <Gavel className="mr-0.5 h-2.5 w-2.5" />
            Judge
          </Badge>
        )}
        <Check className="h-3.5 w-3.5 text-emerald-500" />
      </div>
    </div>
  );
}

// ============================================================================
// Active Game Row (expanded with scoring buttons)
// ============================================================================

function ActiveGameRow({
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
}: GameRowProps) {
  const [isPending, setIsPending] = useState(false);
  const [overrideWinner, setOverrideWinner] = useState<number | null>(null);
  const [showJudgeTools, setShowJudgeTools] = useState(isStaff);
  const [highlighted, setHighlighted] = useState(false);
  const prevStatusRef = useRef(game.status);

  // Animate highlight when game status changes via realtime
  useEffect(() => {
    if (prevStatusRef.current !== game.status) {
      prevStatusRef.current = game.status;
      setHighlighted(true);
      const timer = setTimeout(() => setHighlighted(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [game.status]);

  const mySelection = game.my_selection ?? null;
  const hasSubmitted = mySelection !== null;

  const canSubmit =
    isParticipant &&
    !hasSubmitted &&
    ["pending", "awaiting_both", "awaiting_one"].includes(game.status);

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
      onGameUpdated();
    } else {
      toast.error(result.error);
    }
  };

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
      toast.success(`Game ${game.game_number} resolved`);
      setOverrideWinner(null);
      setShowJudgeTools(false);
      onGameUpdated();
    } else {
      toast.error(result.error);
    }
  };

  const handleJudgeReset = async () => {
    setIsPending(true);
    const result = await judgeResetGameAction(game.id, tournamentId);
    setIsPending(false);

    if (result.success) {
      toast.success(`Game ${game.game_number} reset`);
      setShowJudgeTools(false);
      onGameUpdated();
    } else {
      toast.error(result.error);
    }
  };

  const isDisputed = game.status === "disputed";

  return (
    <div
      className={cn(
        "space-y-3 py-3 transition-colors duration-500",
        highlighted && "bg-primary/5"
      )}
    >
      {/* Game header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Game {game.game_number}</span>
          <ReportingStatus
            game={game}
            isParticipant={isParticipant}
            isStaff={isStaff}
            myName={myName}
            opponentName={opponentName}
            myAltId={myAltId}
            isPlayer1={isPlayer1}
          />
        </div>
        <div className="flex items-center gap-2">
          {isStaff && !isDisputed && (
            <button
              onClick={() => setShowJudgeTools(!showJudgeTools)}
              className="text-muted-foreground hover:text-foreground rounded p-1 transition-colors"
            >
              <Gavel className="h-3.5 w-3.5" />
            </button>
          )}
          <GameStatusBadge status={game.status} />
        </div>
      </div>

      {/* Disputed state */}
      {isDisputed && (
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

      {/* Submitted — waiting for opponent (subtle) */}
      {hasSubmitted &&
        !["agreed", "disputed", "resolved"].includes(game.status) && (
          <div className="text-muted-foreground flex items-center gap-2 text-xs">
            <Check className="h-3 w-3 text-emerald-500" />
            <span>Reported</span>
            <span>&middot;</span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
              Waiting for opponent
            </span>
          </div>
        )}

      {/* Non-participant view — awaiting reports */}
      {!isParticipant && ["pending", "awaiting_both"].includes(game.status) && (
        <p className="text-muted-foreground text-xs">Awaiting player reports</p>
      )}

      {/* Judge tools (collapsible) */}
      {isStaff &&
        (showJudgeTools || isDisputed) &&
        ["disputed", "awaiting_one", "awaiting_both", "pending"].includes(
          game.status
        ) && (
          <div className="border-foreground/5 animate-in fade-in slide-in-from-top-1 flex flex-wrap items-center gap-2 border-t pt-3 duration-200">
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
      {isStaff &&
        ["awaiting_one", "awaiting_both"].includes(game.status) &&
        !showJudgeTools && (
          <div className="text-muted-foreground space-y-0.5 text-xs">
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
    </div>
  );
}

// ============================================================================
// Future Game Row (muted, no buttons)
// ============================================================================

function FutureGameRow({ gameNumber }: { gameNumber: number }) {
  return (
    <div className="py-2">
      <span className="text-muted-foreground text-xs">Game {gameNumber}</span>
    </div>
  );
}

// ============================================================================
// Game Status Badge
// ============================================================================

function GameStatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    pending: "Pending",
    awaiting_both: "Awaiting Reports",
    awaiting_one: "1 Report In",
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
// GameRow — dispatches between resolved, active, and future views
// ============================================================================

function GameRow(props: GameRowProps) {
  const { game, myAltId, matchStatus, isCurrentGame } = props;

  const isResolved = ["agreed", "resolved"].includes(game.status);

  if (isResolved) {
    return <ResolvedGameRow game={game} myAltId={myAltId} />;
  }

  if (matchStatus === "pending") {
    return <FutureGameRow gameNumber={game.game_number} />;
  }

  // Only the current game (first unresolved) gets the active treatment
  if (isCurrentGame) {
    return <ActiveGameRow {...props} />;
  }

  return <FutureGameRow gameNumber={game.game_number} />;
}

// ============================================================================
// Staff Judge Alert (with clear button)
// ============================================================================

function StaffJudgeAlert({
  matchId,
  tournamentId,
  onCleared,
}: {
  matchId: number;
  tournamentId: number;
  onCleared: () => void;
}) {
  const [isClearing, setIsClearing] = useState(false);

  const handleClear = async () => {
    setIsClearing(true);
    const result = await clearJudgeRequestAction(matchId, tournamentId);
    setIsClearing(false);

    if (result.success) {
      toast.success("Judge request cleared");
      onCleared();
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 shrink-0" />A judge has been requested
        for this match.
      </div>
      <Button
        variant="outline"
        size="sm"
        className="shrink-0 gap-1 border-amber-500/25 text-amber-700 hover:bg-amber-500/10 dark:text-amber-300"
        onClick={handleClear}
        disabled={isClearing}
      >
        {isClearing ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Check className="h-3 w-3" />
        )}
        Resolve
      </Button>
    </div>
  );
}

// ============================================================================
// GamesList — single card container for all games
// ============================================================================

export function GamesList({
  games,
  gamesLoading,
  matchId,
  myAltId,
  opponentAltId,
  myName,
  opponentName,
  isParticipant,
  isStaff,
  isPlayer1,
  matchStatus,
  tournamentId,
  userAltId,
  staffRequested,
  onGameUpdated,
}: GamesListProps) {
  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Swords className="h-4 w-4" />
          Games
        </CardTitle>
      </CardHeader>
      <CardContent>
        {gamesLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
          </div>
        ) : !games || games.length === 0 ? (
          <div className="text-muted-foreground py-6 text-center text-sm">
            Games will appear once the round starts.
          </div>
        ) : (
          <div className="divide-foreground/5 divide-y">
            {(() => {
              // Find the first unresolved game — that's the "current" game
              const currentGameId = games.find(
                (g) => !["agreed", "resolved", "cancelled"].includes(g.status)
              )?.id;

              return games.map((game) => (
                <GameRow
                  key={game.id}
                  game={game}
                  myAltId={myAltId}
                  opponentAltId={opponentAltId}
                  myName={myName}
                  opponentName={opponentName}
                  isParticipant={isParticipant}
                  isStaff={isStaff}
                  isPlayer1={isPlayer1}
                  matchStatus={matchStatus}
                  tournamentId={tournamentId}
                  userAltId={userAltId}
                  isCurrentGame={game.id === currentGameId}
                  onGameUpdated={onGameUpdated}
                />
              ));
            })()}
          </div>
        )}

        {/* Staff judge alert with clear button */}
        {isStaff && matchStatus === "active" && staffRequested && (
          <StaffJudgeAlert
            matchId={matchId}
            tournamentId={tournamentId}
            onCleared={onGameUpdated}
          />
        )}
      </CardContent>
    </Card>
  );
}

// Keep individual GameCard export for backwards compatibility during migration
export { type GameData as GameDataType };
