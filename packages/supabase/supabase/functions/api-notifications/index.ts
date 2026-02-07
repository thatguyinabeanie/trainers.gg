/**
 * Notification API Edge Function
 *
 * RESTful endpoints for notification management:
 * - GET /api-notifications → List user's notifications
 * - PATCH /api-notifications/:id/read → Mark notification as read
 * - PATCH /api-notifications/read-all → Mark all notifications as read
 * - DELETE /api-notifications/:id → Delete notification
 */

import { createClient } from "@supabase/supabase-js";
import { getCorsHeaders } from "../_shared/cors.ts";
import { getCacheHeaders, CACHE_TTL } from "../_shared/cache.ts";
import type { ActionResult } from "@trainers/validators";
import { getUserNotifications } from "@trainers/supabase/queries";
import {
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
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

    const { user, supabase } = authResult;

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const method = req.method;

    // GET /api-notifications → List user's notifications
    if (method === "GET" && pathParts.length === 1) {
      const result = await getUserNotifications(supabase);

      return jsonResponse(
        { success: true, data: result },
        200,
        cors,
        getCacheHeaders(10, 5)
      );
    }

    // PATCH /api-notifications/:id/read → Mark notification as read
    if (method === "PATCH" && pathParts[2] === "read") {
      const notificationId = parseInt(pathParts[1], 10);

      if (isNaN(notificationId)) {
        return jsonResponse(
          {
            success: false,
            error: "Invalid notification ID",
            code: "INVALID_ID",
          },
          400,
          cors
        );
      }

      await markNotificationRead(supabase, notificationId);

      return jsonResponse(
        { success: true, data: { success: true } },
        200,
        cors
      );
    }

    // PATCH /api-notifications/read-all → Mark all notifications as read
    if (method === "PATCH" && pathParts[1] === "read-all") {
      await markAllNotificationsRead(supabase);

      return jsonResponse(
        { success: true, data: { success: true } },
        200,
        cors
      );
    }

    // DELETE /api-notifications/:id → Delete notification
    if (method === "DELETE" && pathParts.length === 2) {
      const notificationId = parseInt(pathParts[1], 10);

      if (isNaN(notificationId)) {
        return jsonResponse(
          {
            success: false,
            error: "Invalid notification ID",
            code: "INVALID_ID",
          },
          400,
          cors
        );
      }

      await deleteNotification(supabase, notificationId);

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
    console.error("[api-notifications]", error);

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
