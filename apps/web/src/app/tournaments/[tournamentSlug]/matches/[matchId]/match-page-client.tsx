"use client";

import {
  type KeyboardEvent,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { useSupabase, useSupabaseQuery } from "@/lib/supabase";
import {
  getMatchGames,
  getMatchGamesForPlayer,
  getMatchMessages,
} from "@trainers/supabase";
import type { TypedSupabaseClient } from "@trainers/supabase";
import {
  submitGameSelectionAction,
  sendMatchMessageAction,
  requestJudgeAction,
  judgeOverrideGameAction,
  judgeResetGameAction,
} from "@/actions/matches";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { StatusBadge, type Status } from "@/components/ui/status-badge";
import {
  AlertCircle,
  CheckCircle,
  Gavel,
  Loader2,
  MessageSquare,
  RotateCcw,
  Send,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { RealtimeChannel } from "@supabase/supabase-js";

// =============================================================================
// Types
// =============================================================================

interface Player {
  id: number;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface MatchPageClientProps {
  matchId: number;
  tournamentId: number;
  tournamentSlug: string;
  matchStatus: string;
  staffRequested: boolean;
  player1: Player | null;
  player2: Player | null;
  alt1Id: number | null;
  alt2Id: number | null;
  roundNumber: number | null;
  bestOf: number;
  userAltId: number | null;
  isParticipant: boolean;
  isStaff: boolean;
  isPlayer1: boolean;
}

// =============================================================================
// Match Page Client
// =============================================================================

export function MatchPageClient({
  matchId,
  tournamentId,
  tournamentSlug: _tournamentSlug,
  matchStatus: initialStatus,
  staffRequested: initialStaffRequested,
  player1,
  player2,
  alt1Id,
  alt2Id,
  roundNumber,
  bestOf,
  userAltId,
  isParticipant,
  isStaff,
  isPlayer1,
}: MatchPageClientProps) {
  const supabase = useSupabase();
  const [matchStatus, setMatchStatus] = useState(initialStatus);
  const [staffRequested, setStaffRequested] = useState(initialStaffRequested);
  const [gamesRefreshKey, setGamesRefreshKey] = useState(0);
  const [messagesRefreshKey, setMessagesRefreshKey] = useState(0);

  // Fetch games — staff see raw data, players see redacted opponent selections
  // Both return shapes share id, game_number, status, winner_alt_id, etc.
  // We normalize to Record<string, unknown> to handle the union.
  const gamesQueryFn = useCallback(
    async (client: TypedSupabaseClient): Promise<Record<string, unknown>[]> => {
      if (isStaff) {
        return getMatchGames(client, matchId);
      }
      return getMatchGamesForPlayer(client, matchId);
    },
    [matchId, isStaff]
  );

  const {
    data: games,
    isLoading: gamesLoading,
    refetch: refetchGames,
  } = useSupabaseQuery(gamesQueryFn, [matchId, gamesRefreshKey, isStaff]);

  // ==========================================================================
  // Realtime subscriptions
  // ==========================================================================
  useEffect(() => {
    const channels: RealtimeChannel[] = [];

    // Subscribe to match messages for live chat
    const msgChannel = supabase
      .channel(`match-messages-${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "match_messages",
          filter: `match_id=eq.${matchId}`,
        },
        () => {
          setMessagesRefreshKey((k) => k + 1);
        }
      )
      .subscribe();
    channels.push(msgChannel);

    // Subscribe to match status changes
    const matchChannel = supabase
      .channel(`match-status-${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tournament_matches",
          filter: `id=eq.${matchId}`,
        },
        (payload) => {
          const newRow = payload.new as {
            status?: string;
            staff_requested?: boolean;
          };
          if (newRow.status) setMatchStatus(newRow.status);
          if (typeof newRow.staff_requested === "boolean") {
            setStaffRequested(newRow.staff_requested);
          }
          setGamesRefreshKey((k) => k + 1);
        }
      )
      .subscribe();
    channels.push(matchChannel);

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, [supabase, matchId]);

  // ==========================================================================
  // Game status helpers
  // ==========================================================================
  const gamesWon = (altId: number | null) => {
    if (!games || !altId) return 0;
    return games.filter(
      (g) => (g as { winner_alt_id?: number | null }).winner_alt_id === altId
    ).length;
  };

  const p1Wins = gamesWon(alt1Id);
  const p2Wins = gamesWon(alt2Id);

  const p1Name = player1?.display_name ?? player1?.username ?? "Player 1";
  const p2Name = player2?.display_name ?? player2?.username ?? "Player 2";

  return (
    <div className="space-y-6">
      {/* Match Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">
                {p1Name} vs {p2Name}
              </CardTitle>
              <CardDescription>
                Round {roundNumber ?? "?"} &middot; Best of {bestOf}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {staffRequested && (
                <Badge variant="destructive" className="gap-1">
                  <ShieldAlert className="h-3 w-3" />
                  Judge Requested
                </Badge>
              )}
              <StatusBadge status={matchStatus as Status} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-8">
            <div className="text-center">
              <div className="text-muted-foreground mb-1 text-sm">{p1Name}</div>
              <div className="text-4xl font-bold">{p1Wins}</div>
            </div>
            <div className="text-muted-foreground text-2xl">&ndash;</div>
            <div className="text-center">
              <div className="text-muted-foreground mb-1 text-sm">{p2Name}</div>
              <div className="text-4xl font-bold">{p2Wins}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Games Column */}
        <div className="space-y-4 lg:col-span-2">
          <h2 className="text-lg font-semibold">Games</h2>

          {gamesLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </CardContent>
            </Card>
          ) : !games || games.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">
                  No games created yet. The match needs to be started by a
                  tournament organizer.
                </p>
              </CardContent>
            </Card>
          ) : (
            games.map((game) => (
              <GameCard
                key={game.id as number}
                game={game}
                player1={player1}
                player2={player2}
                alt1Id={alt1Id}
                alt2Id={alt2Id}
                userAltId={userAltId}
                isParticipant={isParticipant}
                isStaff={isStaff}
                isPlayer1={isPlayer1}
                tournamentId={tournamentId}
                onGameUpdated={() => refetchGames()}
              />
            ))
          )}

          {isStaff && matchStatus === "active" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Gavel className="h-4 w-4" />
                  Judge Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-2 text-sm">
                  Use the override/reset buttons on individual games above.
                </p>
                {staffRequested && (
                  <div className="flex items-center gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                    <ShieldAlert className="h-4 w-4 shrink-0" />A judge has been
                    requested for this match.
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Chat Column */}
        <div className="flex flex-col">
          <MatchChat
            matchId={matchId}
            userAltId={userAltId}
            isStaff={isStaff}
            isParticipant={isParticipant}
            matchStatus={matchStatus}
            staffRequested={staffRequested}
            tournamentId={tournamentId}
            messagesRefreshKey={messagesRefreshKey}
          />
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Game Card Component
// =============================================================================

interface GameCardProps {
  game: Record<string, unknown>;
  player1: Player | null;
  player2: Player | null;
  alt1Id: number | null;
  alt2Id: number | null;
  userAltId: number | null;
  isParticipant: boolean;
  isStaff: boolean;
  isPlayer1: boolean;
  tournamentId: number;
  onGameUpdated: () => void;
}

function GameCard({
  game,
  player1,
  player2,
  alt1Id,
  alt2Id,
  userAltId,
  isParticipant,
  isStaff,
  isPlayer1,
  tournamentId,
  onGameUpdated,
}: GameCardProps) {
  const [isPending, setIsPending] = useState(false);
  const [overrideWinner, setOverrideWinner] = useState<number | null>(null);

  const gameId = game.id as number;
  const gameNumber = game.game_number as number;
  const status = (game.status as string) ?? "pending";
  const winnerAltId = game.winner_alt_id as number | null;
  const alt1Selection = game.alt1_selection as number | null;
  const alt2Selection = game.alt2_selection as number | null;

  const p1Name = player1?.display_name ?? player1?.username ?? "Player 1";
  const p2Name = player2?.display_name ?? player2?.username ?? "Player 2";

  const mySelection = isPlayer1 ? alt1Selection : alt2Selection;
  const hasSubmitted = mySelection !== null;

  const canSubmit =
    isParticipant &&
    !hasSubmitted &&
    ["pending", "awaiting_both", "awaiting_one"].includes(status);

  const handleSubmitSelection = async (selectedWinnerAltId: number) => {
    setIsPending(true);
    const result = await submitGameSelectionAction(
      gameId,
      selectedWinnerAltId,
      tournamentId
    );
    setIsPending(false);

    if (result.success) {
      toast.success(`Game ${gameNumber} selection submitted`);
      onGameUpdated();
    } else {
      toast.error(result.error);
    }
  };

  const handleJudgeOverride = async () => {
    if (!overrideWinner || !userAltId) return;
    setIsPending(true);
    const result = await judgeOverrideGameAction(
      gameId,
      overrideWinner,
      userAltId,
      tournamentId
    );
    setIsPending(false);

    if (result.success) {
      toast.success(`Game ${gameNumber} resolved by judge`);
      setOverrideWinner(null);
      onGameUpdated();
    } else {
      toast.error(result.error);
    }
  };

  const handleJudgeReset = async () => {
    setIsPending(true);
    const result = await judgeResetGameAction(gameId, tournamentId);
    setIsPending(false);

    if (result.success) {
      toast.success(`Game ${gameNumber} reset`);
      onGameUpdated();
    } else {
      toast.error(result.error);
    }
  };

  const statusLabel: Record<string, string> = {
    pending: "Pending",
    awaiting_both: "Awaiting Submissions",
    awaiting_one: "Awaiting 1 Submission",
    agreed: "Agreed",
    disputed: "Disputed",
    resolved: "Resolved",
    cancelled: "Cancelled",
  };

  const statusVariant: Record<string, "default" | "secondary" | "destructive"> =
    {
      pending: "default",
      awaiting_both: "secondary",
      awaiting_one: "secondary",
      agreed: "default",
      disputed: "destructive",
      resolved: "default",
      cancelled: "secondary",
    };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Game {gameNumber}</CardTitle>
          <Badge variant={statusVariant[status] ?? "default"}>
            {statusLabel[status] ?? status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {(status === "agreed" || status === "resolved") && winnerAltId && (
          <div className="flex items-center gap-2 rounded-md bg-green-50 p-3 text-sm text-green-800 dark:bg-green-950 dark:text-green-200">
            <CheckCircle className="h-4 w-4 shrink-0" />
            Winner: {winnerAltId === alt1Id ? p1Name : p2Name}
            {status === "resolved" && " (Judge decision)"}
          </div>
        )}

        {status === "disputed" && (
          <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Players disagreed on the result. A judge will resolve this.
          </div>
        )}

        {isParticipant &&
          hasSubmitted &&
          status !== "agreed" &&
          status !== "resolved" && (
            <div className="text-muted-foreground text-sm">
              You selected:{" "}
              <span className="font-medium">
                {mySelection === alt1Id ? p1Name : p2Name}
              </span>
            </div>
          )}

        {canSubmit && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Who won this game?</p>
            <div className="flex gap-2">
              {alt1Id && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleSubmitSelection(alt1Id)}
                  className="flex-1"
                >
                  {isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {p1Name}
                </Button>
              )}
              {alt2Id && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleSubmitSelection(alt2Id)}
                  className="flex-1"
                >
                  {isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {p2Name}
                </Button>
              )}
            </div>
          </div>
        )}

        {isStaff &&
          (status === "awaiting_one" ||
            status === "awaiting_both" ||
            status === "disputed") && (
            <div className="text-muted-foreground space-y-1 text-sm">
              <p>
                {p1Name}:{" "}
                {alt1Selection
                  ? alt1Selection === alt1Id
                    ? p1Name
                    : p2Name
                  : "Not submitted"}
              </p>
              <p>
                {p2Name}:{" "}
                {alt2Selection
                  ? alt2Selection === alt1Id
                    ? p1Name
                    : p2Name
                  : "Not submitted"}
              </p>
            </div>
          )}

        {isStaff &&
          (status === "disputed" ||
            status === "awaiting_one" ||
            status === "awaiting_both" ||
            status === "pending") && (
            <div className="flex flex-wrap items-center gap-2 border-t pt-3">
              {(status === "disputed" ||
                status === "awaiting_one" ||
                status === "awaiting_both") && (
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
                    {alt1Id && <option value={alt1Id}>{p1Name}</option>}
                    {alt2Id && <option value={alt2Id}>{p2Name}</option>}
                  </select>
                  <Button
                    variant="default"
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
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Match Chat Component
// =============================================================================

interface MatchChatProps {
  matchId: number;
  userAltId: number | null;
  isStaff: boolean;
  isParticipant: boolean;
  matchStatus: string;
  staffRequested: boolean;
  tournamentId: number;
  messagesRefreshKey: number;
}

function MatchChat({
  matchId,
  userAltId,
  isStaff,
  isParticipant,
  matchStatus,
  staffRequested,
  tournamentId,
  messagesRefreshKey,
}: MatchChatProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isRequestingJudge, setIsRequestingJudge] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messagesQueryFn = useCallback(
    (client: TypedSupabaseClient) => getMatchMessages(client, matchId),
    [matchId]
  );

  const {
    data: messages,
    isLoading: messagesLoading,
    refetch: refetchMessages,
  } = useSupabaseQuery(messagesQueryFn, [matchId, messagesRefreshKey]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim() || !userAltId) return;
    setIsSending(true);

    const messageType = isStaff && !isParticipant ? "judge" : "player";
    const result = await sendMatchMessageAction(
      matchId,
      userAltId,
      message.trim(),
      messageType
    );

    setIsSending(false);

    if (result.success) {
      setMessage("");
      refetchMessages();
    } else {
      toast.error(result.error);
    }
  };

  const handleRequestJudge = async () => {
    setIsRequestingJudge(true);
    const result = await requestJudgeAction(matchId, tournamentId);
    setIsRequestingJudge(false);

    if (result.success) {
      toast.success("Judge has been requested");
    } else {
      toast.error(result.error);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canChat =
    (isParticipant || isStaff) &&
    matchStatus !== "completed" &&
    matchStatus !== "cancelled";

  return (
    <Card className="flex h-[600px] flex-col">
      <CardHeader className="shrink-0 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4" />
            Match Chat
          </CardTitle>
          {isParticipant && !staffRequested && matchStatus === "active" && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRequestJudge}
              disabled={isRequestingJudge}
            >
              {isRequestingJudge ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ShieldAlert className="mr-2 h-4 w-4" />
              )}
              Call Judge
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col p-0">
        <div className="flex-1 overflow-y-auto px-4">
          {messagesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
            </div>
          ) : !messages || messages.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center text-sm">
              No messages yet. Say hello!
            </div>
          ) : (
            <div className="space-y-3 py-3">
              {messages.map((msg) => {
                const msgAlt = msg.alt as {
                  id: number;
                  display_name: string | null;
                  username: string;
                  avatar_url: string | null;
                } | null;
                const isSystem = msg.message_type === "system";
                const isJudge = msg.message_type === "judge";
                const isOwnMessage = msgAlt?.id === userAltId;

                if (isSystem) {
                  return (
                    <div
                      key={msg.id}
                      className="text-muted-foreground text-center text-xs italic"
                    >
                      {msg.content}
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex flex-col",
                      isOwnMessage ? "items-end" : "items-start"
                    )}
                  >
                    <div className="mb-0.5 flex items-center gap-1">
                      <span className="text-muted-foreground text-xs font-medium">
                        {msgAlt?.display_name ?? msgAlt?.username ?? "Unknown"}
                      </span>
                      {isJudge && (
                        <Badge
                          variant="secondary"
                          className="h-4 px-1 text-[10px]"
                        >
                          Judge
                        </Badge>
                      )}
                    </div>
                    <div
                      className={cn(
                        "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                        isOwnMessage
                          ? "bg-primary text-primary-foreground"
                          : isJudge
                            ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100"
                            : "bg-muted"
                      )}
                    >
                      {msg.content}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {canChat && userAltId && (
          <div className="shrink-0 border-t p-3">
            <div className="flex gap-2">
              <Input
                placeholder="Type a message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                maxLength={500}
                disabled={isSending}
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={isSending || !message.trim()}
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
