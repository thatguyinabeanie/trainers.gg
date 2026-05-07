/**
 * Tournament Runner Orchestrator
 *
 * Phase-driven orchestrator that:
 * 1. Creates N+1 browser contexts (host + N players)
 * 2. Runs through tournament phases sequentially
 * 3. Within each phase, parallelizes player actions via Promise.all
 * 4. Verifies standings assertions after each round
 */

import { chromium, type Browser, type BrowserContext, type Page } from "@playwright/test";
import type { PlayerContext, RunnerOptions, Scenario } from "./types";
import { SAMPLE_TEAMS } from "../fixtures/sample-teams";
import {
  loginAsHost,
  createTournament,
  openRegistration,
  activateTournament,
  startRound,
  completeRound,
  readStandings,
} from "./host";
import {
  login,
  registerForTournament,
  submitTeam,
  checkInToTournament,
  checkInAndReport,
  checkInToMatch,
  dropFromTournament,
} from "./player";
import { resolveRoundActions } from "./resolve-actions";

const DEFAULT_TIMEOUT = 30_000;

export class TournamentOrchestrator {
  private browser: Browser | null = null;
  private hostContext: BrowserContext | null = null;
  private hostPage: Page | null = null;
  private playerContexts: Map<string, PlayerContext> = new Map();
  private tournamentSlug: string = "";

  constructor(
    private scenario: Scenario,
    private options: RunnerOptions
  ) {}

  /**
   * Run the full tournament scenario from start to finish.
   */
  async run(): Promise<void> {
    try {
      await this.setup();
      await this.phaseLogin();
      await this.phaseCreateTournament();
      await this.phaseRegister();
      await this.phaseSubmitTeams();
      await this.phaseCheckIn();
      await this.phaseActivate();
      await this.phaseRounds();
      this.log("Tournament simulation complete!");
    } finally {
      await this.teardown();
    }
  }

  // -- Setup & Teardown --

  private async setup(): Promise<void> {
    this.log("Launching browser...");

    this.browser = await chromium.launch({
      headless: !this.options.headed,
      slowMo: this.options.slowMo,
    });

    // Build extra HTTP headers (e.g. Vercel protection bypass for preview deploys)
    const extraHTTPHeaders: Record<string, string> = {};
    const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
    if (bypassSecret) {
      extraHTTPHeaders["x-vercel-protection-bypass"] = bypassSecret;
    }

    // Create host context
    this.hostContext = await this.browser.newContext({
      baseURL: this.options.baseUrl,
      extraHTTPHeaders,
    });
    this.hostPage = await this.hostContext.newPage();

    // Create player contexts (each isolated — own cookies, storage)
    for (const player of this.scenario.players) {
      const context = await this.browser.newContext({
        baseURL: this.options.baseUrl,
        extraHTTPHeaders,
      });
      const page = await context.newPage();
      this.playerContexts.set(player.username, {
        user: player,
        context,
        page,
      });
    }

    this.log(
      `Created ${this.playerContexts.size} player contexts + 1 host context`
    );
  }

  private async teardown(): Promise<void> {
    // Close all contexts
    for (const [, pc] of this.playerContexts) {
      await pc.context.close().catch(() => {});
    }
    if (this.hostContext) {
      await this.hostContext.close().catch(() => {});
    }
    if (this.browser) {
      await this.browser.close().catch(() => {});
    }
    this.log("Browser closed");
  }

  // -- Phases --

  private async phaseLogin(): Promise<void> {
    this.log("=== Phase: Login ===");

    // Login host
    await loginAsHost(this.hostPage!, this.scenario.host);
    this.log(`  Host logged in: ${this.scenario.host.username}`);

    // Login all players in parallel
    await this.parallel("login", async (pc) => {
      await login(pc.page, pc.user);
    });
    this.log(`  All ${this.scenario.players.length} players logged in`);
  }

  private async phaseCreateTournament(): Promise<void> {
    this.log("=== Phase: Create Tournament ===");

    this.tournamentSlug = await createTournament(
      this.hostPage!,
      this.scenario.config
    );
    this.log(`  Tournament created: ${this.tournamentSlug}`);

    // Open registration
    await openRegistration(
      this.hostPage!,
      this.scenario.config.community,
      this.tournamentSlug
    );
    this.log("  Registration opened");
  }

  private async phaseRegister(): Promise<void> {
    this.log("=== Phase: Registration ===");

    await this.parallel("register", async (pc) => {
      await registerForTournament(pc.page, this.tournamentSlug);
    });
    this.log(`  All ${this.scenario.players.length} players registered`);
  }

  private async phaseSubmitTeams(): Promise<void> {
    this.log("=== Phase: Submit Teams ===");

    const players = Array.from(this.playerContexts.values());
    await Promise.all(
      players.map((pc, i) => {
        // Assign teams round-robin from the sample teams pool
        const teamPaste = SAMPLE_TEAMS[i % SAMPLE_TEAMS.length]!;
        return submitTeam(pc.page, this.tournamentSlug, teamPaste);
      })
    );
    this.log(`  All ${players.length} players submitted teams`);
  }

  private async phaseCheckIn(): Promise<void> {
    this.log("=== Phase: Check-In ===");

    // Check-in is automatically open for upcoming tournaments —
    // no host action needed (there is no "Open check-in" button in the manage UI).
    // All players check in in parallel.
    await this.parallel("check-in", async (pc) => {
      await checkInToTournament(pc.page, this.tournamentSlug);
    });
    this.log(`  All ${this.scenario.players.length} players checked in`);
  }

