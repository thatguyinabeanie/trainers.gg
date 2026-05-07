/**
 * Host/TO Actions — UI-driven via Playwright
 *
 * The host (Tournament Organizer) creates the tournament,
 * manages rounds, and reads pairings/standings from the UI.
 */

import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@trainers/supabase/types";
import { startTournamentEnhanced } from "@trainers/supabase";
import type { Pairing, TestUser, TournamentConfig } from "./types";

const DEFAULT_TIMEOUT = 30_000;

/**
 * Log in as the host/TO user.
 */
export async function loginAsHost(page: Page, host: TestUser): Promise<void> {
  await page.goto("/sign-in");
  await page.getByRole("button", { name: /continue with email/i }).click();
  await page.getByLabel("Email or Username").waitFor({ state: "visible" });
  await page.getByLabel("Email or Username").fill(host.email);
  await page.locator('input[name="password"]').fill(host.password);
  await page
    .getByRole("main")
    .getByRole("button", { name: /sign in/i })
    .click();

  await page.waitForURL((url) => !url.pathname.includes("/sign-in"), {
    timeout: 15_000,
  });
}

/**
 * Create a tournament via the dashboard UI.
 * Returns the tournament slug for use in subsequent operations.
 *
 * Wires scenario config fields into the multi-step wizard:
 * - Step 1: Basic Info (name)
 * - Step 2: Format (preset, bestOf, plannedRounds, roundTimeMinutes per phase)
 * - Step 3: Registration (maxParticipants)
 * - Step 4: Schedule (skipped — defaults are fine)
 * - Step 5: Review → Create
 */
export async function createTournament(
  page: Page,
  config: TournamentConfig
): Promise<string> {
  // Navigate to tournament creation page
  await page.goto(
    `/dashboard/community/${config.community}/tournaments/create`
  );
  await page.waitForLoadState("networkidle");

  // -- Step 1: Basic Info --
  const nameInput = page.getByLabel("Tournament Name");
  await nameInput.waitFor({ state: "visible", timeout: DEFAULT_TIMEOUT });
  await nameInput.fill(config.name);

  // The slug auto-generates from the name — wait for it
  await page.waitForTimeout(500);

  // Select format preset
  if (config.format === "swiss_only") {
    await page.getByText("Swiss Only").click();
  }
  // Default is swiss_with_cut which should already be selected

  // Click Next to go to Step 2: Format
  const nextBtn = page.getByRole("button", { name: /next|continue/i });
  if (await nextBtn.isVisible().catch(() => false)) {
    await nextBtn.click();
  }

  // -- Step 2: Format (phase settings) --
  await page.waitForTimeout(500);

  // Set best-of for the Swiss phase (ButtonGroup with buttons "1", "3", "5")
  if (config.bestOf !== 3) {
    // Default is BO3, only click if different
    const bestOfBtn = page.getByRole("button", {
      name: new RegExp(`^${config.bestOf}$`),
      exact: true,
    });
    if (await bestOfBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await bestOfBtn.click();
    }
  }

  // Set planned rounds if specified (Swiss phase only)
  if (config.rounds) {
    const roundsInput = page.locator('input[id$="-rounds"]').first();
    if (await roundsInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await roundsInput.clear();
      await roundsInput.fill(String(config.rounds));
    }
  }

  // Set round time if specified
  if (config.roundTimeMinutes !== undefined) {
    const timerInput = page.locator('input[id$="-timer"]').first();
    if (await timerInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await timerInput.clear();
      await timerInput.fill(String(config.roundTimeMinutes));
    }
  }

  // Click Next to go to Step 3: Registration
  if (await nextBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await nextBtn.click();
  }

  // -- Step 3: Registration --
  await page.waitForTimeout(500);

  // Set max participants if specified
  if (config.maxParticipants) {
    // Enable player cap switch
    const capSwitch = page.locator("#playerCap");
    if (await capSwitch.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await capSwitch.click();
      await page.waitForTimeout(300);
    }
    // Fill max participants
    const maxInput = page.locator("#maxParticipants");
    if (await maxInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await maxInput.clear();
      await maxInput.fill(String(config.maxParticipants));
    }
  }

  // Click Next to go to Step 4: Schedule
  if (await nextBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await nextBtn.click();
  }

  // -- Step 4: Schedule (skip — use defaults) --
  if (await nextBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await nextBtn.click();
  }

  // -- Step 5: Review → Create --
  const createBtn = page.getByRole("button", { name: /create tournament/i });
  await createBtn.waitFor({ state: "visible", timeout: DEFAULT_TIMEOUT });
  await createBtn.click();

  // Wait for redirect to the management page
  await page.waitForURL(/\/manage/, { timeout: DEFAULT_TIMEOUT });

  // Extract tournament slug from URL
  const url = page.url();
  const slugMatch = url.match(/\/tournaments\/([^/]+)\/manage/);
  if (!slugMatch) {
    throw new Error(`Could not extract tournament slug from URL: ${url}`);
  }

  return slugMatch[1]!;
}

