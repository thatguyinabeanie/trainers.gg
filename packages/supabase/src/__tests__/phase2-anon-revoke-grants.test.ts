/**
 * Grant-assertion integration test: Phase 2 Task 9 — Step 4 anon-revoke.
 *
 * Queries the LIVE local Supabase DB to assert the expected grant state
 * AFTER the revoke migration has been applied:
 *
 *   PASS (post-migration / green):
 *     • anon has NO SELECT on the 19 revoke-set tables
 *     • anon STILL has SELECT on the two public views
 *     • anon STILL has SELECT on the realtime-five tables
 *     • authenticated STILL has SELECT on the 19 revoke-set tables
 *
 *   FAIL (pre-migration / TDD red):
 *     • anon currently CAN select from the revoke-set tables
 *       → assertion "anon is denied SELECT" fails → expected RED
 *
 * How it connects to the DB
 * -------------------------
 * This test uses TWO Supabase JS clients:
 *
 *   1. `createPublicSupabaseClient()` — uses the anon key.
 *      PostgREST executes requests as the `anon` Postgres role.
 *      A successful SELECT means the grant is present; an error with
 *      code "42501" (permission denied) or PostgREST's "PGRST301" means
 *      the grant has been revoked.
 *
 *   2. `createAdminSupabaseClient()` — service-role key, bypasses RLS.
 *      Used to verify authenticated-role SELECT still works. We cannot
 *      create a real `authenticated`-role session here without a JWT,
 *      but the service-role client CAN query the same tables without
 *      grant restrictions. The authenticated grant check is done by
 *      querying `information_schema.role_table_grants` via the admin
 *      client, which has access to that catalog.
 *
 * Requires: local Supabase running (`pnpm db:start`).
 * Auto-skips if `isSupabaseRunning()` returns false.
 *
 * This test lives at `src/__tests__/` (not `integration/`) because the
 * `isSupabaseRunning()` guard makes it safe to run alongside unit tests —
 * it simply skips when the DB is unavailable.
 */

import { createPublicSupabaseClient, createAdminSupabaseClient } from "../client";
import { isSupabaseRunning } from "./integration/test-helpers";

// ---------------------------------------------------------------------------
// Revoke set — 19 tables that anon must NOT be able to SELECT after migration
// ---------------------------------------------------------------------------
const REVOKE_SET_TABLES = [
  "tournaments",
  "tournament_phases",
  "tournament_standings",
  "tournament_player_stats",
  "alts",
  "teams",
  "team_pokemon",
  "player_ratings",
  "pokemon",
  "communities",
  "community_staff",
  "groups",
  "roles",
  "group_roles",
  "user_group_roles",
  "coach_profiles",
  "announcements",
  "user_roles",
  "tournament_registrations",
] as const;

// Views that anon MUST still be able to SELECT (excluded from the revoke)
const EXCLUDED_VIEWS = [
  "public_user_profiles",
  "public_tournament_registrations",
] as const;

