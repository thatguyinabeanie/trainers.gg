import type { TypedClient, ServiceRoleClient } from "../client";
import { escapeLike } from "@trainers/utils";

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

/**
 * Options for listing users in the admin panel.
 */
export interface ListUsersAdminOptions {
  /** Filter by username (case-insensitive partial match).
   * Email search requires auth.admin filtering — not supported here. */
  search?: string;
  /** Filter by suspension status (is_locked) */
  isLocked?: boolean;
  /** Maximum number of rows to return (default 25) */
  limit?: number;
  /** Row offset for pagination (default 0) */
  offset?: number;
}

// ------------------------------------------------------------------
// PII helpers
// ------------------------------------------------------------------

/**
 * Batch-fetch first/last names via the `get_users_pii` RPC for a set of user IDs.
 *
 * Requires a service-role client — the RPC has EXECUTE granted to service_role
 * only (it exposes cross-user PII). Using an authenticated or anon client will
 * return a permission-denied error (HTTP 403 / code 42501).
 *
 * INTENTIONAL log-and-degrade: on a runtime RPC error (e.g. transient DB
 * failure) this function logs the error and returns an empty Map rather than
 * throwing. First/last names are non-essential enrichment for the admin view;
 * failing the entire page fetch when names are unavailable would be worse than
 * degrading gracefully. This is a documented decision, not a silent swallow.
 *
 * @param supabase - MUST be a service-role client (`get_users_pii` is service_role-only)
 * @param userIds  - Array of user UUIDs to look up
 */
export async function getPiiByUserIds(
  supabase: ServiceRoleClient,
  userIds: string[]
): Promise<
  Map<string, { first_name: string | null; last_name: string | null }>
> {
  if (userIds.length === 0) return new Map();

  const { data, error } = await supabase.rpc("get_users_pii", {
    p_user_ids: userIds,
  });

  if (error) {
    console.error("[getPiiByUserIds] Failed to fetch PII:", error);
    return new Map();
  }

  return new Map(
    (data ?? []).map((row) => [
      row.user_id,
      { first_name: row.first_name ?? null, last_name: row.last_name ?? null },
    ])
  );
}

// Cap on concurrent auth.admin.getUserById calls. There is no batch
// getUsersByIds in the admin API, so we fan out per id — but in bounded chunks
// so a large staff roster can't burst hundreds of admin requests at once
// (rate-limit / timeout risk).
const EMAIL_LOOKUP_CHUNK_SIZE = 20;

/**
 * Batch-fetch emails for a set of user IDs via the auth admin API.
 * Requires a service-role client — auth.users is not PostgREST-queryable.
 *
 * Makes one auth.admin.getUserById call per ID, in bounded-concurrency chunks
 * of EMAIL_LOOKUP_CHUNK_SIZE so a large set doesn't burst the admin API.
 *
 * INTENTIONAL log-and-degrade: individual lookup failures are logged and
 * that user's email is returned as null rather than aborting the batch.
 * Email is non-essential enrichment; failing the whole admin view when one
 * auth record is missing would be worse than a graceful null. This is a
 * documented decision, not a silent swallow.
 *
 * @param supabase - MUST be a service-role client (auth.admin requires service_role)
 * @param userIds  - Array of user UUIDs to look up
 */
export async function getEmailsByUserIds(
  supabase: ServiceRoleClient,
  userIds: string[]
): Promise<Map<string, string | null>> {
  if (userIds.length === 0) return new Map();

  const results: [string, string | null][] = [];
  for (let i = 0; i < userIds.length; i += EMAIL_LOOKUP_CHUNK_SIZE) {
    const chunk = userIds.slice(i, i + EMAIL_LOOKUP_CHUNK_SIZE);
    const chunkResults = await Promise.all(
      chunk.map(async (id) => {
        const { data, error } = await supabase.auth.admin.getUserById(id);
        if (error) {
          console.error("[getEmailsByUserIds] Failed to fetch user:", {
            id,
            error,
          });
          return [id, null] as [string, string | null];
        }
        return [id, data.user?.email ?? null] as [string, string | null];
      })
    );
    results.push(...chunkResults);
  }

  return new Map(results);
}

// ------------------------------------------------------------------
// Queries
// ------------------------------------------------------------------

/**
 * Paginated user list for the admin panel.
 *
 * Fetches public.users columns (no PII), then merges in email (auth admin API)
 * and first/last name (private.user_pii) for the returned page.
 *
 * Returns both data rows and an exact total count for pagination.
 *
 * @param supabase - MUST be a service-role client (reads PII via service_role-only helpers)
 * @param options  - Filtering and pagination options
 */
