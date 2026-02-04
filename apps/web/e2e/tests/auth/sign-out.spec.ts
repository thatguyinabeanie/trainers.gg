import { test, expect } from "@playwright/test";

test.describe("Sign out", () => {
  // Uses stored auth state from setup
  test("signs out and redirects", async ({ page }) => {
    await page.goto("/dashboard");

    // The user menu button may have varying accessible names across design
    // iterations. If this test becomes flaky, add a data-testid to the component.
    const userMenu = page.getByRole("button", {
      name: /user|account|menu|avatar/i,
    });
    await expect(userMenu).toBeVisible({ timeout: 10000 });
    await userMenu.click();

    const signOutButton = page
      .getByRole("button", { name: /sign out|log out/i })
      .or(page.getByRole("menuitem", { name: /sign out|log out/i }));
    await signOutButton.click();

    await expect(page).toHaveURL(/^\/($|sign-in)/);
  });
});
