import { test, expect } from "@playwright/test";

// ────────────────────────────────────────────────────────────────────────────────
// Builder Landing — E2E Spec (Phase 1, local-drafts-only)
//
// All flows run as a guest (no sign-in). The suite uses an empty storage state
// so the session cookie from auth.setup.ts is never applied.
//
// Covered scenarios:
//   1. Landing → editor → back: empty state → New Team → editor URL → back →
//      draft appears as a row
//   2. Deep-link reload: reload /builder/t/<id> directly, editor stays mounted
//   3. Invalid id redirect: /builder/t/123 (no "local-" prefix) → /builder
//   4. Multi-draft: create two drafts → both rows visible on landing
//   5. Delete: row's overflow menu → Delete → draft disappears
//
// No DB interaction; all state is localStorage under
//   trainersgg.builder.localDrafts.v2
//
// Auth note: this entire file uses `storageState: { cookies: [], origins: [] }`
// so the default player storage state is never applied. Each describe block
// clears the localStorage key before each test for isolation.
// ────────────────────────────────────────────────────────────────────────────────

const LS_KEY = "trainersgg.builder.localDrafts.v2";

// All tests in this file are guest (unauthenticated) flows.
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

// Helper: clear the local drafts store before each test so the empty state
// always renders on a fresh visit, regardless of test ordering.
async function clearLocalDrafts(page: import("@playwright/test").Page) {
  // Navigate to origin so localStorage is accessible, then clear the key.
  // Must be called after an initial page.goto() so we have an origin context.
  await page.evaluate((key) => {
    localStorage.removeItem(key);
  }, LS_KEY);
}

// ─── Scenario 1: Landing → editor → back ─────────────────────────────────────

test.describe("Builder landing — empty state and New Team flow", () => {
  test("shows empty state on a fresh visit", async ({ page }) => {
    await page.goto("/builder");
    await clearLocalDrafts(page);
    await page.reload();

    const main = page.getByRole("main");

    // Page heading
    await expect(
      main.getByRole("heading", { name: /your teams/i })
    ).toBeVisible({ timeout: 15000 });

    // Empty state message
    await expect(
      main.getByText(/no teams yet/i)
    ).toBeVisible({ timeout: 10000 });
  });

  test("New Team button navigates to a local-draft editor URL", async ({
    page,
  }) => {
    await page.goto("/builder");
    await clearLocalDrafts(page);
    await page.reload();

    const main = page.getByRole("main");

    // Wait for hydration — landing must show empty state before clicking
    await expect(main.getByText(/no teams yet/i)).toBeVisible({
      timeout: 15000,
    });

    // Click the New Team button (there are two — header and empty-state CTA;
    // either works, prefer the header button by role first, fall back to label)
    const newTeamButton = main
      .getByRole("button", { name: /new team/i })
      .first();
    await newTeamButton.click();

    // URL should become /builder/t/local-<suffix>
    await page.waitForURL(/\/builder\/t\/local-/, { timeout: 15000 });
    expect(page.url()).toMatch(/\/builder\/t\/local-[a-z0-9]+$/);
  });

  test("pressing browser back after New Team returns to landing with the draft row", async ({
    page,
  }) => {
    await page.goto("/builder");
    await clearLocalDrafts(page);
    await page.reload();

    const main = page.getByRole("main");
    await expect(main.getByText(/no teams yet/i)).toBeVisible({
      timeout: 15000,
    });

    // Create a new team
    await main.getByRole("button", { name: /new team/i }).first().click();
    await page.waitForURL(/\/builder\/t\/local-/, { timeout: 15000 });

    // Go back
    await page.goBack();
    await page.waitForURL(/\/builder$/, { timeout: 15000 });

    // The draft row should appear (empty state is gone)
    // TeamRow renders the team name; default is "Untitled Team"
    await expect(main.getByText(/untitled team/i)).toBeVisible({
      timeout: 15000,
    });

    // Sanity: empty-state text should no longer be visible
    await expect(main.getByText(/no teams yet/i)).not.toBeVisible();
  });
});

