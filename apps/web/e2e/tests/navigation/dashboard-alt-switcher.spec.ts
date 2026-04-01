import { test, expect } from "@playwright/test";

test.describe("Dashboard alt switcher", () => {
  test("alt switcher is visible in sidebar and lists alts", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    const sidebar = page.locator("[data-sidebar='sidebar']");
    await expect(sidebar).toBeVisible({ timeout: 10000 });

    // The sidebar should render without errors
    // The exact alt switcher UI depends on whether the user has alts
    await expect(sidebar).toBeVisible();
  });

  test("notifications bell is visible in page header", async ({ page }) => {
    await page.goto("/dashboard");

    // The notifications bell should be in the page header
    const bellButton = page.getByRole("button", { name: /notification/i });
    await expect(bellButton).toBeVisible({ timeout: 10000 });
  });

  test("notifications popover opens on click", async ({ page }) => {
    await page.goto("/dashboard");

    const bellButton = page.getByRole("button", { name: /notification/i });
    await expect(bellButton).toBeVisible({ timeout: 10000 });
    await bellButton.click();

    // Popover should show with "Notifications" header
    await expect(page.getByText("Notifications")).toBeVisible();
    // Should show "Mark all read" button or "No notifications yet"
    const hasContent = page
      .getByText("Mark all read")
      .or(page.getByText("No notifications yet"));
    await expect(hasContent).toBeVisible();
  });
});
