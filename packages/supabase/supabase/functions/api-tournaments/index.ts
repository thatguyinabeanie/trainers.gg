/**
 * Tournament API Edge Function
 *
 * RESTful endpoints for tournament operations:
 * - GET /api-tournaments → List tournaments (grouped by status)
 * - GET /api-tournaments/:id → Get tournament details
 * - POST /api-tournaments → Create tournament
 * - PATCH /api-tournaments/:id → Update tournament
 * - POST /api-tournaments/:id/register → Register for tournament
 * - POST /api-tournaments/:id/check-in → Check in for tournament
 * - DELETE /api-tournaments/:id/registration → Cancel registration
 * - POST /api-tournaments/:id/submit-team → Submit team
 * - POST /api-tournaments/:id/start → Start tournament (TO only)
 * - POST /api-tournaments/:id/rounds → Create new round
 * - POST /api-tournaments/:id/advance-top-cut → Advance to top cut
 *
 * Uses three-layer caching:
 * 1. Client cache (Next.js ISR / TanStack Query)
 * 2. CDN cache (Cache-Control headers)
 * 3. Edge Function cache (Upstash Redis)
 */

import { createClient } from "@supabase/supabase-js";
import { getCorsHeaders } from "../_shared/cors.ts";
import {
  withCache,
  invalidateCache,
  getCacheHeaders,
  CACHE_TTL,
} from "../_shared/cache.ts";
import type { ActionResult } from "@trainers/validators";
import {
  listTournamentsGrouped,
  getTournamentById,
} from "@trainers/supabase/queries";
import {
  createTournament as createTournamentMutation,
  updateTournament as updateTournamentMutation,
  registerForTournament as registerForTournamentMutation,
  checkIn as checkInMutation,
  cancelRegistration as cancelRegistrationMutation,
  submitTeam as submitTeamMutation,
  startTournamentEnhanced as startTournamentEnhancedMutation,
  createRound as createRoundMutation,
  advanceToTopCut as advanceToTopCutMutation,
} from "@trainers/supabase/mutations";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

/**
 * Extract and validate user from JWT
 */
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

/**
 * Create JSON response with CORS and optional cache headers
 */
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

