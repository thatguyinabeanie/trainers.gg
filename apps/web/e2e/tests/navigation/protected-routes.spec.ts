import { test, expect } from "@playwright/test";

test.describe("Protected routes redirect unauthenticated users", () => {
  // Disable E2E bypass for these tests - we're testing actual unauthenticated behavior
  test.use({
    storageState: { cookies: [], origins: [] },
    extraHTTPHeaders: {
      // Preserve Vercel protection bypass header for CI
      ...(process.env.VERCEL_AUTOMATION_BYPASS_SECRET
        ? {
            "x-vercel-protection-bypass":
              process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
          }
        : {}),
      // Explicitly set E2E bypass header to empty string to disable it
      // This prevents the E2E auth bypass from taking effect in these tests
      "x-e2e-auth-bypass": "",
    },
  });

  const protectedRoutes = [
    "/dashboard",
    "/to-dashboard",
    "/onboarding",
    "/organizations/create",
  ];

  for (const route of protectedRoutes) {
    test(`${route} redirects unauthenticated users`, async ({ page }) => {
      await page.goto(route);

      // In maintenance mode, protected routes redirect to /waitlist
      // Otherwise, they redirect to /sign-in
      // We check which redirect happened to handle both scenarios
      const url = page.url();
      const isMaintenanceMode = url.includes("/waitlist");

      if (isMaintenanceMode) {
        await expect(page).toHaveURL(/waitlist/);
      } else {
        await expect(page).toHaveURL(/sign-in/);
      }
    });
  }
});
