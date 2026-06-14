/**
 * Guardrail test: Phase 2 Task 9 — Step 4 anon-revoke migration.
 *
 * Asserts that the migration file
 * `20260613173105_phase2_revoke_anon_s_bucket_select.sql`
 * contains a `REVOKE SELECT ON public.<table> FROM anon;` statement for each
 * of the 19 S-bucket tables identified in the data-access architecture
 * decision (docs/decisions/architecture-phase2-task9-step4-anon-revoke.md).
 *
 * This is a static-file assertion — it does NOT require a running Supabase
 * instance. It acts as a compile-time contract:
 *   • If a table is accidentally removed from the migration, this test fails
 *     in CI immediately rather than silently leaving the grant in place.
 *   • If the migration file is never created, this test fails with a clear
 *     "file not found" error.
 *   • If `authenticated` is accidentally revoked, a dedicated assertion catches
 *     it before the migration reaches the DB.
 *
 * KEY DIFFERENCE FROM STEP 1 GUARDRAIL
 * -------------------------------------
 * Step 1 revoked SELECT FROM anon, authenticated (both roles — zero-reader
 * tables with no legitimate reads at all). Step 4 revokes SELECT FROM anon
 * ONLY — authenticated is explicitly kept so that logged-in clients continue
 * to read these tables through RLS.
 *
 * The complementary live grant-assertion test (which requires a running DB)
 * lives in `phase2-anon-revoke-grants.test.ts`.
 */

