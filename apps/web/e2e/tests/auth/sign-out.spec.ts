import { test } from "@playwright/test";

test.describe("Sign out", () => {
  // Uses stored auth state from setup
  test("signs out and redirects", async ({ page }) => {
    await page.goto("/dashboard");
    // Look for a sign-out button or user menu
    const userMenu = page.getByRole("button", {
      name: /user|account|menu|avatar/i,
    });
    if (await userMenu.isVisible()) {
      await userMenu.click();
    }
    const signOutButton = page
      .getByRole("button", { name: /sign out|log out/i })
      .or(page.getByRole("menuitem", { name: /sign out|log out/i }));
    await signOutButton.click();
    // Should redirect to home or sign-in
    await page.waitForURL(
      (url) => url.pathname === "/" || url.pathname.includes("/sign-in")
    );
  });
});
