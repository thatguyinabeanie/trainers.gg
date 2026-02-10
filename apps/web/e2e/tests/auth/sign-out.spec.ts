import { test, expect } from "@playwright/test";

test.describe("Sign out", () => {
  test("signs out and redirects", async ({ page }) => {
    await page.goto("/dashboard");

    const userMenu = page.getByRole("button", { name: /user menu/i });
    await expect(userMenu).toBeVisible({ timeout: 10000 });
    await userMenu.click();

    const signOutButton = page
      .getByRole("button", { name: /sign out|log out/i })
      .or(page.getByRole("menuitem", { name: /sign out|log out/i }));
    await signOutButton.click();

    // After sign-out, should redirect to home or sign-in page
    await expect(page).toHaveURL(/\/(sign-in)?(\?.*)?$/);
  });
});
