/**
 * Integration Test Helpers
 *
 * Utilities for setting up test data and managing test users in integration tests.
 * These tests run against a real local Supabase database.
 */

import { createAdminSupabaseClient } from "../../client";
import type { TypedClient } from "../../client";
import type { TablesInsert } from "../../types";

/**
 * Check if Supabase is running locally.
 * Integration tests will be skipped if Supabase is not available.
 */
export function isSupabaseRunning(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return false;
  }

  // Check if it's a local instance
  return url.includes("127.0.0.1") || url.includes("localhost");
}

/**
 * Test user context with authentication token
 */
export interface TestUser {
  id: string;
  email: string;
  username: string;
  client: TypedClient;
}

/**
 * Test alt (player identity)
 */
export interface TestAlt {
  id: number;
  user_id: string;
  username: string;
  display_name: string;
}

/**
 * Test tournament with all relevant data
 */
export interface TestTournament {
  id: number;
  slug: string;
  name: string;
  organization_id: number;
  status: string;
}

/**
 * Create a test user with a real Supabase auth account
 */
export async function createTestUser(
  adminClient: TypedClient,
  email: string,
  username: string,
  options?: {
    isSiteAdmin?: boolean;
  }
): Promise<TestUser> {
  // Create auth user
  const { data: authData, error: authError } =
    await adminClient.auth.admin.createUser({
      email,
      password: "test-password-123",
      email_confirm: true,
      user_metadata: {
        username,
      },
    });

  if (authError || !authData.user) {
    throw new Error(`Failed to create test user: ${authError?.message}`);
  }

  const userId = authData.user.id;

  // Create user record
  const { error: userError } = await adminClient.from("users").insert({
    id: userId,
    email,
    username,
    pds_status: "pending",
  });

  if (userError) {
    throw new Error(`Failed to create user record: ${userError.message}`);
  }

  // Add site admin role if requested
  if (options?.isSiteAdmin) {
    await adminClient.rpc("set_claim", {
      uid: userId,
      claim: "site_roles",
      value: ["site_admin"],
    });
  }

  // Create a client authenticated as this user
  const { data: sessionData, error: sessionError } =
    await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

  if (sessionError || !sessionData) {
    throw new Error(`Failed to generate session: ${sessionError?.message}`);
  }

  // Create an authenticated client for this user
  // We'll use the admin client with auth context for simplicity in tests
  const userClient = createAdminSupabaseClient();

  return {
    id: userId,
    email,
    username,
    client: userClient,
  };
}

/**
 * Create a test alt (player identity) for a user
 */
export async function createTestAlt(
  adminClient: TypedClient,
  userId: string,
  username: string,
  displayName: string
): Promise<TestAlt> {
  const { data, error } = await adminClient
    .from("alts")
    .insert({
      user_id: userId,
      username,
      display_name: displayName,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to create test alt: ${error?.message}`);
  }

  return {
    id: data.id,
    user_id: data.user_id,
    username: data.username,
    display_name: data.display_name,
  };
}

/**
 * Create a test organization
 */
export async function createTestOrganization(
  adminClient: TypedClient,
  ownerUserId: string,
  name: string,
  slug: string
): Promise<number> {
  const { data, error } = await adminClient
    .from("organizations")
    .insert({
      owner_user_id: ownerUserId,
      name,
      slug,
      description: `Test organization ${name}`,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to create test organization: ${error?.message}`);
  }

  return data.id;
}

/**
 * Create a test tournament
 */
