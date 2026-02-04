"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { Separator } from "@/components/ui/separator";
import { StatusBadge, type Status } from "@/components/ui/status-badge";
import {
  AlertCircle,
  Check,
  Gavel,
  Loader2,
  Gamepad2,
  RotateCcw,
  ShieldAlert,
  Trophy,
  User,
  X,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  submitGameSelectionAction,
  judgeOverrideGameAction,
  judgeResetGameAction,
  clearJudgeRequestAction,
  resetMatchAction,
} from "@/actions/matches";
import type { GameData } from "./game-card";

// ============================================================================
// Types
// ============================================================================

export interface PlayerInfo {
  id: number;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  in_game_name: string | null;
  handle: string | null;
}

export interface PlayerStats {
  wins: number;
  losses: number;
}

interface MatchHeaderProps {
  opponent: PlayerInfo | null;
  myPlayer: PlayerInfo | null;
  opponentStats: PlayerStats | null;
  myStats: PlayerStats | null;
  myWins: number;
  opponentWins: number;
  bestOf: number;
  matchStatus: string;
  staffRequested: boolean;
  roundNumber: number | null;
  tableNumber: number | null;
  isStaff?: boolean;
  // Game reporting props
  games: GameData[] | null;
  gamesLoading: boolean;
  matchId: number;
  myAltId: number | null;
  opponentAltId: number | null;
  myName: string;
  opponentName: string;
  isParticipant: boolean;
  isPlayer1: boolean;
  tournamentId: number;
  userAltId: number | null;
  onGameUpdated: () => void;
}

// ============================================================================
// Player Card
// ============================================================================

