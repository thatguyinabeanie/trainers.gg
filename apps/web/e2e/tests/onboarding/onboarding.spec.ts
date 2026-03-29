import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

test.describe("Onboarding flow", () => {
  // Use clean storage state — we sign in manually with a fresh temp user
  test.use({ storageState: { cookies: [], origins: [] } });

  test("redirects temp user to onboarding and completes setup", async ({
    page,
  }) => {
    const baseURL = process.env.PLAYWRIGHT_BASE_URL || "";
    // Skip on Vercel preview deployments (no service role key / seeded users)
    test.skip(
      baseURL.includes("vercel.app") &&
        !baseURL.includes("trainers-gg.vercel.app"),
      "Service role key not available in preview environments"
    );

    // --- Seed a user with a temp username via Supabase admin API ---
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const testEmail = `e2e-onboarding-${Date.now()}@trainers.local`;
    const testPassword = "Password123!";

    const { data: authData, error: createError } =
      await supabase.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        email_confirm: true,
        user_metadata: {
          username: `temp_${Date.now().toString(36)}`,
        },
      });

    expect(createError).toBeNull();
    expect(authData.user).toBeTruthy();

    try {
      // --- Sign in via the UI ---
      await page.goto("/sign-in");
      await page.getByRole("button", { name: /continue with email/i }).click();

      // Wait for the email form to be ready
      await page.getByLabel("Email or Username").waitFor({ state: "visible" });

      await page.getByLabel("Email or Username").fill(testEmail);
      await page.locator('input[name="password"]').fill(testPassword);
      await page
        .getByRole("main")
        .getByRole("button", { name: /sign in/i })
        .click();

      // --- Should redirect to /onboarding (not /dashboard) ---
      await page.waitForURL("**/onboarding", { timeout: 15000 });
      expect(page.url()).toContain("/onboarding");

      // --- Fill out the onboarding form ---
      const uniqueUsername = `e2e_trainer_${Date.now().toString(36)}`;

      // Username field
      await page.getByLabel("Username").fill(uniqueUsername);

      // Wait for the debounced availability check to resolve
      await expect(page.getByText("Username is available")).toBeVisible({
        timeout: 10000,
      });

      // Country — Base UI Select: click trigger, then click the option
      await page.getByLabel("Country").click();
      await page.getByRole("option", { name: "United States" }).click();

      // Bio
      await page.getByLabel("Bio").fill("E2E test trainer profile");

      // --- Submit ---
      await page.getByRole("button", { name: /complete setup/i }).click();

      // --- Should redirect to dashboard ---
      await page.waitForURL("**/dashboard/overview", { timeout: 30000 });
      expect(page.url()).toContain("/dashboard/overview");
    } finally {
      // --- Cleanup: delete the test user regardless of pass/fail ---
      if (authData.user) {
        await supabase.auth.admin.deleteUser(authData.user.id);
      }
    }
  });
});
