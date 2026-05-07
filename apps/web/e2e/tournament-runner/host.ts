/**
 * Host/TO Actions — UI-driven via Playwright
 *
 * The host (Tournament Organizer) creates the tournament,
 * manages rounds, and reads pairings/standings from the UI.
 */

import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
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

  // Fill tournament name
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

  // Submit the form (multi-step wizard — click through steps)
  // Step 1: Format — click Next/Continue
  const nextBtn = page.getByRole("button", { name: /next|continue/i });
  if (await nextBtn.isVisible().catch(() => false)) {
    await nextBtn.click();
  }

  // Step 2: Registration settings — click Next/Continue
  if (await nextBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await nextBtn.click();
  }

  // Step 3: Schedule — click Next/Continue
  if (await nextBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await nextBtn.click();
  }

  // Final step: Review — click Create
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
 * Open check-in for the tournament.
 * This may be automatic or require a button click depending on settings.
 */
export async function openCheckIn(
  page: Page,
  communitySlug: string,
  tournamentSlug: string
): Promise<void> {
  await page.goto(
    `/dashboard/community/${communitySlug}/tournaments/${tournamentSlug}/manage`
  );
  await page.waitForLoadState("networkidle");

  const checkInBtn = page.getByRole("button", { name: /open check-in/i });
  if (await checkInBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await checkInBtn.click();
    await page.waitForTimeout(1_000);
  }
}

/**
 * Start a round from the management UI.
 * Clicks "Start Round N" → waits for preview → clicks "Confirm & Start".
 */
export async function startRound(
  page: Page,
  communitySlug: string,
  tournamentSlug: string,
  roundNumber: number
): Promise<void> {
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

  // Wait for pairings preview
  await page
    .getByText(`Round ${roundNumber} Preview`)
    .waitFor({ timeout: DEFAULT_TIMEOUT });

  // Confirm & Start
  const confirmBtn = page.getByRole("button", { name: /Confirm & Start/ });
  await confirmBtn.waitFor({ state: "visible", timeout: 10_000 });
  await confirmBtn.click();

  // Wait for round to be active
  await page
    .getByText(`Round ${roundNumber} in Progress`)
    .waitFor({ timeout: DEFAULT_TIMEOUT });
}

/**
 * Complete the current round from the management UI.
 * Waits for all matches to be completed, then clicks "Complete Round".
 */
export async function completeRound(
  page: Page,
  communitySlug: string,
  tournamentSlug: string
): Promise<void> {
  await page.goto(
    `/dashboard/community/${communitySlug}/tournaments/${tournamentSlug}/manage`
  );
  await page.waitForLoadState("networkidle");

  // Wait for "Complete Round" to be enabled (all matches done)
  const completeBtn = page.getByRole("button", { name: "Complete Round" });
  await completeBtn.waitFor({ state: "visible", timeout: 60_000 });
  await expect(completeBtn).toBeEnabled({ timeout: 60_000 });
  await completeBtn.click({ timeout: DEFAULT_TIMEOUT });

  // Wait for round completion confirmation
  await page.waitForTimeout(3_000);
}

/**
 * Read pairings from the management UI for the current round.
 * Parses the pairings table/list to extract player matchups.
 */
export async function readPairings(
  page: Page,
  communitySlug: string,
  tournamentSlug: string
): Promise<Pairing[]> {
  await page.goto(
    `/dashboard/community/${communitySlug}/tournaments/${tournamentSlug}/manage`
  );
  await page.waitForLoadState("networkidle");

  // Extract pairings from the page
  // The pairings are displayed in the tournament management view
  // We need to parse the match list to get player names and table numbers
  const pairings = await page.evaluate(() => {
    const results: Array<{
      table: number;
      player1: string;
      player2: string | null;
    }> = [];

    // Look for match rows in the pairings section
    // Each match row typically shows: Table # | Player 1 | vs | Player 2
    const matchRows = document.querySelectorAll(
      '[data-match-row], [class*="match"], tr[class*="pairing"]'
    );

    if (matchRows.length === 0) {
      // Fallback: try to find match info from the round display
      // The exact structure depends on the RoundCommandCenter component
      const matchElements = document.querySelectorAll(
        '[class*="table"], [class*="pairing"]'
      );
      matchElements.forEach((el, i) => {
        const text = el.textContent ?? "";
        // Try to parse "username1 vs username2" patterns
        const vsMatch = text.match(/(\w+)\s+vs\.?\s+(\w+)/);
        if (vsMatch) {
          results.push({
            table: i + 1,
            player1: vsMatch[1]!,
            player2: vsMatch[2]!,
          });
        }
      });
    } else {
      matchRows.forEach((row, i) => {
        const cells = row.querySelectorAll("td, [class*='player']");
        if (cells.length >= 2) {
          results.push({
            table: i + 1,
            player1: cells[0]?.textContent?.trim() ?? "",
            player2: cells[1]?.textContent?.trim() ?? null,
          });
        }
      });
    }

    return results;
  });

  return pairings;
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
