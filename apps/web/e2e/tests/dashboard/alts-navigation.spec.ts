import { test, expect } from "@playwright/test";

test.describe("Alts page", () => {
  test.use({ storageState: "e2e/playwright/.auth/player.json" });

  test("shows alts page from dashboard nav", async ({ page }) => {
    await page.goto("/dashboard");

    // Click Alts tab in dashboard nav
    await page.getByRole("link", { name: "Alts" }).click();
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
    await expect(
      page.getByRole("heading", { name: "Your Alts" })
    ).toBeVisible();
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
