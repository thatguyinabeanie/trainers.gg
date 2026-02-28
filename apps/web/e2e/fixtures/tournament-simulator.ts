/**
 * Tournament Simulator
 *
 * Programmatically runs a complete Swiss + Top 8 tournament using:
 * - Admin client (service role): bulk DB setup — create tournament, register, check-in
 * - TO client (signed in as admin): auth-required mutations — start, advance, complete
 * - Per-user clients (signed in players): match result reporting via RPC
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@trainers/supabase/types";
import {
  createAdminSupabaseClient,
  startTournamentEnhanced,
  advanceToTopCut,
  completeTournament,
  reportMatchResult,
  confirmMatchCheckIn,
  dropPlayer,
} from "@trainers/supabase";
// SAMPLE_TEAMS available if full team data is needed in future
// import { SAMPLE_TEAMS } from "./sample-teams";

// -- Types --

export interface SimulatorConfig {
  playerCount: number;
  swissRounds: number;
  topCutSize: number;
  format: "swiss_with_cut";
  seed?: number;
}

interface SimPlayer {
  email: string;
  userId: string;
  altId: number;
  username: string;
  registrationId: number;
  client: SupabaseClient<Database>;
  isDropped: boolean;
}

interface RoundMatchData {
  roundId: number;
  matches: Array<{
    id: number;
    alt1Id: number;
    alt2Id: number | null;
    isBye: boolean;
  }>;
}

// -- Seeded Random --

class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed;
  }

  /** Returns a float in [0, 1) */
  next(): number {
    // LCG parameters (Numerical Recipes)
    this.state = (this.state * 1664525 + 1013904223) & 0xffffffff;
    return (this.state >>> 0) / 0x100000000;
  }

  /** Returns an integer in [min, max] inclusive */
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}

// -- Seed User Definitions --

const PASSWORD = "Password123!";

/**
 * 15 seed users for the tournament (all non-admin).
 * Admin (admin@trainers.local) is the TO — not a player.
 */
const PLAYER_ACCOUNTS = [
  { email: "player@trainers.local", username: "ash_ketchum" },
  { email: "champion@trainers.local", username: "cynthia" },
  { email: "gymleader@trainers.local", username: "brock" },
  { email: "elite@trainers.local", username: "karen" },
  { email: "casual@trainers.local", username: "red" },
  { email: "lance@trainers.local", username: "lance" },
  { email: "valentinemiller24@trainers.local", username: "valentinemiller24" },
  { email: "ellis_paucek@trainers.local", username: "ellis_paucek" },
  {
    email: "submissive_trainer_7@trainers.local",
    username: "submissive_trainer_7",
  },
  { email: "halliefay16@trainers.local", username: "halliefay16" },
  {
    email: "demetrius_gutkowski@trainers.local",
    username: "demetrius_gutkowski",
  },
  { email: "trentheaney20@trainers.local", username: "trentheaney20" },
  { email: "eminent_ranger@trainers.local", username: "eminent_ranger" },
  { email: "hilbert38@trainers.local", username: "hilbert38" },
  {
    email: "ordinary_trainer_36@trainers.local",
    username: "ordinary_trainer_36",
  },
] as const;

// -- Simulator Class --

export class TournamentSimulator {
  private config: SimulatorConfig;
  private rng: SeededRandom;
  private adminClient: SupabaseClient<Database>;
  private toClient: SupabaseClient<Database> | null = null;
  private players: SimPlayer[] = [];

  // Tournament state
  private tournamentId: number = 0;
  private tournamentSlug: string = "";
  private orgId: number = 0;
  private orgSlug: string = "vgc-league";
  private swissPhaseId: number = 0;
  private elimPhaseId: number = 0;
  private currentRoundData: RoundMatchData | null = null;

  constructor(config: Partial<SimulatorConfig> = {}) {
    this.config = {
      playerCount: config.playerCount ?? 15,
      swissRounds: config.swissRounds ?? 4,
      topCutSize: config.topCutSize ?? 8,
      format: config.format ?? "swiss_with_cut",
      seed: config.seed ?? (Number(process.env.TOURNAMENT_SIM_SEED) || 42),
    };

    this.rng = new SeededRandom(this.config.seed!);
    this.adminClient = createAdminSupabaseClient();
  }

  /** Management URL for the TO dashboard */
  get managementUrl(): string {
    return `/to-dashboard/${this.orgSlug}/tournaments/${this.tournamentSlug}/manage`;
  }

