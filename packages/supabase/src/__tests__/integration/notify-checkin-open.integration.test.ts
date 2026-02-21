/**
 * Integration Tests: Check-in Open Notification Trigger
 *
 * Tests the notify_checkin_open trigger that fires when a tournament
 * status changes to 'active', sending notifications to registered
 * (but not checked-in) players.
 */

import { createAdminSupabaseClient } from "../../client";
import type { TypedClient } from "../../client";
import {
  isSupabaseRunning,
  createTournamentScenario,
  cleanupTestData,
  type TestUser,
  type TestAlt,
  type TestTournament,
} from "./test-helpers";

// Skip all tests if Supabase is not running locally
const describeIntegration = isSupabaseRunning() ? describe : describe.skip;

describeIntegration("notify_checkin_open trigger", () => {
  let adminClient: TypedClient;
  let tournament: TestTournament;
  let organizationId: number;
  let owner: TestUser;
  let players: Array<{ user: TestUser; alt: TestAlt; registrationId: number }>;

  beforeAll(async () => {
    adminClient = createAdminSupabaseClient();

    // Create a scenario with 3 registered players
    const scenario = await createTournamentScenario(adminClient, 3);
    tournament = scenario.tournament;
    organizationId = scenario.organizationId;
    owner = scenario.owner;
    players = scenario.players;

    // Move tournament from draft -> upcoming first
    await adminClient
      .from("tournaments")
      .update({ status: "upcoming" })
      .eq("id", tournament.id);
  });

  afterAll(async () => {
    // Clean up notifications created by the trigger
    await adminClient
      .from("notifications")
      .delete()
      .eq("tournament_id", tournament.id);

    await cleanupTestData(adminClient, {
      tournamentIds: [tournament.id],
      organizationIds: [organizationId],
      userIds: [owner.id, ...players.map((p) => p.user.id)],
    });
  });

  it("creates notifications for registered players when tournament becomes active", async () => {
    // Activate the tournament (upcoming -> active)
    const { error: updateError } = await adminClient
      .from("tournaments")
      .update({ status: "active" })
      .eq("id", tournament.id);

    expect(updateError).toBeNull();

    // Wait briefly for trigger to execute
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Check that notifications were created for all 3 players
    const { data: notifications, error: notifError } = await adminClient
      .from("notifications")
      .select("*")
      .eq("tournament_id", tournament.id)
      .eq("type", "tournament_start");

    expect(notifError).toBeNull();
    expect(notifications).toHaveLength(3);

    // Verify notification content
    const firstNotif = notifications![0]!;
    expect(firstNotif.title).toContain("has started");
    expect(firstNotif.body).toBe("Check in now to secure your spot");
    expect(firstNotif.action_url).toBe(`/tournaments/${tournament.slug}`);

    // Verify each player got a notification
    const notifiedUserIds = notifications!.map((n) => n.user_id);
    for (const player of players) {
      expect(notifiedUserIds).toContain(player.user.id);
    }
  });

  it("does not create duplicate notifications on subsequent status updates", async () => {
    // Update tournament again (active -> active, should be a no-op)
    await adminClient
      .from("tournaments")
      .update({ status: "active" })
      .eq("id", tournament.id);

    await new Promise((resolve) => setTimeout(resolve, 500));

    // Count should still be 3 (no duplicates)
    const { data: notifications } = await adminClient
      .from("notifications")
      .select("*")
      .eq("tournament_id", tournament.id)
      .eq("type", "tournament_start");

    expect(notifications).toHaveLength(3);
  });

  it("does not notify already checked-in players", async () => {
    // Create a new scenario specifically for this test
    const scenario2 = await createTournamentScenario(adminClient, 2);
    const tournament2 = scenario2.tournament;
    const players2 = scenario2.players;

    // Check in player 0
    await adminClient
      .from("tournament_registrations")
      .update({ status: "checked_in" })
      .eq("id", players2[0]!.registrationId);

    // Move to upcoming, then active
    await adminClient
      .from("tournaments")
      .update({ status: "upcoming" })
      .eq("id", tournament2.id);

    await adminClient
      .from("tournaments")
      .update({ status: "active" })
      .eq("id", tournament2.id);

    await new Promise((resolve) => setTimeout(resolve, 500));

    // Only player 1 (still registered) should get notification
    const { data: notifications } = await adminClient
      .from("notifications")
      .select("*")
      .eq("tournament_id", tournament2.id)
      .eq("type", "tournament_start");

    expect(notifications).toHaveLength(1);
    expect(notifications![0]!.user_id).toBe(players2[1]!.user.id);

    // Cleanup
    await adminClient
      .from("notifications")
      .delete()
      .eq("tournament_id", tournament2.id);
    await cleanupTestData(adminClient, {
      tournamentIds: [tournament2.id],
      organizationIds: [scenario2.organizationId],
      userIds: scenario2.players
        .map((p) => p.user.id)
        .concat(scenario2.owner.id),
    });
  });
});
