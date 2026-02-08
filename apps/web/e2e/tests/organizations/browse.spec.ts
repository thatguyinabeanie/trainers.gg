import { test, expect } from "@playwright/test";

test.describe("Organization browsing", () => {
  test("organizations page loads", async ({ page }) => {
    await page.goto("/organizations");
    await expect(
      page.getByRole("heading", { name: "Organizations", exact: true })
    ).toBeVisible();
  });

  test("organizations page is accessible without authentication", async ({
    page,
  }) => {
    await page.context().clearCookies();
    await page.goto("/organizations");
    expect(page.url()).toContain("/organizations");
    await expect(
      page.getByRole("heading", { name: "Organizations", exact: true })
    ).toBeVisible();
  });
});
