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
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  submitGameSelectionAction,
  judgeOverrideGameAction,
  judgeResetGameAction,
  clearJudgeRequestAction,
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
  className,
}: {
  player: PlayerInfo | null;
  stats: PlayerStats | null;
  showIGN: boolean;
  align?: "left" | "right";
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
      <Avatar className="h-10 w-10 shrink-0 sm:h-12 sm:w-12">
        <AvatarImage src={player.avatar_url ?? undefined} />
        <AvatarFallback>
          <User className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
      <div className={cn("min-w-0", isRight && "text-right")}>
        <div
          className={cn(
            "flex items-center gap-2",
            isRight && "flex-row-reverse"
          )}
        >
          <span className="truncate text-sm font-medium sm:text-base">
            {displayName}
          </span>
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
    <div className="flex items-center gap-3 sm:gap-5">
      <span
        className={cn(
          "text-4xl font-bold tabular-nums transition-colors duration-300 sm:text-5xl",
          opponentWins > myWins ? "text-primary" : "text-foreground"
        )}
      >
        {opponentWins}
      </span>
      <span className="text-muted-foreground text-xl sm:text-2xl">&ndash;</span>
      <span
        className={cn(
          "text-4xl font-bold tabular-nums transition-colors duration-300 sm:text-5xl",
          myWins > opponentWins ? "text-primary" : "text-foreground"
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

function GameNode({
  game,
  state,
  isLast,
  myAltId,
  opponentAltId,
  tournamentId,
  isParticipant,
  isStaff,
  onGameUpdated,
}: {
  game: GameData;
  state: GameNodeState;
  isLast: boolean;
  myAltId: number | null;
  opponentAltId: number | null;
  tournamentId: number;
  isParticipant: boolean;
  isStaff: boolean;
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

  const isResolved = state === "won" || state === "lost";
  const showEditButtons =
    (state === "active" || (state === "self-correct" && isEditing)) &&
    isParticipant;

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
  if (isResolved && state !== "lost" && state !== "won") {
    return null; // type guard
  }
  if (state === "won" || state === "lost") {
    const isSelfCorrectable =
      game.status === "agreed" &&
      isParticipant &&
      game.my_selection != null &&
      !isEditing;

    return (
      <>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground text-[10px] tabular-nums">
            {game.game_number}
          </span>
          <button
            type="button"
            onClick={isSelfCorrectable ? () => setIsEditing(true) : undefined}
            className={cn(
              "relative flex h-7 w-7 items-center justify-center rounded-full transition-all duration-300",
              state === "won"
                ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
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
            <Button
              size="sm"
              className="h-7 gap-0.5 px-2.5 text-xs"
              onClick={() => handleReport(true)}
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
              onClick={() => handleReport(false)}
              disabled={isPending}
            >
              Lost
            </Button>
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
                ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
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
              <Button
                size="sm"
                className="h-7 gap-0.5 px-2.5 text-xs"
                onClick={() => handleReport(true)}
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
                onClick={() => handleReport(false)}
                disabled={isPending}
              >
                Lost
              </Button>
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

  return (
    <div className="flex items-center justify-center py-2">
      {visibleGames.map((game, i) => {
        let state: GameNodeState = "future";

        if (game.status === "disputed") {
          state = "disputed";
        } else if (
          game.status === "agreed" &&
          isParticipant &&
          game.my_selection != null
        ) {
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
            myAltId={myAltId}
            opponentAltId={opponentAltId}
            tournamentId={tournamentId}
            isParticipant={isParticipant}
            isStaff={isStaff}
            onGameUpdated={onGameUpdated}
          />
        );
      })}
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
  const [overrideWinner, setOverrideWinner] = useState<number | null>(null);

  const disputedGames = games.filter((g) => g.status === "disputed");
  if (disputedGames.length === 0) return null;

  const judgeAltId = userAltId ?? myAltId;

  const handleOverride = async (gameId: number) => {
    if (!overrideWinner || !judgeAltId) return;
    setIsPending(true);
    const result = await judgeOverrideGameAction(
      gameId,
      overrideWinner,
      judgeAltId,
      tournamentId
    );
    setIsPending(false);

    if (result.success) {
      toast.success("Game resolved");
      setOverrideWinner(null);
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
                  value={overrideWinner ?? ""}
                  onChange={(e) =>
                    setOverrideWinner(
                      e.target.value ? parseInt(e.target.value) : null
                    )
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
                  disabled={isPending || !overrideWinner}
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
  return (
    <div className="space-y-2">
      <Card>
        <CardContent className="p-4 sm:px-6 sm:py-4">
          {/* Metadata row */}
          <div className="mb-2 flex items-center justify-between">
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
              <StatusBadge status={matchStatus as Status} />
            </div>
          </div>

          {/* Desktop: Players + Score horizontal */}
          <div className="mx-auto hidden max-w-2xl items-center justify-between gap-6 sm:flex">
            <PlayerCard
              player={opponent}
              stats={opponentStats}
              showIGN={true}
              align="left"
            />

            <div className="flex flex-col items-center gap-1">
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
            />
          </div>

          {/* Mobile: Stacked layout */}
          <div className="flex flex-col items-center gap-3 sm:hidden">
            <PlayerCard
              player={opponent}
              stats={opponentStats}
              showIGN={true}
              align="left"
              className="w-full"
            />

            <div className="flex flex-col items-center gap-1">
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
              className="w-full"
            />
          </div>

          {/* Separator + Game reporting timeline */}
          {games && games.length > 0 && (
            <>
              <Separator className="mt-3" />
              <GameStrip
                games={games}
                gamesLoading={gamesLoading}
                matchStatus={matchStatus}
                bestOf={bestOf}
                myAltId={myAltId}
                opponentAltId={opponentAltId}
                tournamentId={tournamentId}
                isParticipant={isParticipant}
                isStaff={isStaff}
                onGameUpdated={onGameUpdated}
              />
            </>
          )}
          {gamesLoading && (
            <>
              <Separator className="mt-3" />
              <GameStrip
                games={null}
                gamesLoading={true}
                matchStatus={matchStatus}
                bestOf={bestOf}
                myAltId={myAltId}
                opponentAltId={opponentAltId}
                tournamentId={tournamentId}
                isParticipant={isParticipant}
                isStaff={isStaff}
                onGameUpdated={onGameUpdated}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Alerts below header card */}
      {isStaff && matchStatus === "active" && staffRequested && (
        <StaffJudgeAlert
          matchId={matchId}
          tournamentId={tournamentId}
          onCleared={onGameUpdated}
        />
      )}

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