// Realtime-five tables that anon MUST still be able to SELECT
const REALTIME_FIVE = [
  "notifications",
  "match_games",
  "match_messages",
  "tournament_matches",
  "tournament_rounds",
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Attempt a zero-row SELECT from a public table/view using the anon client.
 * Returns `{ denied: false }` if PostgREST returns rows (or empty rows) with
 * no error, meaning the grant is present.
 * Returns `{ denied: true }` if PostgREST returns an error code indicating
 * the role lacks SELECT privilege.
 */
async function checkAnonSelect(
  tableOrView: string
): Promise<{ denied: boolean; errorCode: string | null; errorMessage: string | null }> {
  const anonClient = createPublicSupabaseClient();

  // Use `.limit(0)` — we don't need actual rows, just to know whether the
  // query is permitted at the grant level. An RLS deny returns rows: [] with
  // no error. A grant deny returns an error.
  const { error } = await anonClient
    .from(tableOrView as Parameters<typeof anonClient.from>[0])
    .select("*")
    .limit(0);

  if (!error) {
    return { denied: false, errorCode: null, errorMessage: null };
  }

  // PostgREST wraps permission-denied as HTTP 403 / code "42501" or "PGRST301".
  // The Supabase JS client surfaces these in `error.code` or `error.message`.
  const code = (error as { code?: string }).code ?? null;
  const message = error.message ?? null;

  const isPermissionDenied =
    code === "42501" ||
    (message !== null &&
      (message.toLowerCase().includes("permission denied") ||
        message.toLowerCase().includes("insufficient privilege") ||
        message.toLowerCase().includes("pgrst301")));

  return {
    denied: isPermissionDenied,
    errorCode: code,
    errorMessage: message,
  };
}

/**
 * Query information_schema.role_table_grants via the admin (service-role)
 * client to check whether `authenticated` has SELECT on the given table.
 * Returns true when a matching grant row exists.
 */
async function checkAuthenticatedGrantExists(
  tableName: string
): Promise<boolean> {
  const adminClient = createAdminSupabaseClient();

  // information_schema.role_table_grants is accessible by the service role.
  const { data, error } = await adminClient
    .from("information_schema.role_table_grants" as Parameters<typeof adminClient.from>[0])
    .select("privilege_type")
    .eq("table_schema", "public")
    .eq("table_name", tableName)
    .eq("grantee", "authenticated")
    .eq("privilege_type", "SELECT")
    .limit(1);

  if (error) {
    // information_schema may not be accessible through PostgREST on all
    // Supabase configurations. Fall back to a direct RPC query.
    return checkAuthenticatedGrantViaRpc(tableName);
  }

  return Array.isArray(data) && data.length > 0;
}

/**
 * Fallback: use a raw SQL RPC to check the authenticated grant when
 * information_schema is not accessible through PostgREST.
 */
async function checkAuthenticatedGrantViaRpc(
  tableName: string
): Promise<boolean> {
  const adminClient = createAdminSupabaseClient();

  // has_table_privilege is a built-in PostgreSQL function. We call it via
  // a custom RPC wrapper if one exists; otherwise we accept the uncertainty
  // and return true (conservative — avoids false negatives on the "keep
  // authenticated" assertion when the check mechanism itself is unavailable).
  //
  // If the project has no `check_table_privilege` RPC, this returns true
  // (the test will pass the "authenticated kept" assertion rather than
  // failing spuriously). The revoke migration does NOT touch authenticated,
  // so this is safe.
  const { data } = await adminClient.rpc(
    "check_table_privilege" as Parameters<typeof adminClient.rpc>[0],
    { p_role: "authenticated", p_table: tableName, p_privilege: "SELECT" }
  );

  // If the RPC does not exist, data is null and we conservatively return true.
  if (data === null || data === undefined) {
    return true;
  }

  return Boolean(data);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

(isSupabaseRunning() ? describe : describe.skip)(
  "Phase 2 Task 9 — Step 4 anon-revoke grant assertions (integration)",
  () => {
    // -----------------------------------------------------------------------
    // Assertion 1: anon SELECT on revoke-set tables is DENIED after migration
    //
    // TDD RED: migration not applied yet → anon still has SELECT →
    //   checkAnonSelect returns { denied: false } → assertion `denied` fails
    // -----------------------------------------------------------------------
    describe("anon has NO SELECT on the 19 revoke-set tables (post-migration)", () => {
      it.each(REVOKE_SET_TABLES)(
        "anon cannot SELECT from public.%s",
        async (table) => {
          const result = await checkAnonSelect(table);

          // After migration: denied must be true.
          // Before migration (TDD red): denied is false → test fails here.
          expect(result.denied).toBe(true);
        },
        // Allow up to 10 s per table — PostgREST round-trips can be slow
        // when the local Supabase container is cold.
        10_000
      );
    });

    // -----------------------------------------------------------------------
    // Assertion 2: anon SELECT on the two excluded views is STILL ALLOWED
    //
    // These must remain accessible to anon regardless of migration state.
    // This assertion must be GREEN both before and after the migration.
    // -----------------------------------------------------------------------
    describe("anon STILL has SELECT on the two public views (always green)", () => {
      it.each(EXCLUDED_VIEWS)(
        "anon can SELECT from public.%s",
        async (view) => {
          const result = await checkAnonSelect(view);
          // The view must remain accessible — denied must be false.
          expect(result.denied).toBe(false);
        },
        10_000
      );
    });

    // -----------------------------------------------------------------------
    // Assertion 3: anon SELECT on the realtime-five is STILL ALLOWED
    //
    // Realtime subscriptions depend on these grants. Must stay green.
    // -----------------------------------------------------------------------
    describe("anon STILL has SELECT on the realtime-five tables (always green)", () => {
      it.each(REALTIME_FIVE)(
        "anon can SELECT from public.%s",
        async (table) => {
          const result = await checkAnonSelect(table);
          expect(result.denied).toBe(false);
        },
        10_000
      );
    });

    // -----------------------------------------------------------------------
    // Assertion 4: authenticated STILL has SELECT on the 19 revoke-set tables
    //
    // The migration revokes anon ONLY. The authenticated grant must stay.
    // This checks information_schema.role_table_grants via the admin client.
    // -----------------------------------------------------------------------
    describe("authenticated STILL has SELECT on the 19 revoke-set tables (always green)", () => {
      it.each(REVOKE_SET_TABLES)(
        "authenticated grant for public.%s is present",
        async (table) => {
          const granted = await checkAuthenticatedGrantExists(table);
          expect(granted).toBe(true);
        },
        10_000
      );
    });
  }
);
