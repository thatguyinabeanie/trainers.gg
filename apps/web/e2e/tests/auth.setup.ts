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
  // Perform real UI login and save session
  mkdirSync(authDir, { recursive: true });
  await loginViaUI(page, TEST_USERS.player);

  // Verify we're actually authenticated before saving storage state
  await expect(page).not.toHaveURL(/sign-in/);

  // Save authenticated session cookies/tokens to disk for reuse by test projects
  await page.context().storageState({ path: authFile });
});
