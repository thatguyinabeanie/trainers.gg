import { test, expect } from "@playwright/test";

test.describe("Protected routes redirect to sign-in", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  const protectedRoutes = [
    "/dashboard",
    "/to-dashboard",
    "/settings",
    "/onboarding",
    "/organizations/create",
  ];

  for (const route of protectedRoutes) {
    test(`${route} redirects unauthenticated users`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/sign-in/);
    });
  }
});
