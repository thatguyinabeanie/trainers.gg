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
  resetMatch,
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
): Promise<ActionResult> {
  try {
    await rejectBots();
    const supabase = await createClient();
    await submitGameSelection(supabase, gameId, selectedWinnerAltId);
    updateTag(CacheTags.tournament(tournamentId));
    return { success: true, data: undefined };
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
  ["player", "judge"];

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
  tournamentId: number,
  notes?: string
): Promise<ActionResult<{ gameId: number }>> {
  try {
    await rejectBots();
    const supabase = await createClient();

    // Resolve judge alt ID from authenticated session — never trust client input
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: alt } = await supabase
      .from("alts")
      .select("id")
      .eq("user_id", user.id)
      .limit(1)
      .single();
    if (!alt) throw new Error("No alt found for authenticated user");

    const data = await judgeOverrideGame(
      supabase,
      gameId,
      winnerAltId,
      alt.id,
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

/**
 * Judge: Reset all games in a match back to pending and clear the match score.
 */
export async function resetMatchAction(
  matchId: number,
  tournamentId: number
): Promise<ActionResult<{ matchId: number }>> {
  try {
    await rejectBots();
    const supabase = await createClient();
    const data = await resetMatch(supabase, matchId);
    updateTag(CacheTags.tournament(tournamentId));
    return { success: true, data: { matchId: data.id } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to reset match"),
    };
  }
}

/**
 * Cancel a judge request (player action — sets staff_requested = false).
 * Only match participants can cancel requests they initiated.
 */
export async function cancelJudgeRequestAction(
  matchId: number,
  tournamentId: number
): Promise<ActionResult<{ success: true }>> {
  try {
    await rejectBots();
    const supabase = await createClient();

    const { error } = await supabase.rpc("cancel_judge_request", {
      p_match_id: matchId,
    });

    if (error) throw error;
    updateTag(CacheTags.tournament(tournamentId));
    return { success: true, data: { success: true } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to cancel judge request"),
    };
  }
}

/**
 * Clear a judge request for a match (sets staff_requested = false).
 * Only org staff with tournament.manage permission can clear requests.
 */
export async function clearJudgeRequestAction(
  matchId: number,
  tournamentId: number
): Promise<ActionResult<{ success: true }>> {
  try {
    await rejectBots();
    const supabase = await createClient();

    const { error } = await supabase.rpc("clear_judge_request", {
      p_match_id: matchId,
    });

    if (error) throw error;
    updateTag(CacheTags.tournament(tournamentId));
    return { success: true, data: { success: true } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to clear judge request"),
    };
  }
}
