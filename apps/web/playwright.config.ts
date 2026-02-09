import { defineConfig, devices } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";
import { config as dotenvConfig } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env.local for env vars
// Look in the repo root (two levels up from apps/web)
dotenvConfig({ path: path.resolve(__dirname, "../../.env.local") });
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
  workers: process.env.CI ? 1 : 2, // Limit local workers to avoid dev server overload

  reporter: process.env.CI
    ? [
        ["github"],
        ["html", { open: "never" }],
        ["junit", { outputFile: "test-results/junit.xml" }],
      ]
    : [["html", { open: "on-failure" }]],

  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
    extraHTTPHeaders: {
      ...(process.env.VERCEL_AUTOMATION_BYPASS_SECRET
        ? {
            "x-vercel-protection-bypass":
              process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
          }
        : {}),
    },
  },

  // Start the dev server automatically (reuses an existing one if already running)
  // When PLAYWRIGHT_BASE_URL is set (CI with Vercel preview), always reuse — the server is already deployed
  webServer: {
    command: "pnpm dev",
    url: baseURL,
    reuseExistingServer: !!process.env.PLAYWRIGHT_BASE_URL || !process.env.CI,
    timeout: 120_000,
  },

  projects: [
    // Auth setup — runs first, saves storage state via real UI login
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      use: {
        baseURL,
        extraHTTPHeaders: {
          ...(process.env.VERCEL_AUTOMATION_BYPASS_SECRET
            ? {
                "x-vercel-protection-bypass":
                  process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
              }
            : {}),
        },
      },
    },

    // Main tests — depend on setup for auth state
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: storageStatePath,
        extraHTTPHeaders: {
          ...(process.env.VERCEL_AUTOMATION_BYPASS_SECRET
            ? {
                "x-vercel-protection-bypass":
                  process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
              }
            : {}),
        },
      },
      dependencies: ["setup"],
    },
  ],
});
