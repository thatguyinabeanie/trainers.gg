import type { TypedClient } from "../client";

/**
 * Get the active sudo session for the current user.
 * Returns null if no active session exists or session has expired.
 *
 * @param supabase - Typed Supabase client
 * @param timeoutMinutes - Session timeout in minutes (default: 30)
 */
export async function getActiveSudoSession(
  supabase: TypedClient,
  timeoutMinutes = 30
) {
  const { data, error } = await supabase.rpc("get_active_sudo_session", {
    timeout_minutes: timeoutMinutes,
  });

  if (error) {
    console.error("Error fetching active sudo session:", error);
    return null;
  }

  return data?.[0] ?? null;
}

/**
 * Check if the current user has an active sudo session.
 *
 * @param supabase - Typed Supabase client
 */
export async function isSudoModeActive(
  supabase: TypedClient
): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_sudo_active");

  if (error) {
    console.error("Error checking sudo status:", error);
    return false;
  }

  return data ?? false;
}

/**
 * Get all sudo sessions for a user (for audit purposes).
 * Only callable by site admins.
 *
 * @param supabase - Typed Supabase client
 * @param userId - User ID to fetch sessions for (defaults to current user)
 * @param options - Query options (limit, offset, includeEnded)
 */
export async function getSudoSessions(
  supabase: TypedClient,
  userId?: string,
  options: {
    limit?: number;
    offset?: number;
    includeEnded?: boolean;
  } = {}
) {
  const { limit = 50, offset = 0, includeEnded = true } = options;

  let query = supabase.from("sudo_sessions").select("*");

  if (userId) {
    query = query.eq("user_id", userId);
  }

  if (!includeEnded) {
    query = query.is("ended_at", null);
  }

  query = query.order("started_at", { ascending: false });
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;

  if (error) throw error;
  return data;
}

/**
 * Start a new sudo session for the current user.
 * Creates audit log entry automatically.
 *
 * @param supabase - Typed Supabase client (must be authenticated)
 * @param ipAddress - IP address of the request
 * @param userAgent - User agent of the request
 */
export async function startSudoSession(
  supabase: TypedClient,
  ipAddress?: string,
  userAgent?: string
) {
  // First verify user is a site admin
  const isSiteAdmin = await supabase.rpc("is_site_admin");
  if (!isSiteAdmin.data) {
    throw new Error("User is not a site admin");
  }

  // Check if there's already an active session
  const activeSession = await getActiveSudoSession(supabase);
  if (activeSession) {
    // Session already active, return existing session
    return activeSession;
  }

  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("Failed to get current user");
  }

  // Create new sudo session
  const { data: session, error: sessionError } = await supabase
    .from("sudo_sessions")
    .insert({
      user_id: user.id,
      ip_address: ipAddress,
      user_agent: userAgent,
    })
    .select()
    .single();

  if (sessionError) throw sessionError;

  // Create audit log entry
  await supabase.from("audit_log").insert({
    action: "admin.sudo_activated",
    actor_user_id: user.id,
    metadata: {
      session_id: session.id,
      ip_address: ipAddress,
      user_agent: userAgent,
    },
  });

  return session;
}

/**
 * End the current user's active sudo session.
 * Creates audit log entry automatically.
 *
 * @param supabase - Typed Supabase client (must be authenticated)
 */
export async function endSudoSession(supabase: TypedClient) {
  // Get active session
  const activeSession = await getActiveSudoSession(supabase);
  if (!activeSession) {
    // No active session to end
    return null;
  }

  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("Failed to get current user");
  }

  // End the session
  const { data: session, error: sessionError } = await supabase
    .from("sudo_sessions")
    .update({ ended_at: new Date().toISOString() })
    .eq("id", activeSession.id)
    .select()
    .single();

  if (sessionError) throw sessionError;

  // Create audit log entry
  await supabase.from("audit_log").insert({
    action: "admin.sudo_deactivated",
    actor_user_id: user.id,
    metadata: {
      session_id: session.id,
      duration_seconds: Math.floor(
        (new Date(session.ended_at!).getTime() -
          new Date(session.started_at).getTime()) /
          1000
      ),
    },
  });

  return session;
}
