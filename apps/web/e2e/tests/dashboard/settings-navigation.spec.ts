import { test, expect } from "@playwright/test";

test.describe("Settings navigation", () => {
  // E2E auth bypass via x-e2e-auth-bypass header (set in playwright.config.ts)
  // proxy.ts sets e2e-test-mode cookie, AuthProvider uses mock user

  test("shows settings tabs and allows navigation", async ({ page }) => {
    await page.goto("/dashboard/settings/profile");

    // Verify profile tab is active
    await expect(page.getByRole("link", { name: "Profile" })).toHaveAttribute(
      "class",
      /border-primary/
    );

    // Navigate to account tab
    await page.getByRole("link", { name: "Account" }).click();
    await expect(page).toHaveURL("/dashboard/settings/account");
    await expect(page.getByRole("link", { name: "Account" })).toHaveAttribute(
      "class",
      /border-primary/
    );

    // Navigate back to profile tab
    await page.getByRole("link", { name: "Profile" }).click();
    await expect(page).toHaveURL("/dashboard/settings/profile");
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
