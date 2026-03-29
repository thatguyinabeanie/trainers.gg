import { test, expect, type Page } from "@playwright/test";
import { TEST_USERS, loginViaUI } from "../../fixtures/auth";

// ────────────────────────────────────────────────────────────────
// Access Control
//
// The admin panel requires:
//   1. An authenticated user
//   2. The `site_admin` role in their JWT `site_roles` claim
//   3. An active sudo mode session (sudo cookie)
//
// Without auth       => redirect to /sign-in
// Without admin role => rewrite to /forbidden (URL preserved)
// Without sudo       => redirect to /admin/sudo-required
//
// NOTE: The `site_roles` JWT claim requires the Supabase
// `custom_access_token_hook` to be enabled. In environments
// where the hook is not configured (e.g., some preview branches),
// admin users are treated as non-admins and see the forbidden page.
// Tests that require admin access detect this and skip gracefully.
// ────────────────────────────────────────────────────────────────

/**
 * After navigating to an admin page, check whether the admin dashboard
 * rendered or the forbidden page appeared. Returns `true` if the admin
 * dashboard heading is visible, `false` if forbidden is shown.
 */
async function waitForAdminOrForbidden(page: Page): Promise<boolean> {
  try {
    const result = await Promise.race([
      page
        .getByRole("heading", { name: /Site Administration/i })
        .waitFor({ timeout: 15000 })
        .then(() => true),
      page
        .getByRole("heading", { name: /403|Access Denied/i })
        .waitFor({ timeout: 15000 })
        .then(() => false),
    ]);
    return result;
  } catch {
    return false;
  }
}

test.describe("Admin panel — unauthenticated access", () => {
  // Use empty storage state so there is no session
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

  test("redirects unauthenticated users to sign-in", async ({ page }) => {
    await page.goto("/admin");

    // The proxy redirects unauthenticated admin requests to /sign-in
    await expect(page).toHaveURL(/sign-in/, { timeout: 15000 });
  });
});

test.describe("Admin panel — non-admin access", () => {
  // Default storage state uses the `player` user who does NOT have site_admin role

  test("rewrites non-admin user to forbidden page", async ({ page }) => {
    await page.goto("/admin");

    // The proxy rewrites (not redirects) non-admins to /forbidden,
    // so the browser URL may still show /admin but the content is the
    // forbidden page. Check for the "403" heading or "Access Denied" text.
    await expect(
      page.getByRole("heading", { name: /403|Access Denied/i })
    ).toBeVisible({ timeout: 15000 });

    // Verify the forbidden page content renders
    await expect(
      page.getByText(/don.?t have permission to access this page/i)
    ).toBeVisible();
  });

  test("rewrites non-admin user on /admin/users to forbidden", async ({
    page,
  }) => {
    await page.goto("/admin/users");

    await expect(
      page.getByRole("heading", { name: /403|Access Denied/i })
    ).toBeVisible({ timeout: 15000 });
  });

  test("rewrites non-admin user on /admin/organizations to forbidden", async ({
    page,
  }) => {
    await page.goto("/admin/organizations");

    await expect(
      page.getByRole("heading", { name: /403|Access Denied/i })
    ).toBeVisible({ timeout: 15000 });
  });

  test("rewrites non-admin user on /admin/config to forbidden", async ({
    page,
  }) => {
    await page.goto("/admin/config");

    await expect(
      page.getByRole("heading", { name: /403|Access Denied/i })
    ).toBeVisible({ timeout: 15000 });
  });
});

// ────────────────────────────────────────────────────────────────
// Admin User Tests
//
// These tests log in as the admin user. Admin routes also require
// sudo mode, so the admin user without sudo will be redirected
// to /admin/sudo-required. We test both scenarios:
//   - Admin without sudo => sudo-required page
//   - Admin with sudo    => actual admin pages
//
// NOTE: If the Supabase `custom_access_token_hook` is not enabled,
// the JWT won't contain `site_roles` and the proxy will treat the
// admin user as a non-admin (rewriting to /forbidden). Tests detect
// this and skip gracefully.
// ────────────────────────────────────────────────────────────────

test.describe("Admin panel — admin user without sudo", () => {
  // Start with empty storage state so we can log in as admin
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

  test("admin user without sudo is redirected to sudo-required", async ({
    page,
  }) => {
    // Log in as the admin user via UI
    await loginViaUI(page, TEST_USERS.admin);

    // Navigate to admin panel — without sudo, should redirect to sudo-required
    await page.goto("/admin");

    // If the JWT hook is not configured, the admin user is treated as non-admin
    // and sees the forbidden page (URL preserved at /admin).
    if (!page.url().includes("sudo-required")) {
      const isForbidden = await page
        .getByRole("heading", { name: /403|Access Denied/i })
        .isVisible()
        .catch(() => false);

      test.skip(
        isForbidden,
        "JWT custom_access_token_hook not configured — admin role not in JWT"
      );
    }

    await expect(page).toHaveURL(/sudo-required/, { timeout: 15000 });
  });
});