  private async phaseActivate(): Promise<void> {
    this.log("=== Phase: Activate Tournament ===");

    // Transition tournament from upcoming → active via Supabase mutation.
    // There is no UI button for this step — the startTournament server action
    // exists but is not wired to any manage-page control.
    // Also sets checkInTimeMinutes on phases if configured (not exposed in wizard UI).
    await activateTournament(
      this.scenario.host,
      this.tournamentSlug,
      this.scenario.config
    );
    this.log("  Tournament activated (status: active)");

    // Reload the host's manage page so the RoundCommandCenter renders
    await this.hostPage!.goto(
      `/dashboard/community/${this.scenario.config.community}/tournaments/${this.tournamentSlug}/manage`
    );
    // Wait for the RoundCommandCenter to render (deterministic — no networkidle)
    await this.hostPage!
      .getByRole("button", { name: /Start Round 1/i })
      .waitFor({ state: "visible", timeout: DEFAULT_TIMEOUT });
  }

  private async phaseRounds(): Promise<void> {
    this.log("=== Phase: Rounds ===");

    for (let round = 1; round <= this.scenario.config.rounds; round++) {
      this.log(`  --- Round ${round} ---`);

      // Host starts the round and reads pairings from the preview table
      // (pairings are captured before clicking "Confirm & Start" because
      // the preview table disappears once the round goes active)
      const pairings = await startRound(
        this.hostPage!,
        this.scenario.config.community,
        this.tournamentSlug,
        round
      );
      this.log(`  Round ${round} started — ${pairings.length} pairings read`);

      if (pairings.length === 0) {
        throw new Error(
          `No pairings found for round ${round}. ` +
            `The DOM selectors in readPairings() may need updating for the current UI.`
        );
      }

      // Resolve what each player should do
      const actions = resolveRoundActions(pairings, this.scenario, round);
      this.log(
        `  Actions resolved: ${actions.filter((a) => a.type === "check-in-and-report").length} reporters, ` +
          `${actions.filter((a) => a.type === "check-in-and-wait").length} waiters, ` +
          `${actions.filter((a) => a.type === "bye").length} byes, ` +
          `${actions.filter((a) => a.type === "drop").length} drops`
      );

      // Execute player actions in parallel
      await Promise.all(
        actions.map((action) => {
          const pc = this.playerContexts.get(action.player);
          if (!pc) {
            throw new Error(
              `No browser context for player "${action.player}" — ` +
                `the pairings parser returned a username that doesn't match any known player. ` +
                `Known players: ${Array.from(this.playerContexts.keys()).join(", ")}`
            );
          }

          switch (action.type) {
            case "check-in-and-report":
              if (!action.games) {
                throw new Error(
                  `check-in-and-report action for ${action.player} is missing games array`
                );
              }
              return checkInAndReport(
                pc.page,
                this.tournamentSlug,
                action.games
              );
            case "check-in-and-wait":
              return checkInToMatch(pc.page, this.tournamentSlug);
            case "drop":
              return dropFromTournament(pc.page, this.tournamentSlug);
            case "bye":
            case "no-show":
              return Promise.resolve(); // Do nothing
          }
        })
      );
      this.log(`  Round ${round} actions completed`);

      // Calculate completeRound timeout.
      // If this round has no-shows, the auto-award timer must expire before
      // the match resolves. Budget: bestOf × checkInTimeMinutes × 60s + buffer.
      const hasNoShow = actions.some((a) => a.type === "no-show");
      const checkInMin = this.scenario.config.checkInTimeMinutes ?? 5;
      const completeTimeout = hasNoShow
        ? this.scenario.config.bestOf * checkInMin * 60_000 + 30_000
        : 60_000;

      // Host completes the round
      await completeRound(
        this.hostPage!,
        this.scenario.config.community,
        this.tournamentSlug,
        completeTimeout
      );
      this.log(`  Round ${round} completed`);

      // Verify standings if there's an assertion for this round
      const assertion = this.scenario.assertions.find(
        (a) => a.afterRound === round
      );
      if (assertion) {
        const standings = await readStandings(
          this.hostPage!,
          this.tournamentSlug
        );
        this.verifyStandings(standings, assertion.order, round);
      }
    }
  }

  // -- Helpers --

  /**
   * Run an action for all players in parallel.
   */
  private async parallel(
    phaseName: string,
    action: (pc: PlayerContext) => Promise<void>
  ): Promise<void> {
    const players = Array.from(this.playerContexts.values());
    const results = await Promise.allSettled(players.map(action));

    const failures = results.filter(
      (r): r is PromiseRejectedResult => r.status === "rejected"
    );

    if (failures.length > 0) {
      const errors = failures.map((f) => f.reason?.message ?? f.reason);
      throw new Error(
        `${phaseName} phase failed for ${failures.length}/${players.length} players:\n` +
          errors.join("\n")
      );
    }
  }

  /**
   * Verify standings match the expected order.
   */
  private verifyStandings(
    actual: string[],
    expected: string[],
    round: number
  ): void {
    const mismatches: string[] = [];
    for (let i = 0; i < expected.length; i++) {
      if (actual[i] !== expected[i]) {
        mismatches.push(
          `  Position ${i + 1}: expected "${expected[i]}", got "${actual[i] ?? "(missing)"}"`
        );
      }
    }

    if (mismatches.length > 0) {
      const details = [
        `Standings assertion failed after round ${round}:`,
        ...mismatches,
        `Actual standings: ${actual.join(", ")}`,
      ].join("\n");
      this.log(`  ASSERTION FAILED (after round ${round}):`);
      mismatches.forEach((m) => this.log(m));
      this.log(`  Actual standings: ${actual.join(", ")}`);
      throw new Error(details);
    } else {
      this.log(`  Standings verified after round ${round}`);
    }
  }

  private log(msg: string): void {
    if (this.options.verbose !== false) {
      console.log(`[TournamentRunner] ${msg}`);
    }
  }
}
