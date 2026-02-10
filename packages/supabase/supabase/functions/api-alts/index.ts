/**
 * Alt API Edge Function
 *
 * RESTful endpoints for alt management:
 * - GET /api-alts → List current user's alts
 * - GET /api-alts/:id → Get alt details
 * - POST /api-alts → Create new alt
 * - PATCH /api-alts/:id → Update alt
 * - DELETE /api-alts/:id → Delete alt
 * - POST /api-alts/:id/set-main → Set as main alt
 */

import { createClient } from "@supabase/supabase-js";
import { getCorsHeaders } from "../_shared/cors.ts";
import { getCacheHeaders, CACHE_TTL } from "../_shared/cache.ts";
import type { ActionResult } from "@trainers/validators";
import { getCurrentUserAlts, getAltById } from "@trainers/supabase/queries";
import {
  createAlt,
  updateAlt,
  deleteAlt,
  setMainAlt,
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

    // GET /api-alts → List current user's alts
    if (method === "GET" && pathParts.length === 1) {
      const result = await getCurrentUserAlts(supabase);

      return jsonResponse(
        { success: true, data: result },
        200,
        cors,
        getCacheHeaders(CACHE_TTL.ALT, 60)
      );
    }

    // GET /api-alts/:id → Get alt details
    if (method === "GET" && pathParts.length === 2) {
      const altId = parseInt(pathParts[1], 10);

      if (isNaN(altId)) {
        return jsonResponse(
          { success: false, error: "Invalid alt ID", code: "INVALID_ID" },
          400,
          cors
        );
      }

      const result = await getAltById(supabase, altId);

      if (!result) {
        return jsonResponse(
          { success: false, error: "Alt not found", code: "NOT_FOUND" },
          404,
          cors
        );
      }

      return jsonResponse(
        { success: true, data: result },
        200,
        cors,
        getCacheHeaders(CACHE_TTL.ALT, 60)
      );
    }

    // POST /api-alts → Create new alt
    if (method === "POST" && pathParts.length === 1) {
      const body = await req.json();
      const { username, inGameName } = body;

      if (!username) {
        return jsonResponse(
          {
            success: false,
            error: "Username is required",
            code: "MISSING_FIELDS",
          },
          400,
          cors
        );
      }

      const alt = await createAlt(supabase, {
        username,
        inGameName,
      });

      return jsonResponse({ success: true, data: { id: alt.id } }, 201, cors);
    }

    // PATCH /api-alts/:id → Update alt
    if (method === "PATCH" && pathParts.length === 2) {
      const altId = parseInt(pathParts[1], 10);

      if (isNaN(altId)) {
        return jsonResponse(
          { success: false, error: "Invalid alt ID", code: "INVALID_ID" },
          400,
          cors
        );
      }

      const body = await req.json();

      // TODO: Add Zod validation for updateAltSchema

      await updateAlt(supabase, altId, body);

      return jsonResponse(
        { success: true, data: { success: true } },
        200,
        cors
      );
    }

    // DELETE /api-alts/:id → Delete alt
    if (method === "DELETE" && pathParts.length === 2) {
      const altId = parseInt(pathParts[1], 10);

      if (isNaN(altId)) {
        return jsonResponse(
          { success: false, error: "Invalid alt ID", code: "INVALID_ID" },
          400,
          cors
        );
      }

      await deleteAlt(supabase, altId);

      return jsonResponse(
        { success: true, data: { success: true } },
        200,
        cors
      );
    }

    // POST /api-alts/:id/set-main → Set as main alt
    if (method === "POST" && pathParts[2] === "set-main") {
      const altId = parseInt(pathParts[1], 10);

      if (isNaN(altId)) {
        return jsonResponse(
          { success: false, error: "Invalid alt ID", code: "INVALID_ID" },
          400,
          cors
        );
      }

      await setMainAlt(supabase, altId);

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
    console.error("[api-alts]", error);

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
