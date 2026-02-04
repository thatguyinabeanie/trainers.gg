import { test, expect } from "@playwright/test";

test.describe("Tournament browsing", () => {
  test("tournaments page displays content", async ({ page }) => {
    await page.goto("/tournaments");
    await expect(
      page.getByRole("heading", { name: /tournaments/i })
    ).toBeVisible();
  });

  test("tournaments page is accessible without authentication", async ({
    page,
  }) => {
    await page.context().clearCookies();
    await page.goto("/tournaments");
    expect(page.url()).toContain("/tournaments");
    await expect(
      page.getByRole("heading", { name: /tournaments/i })
    ).toBeVisible();
  });
});
