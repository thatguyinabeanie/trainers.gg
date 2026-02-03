"use client";

import { useState } from "react";
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
  // Player view (from get_match_games_for_player RPC)
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
// Resolved Game Row (compact single line, with staff reset)
// ============================================================================

function ResolvedGameRow({
  game,
  myAltId,
  isStaff,
  tournamentId,
  onReset,
}: {
  game: GameData;
  myAltId: number | null;
  isStaff?: boolean;
  tournamentId?: number;
  onReset?: () => void;
}) {
  const [isPending, setIsPending] = useState(false);
  const iWon =
    game.winner_alt_id !== null ? game.winner_alt_id === myAltId : null;
  const isJudgeResolved = game.status === "resolved";

  const handleReset = async () => {
    if (!tournamentId) return;
    setIsPending(true);
    const result = await judgeResetGameAction(game.id, tournamentId);
    setIsPending(false);

    if (result.success) {
      toast.success(`Game ${game.game_number} reset`);
      onReset?.();
    } else {
      toast.error(result.error);
    }
  };

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
        {isStaff && onReset ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 gap-1 px-1.5 text-[10px]"
            disabled={isPending}
            onClick={handleReset}
          >
            {isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RotateCcw className="h-3 w-3" />
            )}
            Reset
          </Button>
        ) : (
          <Check className="h-3.5 w-3.5 text-emerald-500" />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Active Game Row — compact inline "I Won / I Lost" buttons
// ============================================================================

function ActiveGameRow({
  game,
  myAltId,
  opponentAltId,
  myName,
  opponentName,
  isParticipant,
  isStaff,
  tournamentId,
  userAltId,
  onGameUpdated,
}: GameRowProps) {
  const [isPending, setIsPending] = useState(false);
  const [overrideWinner, setOverrideWinner] = useState<number | null>(null);

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

  const handleStaffOverride = async () => {
    if (!overrideWinner) return;
    const judgeAltId = userAltId ?? myAltId;
    if (!judgeAltId) return;
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
      onGameUpdated();
    } else {
      toast.error(result.error);
    }
  };

  // Staff (non-participant): show override controls
  if (isStaff && !isParticipant) {
    return (
      <div className="flex items-center justify-between py-2">
        <span className="text-sm font-medium">Game {game.game_number}</span>
        <div className="flex items-center gap-1.5">
          <select
            className="border-input bg-background h-7 rounded-md border px-2 text-xs"
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
            className="h-7 gap-1 text-xs"
            disabled={isPending || !overrideWinner}
            onClick={handleStaffOverride}
          >
            {isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Gavel className="h-3 w-3" />
            )}
            Set
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm font-medium">Game {game.game_number}</span>
      {isParticipant ? (
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            className="h-7 gap-1 px-3 text-xs"
            onClick={() => handleReport(true)}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Trophy className="h-3 w-3" />
            )}
            I Won
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 px-3 text-xs"
            onClick={() => handleReport(false)}
            disabled={isPending}
          >
            I Lost
          </Button>
        </div>
      ) : (
        <span className="text-muted-foreground text-xs">
          Awaiting player reports
        </span>
      )}
    </div>
  );
}

// ============================================================================
// Disputed Game Row — alert + judge tools
// ============================================================================

