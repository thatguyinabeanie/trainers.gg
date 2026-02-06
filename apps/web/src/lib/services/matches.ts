/**
 * Match Service Layer
 *
 * Pure business logic for match operations.
 * Called by both Server Actions (web) and API Routes (mobile).
 */

import { createClient } from "@/lib/supabase/server";
import {
  getMatchDetails,
  submitGameSelection,
  sendMatchMessage,
  createMatchGames,
  judgeOverrideGame,
  judgeResetGame,
  resetMatch,
  type Database,
} from "@trainers/supabase";

type MatchMessageType = Database["public"]["Enums"]["match_message_type"];

// =============================================================================
// Queries
// =============================================================================

export async function getMatchByIdService(matchId: number) {
  const supabase = await createClient();
  const match = await getMatchDetails(supabase, matchId);
  if (!match) {
    throw new Error("Match not found");
  }
  return match;
}

// =============================================================================
// Game Scoring
// =============================================================================

export async function submitGameSelectionService(
  gameId: number,
  selectedWinnerAltId: number
) {
  const supabase = await createClient();
  return await submitGameSelection(supabase, gameId, selectedWinnerAltId);
}

// =============================================================================
// Match Chat
// =============================================================================

export async function sendMatchMessageService(
  matchId: number,
  altId: number,
  content: string,
  messageType: MatchMessageType = "player"
) {
  const supabase = await createClient();
  return await sendMatchMessage(supabase, matchId, altId, content, messageType);
}

// =============================================================================
// Match Game Management
// =============================================================================

export async function createMatchGamesService(
  matchId: number,
  numberOfGames: number
) {
  const supabase = await createClient();
  return await createMatchGames(supabase, matchId, numberOfGames);
}

export async function judgeOverrideGameService(
  gameId: number,
  winnerAltId: number,
  judgeAltId: number,
  notes?: string
) {
  const supabase = await createClient();
  return await judgeOverrideGame(
    supabase,
    gameId,
    winnerAltId,
    judgeAltId,
    notes
  );
}

export async function judgeResetGameService(gameId: number) {
  const supabase = await createClient();
  return await judgeResetGame(supabase, gameId);
}

export async function resetMatchService(matchId: number) {
  const supabase = await createClient();
  return await resetMatch(supabase, matchId);
}
