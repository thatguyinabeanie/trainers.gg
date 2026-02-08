import { test, expect } from "@playwright/test";

test.describe("Public routes", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("home page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/trainers/i);
  });

  test("tournaments page loads", async ({ page }) => {
    await page.goto("/tournaments");
    await expect(
      page.getByRole("heading", { name: /tournaments/i })
    ).toBeVisible();
  });

  test("organizations page loads", async ({ page }) => {
    await page.goto("/organizations");
    await expect(
      page.getByRole("heading", { name: "Organizations", exact: true })
    ).toBeVisible();
  });

  test("sign-in page loads", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("sign-up page loads", async ({ page }) => {
    await page.goto("/sign-up");
    await expect(
      page.getByRole("button", { name: /sign up|create account/i })
    ).toBeVisible();
  });
});
