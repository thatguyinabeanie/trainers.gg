/**
 * Player Actions — UI-driven via Playwright
 *
 * Each function operates on a player's isolated Page instance.
 * All actions wait for deterministic UI state before proceeding —
 * no networkidle or fixed sleeps.
 */

import type { Page } from "@playwright/test";
import type { TestUser } from "./types";

const DEFAULT_TIMEOUT = 30_000;

/**
 * Log in through the UI as the given user.
 * Navigates to /sign-in, fills credentials, waits for redirect.
 */
export async function login(page: Page, user: TestUser): Promise<void> {
  await page.goto("/sign-in");
  await page.getByRole("button", { name: /continue with email/i }).click();
  await page.getByLabel("Email or Username").waitFor({ state: "visible" });
  await page.getByLabel("Email or Username").fill(user.email);
  await page.locator('input[name="password"]').fill(user.password);
  await page
    .getByRole("main")
    .getByRole("button", { name: /sign in/i })
    .click();

  try {
    await page.waitForURL((url) => !url.pathname.includes("/sign-in"), {
      timeout: 15_000,
    });
  } catch {
    throw new Error(
      `Login failed for "${user.email}" — timed out waiting for redirect away from /sign-in. ` +
        `Check that test users are seeded (run pnpm db:reset).`
    );
  }
}

/**
 * Register for a tournament.
 * Assumes player is logged in and navigates to the tournament page.
 */
export async function registerForTournament(
  page: Page,
  tournamentSlug: string
): Promise<void> {
  await page.goto(`/tournaments/${tournamentSlug}`);

  // Wait for the Register button (deterministic — no networkidle)
  await page
    .getByRole("button", { name: "Register" })
    .click({ timeout: DEFAULT_TIMEOUT });

  // Confirm registration in the modal
  await page
    .getByRole("button", { name: "Confirm Registration" })
    .click({ timeout: DEFAULT_TIMEOUT });

  // Wait for success state
  await page
    .locator('[data-testid="registration-success-state"]')
    .waitFor({ timeout: DEFAULT_TIMEOUT });
}

/**
 * Submit a team by pasting Showdown export text.
 * Assumes player is on the tournament page and already registered.
 */
export async function submitTeam(
  page: Page,
  tournamentSlug: string,
  teamPaste: string
): Promise<void> {
  await page.goto(`/tournaments/${tournamentSlug}`);

  // Wait for the Paste Team button (deterministic — no networkidle)
  await page
    .getByRole("button", { name: "Paste Team" })
    .click({ timeout: DEFAULT_TIMEOUT });

  // Fill the textarea with the team paste
  const textarea = page.locator("textarea");
  await textarea.waitFor({ state: "visible", timeout: DEFAULT_TIMEOUT });
  await textarea.fill(teamPaste);

  // Click "Submit Team"
  await page
    .getByRole("button", { name: "Submit Team" })
    .click({ timeout: DEFAULT_TIMEOUT });

  // Wait for the team to be accepted (textarea disappears, team preview shows)
  await textarea.waitFor({ state: "hidden", timeout: DEFAULT_TIMEOUT });
}

/**
 * Check in to the tournament.
 * Assumes player is on the tournament page with a team submitted.
 */
export async function checkInToTournament(
  page: Page,
  tournamentSlug: string
): Promise<void> {
  await page.goto(`/tournaments/${tournamentSlug}`);

  // Wait for Check In button (deterministic — no networkidle)
  await page
    .getByRole("button", { name: "Check In" })
    .click({ timeout: DEFAULT_TIMEOUT });

  // Wait for check-in confirmation (button changes to "Undo Check-In")
  await page
    .getByRole("button", { name: "Undo Check-In" })
    .waitFor({ timeout: DEFAULT_TIMEOUT });
}

/**
 * Navigate to the player's current match and check in.
 * Uses the "Go to Match" banner on the tournament page.
 */
