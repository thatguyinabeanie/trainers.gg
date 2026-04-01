import { test, expect } from "@playwright/test";

test.describe("Dashboard settings tabs", () => {
  test("navigates between settings tabs", async ({ page }) => {
    await page.goto("/dashboard/settings");

    // Should redirect to the profile tab by default
    await expect(page).toHaveURL(/\/dashboard\/settings/);

    // Settings heading should be visible
    await expect(page.getByRole("heading", { name: /settings/i })).toBeVisible({
      timeout: 10000,
    });

    // All four tab links should be present
    const tabs = ["Profile", "Account", "Display", "Notifications"];
    for (const tab of tabs) {
      await expect(page.getByRole("link", { name: tab })).toBeVisible();
    }

    // Navigate to Account tab
    await page.getByRole("link", { name: "Account" }).click();
    await expect(page).toHaveURL(/\/dashboard\/settings\/account/);

    // Navigate to Display tab
    await page.getByRole("link", { name: "Display" }).click();
    await expect(page).toHaveURL(/\/dashboard\/settings\/display/);

    // Navigate to Notifications tab
    await page.getByRole("link", { name: "Notifications" }).click();
    await expect(page).toHaveURL(/\/dashboard\/settings\/notifications/);

    // Navigate back to Profile tab
    await page.getByRole("link", { name: "Profile" }).click();
    await expect(page).toHaveURL(/\/dashboard\/settings\/profile/);
  });
});
