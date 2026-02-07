/**
 * Edge Function API Template
 *
 * Standard handler with:
 * - CORS (OPTIONS preflight)
 * - Auth (JWT validation, user extraction)
 * - Error handling (consistent ActionResult format)
 * - Caching (HTTP Cache-Control headers for CDN/browser caching)
 *
 * Usage:
 * 1. Copy this template to new Edge Function directory
 * 2. Replace route handlers with your domain logic
 * 3. Import domain-specific queries/mutations from @trainers/supabase
 * 4. Use appropriate cache TTL from CACHE_TTL
 */

import { createClient } from "jsr:@supabase/supabase-js@2";
import { getCorsHeaders } from "./cors.ts";
import { getCacheHeaders, CACHE_TTL } from "./cache.ts";
import type { ActionResult } from "@trainers/validators";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

/**
 * Extract and validate user from JWT.
 * Returns ActionResult with user or error.
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
 * Create a JSON response with CORS headers.
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
 * Main handler (example routes - replace with your domain logic)
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

    const { user, supabase } = authResult;

    // Parse URL and route to handler
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const method = req.method;

    // TODO: Use supabase for database queries (example placeholder)
    console.log(
      "Authenticated user:",
      user.id,
      "with supabase client:",
      !!supabase
    );

    // Example: GET /api-domain (list items)
    if (method === "GET" && pathParts.length === 1) {
      // TODO: Call your domain-specific query function
      // const result = await listItems(supabase, filters);
      const result = [];

      return jsonResponse(
        { success: true, data: result },
        200,
        cors,
        getCacheHeaders(CACHE_TTL.TOURNAMENT, 30) // Use appropriate TTL
      );
    }

    // Example: GET /api-domain/:id (get item by ID)
    if (method === "GET" && pathParts.length === 2) {
      const _itemId = pathParts[1];

      // TODO: Call your domain-specific query function
      // const result = await getItemById(supabase, _itemId);
      const result = null;

      if (!result) {
        return jsonResponse(
          { success: false, error: "Item not found", code: "NOT_FOUND" },
          404,
          cors
        );
      }

      return jsonResponse(
        { success: true, data: result },
        200,
        cors,
        getCacheHeaders(60, 30)
      );
    }

    // Example: POST /api-domain (create item)
    if (method === "POST" && pathParts.length === 1) {
      const body = await req.json();

      // TODO: Validate input with Zod schema
      // const validated = createItemSchema.parse(body);

      // TODO: Call your domain-specific mutation function
      // const item = await createItemMutation(supabase, validated);
      console.log("Creating item:", body, "for user:", user.id);

      return jsonResponse(
        { success: true, data: null }, // Replace with created item
        201,
        cors
      );
    }

    // Example: PATCH /api-domain/:id (update item)
    if (method === "PATCH" && pathParts.length === 2) {
      const itemId = pathParts[1];
      const body = await req.json();

      // TODO: Validate input with Zod schema
      // const validated = updateItemSchema.parse(body);

      // TODO: Call your domain-specific mutation function
      // const item = await updateItemMutation(supabase, itemId, validated);
      console.log("Updating item:", itemId, body);

      return jsonResponse(
        { success: true, data: null }, // Replace with updated item
        200,
        cors
      );
    }

    // Example: DELETE /api-domain/:id (delete item)
    if (method === "DELETE" && pathParts.length === 2) {
      const _itemId = pathParts[1];

      // TODO: Call your domain-specific mutation function
      // await deleteItemMutation(supabase, _itemId);

      return jsonResponse({ success: true, data: null }, 200, cors);
    }

    // No matching route
    return jsonResponse(
      { success: false, error: "Not found", code: "NOT_FOUND" },
      404,
      cors
    );
  } catch (error) {
    console.error("[edge-function-error]", error);

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
