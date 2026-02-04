import { type Page, expect } from "@playwright/test";

// Seeded test users from packages/supabase/supabase/seeds/03_users.sql
export const TEST_USERS = {
  admin: {
    email: "admin@trainers.local",
    username: "admin_trainer",
    password: "Password123!",
  },
  player: {
    email: "player@trainers.local",
    username: "ash_ketchum",
    password: "Password123!",
  },
  champion: {
    email: "champion@trainers.local",
    username: "cynthia",
    password: "Password123!",
  },
  gymLeader: {
    email: "gymleader@trainers.local",
    username: "brock",
    password: "Password123!",
  },
} as const;

/**
 * Log in through the UI with the given credentials.
 * Navigates to /sign-in, fills the form, and submits.
 * Throws with an actionable error message if login fails.
 */
export async function loginViaUI(
  page: Page,
  user: { email: string; password: string }
): Promise<void> {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: /sign in/i }).click();

  // Detect login errors instead of silently timing out
  const errorLocator = page.locator(
    '[role="alert"], .text-destructive, [data-error]'
  );
  const navigationPromise = page.waitForURL(
    (url) => !url.pathname.includes("/sign-in"),
    { timeout: 15000 }
  );

  // Race: either we navigate away (success) or an error appears
  const result = await Promise.race([
    navigationPromise.then(() => "navigated" as const),
    errorLocator
      .waitFor({ state: "visible", timeout: 15000 })
      .then(() => "error" as const)
      .catch(() => null),
  ]);

  if (result === "error") {
    const errorText = await errorLocator.textContent();
    throw new Error(
      `Login failed for ${user.email}: ${errorText ?? "Unknown error displayed on page"}`
    );
  }

  // Verify we actually left the sign-in page
  await expect(page).not.toHaveURL(/sign-in/);
}