  /** Tournament ID getter */
  get id(): number {
    return this.tournamentId;
  }

  private log(msg: string): void {
    console.log(`[Sim] ${msg}`);
  }

  // -- Setup Methods --

  /**
   * Create a TO client (signed in as admin@trainers.local, the VGC League org owner).
   * Required for mutations that check getCurrentUser() + org permissions.
   */
  async createTOClient(): Promise<void> {
    this.toClient = this.createAnonClient();
    const { error } = await this.toClient.auth.signInWithPassword({
      email: "admin@trainers.local",
      password: PASSWORD,
    });
    if (error) throw new Error(`TO sign-in failed: ${error.message}`);
    this.log("TO client authenticated (admin@trainers.local)");
  }

  /**
   * Sign in 15 seed users, each with their own Supabase client.
   * Looks up each user's first alt via admin client.
   */
  async createPlayerClients(): Promise<void> {
    const accounts = PLAYER_ACCOUNTS.slice(0, this.config.playerCount);

    for (const account of accounts) {
      // Create an anon client and sign in as this user
      const client = this.createAnonClient();
      const { data: authData, error: authError } =
        await client.auth.signInWithPassword({
          email: account.email,
          password: PASSWORD,
        });

      if (authError || !authData.user) {
        throw new Error(
          `Sign-in failed for ${account.email}: ${authError?.message}`
        );
      }

      const userId = authData.user.id;

      // Look up the user's first alt (ordered by id)
      const { data: alt, error: altError } = await this.adminClient
        .from("alts")
        .select("id, username")
        .eq("user_id", userId)
        .order("id", { ascending: true })
        .limit(1)
        .single();

      if (altError || !alt) {
        throw new Error(
          `Alt lookup failed for ${account.email}: ${altError?.message}`
        );
      }

      this.players.push({
        email: account.email,
        userId,
        altId: alt.id,
        username: alt.username,
        registrationId: 0, // Set during registration
        client,
        isDropped: false,
      });
    }

    this.log(`Signed in ${this.players.length} player clients`);
  }

  /**
   * Create tournament under VGC League org with Swiss + top cut phases.
   * Uses admin client for direct DB inserts.
   */
  async setupTournament(): Promise<void> {
    // Look up VGC League org
    const { data: org, error: orgError } = await this.adminClient
      .from("organizations")
      .select("id")
      .eq("slug", this.orgSlug)
      .single();

    if (orgError || !org) {
      throw new Error(`VGC League org not found: ${orgError?.message}`);
    }
    this.orgId = org.id;

    // Create tournament
    this.tournamentSlug = `sim-${Date.now()}`;
    const { data: tournament, error: tournamentError } = await this.adminClient
      .from("tournaments")
      .insert({
        organization_id: this.orgId,
        name: `Simulation Tournament ${this.tournamentSlug}`,
        slug: this.tournamentSlug,
        format: "swiss_with_cut",
        game: "pokemon_vgc",
        status: "draft",
        start_date: new Date().toISOString(),
        max_participants: 32,
      })
      .select("id, slug")
      .single();

    if (tournamentError || !tournament) {
      throw new Error(
        `Tournament creation failed: ${tournamentError?.message}`
      );
    }
    this.tournamentId = tournament.id;

    // Create Swiss phase
    const { data: swissPhase, error: swissError } = await this.adminClient
      .from("tournament_phases")
      .insert({
        tournament_id: this.tournamentId,
        name: "Swiss Rounds",
        phase_order: 1,
        phase_type: "swiss",
        status: "pending",
        best_of: 3,
        round_time_minutes: 50,
        check_in_time_minutes: 5,
        planned_rounds: this.config.swissRounds,
        current_round: 0,
      })
      .select("id")
      .single();

    if (swissError || !swissPhase) {
      throw new Error(`Swiss phase creation failed: ${swissError?.message}`);
    }
    this.swissPhaseId = swissPhase.id;

    // Create elimination phase
    const { data: elimPhase, error: elimError } = await this.adminClient
      .from("tournament_phases")
      .insert({
        tournament_id: this.tournamentId,
        name: "Top 8",
        phase_order: 2,
        phase_type: "single_elimination",
        status: "pending",
        best_of: 3,
        round_time_minutes: 50,
        check_in_time_minutes: 5,
        cut_rule: "top-8",
        current_round: 0,
      })
      .select("id")
      .single();

    if (elimError || !elimPhase) {
      throw new Error(
        `Elimination phase creation failed: ${elimError?.message}`
      );
    }
    this.elimPhaseId = elimPhase.id;

    // Publish tournament (draft → upcoming)
    const { error: publishError } = await this.adminClient
      .from("tournaments")
      .update({ status: "upcoming" })
      .eq("id", this.tournamentId);

    if (publishError) {
      throw new Error(`Tournament publish failed: ${publishError.message}`);
    }

    this.log(
      `Created tournament: ${this.tournamentSlug} (ID: ${this.tournamentId})`
    );
  }

