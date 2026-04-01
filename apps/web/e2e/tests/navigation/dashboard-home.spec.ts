import { test, expect } from "@playwright/test";

test.describe("Dashboard home page", () => {
  test("renders welcome heading and stat cards", async ({ page }) => {
    await page.goto("/dashboard");

    const main = page.getByRole("main");

    // Welcome heading should contain the user's display name
    await expect(
      main.getByRole("heading", { name: /welcome back/i })
    ).toBeVisible({ timeout: 15000 });

    // Four stat cards — scope to main to avoid matching sidebar nav links
    const statLabels = ["Win Rate", "Rating", "Record", "Tournaments"];
    for (const label of statLabels) {
      await expect(
        main.getByText(label, { exact: true }).first()
      ).toBeVisible();
    }
  });

  test("renders recent results section", async ({ page }) => {
    await page.goto("/dashboard");

    const main = page.getByRole("main");

    await expect(
      main.getByRole("heading", { name: /welcome back/i })
    ).toBeVisible({ timeout: 15000 });

    await expect(main.getByText(/recent results/i)).toBeVisible();
  });

  test("page header shows Home title", async ({ page }) => {
    await page.goto("/dashboard");

    // "Home" appears in both sidebar and page header — scope to header
    const header = page.locator("header");
    await expect(header.getByText("Home", { exact: true })).toBeVisible({
      timeout: 10000,
    });
  });
});
