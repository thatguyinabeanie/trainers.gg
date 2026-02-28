/**
 * Full Tournament Simulation E2E Test
 *
 * Runs a complete 15-player Swiss + Top 8 tournament:
 * - Playwright (1 browser, TO): round management UI via RoundCommandCenter
 * - Admin Supabase client: bulk setup (create, register, check-in, start)
 * - Per-user Supabase clients: match result reporting (RLS enforced)
 *
 * Environment variables:
 * - TOURNAMENT_SIM_PAUSE=round-N  → pause after round N for manual inspection
 * - TOURNAMENT_SIM_SKIP_CLEANUP=1 → leave tournament in DB after test
 * - TOURNAMENT_SIM_SEED=N         → override random seed for match results
 */

import { test, expect } from "@playwright/test";
import { TEST_USERS, loginViaUI } from "../../fixtures/auth";
import { TournamentSimulator } from "../../fixtures/tournament-simulator";

// Use empty storage state — we'll log in explicitly as the TO
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Full Tournament Simulation", () => {
  let sim: TournamentSimulator;

  test.beforeAll(async () => {
    sim = new TournamentSimulator({
      playerCount: 15,
      swissRounds: 4,
      topCutSize: 6,
    });

    // Set up all clients and tournament data
    await sim.createTOClient();
    await sim.createPlayerClients();
    await sim.setupTournament();
    await sim.registerAllPlayers();
    await sim.submitAllTeams();
    await sim.checkInAllPlayers();
    await sim.startTournament();
  });

  test.afterAll(async () => {
    if (!process.env.TOURNAMENT_SIM_SKIP_CLEANUP) {
      await sim.cleanup();
    }
  });

  // 5-minute timeout for the full simulation
  test.setTimeout(300_000);

  test("run complete 15-player swiss + top 8 tournament", async ({ page }) => {
    // -- TO logs in via UI --
    await loginViaUI(page, TEST_USERS.admin);
    await page.goto(sim.managementUrl);

    // Wait for the page to load and show the tournament management UI
    await page.waitForLoadState("networkidle");

    // Dismiss cookie consent dialog if present — it can intercept clicks
    const cookieAcceptBtn = page.getByRole("button", { name: "Accept" });
    if (
      await cookieAcceptBtn.isVisible({ timeout: 2_000 }).catch(() => false)
    ) {
      await cookieAcceptBtn.click();
    }

    // --- SWISS ROUNDS (4 rounds) ---
    for (let round = 1; round <= 4; round++) {
      // TO clicks "Start Round N" button to prepare the round
      await page
        .getByRole("button", { name: `Start Round ${round}` })
        .click({ timeout: 30_000 });

      // Wait for pairings preview to appear
      await page
        .getByText(`Round ${round} Preview`)
        .waitFor({ timeout: 30_000 });

      // TO reviews preview and clicks "Confirm & Start"
      const confirmBtn = page.getByRole("button", { name: /Confirm & Start/ });
      await confirmBtn.waitFor({ state: "visible", timeout: 10_000 });
      await confirmBtn.click();

      // After clicking, the UI should transition through "starting" → "active"
      // If the server action fails, an error toast appears and state reverts to "preview"
      // Wait a moment then check for error toast before waiting for "in Progress"
      const errorToast = page.locator('[data-sonner-toast][data-type="error"]');
      const inProgressText = page.getByText(`Round ${round} in Progress`);

      // Race: either the round starts or an error toast appears
      const result = await Promise.race([
        inProgressText
          .waitFor({ timeout: 30_000 })
          .then(() => "in_progress" as const),
        errorToast
          .first()
          .waitFor({ timeout: 30_000 })
          .then(async () => {
            const toastText = await errorToast.first().textContent();
            return `error: ${toastText}` as const;
          }),
      ]);

      if (result !== "in_progress") {
        throw new Error(
          `Round ${round} failed to start. ${result}. URL: ${page.url()}`
        );
      }

      // Fetch match data for this round so players can report results
      const currentRound = await sim.getCurrentRound(sim.swissPhaseId_);
      if (!currentRound) {
        throw new Error(`Round ${round} not found after starting`);
      }
      await sim.fetchRoundMatches(currentRound.id);

      // Players report match results via their Supabase clients
      await sim.reportMatchResults(round);

      // Drop a player after round 2 to test odd-player handling
      if (round === 2) {
        await sim.dropPlayer(14); // Drop 15th player (ordinary_trainer_36)
      }

      // Reload to pick up match completion state
      // (realtime subscriptions may not reliably fire in test environments)
      await page.reload();
      await page.waitForLoadState("networkidle");

      // Wait for "Complete Round" button to become enabled
      await expect(
        page.getByRole("button", { name: "Complete Round" })
      ).toBeEnabled({ timeout: 30_000 });

      // TO clicks "Complete Round"
      await page.getByRole("button", { name: "Complete Round" }).click();

      // Wait for round completion — either the next round prompt or the toast
      // The toast may auto-dismiss, so primarily wait for the UI state change
      if (round < 4) {
        // After completing rounds 1-3, wait for "Start Round N+1" button
        await page
          .getByRole("button", { name: `Start Round ${round + 1}` })
          .waitFor({ timeout: 30_000 });
      } else {
        // After the last swiss round, wait for round complete state
        await page
          .getByText(`Round ${round} Complete`)
          .waitFor({ timeout: 30_000 });
      }

      // Optional: pause for dev inspection
      if (process.env.TOURNAMENT_SIM_PAUSE === `round-${round}`) {
        console.log(
          `[Sim] Paused at round ${round}. URL: ${sim.managementUrl}`
        );
        await page.pause(); // Opens Playwright Inspector
      }
    }

    // --- TOP CUT ---
    // Advance to top 8 via admin client (no UI button for this yet)
    await sim.advanceToTopCut();
    await page.reload();
    await page.waitForLoadState("networkidle");

    // --- ELIMINATION ROUNDS (QF, SF, Finals = 3 rounds) ---
    for (let elimRound = 1; elimRound <= 3; elimRound++) {
      if (elimRound === 1) {
        // Round 1: advanceToTopCut already created matches — UI shows
        // "pending_resume" with "Start Round 1" button (no preview step)
        await page
          .getByRole("button", { name: /Start Round/ })
          .click({ timeout: 30_000 });
      } else {
        // Rounds 2+: need to generate pairings via "Start Round N" → preview → confirm
        await page
          .getByRole("button", { name: /Start Round/ })
          .click({ timeout: 30_000 });

        // Wait for pairings preview
        await page.getByText(/Preview/).waitFor({ timeout: 30_000 });

        // Confirm & Start
        const elimConfirmBtn = page.getByRole("button", {
          name: /Confirm & Start/,
        });
        await elimConfirmBtn.waitFor({ state: "visible", timeout: 10_000 });
        await elimConfirmBtn.click();
      }

      // Wait for round to be active (with error detection)
      const elimErrorToast = page.locator(
        '[data-sonner-toast][data-type="error"]'
      );
      const elimInProgress = page.getByText(/in Progress/);
      const elimResult = await Promise.race([
        elimInProgress
          .waitFor({ timeout: 30_000 })
          .then(() => "in_progress" as const),
        elimErrorToast
          .first()
          .waitFor({ timeout: 30_000 })
          .then(async () => {
            const text = await elimErrorToast.first().textContent();
            return `error: ${text}` as const;
          }),
      ]);
      if (elimResult !== "in_progress") {
        throw new Error(
          `Elimination round ${elimRound} failed to start. ${elimResult}`
        );
      }

      // Fetch matches and report results
      const elimCurrentRound = await sim.getCurrentRound(
        sim.eliminationPhaseId
      );
      if (!elimCurrentRound) {
        throw new Error(`Elimination round ${elimRound} not found`);
      }
      await sim.fetchRoundMatches(elimCurrentRound.id);
      await sim.reportMatchResults(elimRound, { isElimination: true });

      // Reload to pick up match completion state
      await page.reload();
      await page.waitForLoadState("networkidle");

      // Complete round
      await expect(
        page.getByRole("button", { name: "Complete Round" })
      ).toBeEnabled({ timeout: 30_000 });
      await page.getByRole("button", { name: "Complete Round" }).click();

      // Wait for round completion UI state change
      if (elimRound < 3) {
        await page
          .getByRole("button", { name: /Start Round/ })
          .waitFor({ timeout: 30_000 });
      } else {
        // Finals: wait for complete state
        await page
          .getByText(/Complete/)
          .first()
          .waitFor({ timeout: 30_000 });
      }
    }

    // --- COMPLETE TOURNAMENT ---
    await sim.completeTournament();

    // --- VERIFY ---
    const standings = await sim.getStandings();
    expect(standings.length).toBeGreaterThan(0);

    const status = await sim.getTournamentStatus();
    expect(status).toBe("completed");

    // Log the winner
    const winner = standings.find((s) => s.rank === 1);
    if (winner) {
      console.log(
        `[Sim] Tournament completed. Winner: alt ${winner.altId} (rank 1)`
      );
    }
  });
});