/**
 * Open registration for the tournament (publish it).
 * Navigates to the management page and clicks publish/open registration.
 */
export async function openRegistration(
  page: Page,
  communitySlug: string,
  tournamentSlug: string
): Promise<void> {
  await page.goto(
    `/dashboard/community/${communitySlug}/tournaments/${tournamentSlug}/manage`
  );
  await page.waitForLoadState("networkidle");

  // Look for publish/open registration button
  const publishBtn = page.getByRole("button", {
    name: /publish|open registration/i,
  });
  if (await publishBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await publishBtn.click();
    await page.waitForTimeout(1_000);
  }
}

/**
 * Activate the tournament via Supabase — transitions from upcoming → active.
 *
 * There is no UI button for this step (the startTournament server action exists
 * but is not wired to any manage-page control). We call the mutation directly,
 * matching the pattern used by tournament-simulator.ts.
 *
 * Also deletes phantom rounds pre-created by startTournamentEnhanced so the
 * UI's "Start Round 1" button works correctly.
 *
 * If `checkInTimeMinutes` is specified in config, updates all phases to use
 * that value (not exposed in the creation wizard UI, so must be set via DB).
 */
export async function activateTournament(
  host: TestUser,
  tournamentSlug: string,
  config?: TournamentConfig
): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY — " +
        "required for activateTournament (no UI button exists for this step)"
    );
  }

  // Production safety: prevent accidental mutations against prod database
  assertNotProductionDatabase(supabaseUrl);

  // Create a Supabase client authenticated as the host
  const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: authError } = await supabase.auth.signInWithPassword({
    email: host.email,
    password: host.password,
  });
  if (authError) {
    throw new Error(`Host sign-in failed: ${authError.message}`);
  }

  // Look up tournament ID from slug
  const { data: tournament, error: lookupError } = await supabase
    .from("tournaments")
    .select("id")
    .eq("slug", tournamentSlug)
    .single();

  if (lookupError || !tournament) {
    throw new Error(
      `Tournament lookup failed for slug "${tournamentSlug}": ${lookupError?.message}`
    );
  }

  // Start the tournament (sets status = active, locks teams, activates phase)
  await startTournamentEnhanced(supabase, tournament.id);

  // startTournamentEnhanced pre-creates Round 1 as pending with 0 matches.
  // The UI's prepareRound flow (RoundCommandCenter) expects to create rounds
  // from scratch via createRound(). Delete phantom rounds so the UI shows
  // "Start Round 1" instead of "Start Round 2".
  const { data: phases, error: phasesError } = await supabase
    .from("tournament_phases")
    .select("id")
    .eq("tournament_id", tournament.id);

  if (phasesError) {
    throw new Error(
      `Failed to fetch phases for tournament ${tournament.id}: ${phasesError.message}`
    );
  }

  if (phases?.length) {
    for (const phase of phases) {
      const { data: phantomRounds, error: roundsError } = await supabase
        .from("tournament_rounds")
        .select("id")
        .eq("phase_id", phase.id);

      if (roundsError) {
        throw new Error(
          `Failed to fetch rounds for phase ${phase.id}: ${roundsError.message}`
        );
      }

      if (phantomRounds?.length) {
        for (const round of phantomRounds) {
          const { error: deleteError } = await supabase
            .from("tournament_rounds")
            .delete()
            .eq("id", round.id);

          if (deleteError) {
            throw new Error(
              `Failed to delete phantom round ${round.id}: ${deleteError.message}`
            );
          }
        }
      }
    }
  }

  // Set check-in time on all phases if configured.
  // This field is not exposed in the creation wizard — must be set via DB.
  // A short value (e.g., 1 min) ensures no-show auto-awards resolve quickly.
  const checkInMinutes = config?.checkInTimeMinutes;
  if (checkInMinutes !== undefined && phases?.length) {
    for (const phase of phases) {
      const { error: updateError } = await supabase
        .from("tournament_phases")
        .update({ check_in_time_minutes: checkInMinutes })
        .eq("id", phase.id);

      if (updateError) {
        throw new Error(
          `Failed to set check_in_time_minutes on phase ${phase.id}: ${updateError.message}`
        );
      }
    }
  }

  // Sign out to clean up the client
  await supabase.auth.signOut().catch(() => {});
}