// ─── Scenario 2: Deep-link reload ────────────────────────────────────────────

test.describe("Builder editor — deep-link reload", () => {
  test("reloading /builder/t/<id> directly keeps the editor mounted, not redirected", async ({
    page,
  }) => {
    // First create a draft so we have a real local-<id> written to localStorage
    await page.goto("/builder");
    await clearLocalDrafts(page);
    await page.reload();

    const main = page.getByRole("main");
    await expect(main.getByText(/no teams yet/i)).toBeVisible({
      timeout: 15000,
    });

    await main.getByRole("button", { name: /new team/i }).first().click();
    await page.waitForURL(/\/builder\/t\/local-/, { timeout: 15000 });

    const editorUrl = page.url();

    // Hard-reload the editor URL — localStorage persists across reloads, so
    // the draft should still exist and the workspace should hydrate normally
    await page.reload();

    // Must remain on the editor URL — LocalBuilderWorkspace redirects to
    // /builder only when the draft is *missing* after hydration.
    // The draft is present in localStorage, so no redirect should occur.
    await expect(page).toHaveURL(editorUrl, { timeout: 15000 });

    // The landing "Your Teams" heading must not appear (we are in the editor)
    await expect(
      page.getByRole("heading", { name: /your teams/i })
    ).not.toBeVisible();
  });
});

// ─── Scenario 3: Invalid id redirect ─────────────────────────────────────────

test.describe("Builder editor — invalid id redirect", () => {
  test("navigating to /builder/t/123 (no local- prefix) redirects to /builder", async ({
    page,
  }) => {
    await page.goto("/builder/t/123");

    // The page should redirect to /builder
    await page.waitForURL(/\/builder$/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/builder$/);
  });

  test("navigating to /builder/t/not-a-local-id redirects to /builder", async ({
    page,
  }) => {
    await page.goto("/builder/t/not-a-local-id");

    await page.waitForURL(/\/builder$/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/builder$/);
  });

  test("navigating to /builder/t/abc123def (no local- prefix) redirects to /builder", async ({
    page,
  }) => {
    await page.goto("/builder/t/abc123def");

    await page.waitForURL(/\/builder$/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/builder$/);
  });
});

// ─── Scenario 4: Multi-draft ──────────────────────────────────────────────────

test.describe("Builder landing — multi-draft", () => {
  test("creating two drafts shows both as rows on the landing", async ({
    page,
  }) => {
    await page.goto("/builder");
    await clearLocalDrafts(page);
    await page.reload();

    const main = page.getByRole("main");
    await expect(main.getByText(/no teams yet/i)).toBeVisible({
      timeout: 15000,
    });

    // Create first draft
    await main.getByRole("button", { name: /new team/i }).first().click();
    await page.waitForURL(/\/builder\/t\/local-/, { timeout: 15000 });

    // Navigate back to landing
    await page.goto("/builder");
    await expect(main.getByRole("heading", { name: /your teams/i })).toBeVisible(
      { timeout: 15000 }
    );

    // Create second draft
    await main.getByRole("button", { name: /new team/i }).first().click();
    await page.waitForURL(/\/builder\/t\/local-/, { timeout: 15000 });

    // Navigate back to landing
    await page.goto("/builder");
    await expect(main.getByRole("heading", { name: /your teams/i })).toBeVisible(
      { timeout: 15000 }
    );

    // Both drafts should appear — default name is "Untitled Team", so we expect
    // at least two rows with that name
    const rows = main.getByText(/untitled team/i);
    await expect(rows.first()).toBeVisible({ timeout: 10000 });
    // Count: should be exactly 2
    await expect(rows).toHaveCount(2, { timeout: 10000 });
  });
});

// ─── Scenario 5: Delete ───────────────────────────────────────────────────────

