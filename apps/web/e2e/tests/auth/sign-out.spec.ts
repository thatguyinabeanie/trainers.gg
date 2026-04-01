import { test, expect } from "@playwright/test";
import { TEST_USERS, loginViaUI } from "../../fixtures/auth";

test.describe("Sign out", () => {
  // Use a fresh session — the sign-out action revokes all server-side sessions
  // (supabase.auth.signOut() defaults to scope: 'global'), which would
  // invalidate the shared storage state used by other authenticated tests.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("signs out and redirects", async ({ page }) => {
    // Log in as a DIFFERENT user than the shared auth state (player).
    // supabase.auth.signOut() uses scope: 'global' which revokes ALL sessions
    // for the user — using the same user here would destroy the shared session.
    await loginViaUI(page, TEST_USERS.champion);

    await page.goto("/dashboard");

    // NavUser footer in the sidebar — button contains username + role
    const userMenu = page
      .getByRole("button", { name: /user menu/i })
      .or(page.getByRole("button", { name: /player/i }).last());
    await expect(userMenu).toBeVisible({ timeout: 10000 });
    await userMenu.click();

    const signOutButton = page
      .getByRole("button", { name: /sign out|log out/i })
      .or(page.getByRole("menuitem", { name: /sign out|log out/i }));
    await signOutButton.click();

    // After sign-out, should redirect to home or sign-in page
    await expect(page).toHaveURL(/\/(sign-in)?(\?.*)?$/);
  });
});
