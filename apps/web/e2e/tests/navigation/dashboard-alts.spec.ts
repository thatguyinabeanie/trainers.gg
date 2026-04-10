import { test, expect } from "@playwright/test";

test.describe("Dashboard alts section", () => {
  // /dashboard/alts redirects to /dashboard — alts are on the unified home page
  test("renders alts heading and add button", async ({ page }) => {
    await page.goto("/dashboard");

    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { name: /your alts/i })).toBeVisible(
      { timeout: 10000 }
    );

    // "New Alt" button should be present
    await expect(main.getByRole("button", { name: /new alt/i })).toBeVisible();
  });

  test("renders alt list or empty state", async ({ page }) => {
    await page.goto("/dashboard");

    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { name: /your alts/i })).toBeVisible(
      { timeout: 10000 }
    );

    // Either table headers (user has alts) or empty state (no alts)
    const hasTable = main.getByText("Handle");
    const hasEmptyState = main.getByText(/create your first alt/i);
    await expect(hasTable.or(hasEmptyState)).toBeVisible();
  });

  test("alt rows are expandable", async ({ page }) => {
    await page.goto("/dashboard");

    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { name: /your alts/i })).toBeVisible(
      { timeout: 10000 }
    );

    // If the user has alts, there should be expandable rows
    const expandButtons = main.locator(
      "button:has(svg.lucide-chevron-right), button:has(svg.lucide-chevron-down)"
    );

    const count = await expandButtons.count();
    if (count > 0) {
      await expandButtons.first().click();

      await expect(
        main
          .locator("svg.lucide-chevron-down")
          .or(main.getByText(/no teams/i))
          .or(main.getByText(/record/i))
      ).toBeVisible();
    }
  });
});
