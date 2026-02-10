/**
 * Server-side impersonation utilities
 *
 * Allows site admins to impersonate other users for debugging.
 * Mirrors the sudo mode pattern: session table + cookie + proxy check.
 *
 * Security:
 * - Requires active sudo mode
 * - All actions logged to audit_log
 * - Auto-expires after 30 minutes
 * - Cannot impersonate yourself
 * - /admin routes always use admin's real identity
 */

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

const IMPERSONATION_COOKIE_NAME = "impersonation_mode";
const IMPERSONATION_COOKIE_MAX_AGE = 30 * 60; // 30 minutes

/**
 * Check if the current user is actively impersonating someone.
 * Checks both the cookie and a valid database session.
 */
export async function isImpersonating(): Promise<boolean> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(IMPERSONATION_COOKIE_NAME);
  if (!cookie?.value) {
    return false;
  }

  const supabase = await createClient();
  try {
    const { data } = await supabase.rpc("get_active_impersonation_session", {
      timeout_minutes: 30,
    });
    return Array.isArray(data) && data.length > 0;
  } catch {
    return false;
  }
}

/**
 * Get the target user ID being impersonated, or null if not impersonating.
 */
export async function getImpersonationTarget(): Promise<{
  targetUserId: string;
  sessionId: number;
  startedAt: string;
} | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(IMPERSONATION_COOKIE_NAME);
  if (!cookie?.value) {
    return null;
  }

  const supabase = await createClient();
  try {
    const { data } = await supabase.rpc("get_active_impersonation_session", {
      timeout_minutes: 30,
    });
    const session = Array.isArray(data) ? data[0] : null;
    if (!session) return null;

    return {
      targetUserId: session.target_user_id,
      sessionId: session.id,
      startedAt: session.started_at,
    };
  } catch {
    return null;
  }
}

/**
 * Set the impersonation cookie after a session is created.
 * Called by the server action after inserting into impersonation_sessions.
 */
export async function setImpersonationCookie(sessionId: number): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(IMPERSONATION_COOKIE_NAME, String(sessionId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: IMPERSONATION_COOKIE_MAX_AGE,
    path: "/",
  });
}

/**
 * Clear the impersonation cookie.
 */
export async function clearImpersonationCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(IMPERSONATION_COOKIE_NAME);
}

/**
 * Get request metadata for impersonation session logging.
 */
export function getRequestMetadata(request?: Request): {
  ipAddress?: string;
  userAgent?: string;
} {
  if (!request) {
    return {};
  }

  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    request.headers.get("x-real-ip") ||
    undefined;

  const userAgent = request.headers.get("user-agent") || undefined;

  return { ipAddress, userAgent };
}
