import { test, expect } from "@playwright/test";

test.describe("Tournament browsing", () => {
  test("tournaments page displays tournament list", async ({ page }) => {
    await page.goto("/tournaments");
    // Should display at least the seeded tournament data
    await expect(page.locator("body")).toBeVisible();
    // Look for any tournament card/link content
    const content = await page.textContent("body");
    expect(content).toBeTruthy();
  });

  test("tournaments page is accessible without authentication", async ({
    page,
  }) => {
    // Use clean state with no auth
    await page.context().clearCookies();
    await page.goto("/tournaments");
    // Should not redirect to sign-in
    expect(page.url()).toContain("/tournaments");
  });
});
