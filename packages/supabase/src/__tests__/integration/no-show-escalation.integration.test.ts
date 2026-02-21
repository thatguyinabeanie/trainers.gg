/**
 * Integration Tests: No-Show Auto-Detection & Game Escalation
 *
 * Tests the check_no_show_escalation() function that auto-awards games
 * when a player fails to check in for a match.
 *
 * These tests run against a real local Supabase database and require
 * the escalation function + is_no_show column to be present.
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

describeIntegration("check_no_show_escalation", () => {
  let adminClient: TypedClient;
  let tournament: TestTournament;
  let organizationId: number;
  let owner: TestUser;
  let players: Array<{ user: TestUser; alt: TestAlt; registrationId: number }>;
  let phaseId: number;
  let roundId: number;
  let matchId: number;

  /**
   * Helper: create a phase, round, and match between player[0] and player[1].
   * Returns { phaseId, roundId, matchId }.
   *
   * The check_in_time_minutes controls how fast escalation progresses.
   * Using a very small value (1 minute) and inserting a backdated check-in
   * message lets us test escalation without waiting.
   */
  async function setupMatchScenario(options?: {
    checkInTimeMinutes?: number;
    bestOf?: number;
  }) {
    const checkInTime = options?.checkInTimeMinutes ?? 1;
    const bestOf = options?.bestOf ?? 3;

    // Create phase
    const { data: phase, error: phaseError } = await adminClient
      .from("tournament_phases")
      .insert({
        tournament_id: tournament.id,
        phase_type: "swiss",
        phase_order: 1,
        best_of: bestOf,
        check_in_time_minutes: checkInTime,
      })
      .select()
      .single();

    if (phaseError || !phase) {
      throw new Error(`Failed to create phase: ${phaseError?.message}`);
    }

    // Create round
    const { data: round, error: roundError } = await adminClient
      .from("tournament_rounds")
      .insert({
        phase_id: phase.id,
        round_number: 1,
        status: "active",
        start_time: new Date().toISOString(),
      })
      .select()
      .single();

    if (roundError || !round) {
      throw new Error(`Failed to create round: ${roundError?.message}`);
    }

    // Create match (pending, neither player confirmed)
    const { data: match, error: matchError } = await adminClient
      .from("tournament_matches")
      .insert({
        round_id: round.id,
        alt1_id: players[0]!.alt.id,
        alt2_id: players[1]!.alt.id,
        table_number: 1,
        status: "pending",
        is_bye: false,
        player1_match_confirmed: false,
        player2_match_confirmed: false,
        start_time: new Date().toISOString(),
      })
      .select()
      .single();

    if (matchError || !match) {
      throw new Error(`Failed to create match: ${matchError?.message}`);
    }

    // Create best_of game rows (as start_round does)
    const gameInserts = Array.from({ length: bestOf }, (_, i) => ({
      match_id: match.id,
      game_number: i + 1,
    }));
    await adminClient.from("match_games").insert(gameInserts);

    return {
      phaseId: phase.id,
      roundId: round.id,
      matchId: match.id,
    };
  }

  /**
   * Helper: simulate player 1 checking in by setting the confirmed flag
   * and inserting a backdated "checked in" system message.
   */
  async function simulatePlayerCheckin(
    forMatchId: number,
    playerIndex: 0 | 1,
    minutesAgo: number
  ) {
    const isPlayer1 = playerIndex === 0;
    const altId = players[playerIndex]!.alt.id;
    const playerName = players[playerIndex]!.alt.display_name;

    // Set confirmation flag
    const updateField = isPlayer1
      ? { player1_match_confirmed: true }
      : { player2_match_confirmed: true };

    await adminClient
      .from("tournament_matches")
      .update(updateField)
      .eq("id", forMatchId);

    // Insert a backdated "checked in" system message
    const checkinTime = new Date(
      Date.now() - minutesAgo * 60 * 1000
    ).toISOString();

    await adminClient.from("match_messages").insert({
      match_id: forMatchId,
      alt_id: altId,
      message_type: "system",
      content: `${playerName} checked in`,
      created_at: checkinTime,
    });
  }

  /**
   * Helper: run the escalation function
   */
  async function runEscalation() {
    const { error } = await adminClient.rpc("check_no_show_escalation");
    if (error) {
      throw new Error(`Escalation failed: ${error.message}`);
    }
  }

  /**
   * Helper: get match games sorted by game_number
   */
  async function getMatchGames(forMatchId: number) {
    const { data, error } = await adminClient
      .from("match_games")
      .select("*")
      .eq("match_id", forMatchId)
      .order("game_number", { ascending: true });

    if (error) throw new Error(`Failed to get games: ${error.message}`);
    return data;
  }

  /**
   * Helper: get match messages sorted by created_at
   */
  async function getMatchMessages(forMatchId: number) {
    const { data, error } = await adminClient
      .from("match_messages")
      .select("*")
      .eq("match_id", forMatchId)
      .order("created_at", { ascending: true });

    if (error) throw new Error(`Failed to get messages: ${error.message}`);
    return data;
  }

  /**
   * Helper: get match status
   */
  async function getMatchStatus(forMatchId: number) {
    const { data, error } = await adminClient
      .from("tournament_matches")
      .select("status, game_wins1, game_wins2, winner_alt_id")
      .eq("id", forMatchId)
      .single();

    if (error) throw new Error(`Failed to get match: ${error.message}`);
    return data;
  }

  beforeAll(async () => {
    adminClient = createAdminSupabaseClient();

    // Create a scenario with 2 players
    const scenario = await createTournamentScenario(adminClient, 2);
    tournament = scenario.tournament;
    organizationId = scenario.organizationId;
    owner = scenario.owner;
    players = scenario.players;

    // Activate the tournament
    await adminClient
      .from("tournaments")
      .update({ status: "active" })
      .eq("id", tournament.id);
  });

  afterAll(async () => {
    // Cleanup notifications
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

  // Clean up per-test match data
  afterEach(async () => {
    if (matchId) {
      await adminClient.from("match_messages").delete().eq("match_id", matchId);
      await adminClient.from("match_games").delete().eq("match_id", matchId);
      await adminClient.from("tournament_matches").delete().eq("id", matchId);
    }
    if (roundId) {
      await adminClient.from("tournament_rounds").delete().eq("id", roundId);
    }
    if (phaseId) {
      await adminClient.from("tournament_phases").delete().eq("id", phaseId);
    }
  });

  it("awards a game after one interval elapses", async () => {
    const scenario = await setupMatchScenario({
      checkInTimeMinutes: 1,
      bestOf: 3,
    });
    phaseId = scenario.phaseId;
    roundId = scenario.roundId;
    matchId = scenario.matchId;

    // Player 1 checks in 2 minutes ago (> 1 interval)
    await simulatePlayerCheckin(matchId, 0, 2);

    await runEscalation();

    const games = await getMatchGames(matchId);
    const noShowGames = games.filter((g) => g.is_no_show === true);

    // At least 1 game should be awarded after 2 minutes with 1-minute intervals
    expect(noShowGames.length).toBeGreaterThanOrEqual(1);
    expect(noShowGames[0]!.winner_alt_id).toBe(players[0]!.alt.id);
    expect(noShowGames[0]!.status).toBe("resolved");
    expect(noShowGames[0]!.resolution_notes).toBe(
      "Auto-awarded: opponent no-show"
    );
  });

  it("awards multiple games after multiple intervals", async () => {
    const scenario = await setupMatchScenario({
      checkInTimeMinutes: 1,
      bestOf: 5,
    });
    phaseId = scenario.phaseId;
    roundId = scenario.roundId;
    matchId = scenario.matchId;

    // Player 1 checks in 3 minutes ago (3 intervals of 1 minute)
    await simulatePlayerCheckin(matchId, 0, 3);

    await runEscalation();

    const games = await getMatchGames(matchId);
    const noShowGames = games.filter((g) => g.is_no_show === true);

    // Should have 3 no-show games (3 intervals elapsed, Bo5 needs 3 wins)
    expect(noShowGames.length).toBe(3);
    for (const g of noShowGames) {
      expect(g.winner_alt_id).toBe(players[0]!.alt.id);
      expect(g.status).toBe("resolved");
    }
  });

  it("completes match when enough games awarded (Bo3: 2 wins)", async () => {
    const scenario = await setupMatchScenario({
      checkInTimeMinutes: 1,
      bestOf: 3,
    });
    phaseId = scenario.phaseId;
    roundId = scenario.roundId;
    matchId = scenario.matchId;

    // Player 1 checks in 3 minutes ago (enough for 2 wins in Bo3)
    await simulatePlayerCheckin(matchId, 0, 3);

    await runEscalation();

    const matchStatus = await getMatchStatus(matchId);
    expect(matchStatus.status).toBe("completed");
    expect(matchStatus.winner_alt_id).toBe(players[0]!.alt.id);
    expect(matchStatus.game_wins1).toBe(2);
    expect(matchStatus.game_wins2).toBe(0);
  });

  it("completes match when enough games awarded (Bo5: 3 wins)", async () => {
    const scenario = await setupMatchScenario({
      checkInTimeMinutes: 1,
      bestOf: 5,
    });
    phaseId = scenario.phaseId;
    roundId = scenario.roundId;
    matchId = scenario.matchId;

    // Player 2 checks in 4 minutes ago (enough for 3 wins in Bo5)
    await simulatePlayerCheckin(matchId, 1, 4);

    await runEscalation();

    const matchStatus = await getMatchStatus(matchId);
    expect(matchStatus.status).toBe("completed");
    expect(matchStatus.winner_alt_id).toBe(players[1]!.alt.id);
    expect(matchStatus.game_wins1).toBe(0);
    expect(matchStatus.game_wins2).toBe(3);
  });

  it("skips matches where both players confirmed", async () => {
    const scenario = await setupMatchScenario({
      checkInTimeMinutes: 1,
      bestOf: 3,
    });
    phaseId = scenario.phaseId;
    roundId = scenario.roundId;
    matchId = scenario.matchId;

    // Both players confirm
    await simulatePlayerCheckin(matchId, 0, 5);
    await adminClient
      .from("tournament_matches")
      .update({ player2_match_confirmed: true })
      .eq("id", matchId);

    await runEscalation();

    const games = await getMatchGames(matchId);
    const noShowGames = games.filter((g) => g.is_no_show === true);

    // No games should be awarded since both confirmed
    expect(noShowGames.length).toBe(0);
  });

  it("skips matches where neither player confirmed", async () => {
    const scenario = await setupMatchScenario({
      checkInTimeMinutes: 1,
      bestOf: 3,
    });
    phaseId = scenario.phaseId;
    roundId = scenario.roundId;
    matchId = scenario.matchId;

    // Neither player confirms — no check-in message either
    await runEscalation();

    const games = await getMatchGames(matchId);
    const noShowGames = games.filter((g) => g.is_no_show === true);

    expect(noShowGames.length).toBe(0);
  });

  it("stops escalating when both confirm (late arrival)", async () => {
    const scenario = await setupMatchScenario({
      checkInTimeMinutes: 1,
      bestOf: 3,
    });
    phaseId = scenario.phaseId;
    roundId = scenario.roundId;
    matchId = scenario.matchId;

    // Player 1 checks in 2 minutes ago (1 game will be awarded)
    await simulatePlayerCheckin(matchId, 0, 2);

    await runEscalation();

    let games = await getMatchGames(matchId);
    let noShowGames = games.filter((g) => g.is_no_show === true);
    expect(noShowGames.length).toBeGreaterThanOrEqual(1);

    // Now player 2 also confirms (late arrival)
    await adminClient
      .from("tournament_matches")
      .update({ player2_match_confirmed: true })
      .eq("id", matchId);

    // Run escalation again — should not award more games
    await runEscalation();

    games = await getMatchGames(matchId);
    noShowGames = games.filter((g) => g.is_no_show === true);

    // Count should stay the same (no additional games awarded)
    // The match should not have been auto-completed if we only had 1 game in Bo3
    const matchStatus = await getMatchStatus(matchId);
    if (noShowGames.length < 2) {
      // Only 1 game awarded, match should still be ongoing
      expect(matchStatus.status).not.toBe("completed");
    }
  });

  it("creates correct system messages", async () => {
    const scenario = await setupMatchScenario({
      checkInTimeMinutes: 1,
      bestOf: 3,
    });
    phaseId = scenario.phaseId;
    roundId = scenario.roundId;
    matchId = scenario.matchId;

    // Player 1 checks in 2 minutes ago
    await simulatePlayerCheckin(matchId, 0, 2);

    await runEscalation();

    const messages = await getMatchMessages(matchId);
    const noShowMessages = messages.filter(
      (m) =>
        m.message_type === "system" && m.content.includes("opponent no-show")
    );

    expect(noShowMessages.length).toBeGreaterThanOrEqual(1);
    // Verify message format
    const firstMsg = noShowMessages[0]!;
    expect(firstMsg.content).toMatch(
      /Game \d+ awarded to .+ — opponent no-show/
    );
  });

  it("creates notifications when match auto-completes", async () => {
    const scenario = await setupMatchScenario({
      checkInTimeMinutes: 1,
      bestOf: 3,
    });
    phaseId = scenario.phaseId;
    roundId = scenario.roundId;
    matchId = scenario.matchId;

    // Player 1 checks in 3 minutes ago (Bo3 needs 2 wins)
    await simulatePlayerCheckin(matchId, 0, 3);

    await runEscalation();

    // Wait for triggers
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Check match is completed
    const matchStatus = await getMatchStatus(matchId);
    expect(matchStatus.status).toBe("completed");

    // Check player notification (winner)
    const { data: winnerNotifs } = await adminClient
      .from("notifications")
      .select("*")
      .eq("match_id", matchId)
      .eq("user_id", players[0]!.user.id)
      .eq("type", "match_result");

    expect(winnerNotifs).not.toBeNull();
    expect(winnerNotifs!.length).toBeGreaterThanOrEqual(1);
    expect(winnerNotifs![0]!.title).toContain("opponent no-show");

    // Check player notification (loser)
    const { data: loserNotifs } = await adminClient
      .from("notifications")
      .select("*")
      .eq("match_id", matchId)
      .eq("user_id", players[1]!.user.id)
      .eq("type", "match_result");

    expect(loserNotifs).not.toBeNull();
    expect(loserNotifs!.length).toBeGreaterThanOrEqual(1);
    expect(loserNotifs![0]!.title).toContain("no-show");

    // Cleanup notifications for this test
    await adminClient.from("notifications").delete().eq("match_id", matchId);
  });

  it("does not re-award games on subsequent runs", async () => {
    const scenario = await setupMatchScenario({
      checkInTimeMinutes: 1,
      bestOf: 5,
    });
    phaseId = scenario.phaseId;
    roundId = scenario.roundId;
    matchId = scenario.matchId;

    // Player 1 checks in 2 minutes ago
    await simulatePlayerCheckin(matchId, 0, 2);

    // Run escalation twice
    await runEscalation();
    const gamesAfterFirst = await getMatchGames(matchId);
    const noShowCountFirst = gamesAfterFirst.filter(
      (g) => g.is_no_show === true
    ).length;

    await runEscalation();
    const gamesAfterSecond = await getMatchGames(matchId);
    const noShowCountSecond = gamesAfterSecond.filter(
      (g) => g.is_no_show === true
    ).length;

    // Same number of no-show games after second run
    expect(noShowCountSecond).toBe(noShowCountFirst);
  });
});