function PlayerCard({
  player,
  stats,
  showIGN,
  align = "left",
  isMatchWinner = false,
  className,
}: {
  player: PlayerInfo | null;
  stats: PlayerStats | null;
  showIGN: boolean;
  align?: "left" | "right";
  isMatchWinner?: boolean;
  className?: string;
}) {
  if (!player) return null;

  const displayName = player.display_name ?? player.username;
  const isRight = align === "right";

  return (
    <div
      className={cn(
        "flex items-center gap-3",
        isRight && "flex-row-reverse",
        className
      )}
    >
      <div className="relative shrink-0">
        <Avatar
          className={cn(
            "h-8 w-8 sm:h-12 sm:w-12",
            isMatchWinner && "ring-primary ring-2 after:mix-blend-normal"
          )}
        >
          <AvatarImage src={player.avatar_url ?? undefined} />
          <AvatarFallback>
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
        {isMatchWinner && (
          <div className="bg-primary absolute -top-1 -right-1 z-10 flex h-4 w-4 items-center justify-center rounded-full text-white sm:h-5 sm:w-5">
            <Trophy className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
          </div>
        )}
      </div>
      <div className={cn("min-w-0", isRight && "text-right")}>
        <div
          className={cn(
            "flex items-center gap-2",
            isRight && "flex-row-reverse"
          )}
        >
          {player.handle ? (
            <Link
              href={`/profile/${player.handle}`}
              className={cn(
                "truncate text-sm font-medium hover:underline sm:text-base",
                isMatchWinner ? "text-primary" : "text-foreground/80"
              )}
            >
              {displayName}
            </Link>
          ) : (
            <span
              className={cn(
                "truncate text-sm font-medium sm:text-base",
                isMatchWinner ? "text-primary" : "text-foreground/80"
              )}
            >
              {displayName}
            </span>
          )}
          {stats && (
            <Badge variant="secondary" className="shrink-0 text-[10px]">
              {stats.wins}W-{stats.losses}L
            </Badge>
          )}
        </div>
        {showIGN && player.in_game_name && (
          <div
            className={cn(
              "mt-0.5 flex items-center gap-1",
              isRight && "flex-row-reverse"
            )}
          >
            <Gamepad2 className="text-muted-foreground h-3 w-3 shrink-0" />
            <span className="text-muted-foreground font-mono text-xs">
              {player.in_game_name}
            </span>
            <CopyButton
              text={player.in_game_name}
              label="Copy IGN to clipboard"
              toastMessage="IGN copied!"
              size="xs"
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Score Display (numbers only, pips replaced by game strip)
// ============================================================================

function ScoreDisplay({
  myWins,
  opponentWins,
}: {
  myWins: number;
  opponentWins: number;
}) {
  return (
    <div className="flex items-center gap-2 sm:gap-5">
      <span
        className={cn(
          "text-3xl font-bold tabular-nums transition-colors duration-300 sm:text-5xl",
          opponentWins > myWins ? "text-primary" : "text-foreground/70"
        )}
      >
        {opponentWins}
      </span>
      <span className="text-muted-foreground text-lg sm:text-2xl">&ndash;</span>
      <span
        className={cn(
          "text-3xl font-bold tabular-nums transition-colors duration-300 sm:text-5xl",
          myWins > opponentWins ? "text-primary" : "text-foreground/70"
        )}
      >
        {myWins}
      </span>
    </div>
  );
}

// ============================================================================
// Game Node — a single node on the timeline
// ============================================================================

type GameNodeState =
  | "won"
  | "lost"
  | "active"
  | "disputed"
  | "self-correct"
  | "future";

function ReportButtons({
  onWon,
  onLost,
  isPending,
}: {
  onWon: () => void;
  onLost: () => void;
  isPending: boolean;
}) {
  return (
    <>
      <Button
        size="sm"
        className="h-7 gap-0.5 px-2.5 text-xs"
        onClick={onWon}
        disabled={isPending}
      >
        {isPending ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Trophy className="h-3 w-3" />
        )}
        Won
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-7 gap-0.5 px-2.5 text-xs"
        onClick={onLost}
        disabled={isPending}
      >
        Lost
      </Button>
    </>
  );
}

function GameNode({
  game,
  state,
  isLast,
  locked,
  myAltId,
  opponentAltId,
  tournamentId,
  isParticipant,
  isStaff,
  userAltId,
  myName,
  opponentName,
  onGameUpdated,
}: {
  game: GameData;
  state: GameNodeState;
  isLast: boolean;
  locked: boolean;
  myAltId: number | null;
  opponentAltId: number | null;
  tournamentId: number;
  isParticipant: boolean;
  isStaff: boolean;
  userAltId: number | null;
  myName: string;
  opponentName: string;
  onGameUpdated: () => void;
}) {
  const [isPending, setIsPending] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

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
      setIsEditing(false);
      onGameUpdated();
    } else {
      toast.error(result.error);
    }
  };

  const handleReset = async () => {
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

  // Staff direct winner override (pick winner by name)
  const handleStaffOverride = async (winnerAltId: number) => {
    setIsPending(true);
    const result = await judgeOverrideGameAction(
      game.id,
      winnerAltId,
      tournamentId
    );
    setIsPending(false);
    if (result.success) {
      onGameUpdated();
    } else {
      toast.error(result.error);
    }
  };

  const isResolved = state === "won" || state === "lost";
  const showEditButtons =
    (state === "active" || (state === "self-correct" && isEditing)) &&
    isParticipant;
  const showStaffPicker = state === "active" && isStaff && !isParticipant;

  // Track segment after this node (connects to next node)
  const trackSegment = !isLast && (
    <div
      className={cn(
        "mx-1 h-0.5 w-6 shrink-0 rounded-full transition-colors duration-500 sm:w-8",
        isResolved ? "bg-foreground/15" : "bg-foreground/5"
      )}
    />
  );

  // --- Resolved node (won / lost) ---
  if (state === "won" || state === "lost") {
    const isSelfCorrectable =
      !locked &&
      game.status === "agreed" &&
      isParticipant &&
      game.my_selection != null &&
      !isEditing;

    // For staff/judges: show winner's initial in a neutral teal circle
    const winnerName = game.winner_alt_id === myAltId ? myName : opponentName;
    const winnerInitial = winnerName.charAt(0).toUpperCase();

    return (
      <>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground text-[10px] tabular-nums">
            {game.game_number}
          </span>
          {!isParticipant ? (
            // Staff view: neutral circle with winner's initial
            <div
              className={cn(
                "bg-primary/15 text-primary relative flex h-7 w-7 cursor-default items-center justify-center rounded-full text-xs font-semibold transition-all duration-300",
                game.status === "resolved" && "ring-1 ring-amber-500/30"
              )}
              title={`${winnerName} won`}
            >
              {winnerInitial}
            </div>
          ) : (
            // Player view: trophy / X from their perspective
            <button
              type="button"
              onClick={isSelfCorrectable ? () => setIsEditing(true) : undefined}
              className={cn(
                "relative flex h-7 w-7 items-center justify-center rounded-full transition-all duration-300",
                state === "won"
                  ? "bg-primary/15 text-primary"
                  : "bg-muted text-muted-foreground",
                isSelfCorrectable &&
                  "hover:ring-foreground/10 cursor-pointer hover:ring-2",
                !isSelfCorrectable && "cursor-default",
                game.status === "resolved" && "ring-1 ring-amber-500/30"
              )}
              title={
                isSelfCorrectable
                  ? "Click to change"
                  : game.status === "resolved"
                    ? "Resolved by judge"
                    : undefined
              }
            >
              {state === "won" ? (
                <Trophy className="h-3.5 w-3.5" />
              ) : (
                <X className="h-3.5 w-3.5" />
              )}
            </button>
          )}
          {isStaff && (
            <button
              type="button"
              className="text-muted-foreground/50 hover:text-foreground transition-colors"
              onClick={handleReset}
              disabled={isPending}
              title="Reset game"
            >
              <RotateCcw className="h-2.5 w-2.5" />
            </button>
          )}
        </div>
        {trackSegment}
      </>
    );
  }

  // --- Self-correct editing mode (shows buttons like active) ---
  if (state === "self-correct" && isEditing) {
    return (
      <>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground text-[10px] tabular-nums">
            {game.game_number}
          </span>
          <div className="flex items-center gap-1">
            <ReportButtons
              onWon={() => handleReport(true)}
              onLost={() => handleReport(false)}
              isPending={isPending}
            />
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground ml-0.5"
              onClick={() => setIsEditing(false)}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        {trackSegment}
      </>
    );
  }

  // --- Self-correct (not editing, render as resolved with click-to-edit) ---
  if (state === "self-correct") {
    const iWon = game.winner_alt_id === myAltId;
    return (
      <>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground text-[10px] tabular-nums">
            {game.game_number}
          </span>
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className={cn(
              "hover:ring-foreground/10 relative flex h-7 w-7 cursor-pointer items-center justify-center rounded-full transition-all duration-300 hover:ring-2",
              iWon
                ? "text-primary bg-primary/15"
                : "bg-muted text-muted-foreground"
            )}
            title="Click to change"
          >
            {iWon ? (
              <Trophy className="h-3.5 w-3.5" />
            ) : (
              <X className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
        {trackSegment}
      </>
    );
  }

  // --- Active game (buttons or waiting indicator) ---
  if (state === "active") {
    return (
      <>
        <div className="flex items-center gap-1.5">
          <span className="text-primary text-[10px] font-medium tabular-nums">
            {game.game_number}
          </span>
          {showEditButtons ? (
            <div className="flex items-center gap-1">
              <ReportButtons
                onWon={() => handleReport(true)}
                onLost={() => handleReport(false)}
                isPending={isPending}
              />
            </div>
          ) : showStaffPicker ? (
            <div className="flex items-center gap-1">
              {myAltId && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-muted-foreground h-7 gap-0.5 px-2.5 text-xs"
                  onClick={() => handleStaffOverride(myAltId)}
                  disabled={isPending}
                >
                  {isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Gavel className="h-3 w-3" />
                  )}
                  {myName}
                </Button>
              )}
              {opponentAltId && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-muted-foreground h-7 gap-0.5 px-2.5 text-xs"
                  onClick={() => handleStaffOverride(opponentAltId)}
                  disabled={isPending}
                >
                  {isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Gavel className="h-3 w-3" />
                  )}
                  {opponentName}
                </Button>
              )}
            </div>
          ) : (
            <div className="relative flex h-7 w-7 items-center justify-center">
              <div className="bg-primary/20 absolute inset-0 animate-ping rounded-full opacity-40" />
              <div className="bg-primary/15 ring-primary/30 relative h-7 w-7 rounded-full ring-2" />
            </div>
          )}
        </div>
        {trackSegment}
      </>
    );
  }

  // --- Disputed ---
  if (state === "disputed") {
    return (
      <>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-red-600 tabular-nums dark:text-red-400">
            {game.game_number}
          </span>
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-red-500/20 text-red-600 ring-2 ring-red-500/30 dark:text-red-400">
            <AlertCircle className="h-3.5 w-3.5" />
          </div>
        </div>
        {trackSegment}
      </>
    );
  }

  // --- Future ---
  return (
    <>
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground/40 text-[10px] tabular-nums">
          {game.game_number}
        </span>
        <div className="border-foreground/10 h-7 w-7 rounded-full border-2 border-dashed" />
      </div>
      {trackSegment}
    </>
  );
}