export async function listUsersAdmin(
  supabase: ServiceRoleClient,
  options: ListUsersAdminOptions = {}
) {
  const { search, isLocked, limit = 25, offset = 0 } = options;

  // NOTE: email and first_name/last_name are no longer in public.users.
  // We fetch public columns first, then enrich with PII and email below.
  let query = supabase
    .from("users")
    .select(
      `
      id,
      username,
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

  // Apply search filter — username only (email search now requires auth admin API,
  // which is not composable into a PostgREST query; username is sufficient for
  // the admin panel typeahead).
  if (search) {
    const escaped = escapeLike(search);
    query = query.ilike("username", `%${escaped}%`);
  }

  // Apply suspension filter
  if (isLocked !== undefined) {
    query = query.eq("is_locked", isLocked);
  }

  const { data, count, error } = await query;

  if (error) throw error;

  const rows = data ?? [];
  const userIds = rows.map((r) => r.id);

  // Enrich with email + PII in parallel
  const [emailMap, piiMap] = await Promise.all([
    getEmailsByUserIds(supabase, userIds),
    getPiiByUserIds(supabase, userIds),
  ]);

  const enriched = rows.map((r) => ({
    ...r,
    email: emailMap.get(r.id) ?? null,
    first_name: piiMap.get(r.id)?.first_name ?? null,
    last_name: piiMap.get(r.id)?.last_name ?? null,
  }));

  return { data: enriched, count: count ?? 0 };
}

/**
 * Full user details for the admin detail view.
 *
 * Fetches public.users columns (explicit allowlist — no PII), then merges in
 * email (auth admin API) and first/last name (get_users_pii RPC). Birth date is
 * intentionally NOT included: get_users_pii is a names-only shared RPC (so it
 * can't leak DOB through community staff rosters), and no admin view consumes
 * DOB. An admin DOB view would need a dedicated admin-only path.
 *
 * @param supabase - MUST be a service-role client (reads PII via service_role-only auth admin + RPC)
 * @param userId   - UUID of the user to fetch
 */
export async function getUserAdminDetails(
  supabase: ServiceRoleClient,
  userId: string
) {
  const { data, error } = await supabase
    .from("users")
    .select(
      `
      id,
      username,
      name,
      image,
      is_locked,
      is_coach,
      country,
      created_at,
      last_sign_in_at,
      last_active_at,
      sprite_preference,
      pds_handle,
      pds_status,
      did,
      main_alt_id,
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
  if (!data) return null;

  // Enrich with email (auth admin) + PII (get_users_pii RPC, service-role only) in parallel
  const [authResult, piiMap] = await Promise.all([
    supabase.auth.admin.getUserById(userId),
    getPiiByUserIds(supabase, [userId]),
  ]);

  if (authResult.error) {
    console.error(
      "[getUserAdminDetails] auth email lookup failed:",
      authResult.error.message
    );
  }

  const authUser = authResult.data;
  const pii = piiMap.get(userId);

  return {
    ...data,
    email: authUser?.user?.email ?? null,
    first_name: pii?.first_name ?? null,
    last_name: pii?.last_name ?? null,
  };
}

/**
 * Full user detail shape returned by `getUserAdminDetails`.
 * Includes all public profile columns plus enriched email (from auth.users)
 * and first/last name (from the get_users_pii RPC).
 */
export type UserAdminDetails = NonNullable<
  Awaited<ReturnType<typeof getUserAdminDetails>>
>;

/**
 * Fetch minimal user profiles by a list of UUIDs.
 * Used to display the current allowed-users list on a feature flag.
 *
 * @param supabase - Typed Supabase client
 * @param ids      - Array of user UUIDs to fetch
 */
export async function getUsersByIds(
  supabase: TypedClient,
  ids: string[]
): Promise<{ id: string; username: string | null; image: string | null }[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("users")
    .select("id, username, image")
    .in("id", ids);
  if (error) throw error;
  return data ?? [];
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
  // Update the user record — email is gone from public.users; select only safe columns.
  const { data: user, error: updateError } = await supabase
    .from("users")
    .update({ is_locked: true })
    .eq("id", userId)
    .select("id, username, is_locked")
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
  // Update the user record — email is gone from public.users; select only safe columns.
  const { data: user, error: updateError } = await supabase
    .from("users")
    .update({ is_locked: false })
    .eq("id", userId)
    .select("id, username, is_locked")
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