/**
 * Main handler
 */
Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    // Extract JWT and authenticate
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

    // Parse URL and route to handler
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const method = req.method;

    // GET /api-tournaments → List tournaments (grouped by status)
    if (method === "GET" && pathParts.length === 1) {
      const result = await withCache(
        `tournaments:list:grouped`,
        async () => {
          return await listTournamentsGrouped(supabase, {
            completedLimit: 10,
          });
        },
        CACHE_TTL.TOURNAMENT
      );

      return jsonResponse(
        { success: true, data: result },
        200,
        cors,
        getCacheHeaders(60, 30, true)
      );
    }

    // GET /api-tournaments/:id → Get tournament details
    if (method === "GET" && pathParts.length === 2) {
      const tournamentId = parseInt(pathParts[1], 10);

      if (isNaN(tournamentId)) {
        return jsonResponse(
          {
            success: false,
            error: "Invalid tournament ID",
            code: "INVALID_ID",
          },
          400,
          cors
        );
      }

      const result = await withCache(
        `tournament:${tournamentId}`,
        async () => {
          return await getTournamentById(supabase, tournamentId);
        },
        CACHE_TTL.TOURNAMENT
      );

      if (!result) {
        return jsonResponse(
          {
            success: false,
            error: "Tournament not found",
            code: "NOT_FOUND",
          },
          404,
          cors
        );
      }

      return jsonResponse(
        { success: true, data: result },
        200,
        cors,
        getCacheHeaders(60, 30, true)
      );
    }

    // POST /api-tournaments → Create tournament
    if (method === "POST" && pathParts.length === 1) {
      const body = await req.json();

      // TODO: Add Zod validation for createTournamentSchema

      const result = await createTournamentMutation(supabase, body);

      // Note: Don't invalidate list yet - tournament is created as draft
      // Only invalidate when published (status → upcoming)

      return jsonResponse({ success: true, data: result }, 201, cors);
    }

    // PATCH /api-tournaments/:id → Update tournament
    if (method === "PATCH" && pathParts.length === 2) {
      const tournamentId = parseInt(pathParts[1], 10);

      if (isNaN(tournamentId)) {
        return jsonResponse(
          {
            success: false,
            error: "Invalid tournament ID",
            code: "INVALID_ID",
          },
          400,
          cors
        );
      }

      const body = await req.json();

      // TODO: Add Zod validation for updateTournamentSchema

      await updateTournamentMutation(supabase, tournamentId, body);

      // Invalidate caches
      await invalidateCache(`tournament:${tournamentId}`);

      // If tournament was published (status → upcoming), invalidate list
      if (body.status === "upcoming") {
        await invalidateCache(`tournaments:list:*`);
      }

      return jsonResponse(
        { success: true, data: { success: true } },
        200,
        cors
      );
    }

    // POST /api-tournaments/:id/register → Register for tournament
    if (
      method === "POST" &&
      pathParts.length === 3 &&
      pathParts[2] === "register"
    ) {
      const tournamentId = parseInt(pathParts[1], 10);

      if (isNaN(tournamentId)) {
        return jsonResponse(
          {
            success: false,
            error: "Invalid tournament ID",
            code: "INVALID_ID",
          },
          400,
          cors
        );
      }

      const body = await req.json();
      const { altId } = body;

      if (!altId) {
        return jsonResponse(
          {
            success: false,
            error: "Alt ID is required",
            code: "MISSING_FIELD",
          },
          400,
          cors
        );
      }

      await registerForTournamentMutation(supabase, tournamentId, altId);

      // Invalidate tournament cache (registration count changed)
      await invalidateCache(`tournament:${tournamentId}`);
      await invalidateCache(`tournaments:list:*`);

      return jsonResponse(
        { success: true, data: { success: true } },
        200,
        cors
      );
    }

    // POST /api-tournaments/:id/check-in → Check in for tournament
    if (
      method === "POST" &&
      pathParts.length === 3 &&
      pathParts[2] === "check-in"
    ) {
      const tournamentId = parseInt(pathParts[1], 10);

      if (isNaN(tournamentId)) {
        return jsonResponse(
          {
            success: false,
            error: "Invalid tournament ID",
            code: "INVALID_ID",
          },
          400,
          cors
        );
      }

      await checkInMutation(supabase, tournamentId);

      // Invalidate tournament cache
      await invalidateCache(`tournament:${tournamentId}`);

      return jsonResponse(
        { success: true, data: { success: true } },
        200,
        cors
      );
    }

    // DELETE /api-tournaments/:id/registration → Cancel registration
    if (
      method === "DELETE" &&
      pathParts.length === 3 &&
      pathParts[2] === "registration"
    ) {
      const tournamentId = parseInt(pathParts[1], 10);

      if (isNaN(tournamentId)) {
        return jsonResponse(
          {
            success: false,
            error: "Invalid tournament ID",
            code: "INVALID_ID",
          },
          400,
          cors
        );
      }

      await cancelRegistrationMutation(supabase, tournamentId);

      // Invalidate tournament cache
      await invalidateCache(`tournament:${tournamentId}`);
      await invalidateCache(`tournaments:list:*`);

      return jsonResponse(
        { success: true, data: { success: true } },
        200,
        cors
      );
    }

    // POST /api-tournaments/:id/submit-team → Submit team
    if (
      method === "POST" &&
      pathParts.length === 3 &&
      pathParts[2] === "submit-team"
    ) {
      const tournamentId = parseInt(pathParts[1], 10);

      if (isNaN(tournamentId)) {
        return jsonResponse(
          {
            success: false,
            error: "Invalid tournament ID",
            code: "INVALID_ID",
          },
          400,
          cors
        );
      }

      const body = await req.json();
      const { showdownText } = body;

      if (!showdownText) {
        return jsonResponse(
          {
            success: false,
            error: "Showdown text is required",
            code: "MISSING_FIELD",
          },
          400,
          cors
        );
      }

      const result = await submitTeamMutation(
        supabase,
        tournamentId,
        showdownText
      );

      // Invalidate tournament cache
      await invalidateCache(`tournament:${tournamentId}`);

      return jsonResponse({ success: true, data: result }, 200, cors);
    }

    // POST /api-tournaments/:id/start → Start tournament (TO only)
    if (
      method === "POST" &&
      pathParts.length === 3 &&
      pathParts[2] === "start"
    ) {
      const tournamentId = parseInt(pathParts[1], 10);

      if (isNaN(tournamentId)) {
        return jsonResponse(
          {
            success: false,
            error: "Invalid tournament ID",
            code: "INVALID_ID",
          },
          400,
          cors
        );
      }

      await startTournamentEnhancedMutation(supabase, tournamentId);

      // Invalidate tournament cache
      await invalidateCache(`tournament:${tournamentId}`);
      await invalidateCache(`tournaments:list:*`);

      return jsonResponse(
        { success: true, data: { success: true } },
        200,
        cors
      );
    }

    // POST /api-tournaments/:id/rounds → Create new round
    if (
      method === "POST" &&
      pathParts.length === 3 &&
      pathParts[2] === "rounds"
    ) {
      const tournamentId = parseInt(pathParts[1], 10);

      if (isNaN(tournamentId)) {
        return jsonResponse(
          {
            success: false,
            error: "Invalid tournament ID",
            code: "INVALID_ID",
          },
          400,
          cors
        );
      }

      const result = await createRoundMutation(supabase, tournamentId);

      // Invalidate tournament cache
      await invalidateCache(`tournament:${tournamentId}`);

      return jsonResponse({ success: true, data: result }, 200, cors);
    }

    // POST /api-tournaments/:id/advance-top-cut → Advance to top cut
    if (
      method === "POST" &&
      pathParts.length === 3 &&
      pathParts[2] === "advance-top-cut"
    ) {
      const tournamentId = parseInt(pathParts[1], 10);

      if (isNaN(tournamentId)) {
        return jsonResponse(
          {
            success: false,
            error: "Invalid tournament ID",
            code: "INVALID_ID",
          },
          400,
          cors
        );
      }

      await advanceToTopCutMutation(supabase, tournamentId);

      // Invalidate tournament cache
      await invalidateCache(`tournament:${tournamentId}`);

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
    console.error("[api-tournaments]", error);

    // Handle validation errors (Zod)
    if (error instanceof Error && error.name === "ZodError") {
      return jsonResponse(
        {
          success: false,
          error: "Invalid input",
          code: "VALIDATION_ERROR",
        },
        400,
        cors
      );
    }

    // Generic error
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
