/**
 * Shared API auth resolver for `/api/v1/…` route handlers.
 *
 * Every versioned-API route uses this single helper to authenticate a request.
 * It supports the two clients that hit the API:
 *
 *   1. Mobile — sends `Authorization: Bearer <supabase access JWT>`
 *      (`session.access_token`, see `apps/mobile/src/lib/api/client.ts`).
 *   2. Web — sends the Supabase cookie session.
 *
 * Resolution order is **Bearer first, cookie fallback** (post-decision
 * consideration #1): a request that carries a Bearer header is treated as the
 * mobile path and validated as a JWT; only a request with no Bearer header
 * falls back to the cookie path.
 *
 * This replaces the spike's inline `resolveAuthUserId` (the
 * `// TODO(phase2-task2)` marker) and the older `/api/tournaments` behavior of
 * *rejecting* Bearer tokens — Bearer is now a first-class, supported auth mode.
 *
 * The returned `supabase` client is bound to the resolved identity:
 *   - bearer mode → an anon client with the JWT in `global.headers.Authorization`
 *     (RLS evaluates as that user);
 *   - cookie mode → the read-only cookie client (route handlers must not mutate
 *     the session).
 *
 * The caller maps a `null` result to `401`.
 *
 * SECURITY: token values are NEVER logged (mobile CLAUDE.md token-handling
 * rule). JWT validity is established via `auth.getUser()`, not a string compare.
 */

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { type Database } from "@trainers/supabase/types";
import { type TypedSupabaseClient } from "@trainers/supabase";

import { createClientReadOnly } from "@/lib/supabase/server";

/**
 * A successfully resolved API identity.
 *
 * - `mode` discriminates the auth path that succeeded (`"bearer"` = mobile JWT,
 *   `"cookie"` = web session).
 * - `userId` is the authenticated Supabase user id.
 * - `supabase` is a client bound to that identity — use it for any per-user
 *   reads/writes the route performs (public S-bucket reads still go through the
 *   cookie-less cached fetchers, not this client).
 */
export interface ResolvedApiAuth {
  mode: "bearer" | "cookie";
  userId: string;
  supabase: TypedSupabaseClient;
}

/** The Bearer scheme prefix, lower-cased for case-insensitive matching. */
const BEARER_PREFIX = "bearer ";

/**
 * Build an anon Supabase client bound to a caller-supplied access JWT.
 *
 * The token rides in `global.headers.Authorization`, so PostgREST/GoTrue treat
 * the request as that authenticated user and RLS evaluates accordingly.
 */
function createBearerClient(token: string): TypedSupabaseClient {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
}

/**
 * Resolve the authenticated identity for an `/api/v1/…` request.
 *
 * Tries the mobile Bearer path first, then the web cookie path. Returns the
 * resolved identity (with a client bound to it) on success, or `null` for an
 * anonymous / invalid / expired request — the caller maps `null` to `401`.
 *
 * @param request - The incoming request (only its `Authorization` header is read).
 */
export async function resolveApiAuth(
  request: Request
): Promise<ResolvedApiAuth | null> {
  const authHeader = request.headers.get("authorization");

  // ---------------------------------------------------------------------------
  // Bearer path (mobile): validate the JWT via getUser() on a token-bound client.
  // ---------------------------------------------------------------------------
  if (authHeader && authHeader.toLowerCase().startsWith(BEARER_PREFIX)) {
    const token = authHeader.slice(BEARER_PREFIX.length).trim();
    // An empty token after the scheme is not a valid Bearer credential.
    if (!token) return null;

    const supabase = createBearerClient(token);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;
    return { mode: "bearer", userId: user.id, supabase };
  }

  // ---------------------------------------------------------------------------
  // Cookie path (web): read-only session client — route handlers must not mutate
  // the session.
  // ---------------------------------------------------------------------------
  const supabase = await createClientReadOnly();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;
  return { mode: "cookie", userId: user.id, supabase };
}
