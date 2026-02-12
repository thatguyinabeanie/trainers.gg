import type { TypedClient } from "../client";
import { escapeLike } from "@trainers/utils";

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

/**
 * Options for listing users in the admin panel.
 */
export interface ListUsersAdminOptions {
  /** Filter by username or email (case-insensitive partial match) */
  search?: string;
  /** Filter by suspension status (is_locked) */
  isLocked?: boolean;
  /** Maximum number of rows to return (default 25) */
  limit?: number;
  /** Row offset for pagination (default 0) */
  offset?: number;
}

// ------------------------------------------------------------------
// Queries
// ------------------------------------------------------------------

/**
 * Paginated user list for the admin panel.
 *
 * Includes joined alts and site roles for each user.
 * Returns both data rows and an exact total count for pagination.
 *
 * @param supabase - Typed Supabase client (service role recommended)
 * @param options  - Filtering and pagination options
 */
export async function listUsersAdmin(
  supabase: TypedClient,
  options: ListUsersAdminOptions = {}
) {
  const { search, isLocked, limit = 25, offset = 0 } = options;

  let query = supabase
    .from("users")
    .select(
      `
      id,
      email,
      username,
      first_name,
      last_name,
      image,
      is_locked,
      created_at,
      last_sign_in_at,
      alts!profiles_user_id_fkey (
        id,
        username,
        avatar_url
      ),
      user_roles (
        id,
        role:roles (
          id,
          name,
          description,
          scope
        )
      )
    `,
      { count: "exact", head: false }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  // Apply search filter across username and email
  if (search) {
    const escaped = escapeLike(search);
    query = query.or(`username.ilike.%${escaped}%,email.ilike.%${escaped}%`);
  }

  // Apply suspension filter
  if (isLocked !== undefined) {
    query = query.eq("is_locked", isLocked);
  }

  const { data, count, error } = await query;

  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
}

/**
 * Full user details for the admin detail view.
 *
 * Includes alts and site roles with role metadata.
 *
 * @param supabase - Typed Supabase client
 * @param userId   - UUID of the user to fetch
 */
export async function getUserAdminDetails(
  supabase: TypedClient,
  userId: string
) {
  const { data, error } = await supabase
    .from("users")
    .select(
      `
      *,
      alts!profiles_user_id_fkey (
        id,
        username,
        avatar_url,
        bio,
        tier,
        created_at
      ),
      user_roles (
        id,
        created_at,
        role:roles (
          id,
          name,
          description,
          scope
        )
      )
    `
    )
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

// ------------------------------------------------------------------
// Mutations
// ------------------------------------------------------------------

/**
 * Suspend (lock) a user account.
 *
 * Sets `is_locked = true` on the user row and creates an audit log entry.
 * The caller should pass a service-role client so RLS is bypassed.
 *
 * @param supabase    - Typed Supabase client (service role)
 * @param userId      - UUID of the user to suspend
 * @param adminUserId - UUID of the admin performing the action
 * @param reason      - Optional human-readable reason for suspension
 */
export async function suspendUser(
  supabase: TypedClient,
  userId: string,
  adminUserId: string,
  reason?: string
) {
  // Update the user record
  const { data: user, error: updateError } = await supabase
    .from("users")
    .update({ is_locked: true })
    .eq("id", userId)
    .select("id, username, email, is_locked")
    .single();

  if (updateError) throw updateError;

  // Insert audit log entry
  // NOTE: The audit_action enum values are added by migration
  // 20260209100001_admin_user_management.sql but may not yet
  // appear in the generated TypeScript types. Cast as needed.
  const { error: auditError } = await supabase.from("audit_log").insert({
    action: "admin.user_suspended" as const,
    actor_user_id: adminUserId,
    metadata: {
      target_user_id: userId,
      target_username: user.username,
      reason: reason ?? null,
    },
  });

  if (auditError) {
    console.error("Error inserting suspension audit log:", auditError);
  }

  return user;
}

/**
 * Unsuspend (unlock) a user account.
 *
 * Sets `is_locked = false` on the user row and creates an audit log entry.
 * The caller should pass a service-role client so RLS is bypassed.
 *
 * @param supabase    - Typed Supabase client (service role)
 * @param userId      - UUID of the user to unsuspend
 * @param adminUserId - UUID of the admin performing the action
 */
export async function unsuspendUser(
  supabase: TypedClient,
  userId: string,
  adminUserId: string
) {
  // Update the user record
  const { data: user, error: updateError } = await supabase
    .from("users")
    .update({ is_locked: false })
    .eq("id", userId)
    .select("id, username, email, is_locked")
    .single();

  if (updateError) throw updateError;

  // Insert audit log entry
  const { error: auditError } = await supabase.from("audit_log").insert({
    action: "admin.user_unsuspended" as const,
    actor_user_id: adminUserId,
    metadata: {
      target_user_id: userId,
      target_username: user.username,
    },
  });

  if (auditError) {
    console.error("Error inserting unsuspend audit log:", auditError);
  }

  return user;
}

/**
 * Start an impersonation session.
 *
 * Inserts a row into `impersonation_sessions` and records an audit log entry.
 * The caller should pass a service-role client so RLS is bypassed.
 *
 * @param supabase      - Typed Supabase client (service role)
 * @param adminUserId   - UUID of the admin starting impersonation
 * @param targetUserId  - UUID of the user to impersonate
 * @param reason        - Optional reason for impersonation
 * @param ipAddress     - IP address of the request
 * @param userAgent     - User agent of the request
 */
export async function startImpersonation(
  supabase: TypedClient,
  adminUserId: string,
  targetUserId: string,
  reason?: string,
  ipAddress?: string,
  userAgent?: string
) {
  // Insert the impersonation session
  const { data: session, error: sessionError } = await supabase
    .from("impersonation_sessions")
    .insert({
      admin_user_id: adminUserId,
      target_user_id: targetUserId,
      reason: reason ?? null,
      ip_address: ipAddress ?? null,
      user_agent: userAgent ?? null,
    })
    .select()
    .single();

  if (sessionError) throw sessionError;

  // Insert audit log entry
  const { error: auditError } = await supabase.from("audit_log").insert({
    action: "admin.impersonation_started" as const,
    actor_user_id: adminUserId,
    metadata: {
      session_id: session.id,
      target_user_id: targetUserId,
      reason: reason ?? null,
      ip_address: ipAddress ?? null,
      user_agent: userAgent ?? null,
    },
  });

  if (auditError) {
    console.error("Error inserting impersonation audit log:", auditError);
  }

  return session;
}

/**
 * End the active impersonation session for an admin.
 *
 * Directly queries `impersonation_sessions` by `admin_user_id` (not
 * via the `auth.uid()`-dependent RPC) so this works correctly with a
 * service-role client. Sets `ended_at` and records an audit log entry.
 *
 * @param supabase    - Typed Supabase client (service role)
 * @param adminUserId - UUID of the admin ending impersonation
 */
export async function endImpersonation(
  supabase: TypedClient,
  adminUserId: string
) {
  // Find the active impersonation session directly (no RPC, no auth.uid())
  const { data: activeSession, error: fetchError } = await supabase
    .from("impersonation_sessions")
    .select("*")
    .eq("admin_user_id", adminUserId)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchError) throw fetchError;

  if (!activeSession) {
    return null;
  }

  // End the session
  const now = new Date().toISOString();
  const { data: endedSession, error: updateError } = await supabase
    .from("impersonation_sessions")
    .update({ ended_at: now })
    .eq("id", activeSession.id)
    .select()
    .single();

  if (updateError) throw updateError;

  // Calculate session duration for the audit log
  const durationSeconds = Math.floor(
    (new Date(now).getTime() - new Date(activeSession.started_at).getTime()) /
      1000
  );

  // Insert audit log entry
  const { error: auditError } = await supabase.from("audit_log").insert({
    action: "admin.impersonation_ended" as const,
    actor_user_id: adminUserId,
    metadata: {
      session_id: activeSession.id,
      target_user_id: activeSession.target_user_id,
      duration_seconds: durationSeconds,
    },
  });

  if (auditError) {
    console.error("Error inserting impersonation-end audit log:", auditError);
  }

  return endedSession;
}
