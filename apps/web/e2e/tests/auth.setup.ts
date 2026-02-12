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

setup("authenticate as player", async ({ page, request }) => {
  // Perform real UI login and save session
  mkdirSync(authDir, { recursive: true });

  // Seed test users on Vercel preview deployments (fallback if CI step failed)
  const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
  const seedSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

  if (seedSecret && baseURL.includes("vercel.app")) {
    try {
      const response = await request.post(`${baseURL}/api/e2e/seed`, {
        headers: {
          "x-e2e-seed-secret": seedSecret,
          "x-vercel-protection-bypass": seedSecret,
        },
      });
      console.log(`E2E seed response: ${response.status()}`);
    } catch (err) {
      console.log(`E2E seed request failed (non-fatal): ${err}`);
    }
  }

  // Retry login to handle Supabase preview seeding timing issues
  // The preview branch may still be seeding when E2E tests start
  const maxRetries = 3;
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await loginViaUI(page, TEST_USERS.player);

      // Verify we're actually authenticated before saving storage state
      await expect(page).not.toHaveURL(/sign-in/);

      // Save authenticated session cookies/tokens to disk for reuse by test projects
      await page.context().storageState({ path: authFile });

      // Success - exit retry loop
      return;
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        console.log(
          `Login attempt ${attempt}/${maxRetries} failed. Retrying in 10 seconds...`
        );
        await page.waitForTimeout(10000);
      }
    }
  }

  // All retries failed
  throw new Error(
    `Failed to authenticate after ${maxRetries} attempts. Last error: ${lastError?.message}`
  );
});