  /**
   * Register all players' alts for the tournament.
   */
  async registerAllPlayers(): Promise<void> {
    for (const player of this.players) {
      const { data: reg, error } = await this.adminClient
        .from("tournament_registrations")
        .insert({
          tournament_id: this.tournamentId,
          alt_id: player.altId,
          status: "registered",
        })
        .select("id")
        .single();

      if (error || !reg) {
        throw new Error(
          `Registration failed for ${player.username}: ${error?.message}`
        );
      }
      player.registrationId = reg.id;
    }

    this.log(`Registered ${this.players.length} players`);
  }

  /**
   * Submit minimal team records for all players.
   * The tournament logic only checks if team_id is set on the registration,
   * so we create a bare `teams` record and link it.
   */
  async submitAllTeams(): Promise<void> {
    for (let i = 0; i < this.players.length; i++) {
      const player = this.players[i]!;

      // Create a minimal teams record
      const { data: team, error: teamError } = await this.adminClient
        .from("teams")
        .insert({
          name: `Sim Team ${i + 1}`,
          created_by: player.altId,
          is_public: false,
        })
        .select("id")
        .single();

      if (teamError || !team) {
        throw new Error(
          `Team creation failed for ${player.username}: ${teamError?.message}`
        );
      }

      // Link team to registration
      const { error: linkError } = await this.adminClient
        .from("tournament_registrations")
        .update({ team_id: team.id })
        .eq("id", player.registrationId);

      if (linkError) {
        throw new Error(
          `Team link failed for ${player.username}: ${linkError.message}`
        );
      }
    }

    this.log(`Submitted teams for ${this.players.length} players`);
  }

  /**
   * Check in all registered players.
   */
  async checkInAllPlayers(): Promise<void> {
    const { error } = await this.adminClient
      .from("tournament_registrations")
      .update({ status: "checked_in" })
      .eq("tournament_id", this.tournamentId)
      .eq("status", "registered");

    if (error) {
      throw new Error(`Check-in failed: ${error.message}`);
    }

    this.log(`All ${this.players.length} players checked in`);
  }

  /**
   * Start the tournament (locks teams, activates Swiss phase, creates Round 1).
   * Uses TO client (requires auth + org permission).
   */
  async startTournament(): Promise<void> {
    if (!this.toClient) {
      throw new Error("TO client not initialized — call createTOClient first");
    }

    await startTournamentEnhanced(this.toClient, this.tournamentId);

    // startTournamentEnhanced pre-creates Round 1 as pending with 0 matches.
    // The UI's prepareRound flow (RoundCommandCenter) expects to create rounds
    // from scratch via createRound(). If Round 1 already exists, the UI shows
    // "Start Round 2" instead of "Start Round 1". Delete the phantom round so
    // the UI flow works correctly.
    const { data: phantomRounds } = await this.adminClient
      .from("tournament_rounds")
      .select("id")
      .eq("phase_id", this.swissPhaseId);

    if (phantomRounds?.length) {
      for (const round of phantomRounds) {
        await this.adminClient
          .from("tournament_rounds")
          .delete()
          .eq("id", round.id);
      }
      this.log(
        `Deleted ${phantomRounds.length} phantom round(s) from startTournamentEnhanced`
      );
    }

    this.log("Tournament started — Swiss phase active");
  }

  // -- Round Support --

  /**
   * Fetch matches for a round. Returns match IDs, alt IDs, and bye status.
   */
  async fetchRoundMatches(roundId: number): Promise<RoundMatchData> {
    const { data: matches, error } = await this.adminClient
      .from("tournament_matches")
      .select("id, alt1_id, alt2_id, is_bye")
      .eq("round_id", roundId)
      .order("table_number", { ascending: true });

    if (error) {
      throw new Error(`Fetch matches failed: ${error.message}`);
    }

    const result: RoundMatchData = {
      roundId,
      matches: (matches ?? []).map((m) => ({
        id: m.id,
        alt1Id: m.alt1_id!,
        alt2Id: m.alt2_id,
        isBye: m.is_bye ?? false,
      })),
    };

    this.currentRoundData = result;
    return result;
  }

