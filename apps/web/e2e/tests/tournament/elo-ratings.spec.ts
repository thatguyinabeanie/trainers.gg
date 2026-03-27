/**
 * ELO Rating System E2E Tests
 *
 * Verifies the per-match ELO trigger by running an 8-player, 3-round Swiss
 * tournament (no top cut) and asserting that player_ratings rows are created
 * with correct values.
 *
 * Pattern mirrors full-tournament.spec.ts:
 *   - TO browser (Playwright): round management UI
 *   - Admin Supabase client: bulk setup (register, check-in, start)
 *   - Per-user Supabase clients: match result reporting (RLS-enforced)
 *
 * Assertions (after all rounds complete):
 *   1. player_ratings rows exist for all players ('overall' format)
 *   2. Ratings have diverged from starting 1200 (winners up, losers down)
 *   3. peak_rating >= rating for every player (monotonic invariant)
 *   4. skill_bracket is consistent with the computed rating
 *   5. Format-specific rows also exist alongside 'overall'
 *   6. /api/players/rating endpoint returns the correct shape
 *   7. Global rank is 1 for the highest-rated player
 *
 * Environment variables:
 *   TOURNAMENT_SIM_SKIP_CLEANUP=1  → leave tournament in DB after test
 *   TOURNAMENT_SIM_SEED=N          → override random seed for match results
 */

import { test, expect } from "@playwright/test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminSupabaseClient } from "@trainers/supabase";
import type { Database } from "@trainers/supabase/types";
import { loginViaUI, TEST_USERS } from "../../fixtures/auth";
import { TournamentSimulator } from "../../fixtures/tournament-simulator";

