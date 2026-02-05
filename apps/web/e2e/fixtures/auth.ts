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
 * Navigates to /sign-in, clicks "Continue with Email",
 * fills the form, and submits. Waits for navigation away
 * from the sign-in page as the success signal.
 */
export async function loginViaUI(
  page: Page,
  user: { email: string; password: string }
): Promise<void> {
  await page.goto("/sign-in");

  // The default sign-in page shows a username field + social buttons.
  // Click "Continue with Email" to reveal the email/password form.
  await page.getByRole("button", { name: /continue with email/i }).click();

  // Wait for the email form to be ready
  await page.getByLabel("Email or Username").waitFor({ state: "visible" });

  await page.getByLabel("Email or Username").fill(user.email);
  await page.getByLabel("Password").fill(user.password);

  // Scope to main to avoid matching the nav "Sign In" link/button
  await page
    .getByRole("main")
    .getByRole("button", { name: /sign in/i })
    .click();

  // Wait for navigation away from sign-in page
  try {
    await page.waitForURL((url) => !url.pathname.includes("/sign-in"), {
      timeout: 15000,
    });
  } catch (error) {
    // Navigation didn't happen — gather diagnostics
    const url = page.url();
    const alertLocator = page.getByRole("alert");
    const alertText = await alertLocator
      .textContent({ timeout: 2000 })
      .catch(() => null);

    throw new Error(
      [
        `Login failed for ${user.email}`,
        `Current URL: ${url}`,
        alertText
          ? `Error on page: ${alertText.trim()}`
          : "No error message visible on page (seeded test users may not exist in this environment)",
      ].join(". ")
    );
  }

  // Verify we actually left the sign-in page
  await expect(page).not.toHaveURL(/sign-in/);
}
