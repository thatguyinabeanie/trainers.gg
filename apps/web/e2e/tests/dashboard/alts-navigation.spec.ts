import { test, expect } from "@playwright/test";

test.describe("Alts page", () => {
  test("shows alts page from dashboard nav", async ({ page }) => {
    await page.goto("/dashboard");

    // Click Alts tab in dashboard nav (first() to avoid ambiguity with settings menu)
    await page.getByRole("link", { name: "Alts" }).first().click();
    await page.waitForURL("/dashboard/alts");
    await expect(page.getByRole("heading", { name: "My Alts" })).toBeVisible();
  });

  test("shows alts from topnav dropdown", async ({ page }) => {
    await page.goto("/dashboard");

    // Click user avatar dropdown
    await page.getByLabel("User menu").click();

    // Click My Alts
    await page.getByRole("menuitem", { name: "My Alts" }).click();
    await page.waitForURL("/dashboard/alts");
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

    // Click Settings (goes to /dashboard/settings which redirects based on route structure)
    await page.getByRole("menuitem", { name: "Settings" }).click();
    await page.waitForURL(/\/dashboard\/settings/);
  });
});
