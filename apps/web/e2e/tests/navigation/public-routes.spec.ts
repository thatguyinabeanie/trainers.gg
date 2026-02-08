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
    // Sign-in page shows "Continue" button initially (username step)
    // or "Continue with Email" button from social auth options
    await expect(
      page.getByRole("button", { name: "Continue" }).first()
    ).toBeVisible();
  });

  test("sign-up page loads", async ({ page }) => {
    await page.goto("/sign-up");
    // In maintenance mode, sign-up page shows waitlist form
    // In normal mode, it shows social auth buttons like "Continue with Bluesky"
    const url = page.url();
    const isMaintenanceMode = url.includes("/waitlist");

    if (isMaintenanceMode) {
      // Maintenance mode: should show waitlist form
      await expect(
        page.getByRole("heading", { name: /join.*waitlist/i })
      ).toBeVisible();
    } else {
      // Normal mode: should show social auth buttons
      await expect(
        page.getByRole("button", { name: /continue with/i }).first()
      ).toBeVisible();
    }
  });
});
