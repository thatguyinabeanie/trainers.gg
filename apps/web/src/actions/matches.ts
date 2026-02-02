/**
 * Match Server Actions
 *
 * Server actions for match mutations (blind scoring, chat, judge actions).
 * Wraps @trainers/supabase mutations with cache revalidation.
 */

"use server";

import { checkBotId } from "botid/server";
import { updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getErrorMessage } from "@/lib/utils";
import {
  submitGameSelection,
  sendMatchMessage,
  createMatchGames,
  judgeOverrideGame,
  judgeResetGame,
} from "@trainers/supabase";
import type { Database } from "@trainers/supabase";
import { CacheTags } from "@/lib/cache";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

async function rejectBots(): Promise<void> {
  const { isBot } = await checkBotId();
  if (isBot) throw new Error("Access denied");
}

// =============================================================================
// Blind Scoring
// =============================================================================

/**
 * Submit a blind game selection (player selects who won this game).
 * Uses the SECURITY DEFINER RPC — enforces caller can only set own column.
 */
export async function submitGameSelectionAction(
  gameId: number,
  selectedWinnerAltId: number,
  tournamentId: number
): Promise<ActionResult<{ success: boolean; error?: string }>> {
  try {
    await rejectBots();
    const supabase = await createClient();
    const result = await submitGameSelection(
      supabase,
      gameId,
      selectedWinnerAltId
    );
    updateTag(CacheTags.tournament(tournamentId));
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to submit game selection"),
    };
  }
}

// =============================================================================
// Match Chat
// =============================================================================

/**
 * Send a chat message in a match.
 */
const VALID_MESSAGE_TYPES: Database["public"]["Enums"]["match_message_type"][] =
  ["player", "system", "judge"];

export async function sendMatchMessageAction(
  matchId: number,
  altId: number,
  content: string,
  messageType: Database["public"]["Enums"]["match_message_type"] = "player"
): Promise<ActionResult<{ id: number }>> {
  try {
    await rejectBots();

    // Validate messageType server-side
    if (!VALID_MESSAGE_TYPES.includes(messageType)) {
      return { success: false, error: "Invalid message type" };
    }

    const supabase = await createClient();
    const data = await sendMatchMessage(
      supabase,
      matchId,
      altId,
      content,
      messageType
    );
    return { success: true, data: { id: data.id } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to send message"),
    };
  }
}

// =============================================================================
// Match Game Management
// =============================================================================

/**
 * Create match games when a match starts.
 */
export async function createMatchGamesAction(
  matchId: number,
  numberOfGames: number,
  tournamentId: number
): Promise<ActionResult<{ count: number }>> {
  try {
    await rejectBots();
    const supabase = await createClient();
    const data = await createMatchGames(supabase, matchId, numberOfGames);
    updateTag(CacheTags.tournament(tournamentId));
    return { success: true, data: { count: data.length } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to create match games"),
    };
  }
}

// =============================================================================
// Judge Actions
// =============================================================================

/**
 * Judge: Override a game result.
 */
export async function judgeOverrideGameAction(
  gameId: number,
  winnerAltId: number,
  judgeAltId: number,
  tournamentId: number,
  notes?: string
): Promise<ActionResult<{ gameId: number }>> {
  try {
    await rejectBots();
    const supabase = await createClient();
    const data = await judgeOverrideGame(
      supabase,
      gameId,
      winnerAltId,
      judgeAltId,
      notes
    );
    updateTag(CacheTags.tournament(tournamentId));
    return { success: true, data: { gameId: data.id } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to override game"),
    };
  }
}

/**
 * Judge: Reset a game to pending state.
 */
export async function judgeResetGameAction(
  gameId: number,
  tournamentId: number
): Promise<ActionResult<{ gameId: number }>> {
  try {
    await rejectBots();
    const supabase = await createClient();
    const data = await judgeResetGame(supabase, gameId);
    updateTag(CacheTags.tournament(tournamentId));
    return { success: true, data: { gameId: data.id } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to reset game"),
    };
  }
}

/**
 * Request a judge for a match (sets staff_requested = true).
 * Uses a SECURITY DEFINER RPC that enforces caller is a match
 * participant or org staff with tournament.manage permission.
 */
export async function requestJudgeAction(
  matchId: number,
  tournamentId: number
): Promise<ActionResult<{ success: true }>> {
  try {
    await rejectBots();
    const supabase = await createClient();

    const { error } = await supabase.rpc("request_judge", {
      p_match_id: matchId,
    });

    if (error) throw error;
    updateTag(CacheTags.tournament(tournamentId));
    return { success: true, data: { success: true } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to request judge"),
    };
  }
}
