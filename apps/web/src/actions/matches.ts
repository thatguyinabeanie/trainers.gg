/**
 * Match Server Actions
 *
 * Server actions for match mutations (game scoring, chat, judge actions).
 * Wraps @trainers/supabase mutations with cache revalidation.
 */

"use server";

import { z } from "@trainers/validators";
import { updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  submitGameSelection,
  sendMatchMessage,
  createMatchGames,
  judgeOverrideGame,
  judgeResetGame,
  resetMatch,
  confirmMatchCheckIn,
} from "@trainers/supabase";
import type { Database } from "@trainers/supabase";
import { CacheTags } from "@/lib/cache";
import { type ActionResult } from "@trainers/validators";
import { rejectBots, withAction } from "./utils";

// --- Input Schemas ---

const idSchema = z.number().int().positive();
const messageContentSchema = z
  .string()
  .min(1, "Message cannot be empty")
  .max(500, "Message must be 500 characters or fewer");
const messageTypeSchema = z.enum(["player", "judge"]);
const numberOfGamesSchema = z.number().int().min(1).max(9);

// =============================================================================
// Game Scoring
// =============================================================================

/**
 * Submit a game result selection (player selects who won this game).
 * Uses the SECURITY DEFINER RPC — enforces caller can only set own column.
 */
export async function submitGameSelectionAction(
  gameId: number,
  selectedWinnerAltId: number,
  tournamentId: number
): Promise<ActionResult> {
  return withAction(async () => {
    await rejectBots();
    const validGameId = idSchema.parse(gameId);
    const validWinnerId = idSchema.parse(selectedWinnerAltId);
    const validTournamentId = idSchema.parse(tournamentId);
    const supabase = await createClient();
    await submitGameSelection(supabase, validGameId, validWinnerId);
    updateTag(CacheTags.tournament(validTournamentId));
  }, "Failed to submit game selection");
}

// =============================================================================
// Match Chat
// =============================================================================

/**
 * Send a chat message in a match.
 */
export async function sendMatchMessageAction(
  matchId: number,
  altId: number,
  content: string,
  messageType: Database["public"]["Enums"]["match_message_type"] = "player"
): Promise<ActionResult<{ id: number }>> {
  return withAction(async () => {
    await rejectBots();
    const validMatchId = idSchema.parse(matchId);
    const validAltId = idSchema.parse(altId);
    const validContent = messageContentSchema.parse(content);
    const validType = messageTypeSchema.parse(messageType);

    const supabase = await createClient();
    const data = await sendMatchMessage(
      supabase,
      validMatchId,
      validAltId,
      validContent,
      validType
    );
    return { id: data.id };
  }, "Failed to send message");
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
  return withAction(async () => {
    await rejectBots();
    const validMatchId = idSchema.parse(matchId);
    const validCount = numberOfGamesSchema.parse(numberOfGames);
    const validTournamentId = idSchema.parse(tournamentId);
    const supabase = await createClient();
    const data = await createMatchGames(supabase, validMatchId, validCount);
    updateTag(CacheTags.tournament(validTournamentId));
    return { count: data.length };
  }, "Failed to create match games");
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
  return withAction(async () => {
    await rejectBots();
    const validGameId = idSchema.parse(gameId);
    const validWinnerId = idSchema.parse(winnerAltId);
    const validTournamentId = idSchema.parse(tournamentId);
    const supabase = await createClient();

    // Resolve judge alt ID from authenticated session
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
      validGameId,
      validWinnerId,
      alt.id,
      notes
    );
    updateTag(CacheTags.tournament(validTournamentId));
    return { gameId: data.id };
  }, "Failed to override game");
}

/**
 * Judge: Reset a game to pending state.
 */
export async function judgeResetGameAction(
  gameId: number,
  tournamentId: number
): Promise<ActionResult<{ gameId: number }>> {
  return withAction(async () => {
    await rejectBots();
    const validGameId = idSchema.parse(gameId);
    const validTournamentId = idSchema.parse(tournamentId);
    const supabase = await createClient();
    const data = await judgeResetGame(supabase, validGameId);
    updateTag(CacheTags.tournament(validTournamentId));
    return { gameId: data.id };
  }, "Failed to reset game");
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
  return withAction(async () => {
    await rejectBots();
    const validMatchId = idSchema.parse(matchId);
    const validTournamentId = idSchema.parse(tournamentId);
    const supabase = await createClient();

    const { error } = await supabase.rpc("request_judge", {
      p_match_id: validMatchId,
    });
    if (error) throw error;
    updateTag(CacheTags.tournament(validTournamentId));
    return { success: true as const };
  }, "Failed to request judge");
}

/**
 * Judge: Reset all games in a match back to pending and clear the match score.
 */
export async function resetMatchAction(
  matchId: number,
  tournamentId: number
): Promise<ActionResult<{ matchId: number }>> {
  return withAction(async () => {
    await rejectBots();
    const validMatchId = idSchema.parse(matchId);
    const validTournamentId = idSchema.parse(tournamentId);
    const supabase = await createClient();
    const data = await resetMatch(supabase, validMatchId);
    updateTag(CacheTags.tournament(validTournamentId));
    return { matchId: data.id };
  }, "Failed to reset match");
}

/**
 * Cancel a judge request (player action — sets staff_requested = false).
 * Only match participants can cancel requests they initiated.
 */
export async function cancelJudgeRequestAction(
  matchId: number,
  tournamentId: number
): Promise<ActionResult<{ success: true }>> {
  return withAction(async () => {
    await rejectBots();
    const validMatchId = idSchema.parse(matchId);
    const validTournamentId = idSchema.parse(tournamentId);
    const supabase = await createClient();

    const { error } = await supabase.rpc("cancel_judge_request", {
      p_match_id: validMatchId,
    });
    if (error) throw error;
    updateTag(CacheTags.tournament(validTournamentId));
    return { success: true as const };
  }, "Failed to cancel judge request");
}

/**
 * Clear a judge request for a match (sets staff_requested = false).
 * Only org staff with tournament.manage permission can clear requests.
 */
export async function clearJudgeRequestAction(
  matchId: number,
  tournamentId: number
): Promise<ActionResult<{ success: true }>> {
  return withAction(async () => {
    await rejectBots();
    const validMatchId = idSchema.parse(matchId);
    const validTournamentId = idSchema.parse(tournamentId);
    const supabase = await createClient();

    const { error } = await supabase.rpc("clear_judge_request", {
      p_match_id: validMatchId,
    });
    if (error) throw error;
    updateTag(CacheTags.tournament(validTournamentId));
    return { success: true as const };
  }, "Failed to clear judge request");
}

// =============================================================================
// Match Check-In
// =============================================================================

/**
 * Confirm match check-in (player readiness).
 * When both players confirm, the match transitions from pending to active.
 */
export async function confirmMatchCheckInAction(
  matchId: number,
  tournamentId: number
): Promise<ActionResult<{ matchActivated: boolean }>> {
  return withAction(async () => {
    await rejectBots();
    const validMatchId = idSchema.parse(matchId);
    const validTournamentId = idSchema.parse(tournamentId);
    const supabase = await createClient();
    const result = await confirmMatchCheckIn(supabase, validMatchId);
    updateTag(CacheTags.tournament(validTournamentId));
    return { matchActivated: result.match_activated ?? false };
  }, "Failed to confirm match check-in");
}
