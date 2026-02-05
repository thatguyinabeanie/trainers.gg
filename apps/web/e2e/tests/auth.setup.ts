import { test as setup, expect } from "@playwright/test";
import { TEST_USERS, loginViaUI } from "../fixtures/auth";
import path from "path";
import { fileURLToPath } from "url";
import { mkdirSync } from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authFile = path.resolve(
  __dirname,
  "../../e2e/playwright/.auth/player.json"
);
const authDir = path.dirname(authFile);

setup("authenticate as player", async ({ page }) => {
  // When E2E auth bypass is configured, we don't need to do a real UI login
  // The proxy.ts will mock the authenticated user based on the bypass header
  if (process.env.E2E_AUTH_BYPASS_SECRET) {
    // Create an empty storage state file (tests will use bypass header instead)
    mkdirSync(authDir, { recursive: true });
    await page.context().storageState({ path: authFile });
    return;
  }

  // Normal flow: perform UI login and save session
  mkdirSync(authDir, { recursive: true });
  await loginViaUI(page, TEST_USERS.player);

  // Verify we're actually authenticated before saving storage state
  await expect(page).not.toHaveURL(/sign-in/);

  // Save authenticated session cookies/tokens to disk for reuse by test projects
  await page.context().storageState({ path: authFile });
});
