import { test, expect } from "@playwright/test";
import { TEST_USERS, loginViaUI } from "../../fixtures/auth";

test.describe("Sign in", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("signs in with valid credentials", async ({ page }) => {
    await loginViaUI(page, TEST_USERS.player);
    // Should be redirected away from sign-in
    expect(page.url()).not.toContain("/sign-in");
  });

  test("shows error for wrong password", async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByLabel("Email").fill(TEST_USERS.player.email);
    await page.getByLabel("Password").fill("WrongPassword123!");
    await page.getByRole("button", { name: /sign in/i }).click();
    // Should show an error and remain on sign-in
    await expect(
      page.locator('[role="alert"], .text-destructive, [data-error]')
    ).toBeVisible({
      timeout: 10000,
    });
  });

  test("shows error for non-existent user", async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByLabel("Email").fill("nonexistent@trainers.local");
    await page.getByLabel("Password").fill("Password123!");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(
      page.locator('[role="alert"], .text-destructive, [data-error]')
    ).toBeVisible({
      timeout: 10000,
    });
  });
});
