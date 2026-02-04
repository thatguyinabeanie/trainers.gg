import { test, expect } from "@playwright/test";

test.describe("Public routes", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("home page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/trainers/i);
  });

  test("tournaments page loads", async ({ page }) => {
    await page.goto("/tournaments");
    await expect(page.locator("body")).toBeVisible();
  });

  test("organizations page loads", async ({ page }) => {
    await page.goto("/organizations");
    await expect(page.locator("body")).toBeVisible();
  });

  test("sign-in page loads", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.locator("body")).toBeVisible();
  });

  test("sign-up page loads", async ({ page }) => {
    await page.goto("/sign-up");
    await expect(page.locator("body")).toBeVisible();
  });
});
