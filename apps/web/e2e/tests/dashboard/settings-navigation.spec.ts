import { test, expect } from "@playwright/test";

test.describe("Settings navigation", () => {
  test("shows settings tabs and allows navigation", async ({ page }) => {
    await page.goto("/dashboard/settings/profile");

    // Verify profile tab is active
    await expect(page.getByRole("link", { name: "Profile" })).toHaveAttribute(
      "class",
      /border-primary/
    );

    // Wait for hydration before clicking navigation links
    // On cold Vercel previews, clicks during hydration get swallowed
    await page.waitForLoadState("networkidle");

    // Navigate to account tab
    await page.getByRole("link", { name: "Account" }).click();
    await expect(page).toHaveURL(/\/dashboard\/settings\/account/);
    await expect(page.getByRole("link", { name: "Account" })).toHaveAttribute(
      "class",
      /border-primary/
    );

    // Navigate back to profile tab
    await page.getByRole("link", { name: "Profile" }).click();
    await expect(page).toHaveURL(/\/dashboard\/settings\/profile/);
  });

  test("shows profile settings with display name and bio", async ({ page }) => {
    await page.goto("/dashboard/settings/profile");

    await expect(
      page.getByText("Profile", { exact: true }).first()
    ).toBeVisible();
    await expect(page.getByLabel("Display Name")).toBeVisible();
    await expect(page.getByLabel("Bio")).toBeVisible();
  });

  test("shows account settings with email", async ({ page }) => {
    await page.goto("/dashboard/settings/account");

    await expect(
      page.getByText("Email", { exact: true }).first()
    ).toBeVisible();
    await expect(
      page.getByText("Security", { exact: true }).first()
    ).toBeVisible();
  });
});
