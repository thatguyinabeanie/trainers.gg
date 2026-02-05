/**
 * Server-side sudo mode utilities
 *
 * Sudo mode allows site admins to explicitly activate elevated permissions
 * for accessing admin panel features. This is a security measure to prevent
 * accidental admin actions and provide audit logging.
 */

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  startSudoSession,
  endSudoSession,
  isSudoModeActive as checkSudoModeActive,
} from "@trainers/supabase";

const SUDO_COOKIE_NAME = "sudo_mode";
const SUDO_COOKIE_MAX_AGE = 30 * 60; // 30 minutes in seconds

/**
 * Check if the current user is a site admin with the site_admin role.
 * This is a prerequisite for sudo mode but NOT sufficient on its own.
 */
export async function isSiteAdmin(): Promise<boolean> {
  const supabase = await createClient();

  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session?.access_token) {
      return false;
    }

    // Decode JWT to check site_roles claim
    const payload = JSON.parse(atob(session.access_token.split(".")[1]!)) as {
      site_roles?: string[];
    };

    return payload?.site_roles?.includes("site_admin") ?? false;
  } catch {
    return false;
  }
}

/**
 * Check if sudo mode is currently active for the authenticated user.
 * Returns true if:
 * 1. User has site_admin role
 * 2. Sudo cookie exists and is valid
 * 3. Active sudo session exists in database (within timeout period)
 */
export async function isSudoModeActive(): Promise<boolean> {
  // First check if user is a site admin
  const isAdmin = await isSiteAdmin();
  if (!isAdmin) {
    return false;
  }

  // Check for sudo cookie
  const cookieStore = await cookies();
  const sudoCookie = cookieStore.get(SUDO_COOKIE_NAME);
  if (!sudoCookie?.value) {
    return false;
  }

  // Verify active session in database
  const supabase = await createClient();
  try {
    const isActive = await checkSudoModeActive(supabase);
    return isActive;
  } catch (error) {
    console.error("Error checking sudo mode status:", error);
    return false;
  }
}

/**
 * Activate sudo mode for the current user.
 * Creates a sudo session, sets a secure cookie, and logs the action.
 *
 * @param ipAddress - IP address of the request
 * @param userAgent - User agent string of the request
 * @throws Error if user is not a site admin or session creation fails
 */
export async function activateSudoMode(
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  // Verify user is a site admin
  const isAdmin = await isSiteAdmin();
  if (!isAdmin) {
    throw new Error("Only site admins can activate sudo mode");
  }

  // Create sudo session in database
  const supabase = await createClient();
  try {
    await startSudoSession(supabase, ipAddress, userAgent);

    // Set secure HTTP-only cookie
    const cookieStore = await cookies();
    cookieStore.set(SUDO_COOKIE_NAME, "active", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SUDO_COOKIE_MAX_AGE,
      path: "/",
    });
  } catch (error) {
    console.error("Error activating sudo mode:", error);
    throw new Error("Failed to activate sudo mode");
  }
}

/**
 * Deactivate sudo mode for the current user.
 * Ends the sudo session, clears the cookie, and logs the action.
 */
export async function deactivateSudoMode(): Promise<void> {
  const supabase = await createClient();

  try {
    // End sudo session in database
    await endSudoSession(supabase);

    // Clear cookie
    const cookieStore = await cookies();
    cookieStore.delete(SUDO_COOKIE_NAME);
  } catch (error) {
    console.error("Error deactivating sudo mode:", error);
    throw new Error("Failed to deactivate sudo mode");
  }
}

/**
 * Require sudo mode to be active. Throws an error if not.
 * Use this in server components or actions that require sudo mode.
 *
 * @throws Error if sudo mode is not active
 */
export async function requireSudoMode(): Promise<void> {
  const isActive = await isSudoModeActive();
  if (!isActive) {
    throw new Error("Sudo mode is required for this action");
  }
}

/**
 * Get request metadata for sudo session logging.
 * Extracts IP address and user agent from request headers.
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
