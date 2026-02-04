import { test as setup, expect } from "@playwright/test";
import { TEST_USERS, loginViaUI } from "../fixtures/auth";

const authFile = "./e2e/playwright/.auth/player.json";

setup("authenticate as player", async ({ page }) => {
  await loginViaUI(page, TEST_USERS.player);

  // Verify we're actually authenticated before saving storage state
  await expect(page).not.toHaveURL(/sign-in/);

  // Save authenticated session cookies/tokens to disk for reuse by test projects
  await page.context().storageState({ path: authFile });
});