// ============================================================================
// Game Strip — timeline of game nodes
// ============================================================================

function GameStrip({
  games,
  gamesLoading,
  matchStatus,
  bestOf,
  myAltId,
  opponentAltId,
  tournamentId,
  isParticipant,
  isStaff,
  userAltId,
  myName,
  opponentName,
  onGameUpdated,
}: {
  games: GameData[] | null;
  gamesLoading: boolean;
  matchStatus: string;
  bestOf: number;
  myAltId: number | null;
  opponentAltId: number | null;
  tournamentId: number;
  isParticipant: boolean;
  isStaff: boolean;
  userAltId: number | null;
  myName: string;
  opponentName: string;
  onGameUpdated: () => void;
}) {
  if (gamesLoading) {
    return (
      <div className="flex justify-center py-2">
        <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
      </div>
    );
  }

  if (!games || games.length === 0) {
    return null;
  }

  // Hide unnecessary future games when the match is clinched
  const winsNeeded = Math.ceil(bestOf / 2);
  const resolvedStatuses = ["agreed", "resolved"];
  const myWinCount = games.filter(
    (g) => resolvedStatuses.includes(g.status) && g.winner_alt_id === myAltId
  ).length;
  const oppWinCount = games.filter(
    (g) =>
      resolvedStatuses.includes(g.status) && g.winner_alt_id === opponentAltId
  ).length;
  const matchDecided = myWinCount >= winsNeeded || oppWinCount >= winsNeeded;

  const visibleGames = matchDecided
    ? games.filter(
        (g) => resolvedStatuses.includes(g.status) || g.status === "disputed"
      )
    : games;

  const currentGameId = visibleGames.find(
    (g) => !["agreed", "resolved", "cancelled"].includes(g.status)
  )?.id;

  // Determine the highest game_number that has been reported (non-pending).
  // Any agreed game before this is locked — its result is final.
  const highestReportedGameNumber = visibleGames.reduce((max, g) => {
    if (g.status !== "pending" && g.status !== "cancelled") {
      return Math.max(max, g.game_number);
    }
    return max;
  }, 0);

  return (
    <div className="flex items-center justify-center overflow-x-auto pt-4 sm:pt-6">
      <div className="flex items-center gap-2 sm:gap-3">
        {visibleGames.map((game, i) => {
          // A game is locked if a later game has already been reported
          const locked = game.game_number < highestReportedGameNumber;

          let state: GameNodeState = "future";

          if (game.status === "disputed") {
            state = "disputed";
          } else if (
            !locked &&
            game.status === "agreed" &&
            isParticipant &&
            game.my_selection != null
          ) {
            // Self-correct only on the latest reported game
            state = "self-correct";
          } else if (resolvedStatuses.includes(game.status)) {
            state = game.winner_alt_id === myAltId ? "won" : "lost";
          } else if (matchStatus !== "pending") {
            if (
              game.id === currentGameId ||
              (isStaff && !isParticipant && matchStatus === "active")
            ) {
              state = "active";
            }
          }

          return (
            <GameNode
              key={game.id}
              game={game}
              state={state}
              isLast={i === visibleGames.length - 1}
              locked={locked}
              myAltId={myAltId}
              opponentAltId={opponentAltId}
              tournamentId={tournamentId}
              isParticipant={isParticipant}
              isStaff={isStaff}
              userAltId={userAltId}
              myName={myName}
              opponentName={opponentName}
              onGameUpdated={onGameUpdated}
            />
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Dispute Alert (shown below header when a game is disputed)
// ============================================================================

function DisputeAlert({
  games,
  myAltId,
  opponentAltId,
  myName,
  opponentName,
  isPlayer1,
  isStaff,
  tournamentId,
  userAltId,
  onGameUpdated,
}: {
  games: GameData[];
  myAltId: number | null;
  opponentAltId: number | null;
  myName: string;
  opponentName: string;
  isPlayer1: boolean;
  isStaff: boolean;
  tournamentId: number;
  userAltId: number | null;
  onGameUpdated: () => void;
}) {
  const [isPending, setIsPending] = useState(false);
  const [overrideWinners, setOverrideWinners] = useState<
    Record<number, number | null>
  >({});

  const disputedGames = games.filter((g) => g.status === "disputed");
  if (disputedGames.length === 0) return null;

  const handleOverride = async (gameId: number) => {
    const winner = overrideWinners[gameId];
    if (!winner) return;
    setIsPending(true);
    const result = await judgeOverrideGameAction(gameId, winner, tournamentId);
    setIsPending(false);

    if (result.success) {
      toast.success("Game resolved");
      setOverrideWinners((prev) => {
        const next = { ...prev };
        delete next[gameId];
        return next;
      });
      onGameUpdated();
    } else {
      toast.error(result.error);
    }
  };

  const handleReset = async (gameId: number) => {
    setIsPending(true);
    const result = await judgeResetGameAction(gameId, tournamentId);
    setIsPending(false);

    if (result.success) {
      toast.success("Game reset");
      onGameUpdated();
    } else {
      toast.error(result.error);
    }
  };

  return (
    <>
      {disputedGames.map((game) => {
        const p1Label = isPlayer1 ? myName : opponentName;
        const p2Label = isPlayer1 ? opponentName : myName;
        const p1Pick = game.alt1_selection;
        const p2Pick = game.alt2_selection;

        return (
          <div
            key={game.id}
            className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300"
          >
            <div className="flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span className="font-medium">
                Game {game.game_number} disputed
              </span>
            </div>
            <span className="text-red-600/70 dark:text-red-400/70">
              {p1Label}:{" "}
              {p1Pick === (isPlayer1 ? myAltId : opponentAltId)
                ? "Won"
                : "Lost"}
              {" · "}
              {p2Label}:{" "}
              {p2Pick === (isPlayer1 ? opponentAltId : myAltId)
                ? "Won"
                : "Lost"}
            </span>

            {isStaff && (
              <div className="flex items-center gap-1.5">
                <select
                  className="border-input bg-background h-6 rounded-md border px-1.5 text-xs"
                  value={overrideWinners[game.id] ?? ""}
                  onChange={(e) =>
                    setOverrideWinners((prev) => ({
                      ...prev,
                      [game.id]: e.target.value
                        ? parseInt(e.target.value)
                        : null,
                    }))
                  }
                >
                  <option value="">Winner...</option>
                  {myAltId && <option value={myAltId}>{myName}</option>}
                  {opponentAltId && (
                    <option value={opponentAltId}>{opponentName}</option>
                  )}
                </select>
                <Button
                  size="sm"
                  className="h-6 gap-0.5 px-2 text-[11px]"
                  disabled={isPending || !overrideWinners[game.id]}
                  onClick={() => handleOverride(game.id)}
                >
                  {isPending ? (
                    <Loader2 className="h-2.5 w-2.5 animate-spin" />
                  ) : (
                    <Gavel className="h-2.5 w-2.5" />
                  )}
                  Set
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 gap-0.5 px-2 text-[11px]"
                  disabled={isPending}
                  onClick={() => handleReset(game.id)}
                >
                  <RotateCcw className="h-2.5 w-2.5" />
                  Reset
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

// ============================================================================
// Staff Judge Alert
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
    <div className="flex items-center justify-between gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
      <div className="flex items-center gap-1.5">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />A judge has been
        requested.
      </div>
      <Button
        variant="outline"
        size="sm"
        className="h-6 shrink-0 gap-1 border-amber-500/25 px-2 text-[11px] text-amber-700 hover:bg-amber-500/10 dark:text-amber-300"
        onClick={handleClear}
        disabled={isClearing}
      >
        {isClearing ? (
          <Loader2 className="h-2.5 w-2.5 animate-spin" />
        ) : (
          <Check className="h-2.5 w-2.5" />
        )}
        Resolve
      </Button>
    </div>
  );
}

// ============================================================================
// Reset Match Button (staff only, two-click confirmation)
// ============================================================================

function ResetMatchButton({
  matchId,
  tournamentId,
  onReset,
}: {
  matchId: number;
  tournamentId: number;
  onReset: () => void;
}) {
  const [isPending, setIsPending] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const handleClick = async () => {
    if (!confirming) {
      setConfirming(true);
      // Auto-cancel after 3s
      setTimeout(() => setConfirming(false), 3000);
      return;
    }

    setIsPending(true);
    const result = await resetMatchAction(matchId, tournamentId);
    setIsPending(false);
    setConfirming(false);

    if (result.success) {
      toast.success("Match reset");
      onReset();
    } else {
      toast.error(result.error);
    }
  };

  return (
    <Button
      variant={confirming ? "destructive" : "outline"}
      size="sm"
      className={cn(
        "h-6 gap-1 px-2 text-[11px]",
        !confirming &&
          "text-muted-foreground hover:text-destructive border-transparent"
      )}
      onClick={handleClick}
      disabled={isPending}
    >
      {isPending ? (
        <Loader2 className="h-2.5 w-2.5 animate-spin" />
      ) : (
        <RotateCcw className="h-2.5 w-2.5" />
      )}
      {confirming ? "Confirm Reset" : "Reset Match"}
    </Button>
  );
}

// ============================================================================
// Match Header
// ============================================================================

export function MatchHeader({
  opponent,
  myPlayer,
  opponentStats,
  myStats,
  myWins,
  opponentWins,
  bestOf,
  matchStatus,
  staffRequested,
  roundNumber,
  tableNumber,
  isStaff = false,
  games,
  gamesLoading,
  matchId,
  myAltId,
  opponentAltId,
  myName,
  opponentName,
  isParticipant,
  isPlayer1,
  tournamentId,
  userAltId,
  onGameUpdated,
}: MatchHeaderProps) {
  const winsNeeded = Math.ceil(bestOf / 2);
  const matchDecided = myWins >= winsNeeded || opponentWins >= winsNeeded;

  return (
    <div className="space-y-2">
      <Card>
        <CardContent className="p-3 pb-2 sm:px-6 sm:pt-4 sm:pb-2">
          {/* Metadata row */}
          <div className="mb-1 flex items-center justify-between sm:mb-2">
            <div className="flex items-center gap-2">
              {roundNumber !== null && (
                <span className="text-muted-foreground text-xs font-medium">
                  Round {roundNumber}
                </span>
              )}
              {tableNumber !== null && (
                <span className="bg-muted text-foreground rounded-full px-2.5 py-0.5 text-xs font-medium">
                  Table {tableNumber}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {staffRequested && (
                <Badge variant="destructive" className="gap-1">
                  <ShieldAlert className="h-3 w-3" />
                  Judge Requested
                </Badge>
              )}
              {isStaff && (
                <Badge
                  variant="outline"
                  className="gap-1 border-amber-500/25 bg-amber-500/15 text-amber-600 dark:text-amber-400"
                >
                  <Gavel className="h-3 w-3" />
                  Judge
                </Badge>
              )}
              {isStaff && matchStatus === "active" && (
                <ResetMatchButton
                  matchId={matchId}
                  tournamentId={tournamentId}
                  onReset={onGameUpdated}
                />
              )}
              <StatusBadge status={matchStatus as Status} />
            </div>
          </div>

          {/* Players + Score horizontal (all breakpoints) */}
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 sm:gap-6">
            <PlayerCard
              player={opponent}
              stats={opponentStats}
              showIGN={true}
              align="left"
              isMatchWinner={matchDecided && opponentWins > myWins}
              className="min-w-0 flex-1"
            />

            <div className="flex shrink-0 flex-col items-center gap-1">
              <ScoreDisplay myWins={myWins} opponentWins={opponentWins} />
              <div className="text-muted-foreground text-[10px]">
                Bo{bestOf}
              </div>
            </div>

            <PlayerCard
              player={myPlayer}
              stats={myStats}
              showIGN={false}
              align="right"
              isMatchWinner={matchDecided && myWins > opponentWins}
              className="min-w-0 flex-1"
            />
          </div>

          {/* Separator + Game reporting timeline */}
          {((games && games.length > 0) || gamesLoading) && (
            <>
              <Separator className="mt-2 sm:mt-3" />
              <GameStrip
                games={games && games.length > 0 ? games : null}
                gamesLoading={gamesLoading}
                matchStatus={matchStatus}
                bestOf={bestOf}
                myAltId={myAltId}
                opponentAltId={opponentAltId}
                tournamentId={tournamentId}
                isParticipant={isParticipant}
                isStaff={isStaff}
                userAltId={userAltId}
                myName={myName}
                opponentName={opponentName}
                onGameUpdated={onGameUpdated}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Alerts below header card */}
      {games && games.some((g) => g.status === "disputed") && (
        <DisputeAlert
          games={games}
          myAltId={myAltId}
          opponentAltId={opponentAltId}
          myName={myName}
          opponentName={opponentName}
          isPlayer1={isPlayer1}
          isStaff={isStaff}
          tournamentId={tournamentId}
          userAltId={userAltId}
          onGameUpdated={onGameUpdated}
        />
      )}
    </div>
  );
}
