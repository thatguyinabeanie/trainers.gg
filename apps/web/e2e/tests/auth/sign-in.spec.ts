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
    await page.getByRole("button", { name: /continue with email/i }).click();
    await page.getByLabel("Email or Username").fill(TEST_USERS.player.email);
    await page.getByLabel("Password").fill("WrongPassword123!");
    await page
      .getByRole("main")
      .getByRole("button", { name: /sign in/i })
      .click();
    // Should show an error alert and remain on sign-in
    await expect(page.getByRole("alert")).toBeVisible({ timeout: 10000 });
  });

  test("shows error for non-existent user", async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByRole("button", { name: /continue with email/i }).click();
    await page
      .getByLabel("Email or Username")
      .fill("nonexistent@trainers.local");
    await page.getByLabel("Password").fill("Password123!");
    await page
      .getByRole("main")
      .getByRole("button", { name: /sign in/i })
      .click();
    // Should show an error alert and remain on sign-in
    await expect(page.getByRole("alert")).toBeVisible({ timeout: 10000 });
  });
});
