import { test, expect } from "@playwright/test";

test.describe("Dashboard sidebar navigation", () => {
  test("sidebar renders with user info and nav links", async ({ page }) => {
    await page.goto("/dashboard");

    // Sidebar should be visible with the user's display info
    const sidebar = page.locator("[data-sidebar='sidebar']");
    await expect(sidebar).toBeVisible({ timeout: 10000 });

    // Nav links for main dashboard pages should be present
    await expect(sidebar.getByRole("link", { name: /home/i })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: /alts/i })).toBeVisible();
    await expect(
      sidebar.getByRole("link", { name: /tournaments/i })
    ).toBeVisible();
  });

  test("navigates between dashboard pages via sidebar", async ({ page }) => {
    await page.goto("/dashboard");

    const sidebar = page.locator("[data-sidebar='sidebar']");
    await expect(sidebar).toBeVisible({ timeout: 10000 });

    // Navigate to Alts
    await sidebar.getByRole("link", { name: /alts/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/alts/);

    // Navigate to Tournaments
    await sidebar.getByRole("link", { name: /tournaments/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/tournaments/);

    // Navigate back to Home
    await sidebar.getByRole("link", { name: /home/i }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("settings link in sidebar navigates to settings", async ({ page }) => {
    await page.goto("/dashboard");

    const sidebar = page.locator("[data-sidebar='sidebar']");
    await expect(sidebar).toBeVisible({ timeout: 10000 });

    // Settings link is at the bottom of the sidebar
    await sidebar.getByRole("link", { name: /settings/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/settings/);
  });
});
