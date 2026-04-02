import { test, expect } from "@playwright/test";
import { TEST_USERS, loginViaUI } from "../../fixtures/auth";

// =============================================================================
// Community Dashboard — /dashboard/community/vgc-league
//
// The VGC League community is owned by admin@trainers.local (admin_trainer).
// All tests in this file log in fresh as admin so the community layout's
// ownership/access check passes without relying on the default player session.
// =============================================================================

test.describe("Community dashboard", () => {
  // Start every test with no session so we can log in as admin.
  // The default storageState (player.json) does not own vgc-league.
  test.use({
    storageState: { cookies: [], origins: [] },
    extraHTTPHeaders: {
      ...(process.env.VERCEL_AUTOMATION_BYPASS_SECRET
        ? {
            "x-vercel-protection-bypass":
              process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
          }
        : {}),
    },
  });

  // ---------------------------------------------------------------------------
  // Overview page
  // ---------------------------------------------------------------------------

  test.describe("Overview page", () => {
    test("loads with the four stats cards", async ({ page }) => {
      await loginViaUI(page, TEST_USERS.admin);
      await page.goto("/dashboard/community/vgc-league");

      const main = page.getByRole("main");

      // Page header title
      await expect(
        main.getByText("Overview", { exact: true }).first()
      ).toBeVisible({ timeout: 10000 });

      // Four stat card labels
      for (const label of [
        "Tournaments",
        "Unique Players",
        "Total Entries",
        "Staff",
      ]) {
        await expect(
          main.getByText(label, { exact: true }).first()
        ).toBeVisible({ timeout: 10000 });
      }
    });

    test("stats cards show non-zero values from seed data", async ({
      page,
    }) => {
      await loginViaUI(page, TEST_USERS.admin);
      await page.goto("/dashboard/community/vgc-league");

      const main = page.getByRole("main");

      // Wait for the page to settle
      await expect(
        main.getByText("Overview", { exact: true }).first()
      ).toBeVisible({ timeout: 10000 });

      // The seed creates 3 tournaments for vgc-league — the stat should show "3"
      await expect(main.getByText("3").first()).toBeVisible({ timeout: 10000 });

      // Unique Players and Total Entries should be non-zero
      await expect(main.getByText("122").first()).toBeVisible();
      await expect(main.getByText("142").first()).toBeVisible();
    });

    test("shows Upcoming Tournaments card", async ({ page }) => {
      await loginViaUI(page, TEST_USERS.admin);
      await page.goto("/dashboard/community/vgc-league");

      const main = page.getByRole("main");
      await expect(
        main.getByText("Overview", { exact: true }).first()
      ).toBeVisible({ timeout: 10000 });

      await expect(main.getByText(/Upcoming Tournaments/i)).toBeVisible({
        timeout: 10000,
      });
    });

    test("shows Recent Activity section", async ({ page }) => {
      await loginViaUI(page, TEST_USERS.admin);
      await page.goto("/dashboard/community/vgc-league");

      const main = page.getByRole("main");
      await expect(
        main.getByText("Overview", { exact: true }).first()
      ).toBeVisible({ timeout: 10000 });

      await expect(main.getByText(/Recent Activity/i)).toBeVisible({
        timeout: 10000,
      });
    });

    test("shows Top Regulars section", async ({ page }) => {
      await loginViaUI(page, TEST_USERS.admin);
      await page.goto("/dashboard/community/vgc-league");

      const main = page.getByRole("main");
      await expect(
        main.getByText("Overview", { exact: true }).first()
      ).toBeVisible({ timeout: 10000 });

      await expect(main.getByText(/Top Regulars/i)).toBeVisible({
        timeout: 10000,
      });
    });

    test("Create Tournament button links to the create page", async ({
      page,
    }) => {
      await loginViaUI(page, TEST_USERS.admin);
      await page.goto("/dashboard/community/vgc-league");

      const main = page.getByRole("main");
      await expect(
        main.getByText("Overview", { exact: true }).first()
      ).toBeVisible({ timeout: 10000 });

      const createLink = main
        .getByRole("link", { name: /Create Tournament/i })
        .first();
      await expect(createLink).toBeVisible({ timeout: 10000 });
      await expect(createLink).toHaveAttribute(
        "href",
        /\/dashboard\/community\/vgc-league\/tournaments\/create/
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Tournaments page
  // ---------------------------------------------------------------------------

  test.describe("Tournaments page", () => {
    test("loads and shows Create Tournament button in the page header", async ({
      page,
    }) => {
      await loginViaUI(page, TEST_USERS.admin);
      await page.goto("/dashboard/community/vgc-league/tournaments");

      const main = page.getByRole("main");

      await expect(
        main.getByText("Tournaments", { exact: true }).first()
      ).toBeVisible({ timeout: 10000 });

      // The Create Tournament button lives in the page header (PageHeader slot)
      await expect(
        main.getByRole("link", { name: /Create Tournament/i })
      ).toBeVisible({ timeout: 10000 });
    });

    test("Create Tournament link points to the create route", async ({
      page,
    }) => {
      await loginViaUI(page, TEST_USERS.admin);
      await page.goto("/dashboard/community/vgc-league/tournaments");

      const main = page.getByRole("main");
      await expect(
        main.getByText("Tournaments", { exact: true }).first()
      ).toBeVisible({ timeout: 10000 });

      await expect(
        main.getByRole("link", { name: /Create Tournament/i })
      ).toHaveAttribute(
        "href",
        /\/dashboard\/community\/vgc-league\/tournaments\/create/
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Staff page
  // ---------------------------------------------------------------------------

  test.describe("Staff page", () => {
    test("loads and shows the Role Permissions card", async ({ page }) => {
      await loginViaUI(page, TEST_USERS.admin);
      await page.goto("/dashboard/community/vgc-league/staff");

      const main = page.getByRole("main");

      await expect(
        main.getByText("Staff", { exact: true }).first()
      ).toBeVisible({
        timeout: 10000,
      });

      // The RolePermissionsCard always renders its "Role Permissions" label
      await expect(main.getByText(/Role Permissions/i)).toBeVisible({
        timeout: 10000,
      });
    });

    test("Role Permissions card shows Admin, Head Judge, and Judge columns", async ({
      page,
    }) => {
      await loginViaUI(page, TEST_USERS.admin);
      await page.goto("/dashboard/community/vgc-league/staff");

      const main = page.getByRole("main");
      await expect(
        main.getByText("Staff", { exact: true }).first()
      ).toBeVisible({
        timeout: 10000,
      });

      // Wait for the Role Permissions card to render (it's below the drag-drop UI)
      await expect(main.getByText(/Role Permissions/i)).toBeVisible({
        timeout: 15000,
      });

      // Column headers inside the permissions table
      await expect(
        main.getByRole("columnheader", { name: /Admin/i })
      ).toBeVisible({ timeout: 10000 });
      await expect(
        main.getByRole("columnheader", { name: /Head Judge/i })
      ).toBeVisible();
      await expect(
        main.getByRole("columnheader", { name: /Judge/i })
      ).toBeVisible();
    });

    test("Role Permissions card notes that owner has full access", async ({
      page,
    }) => {
      await loginViaUI(page, TEST_USERS.admin);
      await page.goto("/dashboard/community/vgc-league/staff");

      const main = page.getByRole("main");
      await expect(
        main.getByText("Staff", { exact: true }).first()
      ).toBeVisible({
        timeout: 10000,
      });

      await expect(
        main.getByText(/Owner has full access to all permissions/i)
      ).toBeVisible({ timeout: 10000 });
    });
  });

  // ---------------------------------------------------------------------------
  // Settings page
  // ---------------------------------------------------------------------------

  test.describe("Settings page", () => {
    test("loads and shows the three sectioned cards", async ({ page }) => {
      await loginViaUI(page, TEST_USERS.admin);
      await page.goto("/dashboard/community/vgc-league/settings");

      const main = page.getByRole("main");

      await expect(
        main.getByText("Settings", { exact: true }).first()
      ).toBeVisible({ timeout: 10000 });

      // Three DashboardCard labels rendered by SettingsForm
      await expect(main.getByText("Community Identity")).toBeVisible({
        timeout: 10000,
      });
      await expect(main.getByText("About")).toBeVisible();
      await expect(main.getByText("Social Links")).toBeVisible();
    });

    test("Community Identity card shows the name input pre-filled", async ({
      page,
    }) => {
      await loginViaUI(page, TEST_USERS.admin);
      await page.goto("/dashboard/community/vgc-league/settings");

      const main = page.getByRole("main");
      await expect(
        main.getByText("Settings", { exact: true }).first()
      ).toBeVisible({ timeout: 10000 });

      // Community Name input should be pre-filled from seed data
      const nameInput = main.getByLabel("Community Name");
      await expect(nameInput).toBeVisible({ timeout: 10000 });
      await expect(nameInput).toHaveValue("VGC League");
    });

    test("About card shows description textarea and character counter", async ({
      page,
    }) => {
      await loginViaUI(page, TEST_USERS.admin);
      await page.goto("/dashboard/community/vgc-league/settings");

      const main = page.getByRole("main");
      await expect(
        main.getByText("Settings", { exact: true }).first()
      ).toBeVisible({ timeout: 10000 });

      await expect(main.getByLabel("Description")).toBeVisible({
        timeout: 10000,
      });

      // Character counter "X / 500"
      await expect(main.getByText(/\/ 500/)).toBeVisible();
    });

    test("Save button is present", async ({ page }) => {
      await loginViaUI(page, TEST_USERS.admin);
      await page.goto("/dashboard/community/vgc-league/settings");

      const main = page.getByRole("main");
      await expect(
        main.getByText("Settings", { exact: true }).first()
      ).toBeVisible({ timeout: 10000 });

      await expect(main.getByRole("button", { name: /Save/i })).toBeVisible({
        timeout: 10000,
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Access control
  // ---------------------------------------------------------------------------

  test.describe("Access control", () => {
    test("unauthenticated user is redirected to sign-in", async ({ page }) => {
      // storageState is already empty for this describe block
      await page.goto("/dashboard/community/vgc-league");

      await expect(page).toHaveURL(/sign-in/, { timeout: 15000 });
    });

    test("player without community access is redirected to the public community page", async ({
      page,
    }) => {
      // Log in as the player user who is NOT a member of vgc-league
      // (player is owner of pallet-town, not vgc-league)
      await loginViaUI(page, TEST_USERS.player);
      await page.goto("/dashboard/community/vgc-league");

      // Layout redirects non-members to the public community page
      await expect(page).toHaveURL(/\/communities\/vgc-league/, {
        timeout: 15000,
      });
    });
  });
});