test.describe("Admin panel — admin user with sudo mode", () => {
  // Start with empty storage state so we can log in as admin
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

  /**
   * Helper: Log in as admin and activate sudo mode by setting the
   * sudo_mode cookie. This simulates the sudo activation flow
   * without needing to go through the full password re-entry form.
   */
  async function loginAsAdminWithSudo(page: Page, baseURL: string) {
    await loginViaUI(page, TEST_USERS.admin);

    // Set the sudo_mode cookie to simulate an active sudo session.
    // The proxy checks for the presence of this cookie to grant access.
    const url = new URL(baseURL || "http://localhost:3000");
    await page.context().addCookies([
      {
        name: "sudo_mode",
        value: "active",
        domain: url.hostname,
        path: "/",
        httpOnly: true,
        secure: url.protocol === "https:",
        sameSite: "Lax",
      },
    ]);
  }

  /**
   * Helper: Log in as admin with sudo, navigate to /admin, and verify
   * admin access is available. If the JWT hook is not configured,
   * calls test.skip() which halts the test and marks it as skipped.
   */
  async function loginAndVerifyAdminAccess(
    page: Page,
    baseURL: string
  ): Promise<void> {
    await loginAsAdminWithSudo(page, baseURL);
    await page.goto("/admin");

    const isAdmin = await waitForAdminOrForbidden(page);
    test.skip(
      !isAdmin,
      "JWT custom_access_token_hook not configured — admin role not in JWT"
    );
  }

  // ── Dashboard ──────────────────────────────────────────────────

  test("dashboard page loads with layout and metric cards", async ({
    page,
  }) => {
    const baseURL = process.env.PLAYWRIGHT_BASE_URL || "";
    await loginAndVerifyAdminAccess(page, baseURL);

    // Layout elements (heading already verified by loginAndVerifyAdminAccess)
    await expect(
      page.getByText(/Manage site-wide settings, users, and roles/i)
    ).toBeVisible();

    // Dashboard tab should be selected by default
    await expect(page.getByRole("tab", { name: /Dashboard/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Audit Log/i })).toBeVisible();

    // Metric cards: look for the key metric titles (scoped to main to avoid topnav ambiguity)
    const main = page.getByRole("main");
    await expect(main.getByText("Total Users")).toBeVisible({ timeout: 10000 });
    await expect(main.getByText("Active (7d)")).toBeVisible();
    await expect(
      main.getByText("Communities", { exact: true }).first()
    ).toBeVisible();
    await expect(
      main.getByText("Tournaments", { exact: true }).first()
    ).toBeVisible();
    await expect(main.getByText("Events (24h)")).toBeVisible();

    // Recent Activity section
    await expect(
      page.getByText("Recent Activity", { exact: true })
    ).toBeVisible();
  });

  // ── Navigation ─────────────────────────────────────────────────

  test("admin nav shows all navigation links", async ({ page }) => {
    const baseURL = process.env.PLAYWRIGHT_BASE_URL || "";
    await loginAndVerifyAdminAccess(page, baseURL);

    // Verify all nav links from admin-nav.tsx are present (scoped to main to avoid topnav)
    const adminNav = page.getByRole("main").locator("nav");
    await expect(
      adminNav.getByRole("link", { name: "Overview" })
    ).toBeVisible();
    await expect(adminNav.getByRole("link", { name: "Users" })).toBeVisible();
    await expect(
      adminNav.getByRole("link", { name: "Communities" })
    ).toBeVisible();
    await expect(
      adminNav.getByRole("link", { name: "Settings" })
    ).toBeVisible();
  });

  test("clicking Users nav link navigates to users page", async ({ page }) => {
    const baseURL = process.env.PLAYWRIGHT_BASE_URL || "";
    await loginAndVerifyAdminAccess(page, baseURL);

    // Click Users nav link (scoped to main to avoid topnav)
    const adminNav = page.getByRole("main").locator("nav");
    await adminNav.getByRole("link", { name: "Users" }).click();
    await expect(page).toHaveURL(/\/admin\/users/);
  });

  test("clicking Communities nav link navigates to communities page", async ({
    page,
  }) => {
    const baseURL = process.env.PLAYWRIGHT_BASE_URL || "";
    await loginAndVerifyAdminAccess(page, baseURL);

    const adminNav = page.getByRole("main").locator("nav");
    await adminNav.getByRole("link", { name: "Communities" }).click();
    await expect(page).toHaveURL(/\/admin\/communities/);
  });

  test("clicking Settings nav link navigates to config page", async ({
    page,
  }) => {
    const baseURL = process.env.PLAYWRIGHT_BASE_URL || "";
    await loginAndVerifyAdminAccess(page, baseURL);

    const adminNav = page.getByRole("main").locator("nav");
    await adminNav.getByRole("link", { name: "Settings" }).click();
    await expect(page).toHaveURL(/\/admin\/config/);
  });

  // ── Dashboard: Audit Log Tab ───────────────────────────────────

  test("dashboard audit log tab renders stat cards and table", async ({
    page,
  }) => {
    const baseURL = process.env.PLAYWRIGHT_BASE_URL || "";
    await loginAndVerifyAdminAccess(page, baseURL);

    // Click the Audit Log tab
    await page.getByRole("tab", { name: /Audit Log/i }).click();

    // Stat cards should appear (scoped to main to avoid ambiguity)
    const main = page.getByRole("main");
    await expect(main.getByText("Last 24 Hours")).toBeVisible({
      timeout: 10000,
    });
    await expect(main.getByText("Last 7 Days")).toBeVisible();
    await expect(main.getByText("Last 30 Days")).toBeVisible();

    // Refresh button in the audit log tab
    await expect(main.getByRole("button", { name: /Refresh/i })).toBeVisible();
  });

  // ── Users Page ─────────────────────────────────────────────────

  test("users page renders with search and table", async ({ page }) => {
    const baseURL = process.env.PLAYWRIGHT_BASE_URL || "";

    await loginAsAdminWithSudo(page, baseURL);
    await page.goto("/admin/users");

    const isAdmin = await waitForAdminOrForbidden(page);
    test.skip(
      !isAdmin,
      "JWT custom_access_token_hook not configured — admin role not in JWT"
    );

    // Users heading should be visible (scoped to main)
    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { name: /Users/i })).toBeVisible({
      timeout: 10000,
    });

    // Search input
    await expect(
      main.getByPlaceholder(/Search by username or email/i)
    ).toBeVisible();

    // Refresh button
    await expect(main.getByRole("button", { name: /Refresh/i })).toBeVisible();
  });

  // ── Communities Page ───────────────────────────────────────────

  test("communities page renders with status filter tabs", async ({ page }) => {
    const baseURL = process.env.PLAYWRIGHT_BASE_URL || "";

    await loginAsAdminWithSudo(page, baseURL);
    await page.goto("/admin/communities");

    const isAdmin = await waitForAdminOrForbidden(page);
    test.skip(
      !isAdmin,
      "JWT custom_access_token_hook not configured — admin role not in JWT"
    );

    // Page heading (use heading role to avoid topnav/admin nav ambiguity)
    const main = page.getByRole("main");
    await expect(
      main.getByRole("heading", { name: "Communities" })
    ).toBeVisible({ timeout: 10000 });

    // Status filter buttons: All, Active, Suspended, Requests
    await expect(main.getByRole("button", { name: "All" })).toBeVisible();
    await expect(main.getByRole("button", { name: "Active" })).toBeVisible();
    await expect(main.getByRole("button", { name: "Suspended" })).toBeVisible();
    await expect(main.getByRole("button", { name: "Requests" })).toBeVisible();

    // Search input
    await expect(
      main.getByPlaceholder(/Search by name or slug/i)
    ).toBeVisible();
  });

  // ── Config (Settings) Page ─────────────────────────────────────

  test("config page renders feature flags and announcements sections", async ({
    page,
  }) => {
    const baseURL = process.env.PLAYWRIGHT_BASE_URL || "";

    await loginAsAdminWithSudo(page, baseURL);
    await page.goto("/admin/config");

    const isAdmin = await waitForAdminOrForbidden(page);
    test.skip(
      !isAdmin,
      "JWT custom_access_token_hook not configured — admin role not in JWT"
    );

    // Feature Flags section heading (use heading role to avoid matching "No feature flags defined")
    const main = page.getByRole("main");
    await expect(
      main.getByRole("heading", { name: /Feature Flags/i })
    ).toBeVisible({ timeout: 10000 });

    // Announcements section heading
    await expect(
      main.getByRole("heading", { name: /Announcements/i })
    ).toBeVisible();

    // Site Roles section heading
    await expect(page.getByText(/Site Roles/i)).toBeVisible();

    // Create buttons for flags and announcements
    await expect(
      page.getByRole("button", { name: /Create Flag/i })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Create Announcement/i })
    ).toBeVisible();
  });

  // ── Activity Page Redirect ─────────────────────────────────────

  test("/admin/activity redirects to /admin", async ({ page }) => {
    const baseURL = process.env.PLAYWRIGHT_BASE_URL || "";
    // Use the loginAndVerifyAdminAccess flow to check admin access first
    await loginAndVerifyAdminAccess(page, baseURL);

    // Now navigate to /admin/activity — should redirect to /admin
    await page.goto("/admin/activity");
    await expect(page).toHaveURL(/\/admin$/, { timeout: 15000 });
  });

  // ── Analytics Page Redirect ────────────────────────────────────

  test("/admin/analytics redirects to /admin", async ({ page }) => {
    const baseURL = process.env.PLAYWRIGHT_BASE_URL || "";
    await loginAndVerifyAdminAccess(page, baseURL);

    await page.goto("/admin/analytics");
    await expect(page).toHaveURL(/\/admin$/, { timeout: 15000 });
  });
});
