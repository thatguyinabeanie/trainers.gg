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
import { captureEventWithRequest } from "../_shared/posthog.ts";
import { GAME_RESULT_SUBMITTED } from "@trainers/posthog";
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
import { positiveIntSchema } from "@trainers/validators/common";
import {
  submitGameSelectionSchema,
  sendMatchMessageSchema,
  createMatchGamesSchema,
  judgeOverrideSchema,
  judgeResetSchema,
} from "@trainers/validators/match";
import { ZodError } from "zod";

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

    const { user, supabase } = authResult;

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const method = req.method;

    // GET /api-matches/:id → Get match details
    if (method === "GET" && pathParts.length === 2) {
      const matchId = positiveIntSchema.parse(pathParts[1]);

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
      const matchId = positiveIntSchema.parse(pathParts[1]);

      const body = await req.json();
      const { gameId, selectedWinnerAltId } =
        submitGameSelectionSchema.parse(body);

      await submitGameSelection(supabase, gameId, selectedWinnerAltId);

      // Fire-and-forget analytics
      captureEventWithRequest(req, {
        event: GAME_RESULT_SUBMITTED,
        distinctId: user.id,
        properties: { match_id: matchId },
      });

      return jsonResponse(
        { success: true, data: { success: true } },
        200,
        cors
      );
    }

    // POST /api-matches/:id/messages → Send match message
    if (method === "POST" && pathParts[2] === "messages") {
      const matchId = positiveIntSchema.parse(pathParts[1]);

      const body = await req.json();
      const { altId, content, messageType } =
        sendMatchMessageSchema.parse(body);

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
      const matchId = positiveIntSchema.parse(pathParts[1]);

      const body = await req.json();
      const { numberOfGames } = createMatchGamesSchema.parse(body);

      await createMatchGames(supabase, matchId, numberOfGames);

      return jsonResponse(
        { success: true, data: { success: true } },
        200,
        cors
      );
    }

    // POST /api-matches/:id/judge-override → Judge override game
    if (method === "POST" && pathParts[2] === "judge-override") {
      positiveIntSchema.parse(pathParts[1]);

      const body = await req.json();
      const { gameId, winnerAltId } = judgeOverrideSchema.parse(body);

      await judgeOverrideGame(supabase, gameId, winnerAltId);

      return jsonResponse(
        { success: true, data: { success: true } },
        200,
        cors
      );
    }

    // POST /api-matches/:id/judge-reset → Judge reset game
    if (method === "POST" && pathParts[2] === "judge-reset") {
      positiveIntSchema.parse(pathParts[1]);

      const body = await req.json();
      const { gameId } = judgeResetSchema.parse(body);

      await judgeResetGame(supabase, gameId);

      return jsonResponse(
        { success: true, data: { success: true } },
        200,
        cors
      );
    }

    // POST /api-matches/:id/reset → Reset entire match
    if (method === "POST" && pathParts[2] === "reset") {
      const matchId = positiveIntSchema.parse(pathParts[1]);

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

    if (error instanceof ZodError) {
      return jsonResponse(
        {
          success: false,
          error: error.issues[0]?.message ?? "Invalid input",
          code: "VALIDATION_ERROR",
        },
        400,
        cors
      );
    }

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
