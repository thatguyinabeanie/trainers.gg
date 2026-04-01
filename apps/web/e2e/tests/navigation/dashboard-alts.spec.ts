import { test, expect } from "@playwright/test";

test.describe("Dashboard alts page", () => {
  test("renders alts page with header and add button", async ({ page }) => {
    await page.goto("/dashboard/alts");

    // Page header should show "Alts"
    await expect(page.getByText("Alts", { exact: true })).toBeVisible({
      timeout: 10000,
    });

    // "Add Alt" button should be present
    await expect(page.getByRole("button", { name: /add alt/i })).toBeVisible();
  });

  test("renders alt list with table headers", async ({ page }) => {
    await page.goto("/dashboard/alts");

    // Wait for page to load
    await expect(page.getByText("Alts", { exact: true })).toBeVisible({
      timeout: 10000,
    });

    // Table should have expected column headers
    // The alt list shows: Alt (username), Teams, ELO, Visibility
    await expect(page.getByText("Teams")).toBeVisible();
    await expect(page.getByText("ELO")).toBeVisible();
  });

  test("alt rows are expandable", async ({ page }) => {
    await page.goto("/dashboard/alts");

    // Wait for page to load
    await expect(page.getByText("Alts", { exact: true })).toBeVisible({
      timeout: 10000,
    });

    // If the user has alts, there should be expandable rows
    // Look for any expand/chevron button in the alt list
    const expandButtons = page.locator(
      "button:has(svg.lucide-chevron-right), button:has(svg.lucide-chevron-down)"
    );

    const count = await expandButtons.count();
    if (count > 0) {
      // Click the first expand button
      await expandButtons.first().click();

      // After expanding, the chevron should rotate (chevron-down appears)
      // And team details or stats should become visible
      await expect(
        page
          .locator("svg.lucide-chevron-down")
          .or(page.getByText(/no teams/i))
          .or(page.getByText(/record/i))
      ).toBeVisible();
    }
  });
});
