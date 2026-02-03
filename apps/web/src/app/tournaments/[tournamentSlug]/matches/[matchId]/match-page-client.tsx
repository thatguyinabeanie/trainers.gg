"use client";

import { useState, useEffect, useCallback } from "react";
import { useSupabase, useSupabaseQuery } from "@/lib/supabase";
import { getMatchGames, getMatchGamesForPlayer } from "@trainers/supabase";
import type { TypedSupabaseClient } from "@trainers/supabase";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Swords, Users, MessageSquare } from "lucide-react";
import type { RealtimeChannel } from "@supabase/supabase-js";

import {
  MatchHeader,
  type PlayerInfo,
  type PlayerStats,
} from "@/components/match/match-header";
import { GamesList, type GameData } from "@/components/match/game-card";
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
  openTeamSheets: _openTeamSheets,
}: MatchPageClientProps) {
  const supabase = useSupabase();
  const [matchStatus, setMatchStatus] = useState(initialStatus);
  const [staffRequested, setStaffRequested] = useState(initialStaffRequested);
  const [gamesRefreshKey, setGamesRefreshKey] = useState(0);
  const [messagesRefreshKey, setMessagesRefreshKey] = useState(0);

  // Perspective-based names and IDs
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

    // Match messages for live chat
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

    // Match status changes
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

    // Game updates for live score changes
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
  // Shared props for GamesList
  // ==========================================================================
  const gamesListProps = {
    games,
    gamesLoading,
    matchId,
    myAltId: isParticipant ? myAltId : alt1Id,
    opponentAltId: isParticipant ? opponentAltId : alt2Id,
    myName: isParticipant
      ? myName
      : (player1?.display_name ?? player1?.username ?? "Player 1"),
    opponentName: isParticipant
      ? opponentName
      : (player2?.display_name ?? player2?.username ?? "Player 2"),
    isParticipant,
    isStaff,
    isPlayer1,
    matchStatus,
    tournamentId,
    userAltId,
    staffRequested,
    onGameUpdated: () => refetchGames(),
  };

  const chatProps = {
    matchId,
    userAltId,
    isStaff,
    isParticipant,
    matchStatus,
    staffRequested,
    tournamentId,
    messagesRefreshKey,
    viewers,
    typingUsers,
    onTypingStart: handleTypingStart,
    onTypingStop: handleTypingStop,
  };

  // ==========================================================================
  // Team toggle content (shared between mobile & desktop)
  // ==========================================================================
  const teamToggle = hasTeams ? (
    <Tabs defaultValue={opponentTeam ? "opponent" : "mine"}>
      <TabsList className="w-full">
        {opponentTeam && (
          <TabsTrigger value="opponent" className="flex-1 gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {`${opponentName}'s Team`}
          </TabsTrigger>
        )}
        {myTeam && (
          <TabsTrigger value="mine" className="flex-1 gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {isParticipant ? "Your Team" : `${myName}'s Team`}
          </TabsTrigger>
        )}
      </TabsList>

      {opponentTeam && (
        <TabsContent value="opponent" className="mt-3">
          <TeamSheet
            team={opponentTeam}
            playerName={opponentName}
            isOwnTeam={false}
          />
        </TabsContent>
      )}
      {myTeam && (
        <TabsContent value="mine" className="mt-3">
          <TeamSheet
            team={myTeam}
            playerName={myName}
            isOwnTeam={isParticipant}
          />
        </TabsContent>
      )}
    </Tabs>
  ) : null;

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
        isStaff={isStaff}
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
            <GamesList {...gamesListProps} />
          </TabsContent>

          {hasTeams && (
            <TabsContent value="teams" className="mt-4">
              {teamToggle}
            </TabsContent>
          )}

          <TabsContent value="chat" className="mt-4">
            <MatchChat {...chatProps} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Desktop layout: Games + Chat, then Teams below */}
      <div className="hidden lg:block">
        <div className="grid grid-cols-5 gap-6">
          {/* Left: Games */}
          <div className="col-span-2">
            <GamesList {...gamesListProps} />
          </div>

          {/* Right: Chat */}
          <div className="col-span-3">
            <MatchChat {...chatProps} />
          </div>
        </div>

        {/* Teams — full width below */}
        {teamToggle && <div className="mt-4">{teamToggle}</div>}
      </div>
    </div>
  );
}
