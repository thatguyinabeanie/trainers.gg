import { type Page } from "@playwright/test";

// Seeded test users from packages/supabase/supabase/seeds/
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
 */
export async function loginViaUI(
  page: Page,
  user: { email: string; password: string }
): Promise<void> {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  // Wait for navigation away from sign-in page
  await page.waitForURL((url) => !url.pathname.includes("/sign-in"), {
    timeout: 15000,
  });
}
