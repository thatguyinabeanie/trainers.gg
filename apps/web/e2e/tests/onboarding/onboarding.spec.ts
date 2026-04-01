import { test, expect } from "@playwright/test";

const E2E_SECRET = process.env.VERCEL_AUTOMATION_BYPASS_SECRET || "";

test.describe("Onboarding flow", () => {
  // Use clean storage state — we sign in manually with a fresh temp user
  test.use({ storageState: { cookies: [], origins: [] } });

  test("redirects temp user to onboarding and completes setup", async ({
    page,
    baseURL,
  }) => {
    // Onboarding submission includes PDS handle check + provisioning which
    // can take several seconds on preview deployments — extend test timeout
    test.setTimeout(90_000);

    test.skip(!baseURL, "PLAYWRIGHT_BASE_URL is required");
    test.skip(!E2E_SECRET, "VERCEL_AUTOMATION_BYPASS_SECRET is required");

    // --- Create a temp user via the preview deployment's API ---
    // Routes through the preview which has the correct Supabase credentials
    const createResponse = await fetch(`${baseURL}/api/e2e/temp-user`, {
      method: "POST",
      headers: {
        "x-e2e-seed-secret": E2E_SECRET,
        "x-vercel-protection-bypass": E2E_SECRET,
      },
    });

    expect(createResponse.ok).toBe(true);
    const {
      userId,
      email: testEmail,
      password: testPassword,
    } = await createResponse.json();

    try {
      // --- Sign in via the UI ---
      // Use redirect=/dashboard so after sign-in the user hits a protected
      // route, which triggers the onboarding gate in proxy.ts
      await page.goto("/sign-in?redirect=/dashboard");
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
      // Server action includes PDS handle check (5s timeout) + PDS provisioning
      // (30s timeout) which can take a while on preview deployments
      await page.waitForURL("**/dashboard", { timeout: 60000 });
      expect(page.url()).toContain("/dashboard");
    } finally {
      // --- Cleanup: delete the test user via the preview API ---
      await fetch(`${baseURL}/api/e2e/temp-user`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-e2e-seed-secret": E2E_SECRET,
          "x-vercel-protection-bypass": E2E_SECRET,
        },
        body: JSON.stringify({ userId }),
      });
    }
  });
});
