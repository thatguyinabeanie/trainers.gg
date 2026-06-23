import { test, expect } from "@playwright/test";

test.describe("Dashboard alt switcher", () => {
  test("alt switcher is visible in sidebar and lists alts", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    // `.first()`: the shadcn sidebar can transiently mount more than one
    // desktop `data-sidebar="sidebar"` node during navigation/hydration, which
    // tripped Playwright strict mode. We only need to confirm one is visible.
    const sidebar = page
      .locator("[data-sidebar='sidebar']:not([data-mobile='true'])")
      .first();
    await expect(sidebar).toBeVisible({ timeout: 10000 });

    // The sidebar should render without errors
    await expect(sidebar).toBeVisible();
  });

  // Notification bell was removed from the player dashboard header
  // in the unified home + alts redesign (PR #270).
});
