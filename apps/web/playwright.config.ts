import { defineConfig, devices } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const storageStatePath = path.resolve(
  __dirname,
  "./e2e/playwright/.auth/player.json"
);

export default defineConfig({
  testDir: "./e2e/tests",
  outputDir: "./test-results",

  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["html", { open: "on-failure" }]],

  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
    // Bypass Vercel Deployment Protection in CI
    ...(process.env.VERCEL_AUTOMATION_BYPASS_SECRET
      ? {
          extraHTTPHeaders: {
            "x-vercel-protection-bypass":
              process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
          },
        }
      : {}),
  },

  projects: [
    // Auth setup — runs first, saves storage state
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      use: {
        baseURL,
        // Bypass Vercel Deployment Protection in setup as well
        ...(process.env.VERCEL_AUTOMATION_BYPASS_SECRET
          ? {
              extraHTTPHeaders: {
                "x-vercel-protection-bypass":
                  process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
              },
            }
          : {}),
      },
    },

    // Main tests — depend on setup for auth state
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: storageStatePath,
      },
      dependencies: ["setup"],
    },
  ],
});
