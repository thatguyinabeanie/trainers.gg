import { test, expect } from "@playwright/test";

test.describe("Dashboard alts page", () => {
  test("renders alts page with header and add button", async ({ page }) => {
    await page.goto("/dashboard/alts");

    // Page header should show "Alts" — scope to main to avoid sidebar match
    const main = page.getByRole("main");
    await expect(main.getByText("Alts", { exact: true })).toBeVisible({
      timeout: 10000,
    });

    // "Add Alt" button should be present
    await expect(main.getByRole("button", { name: /add alt/i })).toBeVisible();
  });

  test("renders alt list with table headers", async ({ page }) => {
    await page.goto("/dashboard/alts");

    const main = page.getByRole("main");
    await expect(main.getByText("Alts", { exact: true })).toBeVisible({
      timeout: 10000,
    });

    // Table should have expected column headers
    await expect(main.getByText("Teams")).toBeVisible();
    await expect(main.getByText("ELO")).toBeVisible();
  });

  test("alt rows are expandable", async ({ page }) => {
    await page.goto("/dashboard/alts");

    const main = page.getByRole("main");
    await expect(main.getByText("Alts", { exact: true })).toBeVisible({
      timeout: 10000,
    });

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
