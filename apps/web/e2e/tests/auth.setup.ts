import { test as setup } from "@playwright/test";
import { TEST_USERS, loginViaUI } from "../fixtures/auth";

const authFile = "./e2e/playwright/.auth/player.json";

setup("authenticate as player", async ({ page }) => {
  await loginViaUI(page, TEST_USERS.player);
  await page.context().storageState({ path: authFile });
});
