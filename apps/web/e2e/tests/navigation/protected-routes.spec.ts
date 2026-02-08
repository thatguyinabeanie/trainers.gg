import { test, expect } from "@playwright/test";

test.describe("Protected routes redirect unauthenticated users", () => {
  // Disable E2E bypass for these tests - we're testing actual unauthenticated behavior
  test.use({
    storageState: { cookies: [], origins: [] },
    extraHTTPHeaders: {}, // Override global bypass header
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