import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// The 19 S-bucket tables that must have SELECT revoked from anon (ONLY).
// Source: docs/decisions/architecture-phase2-task9-step4-anon-revoke.md §3.3
// ---------------------------------------------------------------------------
const ANON_REVOKE_TABLES = [
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

// The realtime-five + users + two views must NEVER appear in a REVOKE SELECT
// statement in this migration.
const MUST_NOT_REVOKE = [
  "notifications",
  "match_games",
  "match_messages",
  "tournament_matches",
  "tournament_rounds",
  "users",
  "public_user_profiles",
  "public_tournament_registrations",
] as const;

const MIGRATION_FILENAME =
  "20260613173105_phase2_revoke_anon_s_bucket_select.sql";

const MIGRATION_PATH = path.resolve(
  __dirname,
  "../../supabase/migrations",
  MIGRATION_FILENAME
);

describe("Phase 2 Task 9 — Step 4 anon-revoke migration guardrail", () => {
  let migrationSql: string;

  beforeAll(() => {
    if (!fs.existsSync(MIGRATION_PATH)) {
      throw new Error(
        `Migration file not found at ${MIGRATION_PATH}. ` +
          "Task 2 (Step 4) requires this file to exist."
      );
    }
    migrationSql = fs.readFileSync(MIGRATION_PATH, "utf8");
  });

  // -------------------------------------------------------------------------
  // Each revoke-set table must appear with "FROM anon"
  // -------------------------------------------------------------------------

  it("contains a REVOKE SELECT FROM anon for each of the 19 S-bucket tables", () => {
    const missing: string[] = [];

    for (const table of ANON_REVOKE_TABLES) {
      // Match: REVOKE SELECT ON public.<table> FROM anon;
      // The pattern allows optional whitespace around tokens.
      const pattern = new RegExp(
        `REVOKE\\s+SELECT\\s+ON\\s+public\\.${table}\\s+FROM\\s+anon\\s*;`,
        "i"
      );

      if (!pattern.test(migrationSql)) {
        missing.push(table);
      }
    }

    if (missing.length > 0) {
      throw new Error(
        `The following tables are missing a ` +
          `"REVOKE SELECT ON public.<table> FROM anon;" ` +
          `statement in ${MIGRATION_FILENAME}:\n` +
          missing.map((t) => `  - ${t}`).join("\n")
      );
    }
  });

  it.each(ANON_REVOKE_TABLES)(
    "revokes SELECT on public.%s from anon",
    (table) => {
      const pattern = new RegExp(
        `REVOKE\\s+SELECT\\s+ON\\s+public\\.${table}\\s+FROM\\s+anon\\s*;`,
        "i"
      );
      expect(migrationSql).toMatch(pattern);
    }
  );

  // -------------------------------------------------------------------------
  // authenticated must NOT be touched — critical correctness assertion
  // -------------------------------------------------------------------------

  it("does NOT revoke SELECT from authenticated for any table", () => {
    // "FROM authenticated" as a standalone revoke target must not appear.
    // This catches both "FROM authenticated" and "FROM anon, authenticated".
    const revokeAuthPattern = /REVOKE\s+SELECT\s+ON\s+public\.\w+\s+FROM\s+(?:anon\s*,\s*)?authenticated/i;
    expect(migrationSql).not.toMatch(revokeAuthPattern);
  });

  it('does NOT contain "FROM authenticated" anywhere in the file', () => {
    // Belt-and-suspenders: no occurrence of FROM authenticated at all.
    const pattern = /FROM\s+authenticated/i;
    expect(migrationSql).not.toMatch(pattern);
  });

  // -------------------------------------------------------------------------
  // Exclusions — the realtime-five, users, and the two views must be clean
  // -------------------------------------------------------------------------

  it("does NOT revoke SELECT on any realtime-five table", () => {
    const REALTIME_FIVE = [
      "notifications",
      "match_games",
      "match_messages",
      "tournament_matches",
      "tournament_rounds",
    ] as const;

    for (const table of REALTIME_FIVE) {
      const revokePattern = new RegExp(
        `REVOKE\\s+SELECT\\s+ON\\s+public\\.${table}`,
        "i"
      );
      expect(migrationSql).not.toMatch(revokePattern);
    }
  });

  it("does NOT revoke SELECT on public.users", () => {
    const revokePattern = /REVOKE\s+SELECT\s+ON\s+public\.users/i;
    expect(migrationSql).not.toMatch(revokePattern);
  });

  it("does NOT revoke SELECT on the two public views", () => {
    const VIEWS = [
      "public_user_profiles",
      "public_tournament_registrations",
    ] as const;

    for (const view of VIEWS) {
      const revokePattern = new RegExp(
        `REVOKE\\s+SELECT\\s+ON\\s+public\\.${view}`,
        "i"
      );
      expect(migrationSql).not.toMatch(revokePattern);
    }
  });

  it.each(MUST_NOT_REVOKE)(
    "does NOT revoke SELECT on public.%s (excluded table/view)",
    (name) => {
      const pattern = new RegExp(
        `REVOKE\\s+SELECT\\s+ON\\s+public\\.${name}`,
        "i"
      );
      expect(migrationSql).not.toMatch(pattern);
    }
  );

  // -------------------------------------------------------------------------
  // Coverage — exactly 19 tables, no extras
  // -------------------------------------------------------------------------

  it("covers exactly the 19 expected tables — no extra tables accidentally revoked", () => {
    // Collect all table names appearing in REVOKE SELECT ... FROM anon statements.
    const revokeAnonPattern =
      /REVOKE\s+SELECT\s+ON\s+public\.(\w+)\s+FROM\s+anon/gi;

    const revokedTables: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = revokeAnonPattern.exec(migrationSql)) !== null) {
      if (match[1]) {
        revokedTables.push(match[1].toLowerCase());
      }
    }

    const expected = [...ANON_REVOKE_TABLES].sort();
    const actual = [...new Set(revokedTables)].sort();

    expect(actual).toEqual(expected);
  });

  // -------------------------------------------------------------------------
  // COMMENT ON TABLE — each table must have one referencing Phase 2 Task 9
  // -------------------------------------------------------------------------

  it("has a COMMENT ON TABLE for each of the 19 S-bucket tables", () => {
    const missing: string[] = [];

    for (const table of ANON_REVOKE_TABLES) {
      const pattern = new RegExp(
        `COMMENT\\s+ON\\s+TABLE\\s+public\\.${table}\\s+IS`,
        "i"
      );
      if (!pattern.test(migrationSql)) {
        missing.push(table);
      }
    }

    if (missing.length > 0) {
      throw new Error(
        `The following tables are missing a COMMENT ON TABLE statement ` +
          `in ${MIGRATION_FILENAME}:\n` +
          missing.map((t) => `  - ${t}`).join("\n")
      );
    }
  });

  it("mentions Phase 2 Task 9 in every COMMENT ON TABLE body", () => {
    const missing: string[] = [];

    for (const table of ANON_REVOKE_TABLES) {
      // Capture the full COMMENT ... IS '...' block through the closing semicolon.
      const commentBlockPattern = new RegExp(
        `COMMENT\\s+ON\\s+TABLE\\s+public\\.${table}\\s+IS[\\s\\S]*?;`,
        "i"
      );
      const match = migrationSql.match(commentBlockPattern);

      if (!match || !/Phase 2 Task 9/i.test(match[0])) {
        missing.push(table);
      }
    }

    if (missing.length > 0) {
      throw new Error(
        `The COMMENT ON TABLE for the following tables does not mention ` +
          `"Phase 2 Task 9" in ${MIGRATION_FILENAME}:\n` +
          missing.map((t) => `  - ${t}`).join("\n")
      );
    }
  });

  it("mentions Step 4 in every COMMENT ON TABLE body", () => {
    const missing: string[] = [];

    for (const table of ANON_REVOKE_TABLES) {
      const commentBlockPattern = new RegExp(
        `COMMENT\\s+ON\\s+TABLE\\s+public\\.${table}\\s+IS[\\s\\S]*?;`,
        "i"
      );
      const match = migrationSql.match(commentBlockPattern);

      // Must reference "Step 4" to distinguish from the Step-1 zero-reader revoke.
      if (!match || !/Step 4/i.test(match[0])) {
        missing.push(table);
      }
    }

    if (missing.length > 0) {
      throw new Error(
        `The COMMENT ON TABLE for the following tables does not mention ` +
          `"Step 4" in ${MIGRATION_FILENAME}:\n` +
          missing.map((t) => `  - ${t}`).join("\n")
      );
    }
  });
});
