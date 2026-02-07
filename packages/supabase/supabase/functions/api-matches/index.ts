/**
 * Match API Edge Function
 *
 * RESTful endpoints for match operations:
 * - GET /api-matches/:id → Get match details
 * - POST /api-matches/:id/games → Submit game selection
 * - POST /api-matches/:id/messages → Send match message
 * - POST /api-matches/:id/create-games → Create match games
 * - POST /api-matches/:id/judge-override → Judge override game (judge only)
 * - POST /api-matches/:id/judge-reset → Judge reset game (judge only)
 * - POST /api-matches/:id/reset → Reset entire match (judge only)
 */

import { createClient } from "@supabase/supabase-js";
import { getCorsHeaders } from "../_shared/cors.ts";
import { getCacheHeaders, CACHE_TTL } from "../_shared/cache.ts";
import type { ActionResult } from "@trainers/validators";
import { getMatchById } from "@trainers/supabase/queries";
import {
  submitGameSelection,
  sendMatchMessage,
  createMatchGames,
  judgeOverrideGame,
  judgeResetGame,
  resetMatch,
} from "@trainers/supabase/mutations";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

async function authenticateUser(jwt: string | null) {
  if (!jwt) {
    return {
      success: false as const,
      error: "Missing authorization header",
      code: "UNAUTHORIZED",
    };
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      success: false as const,
      error: "Invalid or expired token",
      code: "UNAUTHORIZED",
    };
  }

  return { success: true as const, user, supabase };
}

function jsonResponse(
  data: ActionResult<unknown>,
  status: number,
  cors: Record<string, string>,
  cacheHeaders?: Record<string, string>
) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...cors,
      ...cacheHeaders,
      "Content-Type": "application/json",
    },
  });
}

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const jwt =
      req.headers.get("authorization")?.replace("Bearer ", "") ?? null;
    const authResult = await authenticateUser(jwt);

    if (!authResult.success) {
      return jsonResponse(
        { success: false, error: authResult.error, code: authResult.code },
        401,
        cors
      );
    }

    const { supabase } = authResult;

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const method = req.method;

    // GET /api-matches/:id → Get match details
    if (method === "GET" && pathParts.length === 2) {
      const matchId = parseInt(pathParts[1], 10);

      if (isNaN(matchId)) {
        return jsonResponse(
          { success: false, error: "Invalid match ID", code: "INVALID_ID" },
          400,
          cors
        );
      }

      const result = await getMatchById(supabase, matchId);

      if (!result) {
        return jsonResponse(
          { success: false, error: "Match not found", code: "NOT_FOUND" },
          404,
          cors
        );
      }

      return jsonResponse(
        { success: true, data: result },
        200,
        cors,
        getCacheHeaders(CACHE_TTL.MATCH, 15, true)
      );
    }

    // POST /api-matches/:id/games → Submit game selection
    if (method === "POST" && pathParts[2] === "games") {
      const matchId = parseInt(pathParts[1], 10);

      if (isNaN(matchId)) {
        return jsonResponse(
          { success: false, error: "Invalid match ID", code: "INVALID_ID" },
          400,
          cors
        );
      }

      const body = await req.json();
      const { gameId, selectedWinnerAltId } = body;

      if (!gameId || !selectedWinnerAltId) {
        return jsonResponse(
          {
            success: false,
            error: "Game ID and selected winner required",
            code: "MISSING_FIELDS",
          },
          400,
          cors
        );
      }

      await submitGameSelection(supabase, gameId, selectedWinnerAltId);

      return jsonResponse(
        { success: true, data: { success: true } },
        200,
        cors
      );
    }

    // POST /api-matches/:id/messages → Send match message
    if (method === "POST" && pathParts[2] === "messages") {
      const matchId = parseInt(pathParts[1], 10);

      if (isNaN(matchId)) {
        return jsonResponse(
          { success: false, error: "Invalid match ID", code: "INVALID_ID" },
          400,
          cors
        );
      }

      const body = await req.json();
      const { altId, content, messageType = "player" } = body;

      if (!altId || !content) {
        return jsonResponse(
          {
            success: false,
            error: "Alt ID and content required",
            code: "MISSING_FIELDS",
          },
          400,
          cors
        );
      }

      const data = await sendMatchMessage(
        supabase,
        matchId,
        altId,
        content,
        messageType
      );

      return jsonResponse({ success: true, data: { id: data.id } }, 200, cors);
    }

    // POST /api-matches/:id/create-games → Create match games
    if (method === "POST" && pathParts[2] === "create-games") {
      const matchId = parseInt(pathParts[1], 10);

      if (isNaN(matchId)) {
        return jsonResponse(
          { success: false, error: "Invalid match ID", code: "INVALID_ID" },
          400,
          cors
        );
      }

      const body = await req.json();
      const { numberOfGames } = body;

      if (!numberOfGames || numberOfGames < 1 || numberOfGames > 9) {
        return jsonResponse(
          {
            success: false,
            error: "Number of games must be between 1 and 9",
            code: "INVALID_INPUT",
          },
          400,
          cors
        );
      }

      await createMatchGames(supabase, matchId, numberOfGames);

      return jsonResponse(
        { success: true, data: { success: true } },
        200,
        cors
      );
    }

    // POST /api-matches/:id/judge-override → Judge override game
    if (method === "POST" && pathParts[2] === "judge-override") {
      const matchId = parseInt(pathParts[1], 10);

      if (isNaN(matchId)) {
        return jsonResponse(
          { success: false, error: "Invalid match ID", code: "INVALID_ID" },
          400,
          cors
        );
      }

      const body = await req.json();
      const { gameId, winnerAltId } = body;

      if (!gameId || !winnerAltId) {
        return jsonResponse(
          {
            success: false,
            error: "Game ID and winner required",
            code: "MISSING_FIELDS",
          },
          400,
          cors
        );
      }

      await judgeOverrideGame(supabase, gameId, winnerAltId);

      return jsonResponse(
        { success: true, data: { success: true } },
        200,
        cors
      );
    }

    // POST /api-matches/:id/judge-reset → Judge reset game
    if (method === "POST" && pathParts[2] === "judge-reset") {
      const matchId = parseInt(pathParts[1], 10);

      if (isNaN(matchId)) {
        return jsonResponse(
          { success: false, error: "Invalid match ID", code: "INVALID_ID" },
          400,
          cors
        );
      }

      const body = await req.json();
      const { gameId } = body;

      if (!gameId) {
        return jsonResponse(
          { success: false, error: "Game ID required", code: "MISSING_FIELD" },
          400,
          cors
        );
      }

      await judgeResetGame(supabase, gameId);

      return jsonResponse(
        { success: true, data: { success: true } },
        200,
        cors
      );
    }

    // POST /api-matches/:id/reset → Reset entire match
    if (method === "POST" && pathParts[2] === "reset") {
      const matchId = parseInt(pathParts[1], 10);

      if (isNaN(matchId)) {
        return jsonResponse(
          { success: false, error: "Invalid match ID", code: "INVALID_ID" },
          400,
          cors
        );
      }

      await resetMatch(supabase, matchId);

      return jsonResponse(
        { success: true, data: { success: true } },
        200,
        cors
      );
    }

    // No matching route
    return jsonResponse(
      { success: false, error: "Not found", code: "NOT_FOUND" },
      404,
      cors
    );
  } catch (error) {
    console.error("[api-matches]", error);

    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
        code: "INTERNAL_ERROR",
      },
      500,
      cors
    );
  }
});