const hasSupabaseAdmin =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.SUPABASE_SERVICE_ROLE_KEY;

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("ELO Rating System", () => {
  test.skip(
    !hasSupabaseAdmin,
    "Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
  );

  let sim: TournamentSimulator;
  let adminClient: SupabaseClient<Database>;

  const SWISS_ROUNDS = 3;

  test.beforeAll(async () => {
    adminClient = createAdminSupabaseClient();

    sim = new TournamentSimulator({
      playerCount: 8,
      swissRounds: SWISS_ROUNDS,
      topCutSize: 0,
    });

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

  // 3-minute timeout
  test.setTimeout(180_000);

  test("ELO ratings update after a 3-round Swiss tournament", async ({
    page,
    request,
  }) => {
    await loginViaUI(page, TEST_USERS.admin);
    await page.goto(sim.managementUrl);
    await page.waitForLoadState("networkidle");

    // Dismiss cookie consent if present
    const cookieAcceptBtn = page.getByRole("button", { name: "Accept" });
    if (
      await cookieAcceptBtn.isVisible({ timeout: 2_000 }).catch(() => false)
    ) {
      await cookieAcceptBtn.click();
    }

    // ── SWISS ROUNDS ──────────────────────────────────────────────────────────
    for (let round = 1; round <= SWISS_ROUNDS; round++) {
      // TO clicks "Start Round N" to create pairings
      await page
        .getByRole("button", { name: `Start Round ${round}` })
        .click({ timeout: 30_000 });

      // Wait for pairings preview
      await page
        .getByText(`Round ${round} Preview`)
        .waitFor({ timeout: 30_000 });

      // Confirm & Start
      const confirmBtn = page.getByRole("button", { name: /Confirm & Start/ });
      await confirmBtn.waitFor({ state: "visible", timeout: 10_000 });
      await confirmBtn.click();

      // Wait for round to become active (or error)
      const errorToast = page.locator('[data-sonner-toast][data-type="error"]');
      const inProgressText = page.getByText(`Round ${round} in Progress`);
      const result = await Promise.race([
        inProgressText
          .waitFor({ timeout: 30_000 })
          .then(() => "in_progress" as const),
        errorToast
          .first()
          .waitFor({ timeout: 30_000 })
          .then(async () => {
            const text = await errorToast.first().textContent();
            return `error: ${text}` as const;
          }),
      ]);
      if (result !== "in_progress") {
        throw new Error(
          `Round ${round} failed to start. ${result}. URL: ${page.url()}`
        );
      }

      // Fetch matches and report results (triggers ELO per match)
      const currentRound = await sim.getCurrentRound(sim.swissPhaseId_);
      if (!currentRound) throw new Error(`Round ${round} not found`);
      await sim.fetchRoundMatches(currentRound.id);
      await sim.reportMatchResults(round);

      // Reload to pick up match completion state
      await page.reload();
      await page.waitForLoadState("networkidle");

      // Complete round
      await expect(
        page.getByRole("button", { name: "Complete Round" })
      ).toBeEnabled({ timeout: 30_000 });
      await page.getByRole("button", { name: "Complete Round" }).click();

      if (round < SWISS_ROUNDS) {
        await page
          .getByRole("button", { name: `Start Round ${round + 1}` })
          .waitFor({ timeout: 30_000 });
      } else {
        await page
          .getByText(`Round ${round} Complete`)
          .waitFor({ timeout: 30_000 });
      }
    }

    // ── ELO ASSERTIONS ────────────────────────────────────────────────────────
    // ELO fires per-match (BEFORE UPDATE OF status trigger), so all ratings
    // should be written by this point.

    const altIds = sim.activePlayers.map((p) => p.altId);

    // 1. Every player has an 'overall' rating row
    const { data: overallRatings, error: overallErr } = await adminClient
      .from("player_ratings")
      .select(
        "alt_id, format, rating, peak_rating, games_played, skill_bracket"
      )
      .eq("format", "overall")
      .in("alt_id", altIds);

    expect(overallErr).toBeNull();
    expect(overallRatings?.length).toBe(altIds.length);

    // 2. Ratings have diverged: at least one winner above 1200, one loser below
    const ratings = (overallRatings ?? []).map((r) => Number(r.rating));
    expect(ratings.some((r) => r > 1200)).toBe(true);
    expect(ratings.some((r) => r < 1200)).toBe(true);

    // 3. Everyone played at least 1 game
    for (const r of overallRatings ?? []) {
      expect(r.games_played).toBeGreaterThan(0);
    }

    // 4. peak_rating >= rating (monotonic invariant — never rolled back)
    for (const r of overallRatings ?? []) {
      expect(Number(r.peak_rating)).toBeGreaterThanOrEqual(Number(r.rating));
    }

    // 5. skill_bracket is consistent with rating thresholds
    for (const r of overallRatings ?? []) {
      const rating = Number(r.rating);
      if (rating >= 1800) expect(r.skill_bracket).toBe("expert");
      else if (rating >= 1500) expect(r.skill_bracket).toBe("advanced");
      else if (rating >= 1200) expect(r.skill_bracket).toBe("intermediate");
      else expect(r.skill_bracket).toBe("beginner");
    }

    // 6. Format-specific ratings also exist (trigger creates both)
    const { data: allFormats } = await adminClient
      .from("player_ratings")
      .select("format")
      .in("alt_id", altIds);

    const uniqueFormats = new Set((allFormats ?? []).map((r) => r.format));
    expect(uniqueFormats.has("overall")).toBe(true);
    // The tournament's format column creates a second entry
    expect(uniqueFormats.size).toBeGreaterThanOrEqual(2);

    // 7. API endpoint returns correct shape for a player
    const sampleAltId = altIds[0]!;
    const apiRes = await request.get(
      `/api/players/rating?altId=${sampleAltId}&format=overall`
    );
    expect(apiRes.status()).toBe(200);

    const ratingBody = await apiRes.json();
    expect(ratingBody).not.toBeNull();
    expect(ratingBody.altId).toBe(sampleAltId);
    expect(ratingBody.format).toBe("overall");
    expect(typeof ratingBody.rating).toBe("number");
    expect(typeof ratingBody.peakRating).toBe("number");
    expect(typeof ratingBody.gamesPlayed).toBe("number");
    expect(["beginner", "intermediate", "advanced", "expert"]).toContain(
      ratingBody.skillBracket
    );
    expect(ratingBody.globalRank).toBeGreaterThanOrEqual(1);

    // 8. Global rank is 1 for the highest-rated player
    const { data: topRated } = await adminClient
      .from("player_ratings")
      .select("alt_id, rating")
      .eq("format", "overall")
      .in("alt_id", altIds)
      .order("rating", { ascending: false })
      .limit(1);

    const topAlt = topRated?.[0];
    expect(topAlt).toBeDefined();

    const topRes = await request.get(
      `/api/players/rating?altId=${topAlt!.alt_id}&format=overall`
    );
    const topBody = await topRes.json();
    expect(topBody.globalRank).toBe(1);

    // 9. API returns null for an unrated alt (non-existent ID)
    const unknownRes = await request.get(
      "/api/players/rating?altId=999999&format=overall"
    );
    expect(unknownRes.status()).toBe(200);
    expect(await unknownRes.json()).toBeNull();

    // 10. API returns 400 when altId is missing
    const badRes = await request.get("/api/players/rating");
    expect(badRes.status()).toBe(400);

    console.log(
      `[ELO] Verified ratings for ${altIds.length} players. ` +
        `Top rating: ${topAlt?.rating}, formats: ${[...uniqueFormats].join(", ")}`
    );
  });
});