function DisputedGameRow({
  game,
  myAltId,
  opponentAltId,
  myName,
  opponentName,
  isStaff,
  isPlayer1,
  tournamentId,
  userAltId,
  onGameUpdated,
}: GameRowProps) {
  const [isPending, setIsPending] = useState(false);
  const [overrideWinner, setOverrideWinner] = useState<number | null>(null);

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
      onGameUpdated();
    } else {
      toast.error(result.error);
    }
  };

  // Determine what each player reported
  const p1Pick = game.alt1_selection;
  const p2Pick = game.alt2_selection;
  const p1Label = isPlayer1 ? myName : opponentName;
  const p2Label = isPlayer1 ? opponentName : myName;

  return (
    <div className="space-y-2 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground w-16 text-xs font-medium">
            Game {game.game_number}
          </span>
          <span className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
            <AlertCircle className="h-3 w-3" />
            Disputed
          </span>
        </div>
        <Badge variant="destructive" className="text-[10px]">
          Needs Judge
        </Badge>
      </div>

      {/* Both players' reports */}
      <div className="text-muted-foreground space-y-0.5 text-xs">
        <p>
          {p1Label}:{" "}
          {p1Pick === myAltId || p1Pick === opponentAltId
            ? p1Pick === (isPlayer1 ? myAltId : opponentAltId)
              ? "Won"
              : "Lost"
            : "..."}
        </p>
        <p>
          {p2Label}:{" "}
          {p2Pick === myAltId || p2Pick === opponentAltId
            ? p2Pick === (isPlayer1 ? opponentAltId : myAltId)
              ? "Won"
              : "Lost"
            : "..."}
        </p>
      </div>

      {/* Judge tools */}
      {isStaff && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <select
            className="border-input bg-background rounded-md border px-2 py-1 text-xs"
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
            className="h-7 gap-1 text-xs"
            disabled={isPending || !overrideWinner}
            onClick={handleJudgeOverride}
          >
            {isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Gavel className="h-3 w-3" />
            )}
            Override
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-xs"
            disabled={isPending}
            onClick={handleJudgeReset}
          >
            {isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RotateCcw className="h-3 w-3" />
            )}
            Reset
          </Button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Self-Correctable Game Row — reporter can change their submission
// ============================================================================

function SelfCorrectableGameRow({
  game,
  myAltId,
  opponentAltId,
  tournamentId,
  onGameUpdated,
}: GameRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const iWon = game.winner_alt_id === myAltId;

  const handleChange = async (newIWon: boolean) => {
    if (!myAltId || !opponentAltId) return;
    setIsPending(true);
    const winnerId = newIWon ? myAltId : opponentAltId;
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

  if (isEditing) {
    return (
      <div className="flex items-center justify-between py-2">
        <span className="text-sm font-medium">Game {game.game_number}</span>
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            className="h-7 gap-1 px-3 text-xs"
            onClick={() => handleChange(true)}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Trophy className="h-3 w-3" />
            )}
            I Won
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 px-3 text-xs"
            onClick={() => handleChange(false)}
            disabled={isPending}
          >
            I Lost
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setIsEditing(false)}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground w-16 text-xs font-medium">
          Game {game.game_number}
        </span>
        {iWon ? (
          <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <Trophy className="h-3 w-3" />
            Won
          </span>
        ) : (
          <span className="text-muted-foreground flex items-center gap-1 text-xs">
            <X className="h-3 w-3" />
            Lost
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground h-6 px-2 text-[10px]"
          onClick={() => setIsEditing(true)}
        >
          Change
        </Button>
        <Check className="h-3.5 w-3.5 text-emerald-500" />
      </div>
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
// GameRow — dispatches between states
// ============================================================================

function GameRow(props: GameRowProps) {
  const {
    game,
    myAltId,
    matchStatus,
    isCurrentGame,
    isParticipant,
    isStaff,
    tournamentId,
    onGameUpdated,
  } = props;

  // Disputed games always get special treatment
  if (game.status === "disputed") {
    return <DisputedGameRow {...props} />;
  }

  // Agreed game where I'm the reporter — self-correction window
  if (game.status === "agreed" && isParticipant && game.my_selection != null) {
    return <SelfCorrectableGameRow {...props} />;
  }

  // Agreed or resolved — compact resolved line (staff gets reset button)
  if (["agreed", "resolved"].includes(game.status)) {
    return (
      <ResolvedGameRow
        game={game}
        myAltId={myAltId}
        isStaff={isStaff}
        tournamentId={tournamentId}
        onReset={isStaff ? onGameUpdated : undefined}
      />
    );
  }

  // Match not started yet
  if (matchStatus === "pending") {
    return <FutureGameRow gameNumber={game.game_number} />;
  }

  // Staff can interact with any pending game, not just the current one
  if (isStaff && !isParticipant && matchStatus === "active") {
    return <ActiveGameRow {...props} />;
  }

  // Current active game — show I Won / I Lost buttons
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
          <div className="flex items-center justify-center py-4">
            <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
          </div>
        ) : !games || games.length === 0 ? (
          <div className="text-muted-foreground py-4 text-center text-sm">
            Games will appear once the round starts.
          </div>
        ) : (
          <div className="divide-foreground/5 divide-y">
            {(() => {
              // Current game = first unresolved game
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

export { type GameData as GameDataType };