export async function checkInToMatch(
  page: Page,
  tournamentSlug: string
): Promise<void> {
  await page.goto(`/tournaments/${tournamentSlug}`);

  // Wait for match banner (deterministic — no networkidle)
  const matchLink = page.locator('a:has-text("Go to Match")');
  await matchLink.waitFor({ state: "visible", timeout: DEFAULT_TIMEOUT });
  await matchLink.click();

  // Wait for match page by looking for the Ready button (deterministic)
  const readyBtn = page.getByRole("button", { name: "Ready" });
  // May already be checked in (e.g. auto check-in) — only click if visible
  const isVisible = await readyBtn
    .isVisible({ timeout: 5_000 })
    .catch(() => false);
  if (isVisible) {
    await readyBtn.click();
  }
}

/**
 * Report game results for a match.
 * Assumes player is on the match page and checked in.
 * Clicks "Won" or "Lost" for each game in sequence.
 *
 * Between games, waits for the clicked button to disappear (indicating
 * the game result was processed and the next game's UI is loading) rather
 * than using a fixed sleep.
 */
export async function reportGames(
  page: Page,
  games: ("won" | "lost")[]
): Promise<void> {
  for (let i = 0; i < games.length; i++) {
    const result = games[i]!;
    const btnName = result === "won" ? "Won" : "Lost";

    // Wait for the report button to be available (match must be active)
    const btn = page.getByRole("button", { name: btnName }).first();
    await btn.waitFor({ state: "visible", timeout: DEFAULT_TIMEOUT });
    await btn.click();

    // After reporting, wait for the button to disappear (UI transitions to
    // next game or match completion). Skip for the last game — no next state.
    if (i < games.length - 1) {
      await btn.waitFor({ state: "hidden", timeout: 10_000 }).catch(() => {
        // Non-fatal: if the button doesn't disappear, the next iteration's
        // waitFor({ state: "visible" }) will still handle the transition.
        console.warn(
          `[reportGames] Button "${btnName}" did not disappear after game ${i + 1} — continuing`
        );
      });
    }
  }
}

/**
 * Navigate to match and report games (combined flow).
 * Handles: go to tournament → find match → check in → report.
 */
export async function checkInAndReport(
  page: Page,
  tournamentSlug: string,
  games: ("won" | "lost")[]
): Promise<void> {
  await page.goto(`/tournaments/${tournamentSlug}`);

  // Wait for match banner (deterministic — no networkidle)
  const matchLink = page.locator('a:has-text("Go to Match")');
  await matchLink.waitFor({ state: "visible", timeout: DEFAULT_TIMEOUT });
  await matchLink.click();

  // Wait for match page by looking for Ready button or game report buttons
  const readyBtn = page.getByRole("button", { name: "Ready" });
  const readyVisible = await readyBtn
    .isVisible({ timeout: 5_000 })
    .catch(() => false);
  if (readyVisible) {
    await readyBtn.click();
    // Wait for match to become active — first game report button appears
    const firstGameBtn = page.getByRole("button", { name: /Won|Lost/ }).first();
    await firstGameBtn.waitFor({ state: "visible", timeout: DEFAULT_TIMEOUT });
  }

  // Report games
  await reportGames(page, games);
}

/**
 * Drop from the tournament.
 * Navigates to tournament page and clicks the drop/withdraw button.
 */
export async function dropFromTournament(
  page: Page,
  tournamentSlug: string
): Promise<void> {
  await page.goto(`/tournaments/${tournamentSlug}`);

  // Wait for drop button (deterministic — no networkidle)
  const dropBtn = page.getByRole("button", { name: /drop|withdraw/i });
  await dropBtn.waitFor({ state: "visible", timeout: DEFAULT_TIMEOUT });
  await dropBtn.click();

  // Confirm the drop if there's a confirmation dialog
  const confirmBtn = page.getByRole("button", { name: /confirm/i });
  const confirmVisible = await confirmBtn
    .isVisible({ timeout: 3_000 })
    .catch(() => false);
  if (confirmVisible) {
    await confirmBtn.click();
  }
}
