"use client";

import { useState, useEffect, useCallback } from "react";
import { useSupabase, useSupabaseQuery } from "@/lib/supabase";
import { getMatchGames, getMatchGamesForPlayer } from "@trainers/supabase";
import type { TypedSupabaseClient } from "@trainers/supabase";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Users, MessageSquare } from "lucide-react";
import type { RealtimeChannel } from "@supabase/supabase-js";

import {
  MatchHeader,
  type PlayerInfo,
  type PlayerStats,
} from "@/components/match/match-header";
import type { GameData } from "@/components/match/game-card";
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
  currentUserUsername: string | null;
  currentUserDisplayName: string | null;
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
  currentUserUsername,
  currentUserDisplayName,
}: MatchPageClientProps) {
  const supabase = useSupabase();
  const [matchStatus, setMatchStatus] = useState(initialStatus);
  const [staffRequested, setStaffRequested] = useState(initialStaffRequested);
  const [gamesRefreshKey, setGamesRefreshKey] = useState(0);
  const [messagesRefreshKey, setMessagesRefreshKey] = useState(0);

  // Perspective: participants see themselves on the right, staff see player2 on the right.
  // "swapped" means the current user is player2 (so we flip left/right).
  const swapped = isParticipant && !isPlayer1;

  const myAltId = isParticipant ? (isPlayer1 ? alt1Id : alt2Id) : null;
  const opponentAltId = isParticipant ? (isPlayer1 ? alt2Id : alt1Id) : null;

  const myPlayer = isParticipant ? (swapped ? player2 : player1) : null;
  const opponent = isParticipant ? (swapped ? player1 : player2) : null;

  const myName = myPlayer?.display_name ?? myPlayer?.username ?? "You";
  const opponentName =
    opponent?.display_name ?? opponent?.username ?? "Opponent";

  // Header layout: left = opponent/player1, right = me/player2
  const headerOpponentAltId = swapped ? alt2Id : alt1Id;
  const headerMyAltId = swapped ? alt1Id : alt2Id;
  const headerOpponent = swapped ? player2 : player1;
  const headerMyPlayer = swapped ? player1 : player2;
  const headerOpponentStats = swapped ? player2Stats : player1Stats;
  const headerMyStats = swapped ? player1Stats : player2Stats;
  const headerOpponentName = isParticipant
    ? opponentName
    : (player1?.display_name ?? player1?.username ?? "Player 1");
  const headerMyName = isParticipant
    ? myName
    : (player2?.display_name ?? player2?.username ?? "Player 2");

  // ==========================================================================
  // Presence — use currentUser props so staff/judges also join the channel
  // ==========================================================================
  const { viewers, typingUsers, setTyping, broadcastJudgeRequest } =
    useMatchPresence({
      matchId,
      username: currentUserUsername,
      displayName: currentUserDisplayName,
      isStaff,
      isParticipant,
      onJudgeRequest: setStaffRequested,
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
      .subscribe((status, err) => {
        // MVP: console.error is sufficient; a future iteration could show a toast or retry
        if (err) console.error("[match-messages] subscribe error:", err);
      });
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
      .subscribe((status, err) => {
        // MVP: console.error is sufficient; a future iteration could show a toast or retry
        if (err) console.error("[match-status] subscribe error:", err);
      });
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
      .subscribe((status, err) => {
        // MVP: console.error is sufficient; a future iteration could show a toast or retry
        if (err) console.error("[match-games] subscribe error:", err);
      });
    channels.push(gamesChannel);

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, [supabase, matchId]);

  // ==========================================================================
  // Game score calculation
  // ==========================================================================
  // Scores must match the header layout positions (left/right), not the
  // user perspective. opponentWins displays on the LEFT (headerOpponent),
  // myWins displays on the RIGHT (headerMyPlayer).
  const gamesWon = (altId: number | null) => {
    if (!games || !altId) return 0;
    return games.filter((g) => g.winner_alt_id === altId).length;
  };

  const opponentWins = gamesWon(headerOpponentAltId);
  const myWins = gamesWon(headerMyAltId);

  // ==========================================================================
  // Has teams to show?
  // ==========================================================================
  const hasTeams = myTeam !== null || opponentTeam !== null;

  // ==========================================================================
  // Shared props
  // ==========================================================================
  const chatProps = {
    matchId,
    userAltId,
    isStaff,
    isParticipant,
    matchStatus,
    staffRequested,
    tournamentId,
    messagesRefreshKey,
    onStaffRequestChange: (requested: boolean) => {
      setStaffRequested(requested);
      broadcastJudgeRequest(requested);
    },
    viewers,
    typingUsers,
    currentUsername: currentUserUsername,
    onTypingStart: handleTypingStart,
    onTypingStop: handleTypingStop,
  };

  // ==========================================================================
  // Team toggle content (shared between mobile & desktop)
  // ==========================================================================
  // Use actual player names for non-participants instead of "You"/"Opponent"
  const opponentTeamLabel = isParticipant
    ? opponentName
    : (player1?.display_name ?? player1?.username ?? "Player 1");
  const myTeamLabel = isParticipant
    ? "Your Team"
    : (player2?.display_name ?? player2?.username ?? "Player 2");

  const teamToggle = hasTeams ? (
    <Tabs defaultValue={opponentTeam ? "opponent" : "mine"}>
      <TabsList className="w-full">
        {opponentTeam && (
          <TabsTrigger value="opponent" className="flex-1 gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {opponentTeamLabel}
          </TabsTrigger>
        )}
        {myTeam && (
          <TabsTrigger value="mine" className="flex-1 gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {myTeamLabel}
          </TabsTrigger>
        )}
      </TabsList>

      {opponentTeam && (
        <TabsContent value="opponent" className="mt-3">
          <TeamSheet team={opponentTeam} />
        </TabsContent>
      )}
      {myTeam && (
        <TabsContent value="mine" className="mt-3">
          <TeamSheet team={myTeam} />
        </TabsContent>
      )}
    </Tabs>
  ) : null;

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <div className="flex h-[calc(100dvh-10rem)] flex-col gap-4 overflow-hidden">
      {/* Match Header with game reporting strip */}
      <div className="shrink-0">
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
          games={games}
          gamesLoading={gamesLoading}
          matchId={matchId}
          myAltId={headerMyAltId}
          opponentAltId={headerOpponentAltId}
          myName={headerMyName}
          opponentName={headerOpponentName}
          isParticipant={isParticipant}
          isPlayer1={isPlayer1}
          tournamentId={tournamentId}
          userAltId={userAltId}
          onGameUpdated={() => refetchGames()}
        />
      </div>

      {/* Mobile layout */}
      <div className="flex min-h-0 flex-1 flex-col lg:hidden">
        {hasTeams ? (
          <Tabs defaultValue="chat" className="flex min-h-0 flex-1 flex-col">
            <TabsList className="w-full shrink-0">
              <TabsTrigger value="chat" className="flex-1 gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="teams" className="flex-1 gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Teams
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="mt-4 min-h-0 flex-1">
              <MatchChat {...chatProps} />
            </TabsContent>

            <TabsContent value="teams" className="mt-4">
              {teamToggle}
            </TabsContent>
          </Tabs>
        ) : (
          <MatchChat {...chatProps} />
        )}
      </div>

      {/* Desktop layout: Chat fills height, Teams at bottom */}
      <div className="hidden min-h-0 flex-1 lg:flex lg:flex-col lg:gap-4">
        <div className="min-h-[300px] flex-1">
          <MatchChat {...chatProps} />
        </div>

        {/* Teams — snapped to bottom */}
        {teamToggle && <div className="shrink-0">{teamToggle}</div>}
      </div>
    </div>
  );
}
