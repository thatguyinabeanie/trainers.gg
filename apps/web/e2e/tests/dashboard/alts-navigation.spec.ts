import { test, expect } from "@playwright/test";

test.describe("Alts page", () => {
  // E2E auth bypass via x-e2e-auth-bypass header (set in playwright.config.ts)
  // proxy.ts sets e2e-test-mode cookie, AuthProvider uses mock user

  test("shows alts page from dashboard nav", async ({ page }) => {
    await page.goto("/dashboard");

    // Click Alts tab in dashboard nav (first() to avoid ambiguity with settings menu)
    await page.getByRole("link", { name: "Alts" }).first().click();
    await expect(page).toHaveURL("/dashboard/alts");
    await expect(page.getByRole("heading", { name: "My Alts" })).toBeVisible();
  });

  test("shows alts from topnav dropdown", async ({ page }) => {
    await page.goto("/dashboard");

    // Click user avatar dropdown
    await page.getByLabel("User menu").click();

    // Click My Alts
    await page.getByRole("menuitem", { name: "My Alts" }).click();
    await expect(page).toHaveURL("/dashboard/alts");
  });

  test("shows New Alt button and alt list", async ({ page }) => {
    await page.goto("/dashboard/alts");

    await expect(page.getByRole("button", { name: "New Alt" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "My Alts" })).toBeVisible();
  });

  test("shows settings from topnav dropdown", async ({ page }) => {
    await page.goto("/dashboard");

    // Click user avatar dropdown
    await page.getByLabel("User menu").click();

    // Click Settings
    await page.getByRole("menuitem", { name: "Settings" }).click();
    await expect(page).toHaveURL("/dashboard/settings/profile");
  });
});