/**
 * Fail-closed production database guard.
 * Matches the pattern from tournament-simulator.ts.
 */
function assertNotProductionDatabase(supabaseUrl: string): void {
  // Localhost URLs are never production — local dev/CI with `supabase start`
  if (
    /(^|\/\/)(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|\/|$)/i.test(supabaseUrl)
  ) {
    return;
  }

  const productionRef = process.env.SUPABASE_PRODUCTION_PROJECT_REF;
  // Fail-closed: if we can't verify, block rather than assume safe
  if (!productionRef) {
    throw new Error(
      "Tournament runner BLOCKED: SUPABASE_PRODUCTION_PROJECT_REF is not set — " +
        "cannot verify this is not the production database."
    );
  }

  const match = supabaseUrl.match(/https:\/\/([a-z0-9]+)\.supabase\.co/i);
  const currentRef = match?.[1];
  if (!currentRef) {
    throw new Error(
      "Tournament runner BLOCKED: could not extract Supabase project ref from " +
        `NEXT_PUBLIC_SUPABASE_URL (${supabaseUrl || "<empty>"}) — ` +
        "cannot verify this is not the production database."
    );
  }

  if (currentRef === productionRef) {
    throw new Error(
      "Tournament runner BLOCKED: connected to production database " +
        `(ref: ${currentRef}). Aborting to prevent production pollution.`
    );
  }
}

/**
 * Start a round from the management UI.
 * Clicks "Start Round N" → reads pairings from the preview table →
 * clicks "Confirm & Start" → waits for round active.
 *
 * Returns the pairings read from the preview (the preview table disappears
 * after confirming, so we must capture pairings before clicking "Confirm & Start").
 */
