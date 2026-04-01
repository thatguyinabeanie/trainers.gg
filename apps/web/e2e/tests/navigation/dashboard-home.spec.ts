import { test, expect } from "@playwright/test";

test.describe("Dashboard home page", () => {
  test("renders welcome heading and stat cards", async ({ page }) => {
    await page.goto("/dashboard");

    // Welcome heading should contain the user's display name
    await expect(
      page.getByRole("heading", { name: /welcome back/i })
    ).toBeVisible({ timeout: 15000 });

    // Four stat cards should be present: Win Rate, Rating, Record, Tournaments
    const statLabels = ["Win Rate", "Rating", "Record", "Tournaments"];
    for (const label of statLabels) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }
  });

  test("renders recent results section", async ({ page }) => {
    await page.goto("/dashboard");

    // Wait for main content to load
    await expect(
      page.getByRole("heading", { name: /welcome back/i })
    ).toBeVisible({ timeout: 15000 });

    // Recent results section heading
    await expect(page.getByText(/recent results/i)).toBeVisible();
  });

  test("page header shows Home title", async ({ page }) => {
    await page.goto("/dashboard");

    // The PageHeader should show "Home"
    await expect(page.getByText("Home", { exact: true })).toBeVisible({
      timeout: 10000,
    });
  });
});
