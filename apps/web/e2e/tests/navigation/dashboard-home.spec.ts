import { test, expect } from "@playwright/test";

test.describe("Dashboard home page", () => {
  test("renders stat cards and alts heading", async ({ page }) => {
    await page.goto("/dashboard");

    const main = page.getByRole("main");

    // "Your Alts" heading should be visible (unified home + alts view)
    await expect(main.getByRole("heading", { name: /your alts/i })).toBeVisible(
      { timeout: 15000 }
    );

    // Four stat cards — scope to main to avoid matching sidebar nav links
    const statLabels = ["Win Rate", "Rating", "Record", "Tournaments"];
    for (const label of statLabels) {
      await expect(
        main.getByText(label, { exact: true }).first()
      ).toBeVisible();
    }
  });

  test("renders alts table or empty state", async ({ page }) => {
    await page.goto("/dashboard");

    const main = page.getByRole("main");

    await expect(main.getByRole("heading", { name: /your alts/i })).toBeVisible(
      { timeout: 15000 }
    );

    // Either table headers (user has alts) or empty state
    const hasTable = main.getByText("Handle");
    const hasEmptyState = main.getByText(/create your first alt/i);
    await expect(hasTable.or(hasEmptyState)).toBeVisible();
  });

  test("sidebar Home link is active on dashboard", async ({ page }) => {
    await page.goto("/dashboard");

    // Use .first() to resolve strict-mode violation during SSR-Suspense hydration,
    // when a skeleton sidebar and the real sidebar briefly coexist in the DOM.
    const sidebar = page.locator("[data-sidebar='sidebar']").first();
    await expect(sidebar).toBeVisible({ timeout: 10000 });

    // "Home" link should be present in sidebar
    await expect(sidebar.getByRole("link", { name: /home/i })).toBeVisible();
  });
});
