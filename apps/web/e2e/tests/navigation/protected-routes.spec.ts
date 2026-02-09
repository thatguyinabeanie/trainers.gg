import { test, expect } from "@playwright/test";

test.describe("Protected routes redirect unauthenticated users", () => {
  // Use empty storage state so there's no authenticated session
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
