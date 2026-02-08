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
    // Check for either waitlist form OR OAuth buttons
    const waitlistHeading = page.getByText(/join.*waitlist/i).first();
    const oauthButton = page
      .getByRole("button", { name: /continue with/i })
      .first();

    // Wait for either element to be visible
    await expect
      .poll(async () => {
        const hasWaitlist = await waitlistHeading
          .isVisible()
          .catch(() => false);
        const hasOAuth = await oauthButton.isVisible().catch(() => false);
        return hasWaitlist || hasOAuth;
      })
      .toBe(true);
  });
});