export async function createTestTournament(
  adminClient: TypedClient,
  organizationId: number,
  name: string,
  slug: string,
  options?: Partial<TablesInsert<"tournaments">>
): Promise<TestTournament> {
  const { data, error } = await adminClient
    .from("tournaments")
    .insert({
      organization_id: organizationId,
      name,
      slug,
      format: "swiss",
      game: "pokemon_vgc",
      status: "draft",
      start_date: new Date().toISOString(),
      max_participants: 32,
      ...options,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to create test tournament: ${error?.message}`);
  }

  return {
    id: data.id,
    slug: data.slug,
    name: data.name,
    organization_id: data.organization_id,
    status: data.status,
  };
}

/**
 * Register a player for a tournament
 */
export async function registerPlayerForTournament(
  adminClient: TypedClient,
  tournamentId: number,
  altId: number,
  status: "registered" | "checked_in" | "waitlist" = "registered"
): Promise<number> {
  const { data, error } = await adminClient
    .from("tournament_registrations")
    .insert({
      tournament_id: tournamentId,
      alt_id: altId,
      status,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(
      `Failed to register player for tournament: ${error?.message}`
    );
  }

  return data.id;
}

/**
 * Create a test team for a registration
 */
export async function createTestTeam(
  adminClient: TypedClient,
  registrationId: number,
  teamData: string
): Promise<number> {
  const { data, error } = await adminClient
    .from("tournament_teams")
    .insert({
      registration_id: registrationId,
      team_data: teamData,
      is_valid: true,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to create test team: ${error?.message}`);
  }

  // Update registration to link to team
  await adminClient
    .from("tournament_registrations")
    .update({ team_id: data.id })
    .eq("id", registrationId);

  return data.id;
}

/**
 * Clean up test data after a test run
 */
export async function cleanupTestData(
  adminClient: TypedClient,
  options: {
    tournamentIds?: number[];
    organizationIds?: number[];
    userIds?: string[];
    altIds?: number[];
  }
): Promise<void> {
  const { tournamentIds, organizationIds, userIds, altIds } = options;

  // Delete tournaments (cascades to registrations, teams, rounds, matches, etc.)
  if (tournamentIds && tournamentIds.length > 0) {
    await adminClient.from("tournaments").delete().in("id", tournamentIds);
  }

  // Delete organizations (cascades to tournaments)
  if (organizationIds && organizationIds.length > 0) {
    await adminClient.from("organizations").delete().in("id", organizationIds);
  }

  // Delete alts
  if (altIds && altIds.length > 0) {
    await adminClient.from("alts").delete().in("id", altIds);
  }

  // Delete users (cascades to alts, posts, etc.)
  if (userIds && userIds.length > 0) {
    // Delete auth users
    for (const userId of userIds) {
      await adminClient.auth.admin.deleteUser(userId);
    }

    // Delete user records
    await adminClient.from("users").delete().in("id", userIds);
  }
}

/**
 * Create a complete test scenario with multiple players
 */
export async function createTournamentScenario(
  adminClient: TypedClient,
  numPlayers: number
): Promise<{
  tournament: TestTournament;
  organizationId: number;
  owner: TestUser;
  players: Array<{ user: TestUser; alt: TestAlt; registrationId: number }>;
}> {
  // Create organization owner
  const owner = await createTestUser(
    adminClient,
    `owner-${Date.now()}@test.local`,
    `owner_${Date.now()}`
  );

  // Create organization
  const organizationId = await createTestOrganization(
    adminClient,
    owner.id,
    `Test Org ${Date.now()}`,
    `test-org-${Date.now()}`
  );

  // Create tournament
  const tournament = await createTestTournament(
    adminClient,
    organizationId,
    `Test Tournament ${Date.now()}`,
    `test-tournament-${Date.now()}`,
    {
      max_participants: numPlayers + 10, // Room for more players
    }
  );

  // Create players
  const players: Array<{
    user: TestUser;
    alt: TestAlt;
    registrationId: number;
  }> = [];

  for (let i = 0; i < numPlayers; i++) {
    const user = await createTestUser(
      adminClient,
      `player${i}-${Date.now()}@test.local`,
      `player${i}_${Date.now()}`
    );

    const alt = await createTestAlt(
      adminClient,
      user.id,
      `player${i}_${Date.now()}`,
      `Player ${i}`
    );

    const registrationId = await registerPlayerForTournament(
      adminClient,
      tournament.id,
      alt.id
    );

    players.push({ user, alt, registrationId });
  }

  return {
    tournament,
    organizationId,
    owner,
    players,
  };
}