export async function startRound(
  page: Page,
  communitySlug: string,
  tournamentSlug: string,
  roundNumber: number
): Promise<Pairing[]> {
  await page.goto(
    `/dashboard/community/${communitySlug}/tournaments/${tournamentSlug}/manage`
  );
  await page.waitForLoadState("networkidle");

  // Dismiss cookie consent if present
  const cookieBtn = page.getByRole("button", { name: "Accept" });
  if (await cookieBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await cookieBtn.click();
  }

  // Click "Start Round N"
  await page
    .getByRole("button", { name: `Start Round ${roundNumber}` })
    .click({ timeout: DEFAULT_TIMEOUT });

  // Wait for pairings preview card
  await page
    .getByText(`Round ${roundNumber} Preview`)
    .waitFor({ timeout: DEFAULT_TIMEOUT });

  // Read pairings from the preview table BEFORE confirming
  // The preview table has 3 columns: Table | Player 1 | Player 2
  // Rows are <tr className="border-t"> inside <tbody>
  const pairings = await page.evaluate(() => {
    const results: Array<{
      table: number;
      player1: string;
      player2: string | null;
    }> = [];

    // Target the preview table's data rows (skip the thead row)
    const rows = document.querySelectorAll(
      "table.w-full tbody tr"
    );

    rows.forEach((row) => {
      const cells = row.querySelectorAll("td");
      if (cells.length >= 3) {
        const tableText = cells[0]?.textContent?.trim() ?? "";
        const p1 = cells[1]?.textContent?.trim() ?? "";
        const p2 = cells[2]?.textContent?.trim() ?? "";

        // Skip rows with empty player1
        if (!p1) return;

        // Parse table number from "Table N" or use row index
        const tableMatch = tableText.match(/Table\s+(\d+)/i);
        const tableNum = tableMatch ? parseInt(tableMatch[1]!, 10) : 0;
        const isBye = tableText === "BYE" || p2 === "BYE" || p2 === "";

        results.push({
          table: tableNum,
          player1: p1,
          player2: isBye ? null : p2,
        });
      }
    });

    return results;
  });

  // Confirm & Start
  const confirmBtn = page.getByRole("button", { name: /Confirm & Start/ });
  await confirmBtn.waitFor({ state: "visible", timeout: 10_000 });
  await confirmBtn.click();

  // Wait for round to be active
  await page
    .getByText(`Round ${roundNumber} in Progress`)
    .waitFor({ timeout: DEFAULT_TIMEOUT });

  return pairings;
}

/**
 * Complete the current round from the management UI.
 * Waits for all matches to be completed, then clicks "Complete Round".
 *
 * @param timeoutMs How long to wait for all matches to finish (ms).
 *   Default 60s is fine when all players report normally.
 *   For rounds with no-shows, pass a higher value:
 *   `bestOf × checkInTimeMinutes × 60_000 + buffer`
 *   so the auto-award timer has time to expire.
 */
export async function completeRound(
  page: Page,
  communitySlug: string,
  tournamentSlug: string,
  timeoutMs: number = 60_000
): Promise<void> {
  await page.goto(
    `/dashboard/community/${communitySlug}/tournaments/${tournamentSlug}/manage`
  );
  await page.waitForLoadState("networkidle");

  // Wait for "Complete Round" to be enabled (all matches done)
  const completeBtn = page.getByRole("button", { name: "Complete Round" });
  await completeBtn.waitFor({ state: "visible", timeout: timeoutMs });
  await expect(completeBtn).toBeEnabled({ timeout: timeoutMs });
  await completeBtn.click({ timeout: DEFAULT_TIMEOUT });

  // Wait for round completion confirmation
  await page.waitForTimeout(3_000);
}

/**
 * Read standings from the tournament page.
 * Returns usernames in standing order.
 */
export async function readStandings(
  page: Page,
  tournamentSlug: string
): Promise<string[]> {
  await page.goto(`/tournaments/${tournamentSlug}`);
  await page.waitForLoadState("networkidle");

  // Navigate to standings tab if needed
  const standingsTab = page.getByRole("tab", { name: /standings/i });
  if (await standingsTab.isVisible().catch(() => false)) {
    await standingsTab.click();
    await page.waitForTimeout(1_000);
  }

  // Extract standings from the page
  const standings = await page.evaluate(() => {
    const usernames: string[] = [];
    // Standings typically displayed as a table or list with rank + player name
    const rows = document.querySelectorAll(
      '[class*="standing"] tr, [class*="ranking"] li, table tbody tr'
    );
    rows.forEach((row) => {
      // Look for username-like text (the player alt name)
      const usernameEl = row.querySelector(
        '[class*="username"], [class*="player"], a[href*="/profile/"]'
      );
      if (usernameEl) {
        const text = usernameEl.textContent?.trim();
        if (text) usernames.push(text);
      }
    });
    return usernames;
  });

  return standings;
}
