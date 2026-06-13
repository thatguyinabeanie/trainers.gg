/**
 * RLS regression test: Phase 3 P3-2 — flatten match_games / match_messages
 * SELECT policies via denormalized tournament_id + community_id columns.
 *
 * Runs against the LIVE local Supabase DB (mirrors the pattern in
 * phase2-anon-revoke-grants.test.ts + jest.setup.ts env loading). Auto-skips
 * when local Supabase is unavailable.
 *
 * INVARIANT under test (must hold IDENTICALLY before AND after the migration)
 * --------------------------------------------------------------------------
 *   • A match PARTICIPANT can SELECT their own match's games + messages.
 *   • A community STAFF member (here: the community owner, who implicitly
 *     passes has_community_permission(..., 'tournament.manage')) can SELECT
 *     games + messages for a match in their community.
 *   • An UNRELATED authenticated user sees ZERO rows.
 *
 * These three assertions describe the behavior the flatten must preserve.
 * They are GREEN both pre- and post-migration (the participant/staff/outsider
 * row visibility does not change).
 *
 * MIGRATION-SPECIFIC assertions (RED pre-apply, GREEN post-apply)
 * ---------------------------------------------------------------
 *   • match_games / match_messages expose tournament_id + community_id columns.
 *   • An INSERT (without supplying those columns) has them populated by the
 *     BEFORE INSERT trigger from the match_id chain.
 *
 * Pre-migration these are RED because the columns do not exist yet:
 *   - the column-presence SELECT errors with "column ... does not exist"
 *   - the trigger-populated-INSERT assertion fails for the same reason.
 *
 * How role-scoped clients are built
 * ---------------------------------
 *   • Admin (service-role) client seeds all data, bypassing RLS.
 *   • Authenticated-role clients are real password sign-ins via the anon-key
 *     client → PostgREST executes their requests as the `authenticated` role
 *     with their auth.uid(), so RLS policies apply exactly as in production.
 *
 * Requires: local Supabase running (`pnpm db:start`).
 */

import { createClient } from "@supabase/supabase-js";

import { createAdminSupabaseClient, getSupabaseConfig } from "../client";
import type { TypedClient } from "../client";
import type { Database } from "../types";
import { isSupabaseRunning } from "./integration/test-helpers";

// ---------------------------------------------------------------------------
// Test constants
// ---------------------------------------------------------------------------
const TEST_PASSWORD = "test-password-123";
const RUN_ID = Date.now();

// match_games / match_messages reference these denormalized columns once the
// migration is applied. The column-presence + trigger assertions are RED until
// then. We cast through `unknown` for inserts/selects that touch the new
// columns because the generated types are regenerated only post-apply.
const NEW_COLUMNS = ["tournament_id", "community_id"] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Create + confirm an auth user; return the auth uid.
 *
 * The `handle_new_user` AFTER INSERT trigger on auth.users auto-creates the
 * matching `public.users` row (and a main alt) from user_metadata.username, so
 * we do NOT insert into `public.users` ourselves — doing so would violate
 * users_pkey. We pass the username through metadata for the trigger to consume.
 */
async function createUser(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  email: string,
  username: string
): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { username },
  });
  if (error || !data.user) {
    throw new Error(`createUser failed: ${error?.message}`);
  }
  return data.user.id;
}

/** Sign in with password against the anon endpoint → authenticated-role client. */
async function signInClient(email: string): Promise<TypedClient> {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
  const client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({
    email,
    password: TEST_PASSWORD,
  });
  if (error) throw new Error(`signIn failed for ${email}: ${error.message}`);
  return client as TypedClient;
}

// ---------------------------------------------------------------------------
// Seeded scenario shared across assertions
// ---------------------------------------------------------------------------
interface Scenario {
  matchId: number;
  gameId: number;
  messageId: number;
  ownerEmail: string;
  participantEmail: string;
  outsiderEmail: string;
  cleanup: () => Promise<void>;
}