  /**
   * Get the current pending round for a phase.
   */
  async getCurrentRound(
    phaseId: number
  ): Promise<{ id: number; roundNumber: number; status: string } | null> {
    const { data: rounds, error } = await this.adminClient
      .from("tournament_rounds")
      .select("id, round_number, status")
      .eq("phase_id", phaseId)
      .order("round_number", { ascending: false })
      .limit(1);

    if (error || !rounds || rounds.length === 0) return null;
    const round = rounds[0]!;
    return {
      id: round.id,
      roundNumber: round.round_number,
      status: round.status ?? "pending",
    };
  }

  // -- Player Actions --

  /**
   * Report match results for all non-bye matches in a round.
   * Uses per-user Supabase clients (RLS enforced).
   *
   * @param roundNumber - Swiss round number (1-indexed)
   * @param options.isElimination - If true, all results are 2-0 or 2-1
   * @param options.overrides - Map of matchId → winnerId for specific outcomes
   */
  async reportMatchResults(
    roundNumber: number,
    options: {
      isElimination?: boolean;
      overrides?: Map<number, number>;
    } = {}
  ): Promise<void> {
    if (!this.currentRoundData) {
      throw new Error("No round data — call fetchRoundMatches first");
    }

    const nonByeMatches = this.currentRoundData.matches.filter((m) => !m.isBye);

    // Check in all players — matches start as 'pending' and require both
    // players to check in before becoming 'active'
    for (const match of nonByeMatches) {
      const player1 = this.players.find((p) => p.altId === match.alt1Id);
      const player2 = match.alt2Id
        ? this.players.find((p) => p.altId === match.alt2Id)
        : null;

      if (player1) {
        await confirmMatchCheckIn(player1.client, match.id);
      }
      if (player2) {
        await confirmMatchCheckIn(player2.client, match.id);
      }

      // Small delay between check-ins
      await this.delay(50);
    }

    this.log(
      `Round ${roundNumber}: ${nonByeMatches.length} matches checked in`
    );

    let reported = 0;

    for (const match of nonByeMatches) {
      // Determine winner
      let winnerId: number;
      if (options.overrides?.has(match.id)) {
        winnerId = options.overrides.get(match.id)!;
      } else {
        // Seeded random: ~60% chance alt1 wins
        winnerId = this.rng.next() < 0.6 ? match.alt1Id : match.alt2Id!;
      }

      // Generate score: best-of-3, so either 2-0 or 2-1
      const winnerScore = 2;
      // ~40% chance of a 2-1, 60% chance of a 2-0
      const loserScore = this.rng.next() < 0.4 ? 1 : 0;

      // Determine player1/player2 scores based on who is alt1
      const p1Score = winnerId === match.alt1Id ? winnerScore : loserScore;
      const p2Score = winnerId === match.alt2Id ? winnerScore : loserScore;

      // Find the winning player's client
      const winnerPlayer = this.players.find((p) => p.altId === winnerId);
      if (!winnerPlayer) {
        throw new Error(
          `Winner alt ${winnerId} not found in player list for match ${match.id}`
        );
      }

      // Report via the winner's authenticated client
      await reportMatchResult(
        winnerPlayer.client,
        match.id,
        winnerId,
        p1Score,
        p2Score
      );

      reported++;

      // Small delay to avoid overwhelming realtime subscriptions
      if (reported < nonByeMatches.length) {
        await this.delay(100);
      }
    }

    this.log(
      `Round ${roundNumber}: ${reported}/${nonByeMatches.length} matches reported`
    );

    // Verify all matches completed in DB
    const { data: matchStatuses } = await this.adminClient
      .from("tournament_matches")
      .select("id, status, is_bye")
      .eq("round_id", this.currentRoundData.roundId);

    const statusCounts = (matchStatuses ?? []).reduce(
      (acc, m) => {
        const status = m.status ?? "unknown";
        acc[status] = (acc[status] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    this.log(
      `Round ${roundNumber} DB statuses: ${JSON.stringify(statusCounts)}`
    );
  }

  /**
   * Drop a player from the tournament.
   * Uses TO client (requires auth + org permission).
   */
  async dropPlayer(playerIndex: number): Promise<void> {
    if (!this.toClient) {
      throw new Error("TO client not initialized");
    }

    const player = this.players[playerIndex];
    if (!player) {
      throw new Error(`Player at index ${playerIndex} not found`);
    }

    await dropPlayer(this.toClient, this.tournamentId, player.altId);
    player.isDropped = true;
    this.log(`Dropped player #${playerIndex + 1}: ${player.username}`);
  }

  // -- Lifecycle --

  /**
   * Advance from Swiss to Top Cut elimination phase.
   * Uses TO client (RPC checks org permission).
   */
  async advanceToTopCut(): Promise<void> {
    if (!this.toClient) {
      throw new Error("TO client not initialized");
    }

    const result = await advanceToTopCut(
      this.toClient,
      this.tournamentId,
      this.config.topCutSize
    );

    this.log(
      `Top ${this.config.topCutSize} cut — ${result.qualifiers} qualifiers, ${result.matches_created} matches created`
    );
  }

  /**
   * Complete the tournament (finalize standings, mark as completed).
   * Uses TO client (requires auth + org permission).
   */
  async completeTournament(): Promise<void> {
    if (!this.toClient) {
      throw new Error("TO client not initialized");
    }

    await completeTournament(this.toClient, this.tournamentId);
    this.log("Tournament completed");
  }

  // -- Queries --

  /**
   * Fetch final standings for the tournament.
   */
  async getStandings(): Promise<
    Array<{
      altId: number;
      rank: number;
      matchWins: number;
      matchLosses: number;
      matchPoints: number;
    }>
  > {
    const { data, error } = await this.adminClient
      .from("tournament_player_stats")
      .select("alt_id, current_seed, match_wins, match_losses, match_points")
      .eq("tournament_id", this.tournamentId)
      .order("current_seed", { ascending: true });

    if (error) {
      throw new Error(`Standings fetch failed: ${error.message}`);
    }

    return (data ?? []).map((s) => ({
      altId: s.alt_id,
      rank: s.current_seed ?? 0,
      matchWins: s.match_wins ?? 0,
      matchLosses: s.match_losses ?? 0,
      matchPoints: s.match_points ?? 0,
    }));
  }

  /**
   * Get current tournament status.
   */
  async getTournamentStatus(): Promise<string> {
    const { data, error } = await this.adminClient
      .from("tournaments")
      .select("status")
      .eq("id", this.tournamentId)
      .single();

    if (error || !data) {
      throw new Error(`Status fetch failed: ${error?.message}`);
    }

    return data.status ?? "unknown";
  }

  /**
   * Get the elimination phase ID (for round management after top cut).
   */
  get eliminationPhaseId(): number {
    return this.elimPhaseId;
  }

  /**
   * Get the swiss phase ID.
   */
  get swissPhaseId_(): number {
    return this.swissPhaseId;
  }

  /**
   * Get active players (not dropped).
   */
  get activePlayers(): SimPlayer[] {
    return this.players.filter((p) => !p.isDropped);
  }

  // -- Cleanup --

  /**
   * Delete the tournament and all cascaded child data.
   * Does NOT delete seed users or org.
   */
  async cleanup(): Promise<void> {
    if (this.tournamentId) {
      // The audit_log table has an immutability trigger that blocks UPDATE
      // and DELETE. The tournament FK uses ON DELETE SET NULL, which triggers
      // an UPDATE on audit_log rows — blocked by the trigger. Since each
      // test run uses a unique slug (sim-{timestamp}), leftover data won't
      // interfere. Use db:reset for full cleanup between dev sessions.
      const { error } = await this.adminClient
        .from("tournaments")
        .delete()
        .eq("id", this.tournamentId);

      if (error) {
        if (error.message.includes("audit log")) {
          this.log(
            `Cleanup skipped — audit_log immutability trigger prevents deletion. ` +
              `Run 'pnpm db:reset' to clean up. Tournament: ${this.tournamentSlug}`
          );
        } else {
          console.error(`[Sim] Cleanup failed: ${error.message}`);
        }
      } else {
        this.log(`Cleaned up tournament ${this.tournamentSlug}`);
      }
    }

    // Sign out all player clients
    for (const player of this.players) {
      await player.client.auth.signOut().catch(() => {
        // Ignore sign-out errors during cleanup
      });
    }

    if (this.toClient) {
      await this.toClient.auth.signOut().catch(() => {});
    }
  }

  // -- Private Helpers --

  /**
   * Create an unauthenticated Supabase client using anon key.
   */
  private createAnonClient(): SupabaseClient<Database> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
      );
    }

    return createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
