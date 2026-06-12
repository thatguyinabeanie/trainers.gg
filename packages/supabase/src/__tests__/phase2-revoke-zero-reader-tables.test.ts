/**
 * Guardrail test: Phase 2 Task 9 — Step 1 revoke migration.
 *
 * Asserts that the migration file
 * `20260612171705_phase2_revoke_s_bucket_zero_reader_tables.sql`
 * contains a `REVOKE SELECT ON public.<table> FROM anon, authenticated;`
 * statement for each of the 11 zero-reader tables identified in the
 * data-access audit (docs/audits/2026-06-11-rls-audit.md §3.2). The audit
 * named 13, but `posts` + `post_likes` were already dropped on 2026-03-24
 * (20260324000000_drop_posts_tables.sql), so 11 live tables remain.
 *
 * This is a static-file assertion — it does not require a running Supabase
 * instance. It acts as a compile-time contract: if a table is accidentally
 * removed from the migration, or the migration file is never created, this
 * test fails in CI immediately rather than silently leaving grants in place.
 *
 * The complementary live grant-assertion test (anon PostgREST SELECT denied)
 * lives in the integration test suite and requires `pnpm db:reset` first.
 */

import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// The 11 tables that must have SELECT revoked from anon + authenticated.
// Source: §3.2 of docs/decisions/architecture-phase2-task9-revoke-plan.md.
// `posts` + `post_likes` from the audit's list were dropped 2026-03-24, so
// they are intentionally excluded (REVOKE on a missing relation would error).
// ---------------------------------------------------------------------------
const ZERO_READER_TABLES = [
  "tournament_pairings",
  "tournament_team_sheets",
  "tournament_opponent_history",
  "tournament_events",
  "tournament_templates",
  "tournament_template_phases",
  "team_slots",
  "permissions",
  "role_permissions",
  "follows",
  "pds_handles",
] as const;

const MIGRATION_FILENAME =
  "20260612171705_phase2_revoke_s_bucket_zero_reader_tables.sql";

const MIGRATION_PATH = path.resolve(
  __dirname,
  "../../../../supabase/migrations",
  MIGRATION_FILENAME
);

describe("Phase 2 Task 9 — Step 1 revoke migration guardrail", () => {
  let migrationSql: string;

  beforeAll(() => {
    if (!fs.existsSync(MIGRATION_PATH)) {
      throw new Error(
        `Migration file not found at ${MIGRATION_PATH}. ` +
          "Task T1 requires this file to exist."
      );
    }
    migrationSql = fs.readFileSync(MIGRATION_PATH, "utf8");
  });

  it("contains a REVOKE SELECT FROM anon, authenticated for each of the 13 zero-reader tables", () => {
    const missing: string[] = [];

    for (const table of ZERO_READER_TABLES) {
      // Match: REVOKE SELECT ON public.<table> FROM anon, authenticated;
      // Allow optional whitespace / line breaks between tokens (the file may
      // be reformatted), but the canonical form is a single line.
      const pattern = new RegExp(
        `REVOKE\\s+SELECT\\s+ON\\s+public\\.${table}\\s+FROM\\s+anon,\\s*authenticated\\s*;`,
        "i"
      );

      if (!pattern.test(migrationSql)) {
        missing.push(table);
      }
    }

    if (missing.length > 0) {
      throw new Error(
        `The following tables are missing a ` +
          `"REVOKE SELECT ON public.<table> FROM anon, authenticated;" ` +
          `statement in ${MIGRATION_FILENAME}:\n` +
          missing.map((t) => `  - ${t}`).join("\n")
      );
    }
  });

  it.each(ZERO_READER_TABLES)(
    'revokes SELECT on public.%s from anon, authenticated',
    (table) => {
      const pattern = new RegExp(
        `REVOKE\\s+SELECT\\s+ON\\s+public\\.${table}\\s+FROM\\s+anon,\\s*authenticated\\s*;`,
        "i"
      );
      expect(migrationSql).toMatch(pattern);
    }
  );

  it("does NOT revoke SELECT on any realtime-five table", () => {
    // The realtime five must NEVER appear in a REVOKE SELECT statement.
    const REALTIME_FIVE = [
      "notifications",
      "match_games",
      "match_messages",
      "tournament_matches",
      "tournament_rounds",
    ];

    for (const table of REALTIME_FIVE) {
      const revokePattern = new RegExp(
        `REVOKE\\s+SELECT\\s+ON\\s+public\\.${table}`,
        "i"
      );
      expect(migrationSql).not.toMatch(revokePattern);
    }
  });

  it("does NOT revoke SELECT on public.users", () => {
    // users is locked in Phase 0/1 and must not appear in any S-bucket revoke.
    const revokePattern = /REVOKE\s+SELECT\s+ON\s+public\.users/i;
    expect(migrationSql).not.toMatch(revokePattern);
  });

  it("does NOT revoke SELECT on the two public views", () => {
    // public_user_profiles and public_tournament_registrations must stay
    // readable by anon / authenticated — they are the safe public projection
    // layer. Grant revoke on them would break the public-read path.
    const VIEWS = ["public_user_profiles", "public_tournament_registrations"];

    for (const view of VIEWS) {
      const revokePattern = new RegExp(
        `REVOKE\\s+SELECT\\s+ON\\s+public\\.${view}`,
        "i"
      );
      expect(migrationSql).not.toMatch(revokePattern);
    }
  });

  it("has a COMMENT ON TABLE for each of the 13 zero-reader tables", () => {
    const missing: string[] = [];

    for (const table of ZERO_READER_TABLES) {
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
    // Each comment must reference Phase 2 Task 9 so the next reader
    // understands why the grant was revoked.
    const missing: string[] = [];

    for (const table of ZERO_READER_TABLES) {
      // Match the comment string for this specific table — captures text after
      // "COMMENT ON TABLE public.<table> IS" through the closing semicolon.
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

  it("covers exactly the 13 expected tables — no extra tables accidentally revoked", () => {
    // Find all tables that appear in a REVOKE SELECT statement.
    const revokeSelectPattern =
      /REVOKE\s+SELECT\s+ON\s+public\.(\w+)\s+FROM\s+anon/gi;

    const revokedTables: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = revokeSelectPattern.exec(migrationSql)) !== null) {
      if (match[1]) {
        revokedTables.push(match[1].toLowerCase());
      }
    }

    const expected = [...ZERO_READER_TABLES].sort();
    const actual = [...new Set(revokedTables)].sort();

    expect(actual).toEqual(expected);
  });
});