test.describe("Builder landing — delete draft", () => {
  test("deleting a draft via the overflow menu removes it from the list", async ({
    page,
  }) => {
    await page.goto("/builder");
    await clearLocalDrafts(page);
    await page.reload();

    const main = page.getByRole("main");
    await expect(main.getByText(/no teams yet/i)).toBeVisible({
      timeout: 15000,
    });

    // Create a draft
    await main.getByRole("button", { name: /new team/i }).first().click();
    await page.waitForURL(/\/builder\/t\/local-/, { timeout: 15000 });

    // Return to landing
    await page.goto("/builder");
    await expect(main.getByRole("heading", { name: /your teams/i })).toBeVisible(
      { timeout: 15000 }
    );

    // Verify the draft row is present
    await expect(main.getByText(/untitled team/i)).toBeVisible({
      timeout: 10000,
    });

    // Open the overflow ("Team options") menu on the row
    // TeamRow renders a DropdownMenuTrigger with aria-label="Team options"
    const optionsButton = main.getByRole("button", { name: /team options/i });
    await optionsButton.waitFor({ state: "visible", timeout: 10000 });
    await optionsButton.click();

    // Click "Delete" in the dropdown
    const deleteItem = page.getByRole("menuitem", { name: /delete/i });
    await deleteItem.waitFor({ state: "visible", timeout: 5000 });
    await deleteItem.click();

    // Row should disappear and empty state should return
    await expect(main.getByText(/untitled team/i)).not.toBeVisible({
      timeout: 10000,
    });
    await expect(main.getByText(/no teams yet/i)).toBeVisible({
      timeout: 10000,
    });
  });

  test("deleting one of two drafts leaves the other intact", async ({
    page,
  }) => {
    // Seed localStorage directly with two named drafts to avoid the double
    // navigate-and-create cycle, which is flaky if the back-navigation timing
    // varies across environments.
    await page.goto("/builder");
    await clearLocalDrafts(page);

    await page.evaluate((key) => {
      const now = new Date().toISOString();
      const store = {
        version: 2,
        drafts: [
          {
            id: "local-aaa1",
            team: {
              id: -1,
              name: "Team Alpha",
              format: "gen9championsvgc2026regma",
              format_legal: null,
              description: null,
              notes: null,
              tags: null,
              is_public: null,
              parent_team_id: null,
              created_by: -1,
              created_at: now,
              updated_at: now,
              team_pokemon: [],
            },
            createdAt: now,
            updatedAt: now,
          },
          {
            id: "local-bbb2",
            team: {
              id: -1,
              name: "Team Beta",
              format: "gen9championsvgc2026regma",
              format_legal: null,
              description: null,
              notes: null,
              tags: null,
              is_public: null,
              parent_team_id: null,
              created_by: -1,
              created_at: now,
              updated_at: now,
              team_pokemon: [],
            },
            createdAt: now,
            updatedAt: now,
          },
        ],
      };
      localStorage.setItem(key, JSON.stringify(store));
    }, LS_KEY);

    await page.reload();

    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { name: /your teams/i })).toBeVisible(
      { timeout: 15000 }
    );

    // Both rows visible
    await expect(main.getByText("Team Alpha")).toBeVisible({ timeout: 10000 });
    await expect(main.getByText("Team Beta")).toBeVisible({ timeout: 10000 });

    // Delete "Team Alpha" via its overflow menu. The row renders a
    // DropdownMenuTrigger aria-label="Team options" scoped inside its row.
    // Use the row's container to scope the button click.
    //
    // TeamRow renders a `div.group` that contains the team name and the options button.
    // We find the group by locating the name text and going up to the group, then
    // clicking the options trigger within it.
    const alphaRow = main.locator("div.group", {
      has: main.getByText("Team Alpha"),
    });
    const alphaOptionsButton = alphaRow.getByRole("button", {
      name: /team options/i,
    });

    await alphaOptionsButton.waitFor({ state: "visible", timeout: 10000 });
    await alphaOptionsButton.click();

    const deleteItem = page.getByRole("menuitem", { name: /delete/i });
    await deleteItem.waitFor({ state: "visible", timeout: 5000 });
    await deleteItem.click();

    // Team Alpha is gone; Team Beta remains
    await expect(main.getByText("Team Alpha")).not.toBeVisible({
      timeout: 10000,
    });
    await expect(main.getByText("Team Beta")).toBeVisible({ timeout: 10000 });
  });
});
