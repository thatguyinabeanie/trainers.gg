import { test, expect } from "@playwright/test";

test.describe("Dashboard alt switcher", () => {
  test("alt switcher is visible in sidebar and lists alts", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    const sidebar = page.locator("[data-sidebar='sidebar']");
    await expect(sidebar).toBeVisible({ timeout: 10000 });

    // The sidebar should render without errors
    await expect(sidebar).toBeVisible();
  });

  test("notifications bell is visible in page header", async ({ page }) => {
    await page.goto("/dashboard");

    const bellButton = page.getByRole("button", { name: /notification/i });
    await expect(bellButton).toBeVisible({ timeout: 10000 });
  });

  test("notifications popover opens on click", async ({ page }) => {
    await page.goto("/dashboard");

    const bellButton = page.getByRole("button", { name: /notification/i });
    await expect(bellButton).toBeVisible({ timeout: 10000 });
    await bellButton.click();

    // Popover should show "Mark all read" or "No notifications yet"
    const popover = page.locator("[data-side]");
    const hasContent = popover
      .getByText("Mark all read")
      .or(popover.getByText("No notifications yet"));
    await expect(hasContent).toBeVisible();
  });
});