async function seedScenario(): Promise<Scenario> {
  const admin = createAdminSupabaseClient();

  const ownerEmail = `owner-${RUN_ID}@match-rls.local`;
  const participantEmail = `participant-${RUN_ID}@match-rls.local`;
  const outsiderEmail = `outsider-${RUN_ID}@match-rls.local`;

  const ownerUid = await createUser(admin, ownerEmail, `owner_${RUN_ID}`);
  const participantUid = await createUser(
    admin,
    participantEmail,
    `participant_${RUN_ID}`
  );
  const outsiderUid = await createUser(
    admin,
    outsiderEmail,
    `outsider_${RUN_ID}`
  );

  // Community owned by ownerUid → owner implicitly has tournament.manage.
  const { data: community, error: cErr } = await admin
    .from("communities")
    .insert({
      owner_user_id: ownerUid,
      name: `Match RLS Org ${RUN_ID}`,
      slug: `match-rls-org-${RUN_ID}`,
      status: "active",
    })
    .select("id")
    .single();
  if (cErr || !community) throw new Error(`community: ${cErr?.message}`);

  const { data: tournament, error: tErr } = await admin
    .from("tournaments")
    .insert({
      community_id: community.id,
      name: `Match RLS Tournament ${RUN_ID}`,
      slug: `match-rls-tournament-${RUN_ID}`,
      format: "swiss",
      game: "pokemon_vgc",
      status: "active",
      start_date: new Date().toISOString(),
      max_participants: 8,
    })
    .select("id")
    .single();
  if (tErr || !tournament) throw new Error(`tournament: ${tErr?.message}`);

  const { data: phase, error: pErr } = await admin
    .from("tournament_phases")
    .insert({
      tournament_id: tournament.id,
      name: "Swiss",
      phase_order: 1,
      phase_type: "swiss",
      best_of: 3,
    })
    .select("id")
    .single();
  if (pErr || !phase) throw new Error(`phase: ${pErr?.message}`);

  const { data: round, error: rErr } = await admin
    .from("tournament_rounds")
    .insert({ phase_id: phase.id, round_number: 1 })
    .select("id")
    .single();
  if (rErr || !round) throw new Error(`round: ${rErr?.message}`);

  // Participant alt is alt1 of the match.
  const { data: alt, error: aErr } = await admin
    .from("alts")
    .insert({
      user_id: participantUid,
      username: `participant_alt_${RUN_ID}`,
    })
    .select("id")
    .single();
  if (aErr || !alt) throw new Error(`alt: ${aErr?.message}`);

  const { data: match, error: mErr } = await admin
    .from("tournament_matches")
    .insert({ round_id: round.id, alt1_id: alt.id, table_number: 1 })
    .select("id")
    .single();
  if (mErr || !match) throw new Error(`match: ${mErr?.message}`);

  const { data: game, error: gErr } = await admin
    .from("match_games")
    .insert({ match_id: match.id, game_number: 1 })
    .select("id")
    .single();
  if (gErr || !game) throw new Error(`game: ${gErr?.message}`);

  const { data: message, error: msgErr } = await admin
    .from("match_messages")
    .insert({
      match_id: match.id,
      alt_id: alt.id,
      message_type: "player",
      content: "gg",
    })
    .select("id")
    .single();
  if (msgErr || !message) throw new Error(`message: ${msgErr?.message}`);

  const cleanup = async () => {
    // Deleting the tournament cascades to phases→rounds→matches→games/messages.
    await admin.from("tournaments").delete().eq("id", tournament.id);
    await admin.from("communities").delete().eq("id", community.id);
    await admin.from("alts").delete().eq("id", alt.id);
    for (const uid of [ownerUid, participantUid, outsiderUid]) {
      await admin.auth.admin.deleteUser(uid);
      await admin.from("users").delete().eq("id", uid);
    }
  };

  return {
    matchId: match.id,
    gameId: game.id,
    messageId: message.id,
    ownerEmail,
    participantEmail,
    outsiderEmail,
    cleanup,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
(isSupabaseRunning() ? describe : describe.skip)(
  "match RLS flatten — participant/staff/outsider visibility + denormalized cols",
  () => {
    let scenario: Scenario;
    let participantClient: TypedClient;
    let ownerClient: TypedClient;
    let outsiderClient: TypedClient;

    beforeAll(async () => {
      scenario = await seedScenario();
      [participantClient, ownerClient, outsiderClient] = await Promise.all([
        signInClient(scenario.participantEmail),
        signInClient(scenario.ownerEmail),
        signInClient(scenario.outsiderEmail),
      ]);
    }, 60_000);

    afterAll(async () => {
      if (scenario) await scenario.cleanup();
    }, 30_000);

    // -----------------------------------------------------------------------
    // Invariant — GREEN before AND after the migration.
    // -----------------------------------------------------------------------
    describe("row visibility invariant (green pre + post migration)", () => {
      it("participant can SELECT their own match's games", async () => {
        const { data, error } = await participantClient
          .from("match_games")
          .select("id")
          .eq("match_id", scenario.matchId);
        expect(error).toBeNull();
        expect(data?.map((r) => r.id)).toContain(scenario.gameId);
      });

      it("participant can SELECT their own match's messages", async () => {
        const { data, error } = await participantClient
          .from("match_messages")
          .select("id")
          .eq("match_id", scenario.matchId);
        expect(error).toBeNull();
        expect(data?.map((r) => r.id)).toContain(scenario.messageId);
      });

      it("community staff (owner) can SELECT the match's games", async () => {
        const { data, error } = await ownerClient
          .from("match_games")
          .select("id")
          .eq("match_id", scenario.matchId);
        expect(error).toBeNull();
        expect(data?.map((r) => r.id)).toContain(scenario.gameId);
      });

      it("community staff (owner) can SELECT the match's messages", async () => {
        const { data, error } = await ownerClient
          .from("match_messages")
          .select("id")
          .eq("match_id", scenario.matchId);
        expect(error).toBeNull();
        expect(data?.map((r) => r.id)).toContain(scenario.messageId);
      });

      it("unrelated user sees ZERO games", async () => {
        const { data, error } = await outsiderClient
          .from("match_games")
          .select("id")
          .eq("match_id", scenario.matchId);
        expect(error).toBeNull();
        expect(data).toEqual([]);
      });

      it("unrelated user sees ZERO messages", async () => {
        const { data, error } = await outsiderClient
          .from("match_messages")
          .select("id")
          .eq("match_id", scenario.matchId);
        expect(error).toBeNull();
        expect(data).toEqual([]);
      });
    });

    // -----------------------------------------------------------------------
    // Migration-specific — RED pre-apply (columns absent), GREEN post-apply.
    // -----------------------------------------------------------------------
    describe("denormalized columns (red pre-migration, green post)", () => {
      const admin = createAdminSupabaseClient();

      it.each(NEW_COLUMNS)(
        "match_games exposes column %s",
        async (column) => {
          const { error } = await admin
            .from("match_games")
            .select(column as "id")
            .eq("id", scenario.gameId)
            .maybeSingle();
          // Pre-migration: PostgREST errors "column ... does not exist" → RED.
          expect(error).toBeNull();
        }
      );

      it.each(NEW_COLUMNS)(
        "match_messages exposes column %s",
        async (column) => {
          const { error } = await admin
            .from("match_messages")
            .select(column as "id")
            .eq("id", scenario.messageId)
            .maybeSingle();
          expect(error).toBeNull();
        }
      );

      it("INSERT into match_games populates tournament_id/community_id via trigger", async () => {
        // Insert WITHOUT supplying the denormalized columns — the BEFORE INSERT
        // trigger must derive them from match_id.
        const { data, error } = await admin
          .from("match_games")
          .insert({ match_id: scenario.matchId, game_number: 2 })
          .select("id, tournament_id, community_id")
          .single();

        // Pre-migration: select of non-existent columns errors → RED.
        expect(error).toBeNull();
        const row = data as unknown as {
          tournament_id: number | null;
          community_id: number | null;
        } | null;
        expect(row?.tournament_id).not.toBeNull();
        expect(row?.community_id).not.toBeNull();
      });

      it("INSERT into match_messages populates tournament_id/community_id via trigger", async () => {
        const { data, error } = await admin
          .from("match_messages")
          .insert({
            match_id: scenario.matchId,
            message_type: "system",
            content: "trigger check",
          })
          .select("id, tournament_id, community_id")
          .single();

        expect(error).toBeNull();
        const row = data as unknown as {
          tournament_id: number | null;
          community_id: number | null;
        } | null;
        expect(row?.tournament_id).not.toBeNull();
        expect(row?.community_id).not.toBeNull();
      });
    });
  }
);
