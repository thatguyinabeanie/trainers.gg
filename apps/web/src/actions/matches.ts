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
 * Caller must be a match participant or org staff.
 */
export async function requestJudgeAction(
  matchId: number,
  tournamentId: number
): Promise<ActionResult<{ success: true }>> {
  try {
    await rejectBots();
    const supabase = await createClient();

    // Verify caller is a match participant or org staff
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: match } = await supabase
      .from("tournament_matches")
      .select(
        `
        id,
        alt1_id,
        alt2_id,
        round:tournament_rounds!inner(
          phase:tournament_phases!inner(
            tournament:tournaments!inner(organization_id)
          )
        )
      `
      )
      .eq("id", matchId)
      .single();

    if (!match) throw new Error("Match not found");

    // Check if caller is a match participant
    const { data: callerAlts } = await supabase
      .from("alts")
      .select("id")
      .eq("user_id", user.id);

    const callerAltIds = new Set((callerAlts ?? []).map((a) => a.id));
    const isParticipant =
      (match.alt1_id && callerAltIds.has(match.alt1_id)) ||
      (match.alt2_id && callerAltIds.has(match.alt2_id));

    if (!isParticipant) {
      // Check if caller is org staff (RLS on the update will also enforce this,
      // but we provide a clearer error message)
      const round = match.round as unknown as {
        phase: { tournament: { organization_id: number } };
      };
      const { count } = await supabase
        .from("organization_staff")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", round.phase.tournament.organization_id)
        .eq("user_id", user.id);

      if (!count || count === 0) {
        throw new Error(
          "Only match participants or org staff can request a judge"
        );
      }
    }

    const { error } = await supabase
      .from("tournament_matches")
      .update({ staff_requested: true })
      .eq("id", matchId);

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
