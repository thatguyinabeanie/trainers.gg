"use client";

import { useState, useEffect, useCallback } from "react";
import { useSupabase, useSupabaseQuery } from "@/lib/supabase";
import { getMatchGames, getMatchGamesForPlayer } from "@trainers/supabase";
import type { TypedSupabaseClient } from "@trainers/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Loader2,
  Swords,
  Users,
  MessageSquare,
  ShieldAlert,
} from "lucide-react";
import type { RealtimeChannel } from "@supabase/supabase-js";

import {
  MatchHeader,
  type PlayerInfo,
  type PlayerStats,
} from "@/components/match/match-header";
import { GameCard, type GameData } from "@/components/match/game-card";
import { MatchChat } from "@/components/match/match-chat";
import { useMatchPresence } from "@/components/match/presence-indicator";
import { TeamSheet, type TeamData } from "@/components/match/team-sheet";

// =============================================================================
// Types
// =============================================================================

export interface MatchPageClientProps {
  matchId: number;
  tournamentId: number;
  tournamentSlug: string;
  matchStatus: string;
  staffRequested: boolean;
  player1: PlayerInfo | null;
  player2: PlayerInfo | null;
  alt1Id: number | null;
  alt2Id: number | null;
  roundNumber: number | null;
  tableNumber: number | null;
  bestOf: number;
  userAltId: number | null;
  isParticipant: boolean;
  isStaff: boolean;
  isPlayer1: boolean;
  player1Stats: PlayerStats | null;
  player2Stats: PlayerStats | null;
  myTeam: TeamData | null;
  opponentTeam: TeamData | null;
  openTeamSheets: boolean;
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
  tableNumber,
  bestOf,
  userAltId,
  isParticipant,
  isStaff,
  isPlayer1,
  player1Stats,
  player2Stats,
  myTeam,
  opponentTeam,
  openTeamSheets,
}: MatchPageClientProps) {
  const supabase = useSupabase();
  const [matchStatus, setMatchStatus] = useState(initialStatus);
  const [staffRequested, setStaffRequested] = useState(initialStaffRequested);
  const [gamesRefreshKey, setGamesRefreshKey] = useState(0);
  const [messagesRefreshKey, setMessagesRefreshKey] = useState(0);

  // Determine perspective-based names and IDs
  const myAltId = isPlayer1 ? alt1Id : isParticipant ? alt2Id : null;
  const opponentAltId = isPlayer1 ? alt2Id : isParticipant ? alt1Id : null;

  const myPlayer = isPlayer1 ? player1 : isParticipant ? player2 : null;
  const opponent = isPlayer1 ? player2 : isParticipant ? player1 : null;

  const myStats = isPlayer1
    ? player1Stats
    : isParticipant
      ? player2Stats
      : null;
  const opponentStats = isPlayer1
    ? player2Stats
    : isParticipant
      ? player1Stats
      : null;

  const myName = myPlayer?.display_name ?? myPlayer?.username ?? "You";
  const opponentName =
    opponent?.display_name ?? opponent?.username ?? "Opponent";

  // For non-participants, show player1 as "opponent" (left) and player2 as "my" (right)
  const headerOpponent = isParticipant ? opponent : player1;
  const headerMyPlayer = isParticipant ? myPlayer : player2;
  const headerOpponentStats = isParticipant ? opponentStats : player1Stats;
  const headerMyStats = isParticipant ? myStats : player2Stats;

  // ==========================================================================
  // Presence
  // ==========================================================================
  const username = myPlayer?.username ?? null;
  const displayName = myPlayer?.display_name ?? null;

  const { viewers, typingUsers, setTyping } = useMatchPresence({
    matchId,
    username,
    displayName,
    isStaff,
    isParticipant,
  });

  const handleTypingStart = useCallback(() => {
    setTyping(true);
  }, [setTyping]);

  const handleTypingStop = useCallback(() => {
    setTyping(false);
  }, [setTyping]);

  // ==========================================================================
  // Fetch games
  // ==========================================================================
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
    data: gamesRaw,
    isLoading: gamesLoading,
    refetch: refetchGames,
  } = useSupabaseQuery(gamesQueryFn, [matchId, gamesRefreshKey, isStaff]);

  // Normalize raw game data to GameData shape
  const games: GameData[] | null = gamesRaw
    ? gamesRaw.map((g) => ({
        id: g.id as number,
        game_number: g.game_number as number,
        status: (g.status as string) ?? "pending",
        winner_alt_id: (g.winner_alt_id as number | null) ?? null,
        my_selection: (g.my_selection as number | null) ?? undefined,
        opponent_submitted: (g.opponent_submitted as boolean) ?? undefined,
        alt1_selection: (g.alt1_selection as number | null) ?? undefined,
        alt2_selection: (g.alt2_selection as number | null) ?? undefined,
        resolved_by: (g.resolved_by as number | null) ?? undefined,
      }))
    : null;

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

    // Subscribe to game updates for live score changes
    const gamesChannel = supabase
      .channel(`match-games-${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "match_games",
          filter: `match_id=eq.${matchId}`,
        },
        () => {
          setGamesRefreshKey((k) => k + 1);
        }
      )
      .subscribe();
    channels.push(gamesChannel);

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, [supabase, matchId]);

  // ==========================================================================
  // Game score calculation
  // ==========================================================================
  const gamesWon = (altId: number | null) => {
    if (!games || !altId) return 0;
    return games.filter((g) => g.winner_alt_id === altId).length;
  };

  const myWins = isParticipant ? gamesWon(myAltId) : gamesWon(alt2Id);
  const opponentWins = isParticipant
    ? gamesWon(opponentAltId)
    : gamesWon(alt1Id);

  // ==========================================================================
  // Has teams to show?
  // ==========================================================================
  const hasTeams = myTeam !== null || opponentTeam !== null;

  // ==========================================================================
  // Shared sections
  // ==========================================================================

  const gamesSection = (
    <div className="space-y-2">
      {gamesLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
          </CardContent>
        </Card>
      ) : !games || games.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground text-sm">
              Games will appear once the round starts.
            </p>
          </CardContent>
        </Card>
      ) : (
        games.map((game) => (
          <GameCard
            key={game.id}
            game={game}
            myAltId={isParticipant ? myAltId : alt1Id}
            opponentAltId={isParticipant ? opponentAltId : alt2Id}
            myName={
              isParticipant
                ? myName
                : (player1?.display_name ?? player1?.username ?? "Player 1")
            }
            opponentName={
              isParticipant
                ? opponentName
                : (player2?.display_name ?? player2?.username ?? "Player 2")
            }
            isParticipant={isParticipant}
            isStaff={isStaff}
            isPlayer1={isPlayer1}
            matchStatus={matchStatus}
            tournamentId={tournamentId}
            userAltId={userAltId}
            onGameUpdated={() => refetchGames()}
          />
        ))
      )}

      {/* Staff judge info */}
      {isStaff && matchStatus === "active" && staffRequested && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
          <ShieldAlert className="h-4 w-4 shrink-0" />A judge has been requested
          for this match.
        </div>
      )}
    </div>
  );

  const teamsSection = hasTeams ? (
    <div className="grid gap-6 lg:grid-cols-2">
      {myTeam && (
        <TeamSheet
          team={myTeam}
          playerName={myName}
          isOwnTeam={isParticipant}
        />
      )}
      {opponentTeam && (
        <TeamSheet
          team={opponentTeam}
          playerName={opponentName}
          isOwnTeam={false}
        />
      )}
    </div>
  ) : (
    <div className="text-muted-foreground py-8 text-center text-sm">
      {openTeamSheets
        ? "No team sheets submitted yet."
        : "Team sheets are not visible for this tournament."}
    </div>
  );

  const chatSection = (
    <MatchChat
      matchId={matchId}
      userAltId={userAltId}
      isStaff={isStaff}
      isParticipant={isParticipant}
      matchStatus={matchStatus}
      staffRequested={staffRequested}
      tournamentId={tournamentId}
      messagesRefreshKey={messagesRefreshKey}
      viewers={viewers}
      typingUsers={typingUsers}
      onTypingStart={handleTypingStart}
      onTypingStop={handleTypingStop}
    />
  );

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <div className="space-y-4">
      {/* Match Header — always visible */}
      <MatchHeader
        opponent={headerOpponent}
        myPlayer={headerMyPlayer}
        opponentStats={headerOpponentStats}
        myStats={headerMyStats}
        myWins={myWins}
        opponentWins={opponentWins}
        bestOf={bestOf}
        matchStatus={matchStatus}
        staffRequested={staffRequested}
        roundNumber={roundNumber}
        tableNumber={tableNumber}
      />

      {/* Mobile layout: Tabs */}
      <div className="lg:hidden">
        <Tabs defaultValue="games">
          <TabsList className="w-full">
            <TabsTrigger value="games" className="flex-1 gap-1.5">
              <Swords className="h-3.5 w-3.5" />
              Games
            </TabsTrigger>
            {hasTeams && (
              <TabsTrigger value="teams" className="flex-1 gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Teams
              </TabsTrigger>
            )}
            <TabsTrigger value="chat" className="flex-1 gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              Chat
            </TabsTrigger>
          </TabsList>

          <TabsContent value="games" className="mt-4">
            {gamesSection}
          </TabsContent>

          {hasTeams && (
            <TabsContent value="teams" className="mt-4">
              {teamsSection}
            </TabsContent>
          )}

          <TabsContent value="chat" className="mt-4">
            {chatSection}
          </TabsContent>
        </Tabs>
      </div>

      {/* Desktop layout: Two columns + teams below */}
      <div className="hidden lg:block">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main column: Games */}
          <div className="lg:col-span-2">{gamesSection}</div>

          {/* Sidebar: Chat */}
          <div>{chatSection}</div>
        </div>

        {/* Team sheets — full width below */}
        {hasTeams && <div className="mt-6">{teamsSection}</div>}
      </div>
    </div>
  );
}
