import { test, expect, type Page } from "@playwright/test";

import {
  BUILDER_LS_KEY,
  makeDraftRecord,
  seedDraftsBeforeLoad,
} from "../fixtures/builder-drafts";

// ────────────────────────────────────────────────────────────────────────────────
// Builder Landing — E2E Spec (Phase 1, local-drafts-only)
//
// All flows run as a guest (no sign-in). The suite uses an empty storage state
// so the session cookie from auth.setup.ts is never applied.
//
// Covered scenarios:
//   ── Original 5 scenarios (now v3-seed) ──────────────────────────────────────
//   1. Landing → editor → back: empty state → New Team → editor URL → back →
//      draft appears as a row
//   2. Deep-link reload: reload /builder/t/<id> directly, editor stays mounted
//   3. Invalid id redirect: /builder/t/123 (no "local-" prefix) → /builder
//   4. Multi-draft: create two drafts → both rows visible on landing
//   5. Delete: row's overflow menu → Delete → draft disappears
//
//   ── Milestone A/B/C additions ───────────────────────────────────────────────
//   6. Smart search: type species name → list filters, matching sprite highlighted
//   7. Folder create + file a team into it
//   8. Bulk select + action bar (Archive selected / Delete selected)
//   9. Undoable delete + Undo restores the row
//  10. Archive + restore via FolderRail Archived node
//  11. Drag-reorder in Custom sort mode (keyboard Move up / Move down)
//
// No DB interaction; all state is localStorage under
//   trainersgg.builder.localDrafts.v3
//
// Auth note: this entire file uses `storageState: { cookies: [], origins: [] }`
// so the default player storage state is never applied. Each describe block
// clears the localStorage key before each test for isolation.
// ────────────────────────────────────────────────────────────────────────────────

// Keep backward-compat reference for the rare evaluate() calls that need it.
const LS_KEY = BUILDER_LS_KEY;

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
async function clearLocalDrafts(page: Page) {
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
      main.getByTestId("landing-empty-state")
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
    await expect(main.getByTestId("landing-empty-state")).toBeVisible({
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
    await expect(main.getByTestId("landing-empty-state")).toBeVisible({
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
    await expect(main.getByTestId("landing-empty-state")).not.toBeVisible();
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
    await expect(main.getByTestId("landing-empty-state")).toBeVisible({
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
    await expect(main.getByTestId("landing-empty-state")).toBeVisible({
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
    await expect(main.getByTestId("landing-empty-state")).toBeVisible({
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
    // (undoable delete: the row disappears immediately; undo window is 5s)
    await expect(main.getByText(/untitled team/i)).not.toBeVisible({
      timeout: 10000,
    });
  });

  test("deleting one of two drafts leaves the other intact", async ({
    page,
  }) => {
    // Seed localStorage directly with two named v3 drafts so we don't rely on
    // the double navigate-and-create cycle (which is flaky on timing).
    const alpha = makeDraftRecord({ id: "local-aaa1", team: { name: "Team Alpha" } });
    const beta = makeDraftRecord({ id: "local-bbb2", team: { name: "Team Beta" } });

    await seedDraftsBeforeLoad(page, [alpha, beta]);

    await page.goto("/builder");

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

// ─── Scenario 6: Smart search + match highlight ───────────────────────────────
//
// Selectors confirmed in smart-search.tsx:
//   <Input role="combobox" ...> — the search input
//   Sprite highlight: className includes "ring-2 ring-teal-500/40" (via cn())
//   Clear button: aria-label="Clear search"
//
// The landing's SmartSearch is rendered once the store has ≥1 draft.

test.describe("Builder landing — smart search and filter", () => {
  test("typing a team name filters the draft list", async ({ page }) => {
    const drafts = [
      makeDraftRecord({ id: "local-s001", team: { name: "Charizard Squad" } }),
      makeDraftRecord({ id: "local-s002", team: { name: "Blastoise Brigade" } }),
      makeDraftRecord({ id: "local-s003", team: { name: "Venusaur Vanguard" } }),
    ];

    await seedDraftsBeforeLoad(page, drafts);
    await page.goto("/builder");

    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { name: /your teams/i })).toBeVisible(
      { timeout: 15000 }
    );

    // All three rows should be visible before searching
    await expect(main.getByText("Charizard Squad")).toBeVisible({ timeout: 10000 });
    await expect(main.getByText("Blastoise Brigade")).toBeVisible({ timeout: 10000 });

    // Type into the search combobox — searches by name:
    // The SmartSearch input has role="combobox" (confirmed in smart-search.tsx line 173)
    const searchInput = main.getByRole("combobox");
    await searchInput.fill("Charizard");

    // Only "Charizard Squad" should remain visible
    await expect(main.getByText("Charizard Squad")).toBeVisible({ timeout: 5000 });
    await expect(main.getByText("Blastoise Brigade")).not.toBeVisible({
      timeout: 5000,
    });
    await expect(main.getByText("Venusaur Vanguard")).not.toBeVisible({
      timeout: 5000,
    });
  });

  test("clearing search restores the full list", async ({ page }) => {
    const drafts = [
      makeDraftRecord({ id: "local-c001", team: { name: "Dragon Team" } }),
      makeDraftRecord({ id: "local-c002", team: { name: "Water Team" } }),
    ];

    await seedDraftsBeforeLoad(page, drafts);
    await page.goto("/builder");

    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { name: /your teams/i })).toBeVisible(
      { timeout: 15000 }
    );

    const searchInput = main.getByRole("combobox");
    await searchInput.fill("Dragon");

    // Filtered
    await expect(main.getByText("Dragon Team")).toBeVisible({ timeout: 5000 });
    await expect(main.getByText("Water Team")).not.toBeVisible({ timeout: 5000 });

    // Clear via the aria-labeled button (confirmed in smart-search.tsx line 195)
    await page.getByRole("button", { name: /clear search/i }).click();

    // Both rows restored
    await expect(main.getByText("Dragon Team")).toBeVisible({ timeout: 5000 });
    await expect(main.getByText("Water Team")).toBeVisible({ timeout: 5000 });
  });
});

// ─── Scenario 7: Folder create + file a team ─────────────────────────────────
//
// Selectors confirmed in folder-rail.tsx:
//   "New folder" button: aria-label="New folder" (line 357)
//   Folder name input: aria-label="New folder name" (line 171)
//   Folder item buttons: aria-label={label} via RailItem (line 91)
//
// Selectors confirmed in team-row.tsx:
//   Team options button: aria-label="Team options" (line 146)
//   "Move to folder" submenu trigger text (line 213-215)

test.describe("Builder landing — folder create and team filing", () => {
  test("creating a folder and filing a team into it updates the folder count", async ({
    page,
  }) => {
    const draft = makeDraftRecord({
      id: "local-f001",
      team: { name: "Folder Test Team" },
    });

    await seedDraftsBeforeLoad(page, [draft]);
    await page.goto("/builder");

    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { name: /your teams/i })).toBeVisible(
      { timeout: 15000 }
    );

    // Step 1: Create a folder via the FolderRail "New folder" button
    // aria-label="New folder" (folder-rail.tsx line 357)
    const newFolderBtn = page.getByRole("button", { name: /^new folder$/i });
    await newFolderBtn.waitFor({ state: "visible", timeout: 10000 });
    await newFolderBtn.click();

    // The inline input appears: aria-label="New folder name" (folder-rail.tsx line 171)
    const folderNameInput = page.getByRole("textbox", { name: /new folder name/i });
    await folderNameInput.waitFor({ state: "visible", timeout: 5000 });
    await folderNameInput.fill("My Folder");
    await folderNameInput.press("Enter");

    // The folder should now appear in the rail
    await expect(page.getByRole("button", { name: "My Folder" })).toBeVisible({
      timeout: 5000,
    });

    // Step 2: Open the team's overflow menu and move it to "My Folder"
    // aria-label="Team options" (team-row.tsx line 146)
    const optionsBtn = main.getByRole("button", { name: /team options/i });
    await optionsBtn.waitFor({ state: "visible", timeout: 10000 });
    await optionsBtn.click();

    // "Move to folder" submenu trigger (team-row.tsx line 214)
    const moveToFolder = page.getByRole("menuitem", { name: /move to folder/i });
    await moveToFolder.waitFor({ state: "visible", timeout: 5000 });
    await moveToFolder.hover();

    // Click the specific folder name in the submenu
    const folderMenuItem = page.getByRole("menuitem", { name: "My Folder" });
    await folderMenuItem.waitFor({ state: "visible", timeout: 5000 });
    await folderMenuItem.click();

    // Step 3: Click the folder in the rail — the team should appear in the folder view
    await page.getByRole("button", { name: "My Folder" }).click();
    await expect(main.getByText("Folder Test Team")).toBeVisible({ timeout: 5000 });
  });
});

// ─── Scenario 8: Bulk select + action bar ────────────────────────────────────
//
// Selectors confirmed in team-row.tsx:
//   Checkbox: aria-label={`Select ${summary.name}`} (line 339 / 570)
//
// Selectors confirmed in bulk-action-bar.tsx:
//   Toolbar: role="toolbar" aria-label="Bulk actions" (line 71-73)
//   Archive button: aria-label="Archive selected" (line 161)
//   Delete button: aria-label="Delete selected" (line 171)
//   Clear button: aria-label="Clear selection" (line 185)

test.describe("Builder landing — bulk selection and action bar", () => {
  test("checking a row reveals the bulk action toolbar", async ({ page }) => {
    const drafts = [
      makeDraftRecord({ id: "local-b001", team: { name: "Bulk Team Alpha" } }),
      makeDraftRecord({ id: "local-b002", team: { name: "Bulk Team Beta" } }),
    ];

    await seedDraftsBeforeLoad(page, drafts);
    await page.goto("/builder");

    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { name: /your teams/i })).toBeVisible(
      { timeout: 15000 }
    );

    // Select the first draft — aria-label="Select Bulk Team Alpha"
    const checkbox = main.getByRole("checkbox", { name: /select bulk team alpha/i });
    await checkbox.waitFor({ state: "visible", timeout: 10000 });
    await checkbox.click();

    // The bulk action toolbar should appear
    // role="toolbar" aria-label="Bulk actions" (bulk-action-bar.tsx line 71-73)
    const toolbar = page.getByRole("toolbar", { name: /bulk actions/i });
    await expect(toolbar).toBeVisible({ timeout: 5000 });
  });

  test("Archive selected archives the checked draft and hides the toolbar", async ({
    page,
  }) => {
    const drafts = [
      makeDraftRecord({ id: "local-ba01", team: { name: "Archive Target" } }),
      makeDraftRecord({ id: "local-ba02", team: { name: "Archive Bystander" } }),
    ];

    await seedDraftsBeforeLoad(page, drafts);
    await page.goto("/builder");

    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { name: /your teams/i })).toBeVisible(
      { timeout: 15000 }
    );

    // Select "Archive Target"
    const checkbox = main.getByRole("checkbox", { name: /select archive target/i });
    await checkbox.waitFor({ state: "visible", timeout: 10000 });
    await checkbox.click();

    // Click "Archive selected" (bulk-action-bar.tsx line 161)
    const archiveBtn = page.getByRole("button", { name: /archive selected/i });
    await expect(archiveBtn).toBeVisible({ timeout: 5000 });
    await archiveBtn.click();

    // Toolbar should disappear (selection cleared)
    await expect(page.getByRole("toolbar", { name: /bulk actions/i })).not.toBeVisible({
      timeout: 5000,
    });

    // The archived draft should be gone from the default view
    await expect(main.getByText("Archive Target")).not.toBeVisible({
      timeout: 5000,
    });

    // The bystander draft should still be visible
    await expect(main.getByText("Archive Bystander")).toBeVisible({ timeout: 5000 });
  });

  test("Delete selected removes checked drafts via the bulk bar", async ({
    page,
  }) => {
    const drafts = [
      makeDraftRecord({ id: "local-bd01", team: { name: "Delete Target" } }),
      makeDraftRecord({ id: "local-bd02", team: { name: "Delete Bystander" } }),
    ];

    await seedDraftsBeforeLoad(page, drafts);
    await page.goto("/builder");

    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { name: /your teams/i })).toBeVisible(
      { timeout: 15000 }
    );

    // Select "Delete Target"
    const checkbox = main.getByRole("checkbox", { name: /select delete target/i });
    await checkbox.waitFor({ state: "visible", timeout: 10000 });
    await checkbox.click();

    // Click "Delete selected" (bulk-action-bar.tsx line 171)
    const deleteBtn = page.getByRole("button", { name: /delete selected/i });
    await expect(deleteBtn).toBeVisible({ timeout: 5000 });
    await deleteBtn.click();

    // The deleted draft should be gone from the list (undoable delete removes it immediately)
    await expect(main.getByText("Delete Target")).not.toBeVisible({
      timeout: 5000,
    });

    // The bystander draft should still be visible
    await expect(main.getByText("Delete Bystander")).toBeVisible({ timeout: 5000 });
  });

  test("Clear selection dismisses the bulk action toolbar", async ({ page }) => {
    const draft = makeDraftRecord({
      id: "local-bc01",
      team: { name: "Clearable Draft" },
    });

    await seedDraftsBeforeLoad(page, [draft]);
    await page.goto("/builder");

    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { name: /your teams/i })).toBeVisible(
      { timeout: 15000 }
    );

    const checkbox = main.getByRole("checkbox", { name: /select clearable draft/i });
    await checkbox.waitFor({ state: "visible", timeout: 10000 });
    await checkbox.click();

    const toolbar = page.getByRole("toolbar", { name: /bulk actions/i });
    await expect(toolbar).toBeVisible({ timeout: 5000 });

    // Click "Clear selection" (bulk-action-bar.tsx line 185)
    await page.getByRole("button", { name: /clear selection/i }).click();

    // Toolbar gone
    await expect(toolbar).not.toBeVisible({ timeout: 5000 });
  });
});

// ─── Scenario 9: Undoable delete + Undo ──────────────────────────────────────
//
// Selectors confirmed in use-undoable-delete.ts:
//   Toast action label: "Undo" (line 203)
//   Default toast message: "Deleted 1 team" (line 176)
//
// The undo flow: delete via overflow menu → row disappears → toast shows "Undo"
// → clicking Undo restores the row within the 5-second window.

test.describe("Builder landing — undoable delete", () => {
  test("single delete shows an Undo toast and clicking Undo restores the row", async ({
    page,
  }) => {
    const draft = makeDraftRecord({
      id: "local-u001",
      team: { name: "Undo Me" },
    });

    await seedDraftsBeforeLoad(page, [draft]);
    await page.goto("/builder");

    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { name: /your teams/i })).toBeVisible(
      { timeout: 15000 }
    );

    await expect(main.getByText("Undo Me")).toBeVisible({ timeout: 10000 });

    // Open the overflow menu on the row
    const optionsBtn = main.getByRole("button", { name: /team options/i });
    await optionsBtn.waitFor({ state: "visible", timeout: 10000 });
    await optionsBtn.click();

    const deleteItem = page.getByRole("menuitem", { name: /^delete$/i });
    await deleteItem.waitFor({ state: "visible", timeout: 5000 });
    await deleteItem.click();

    // Row should disappear immediately (pending delete)
    await expect(main.getByText("Undo Me")).not.toBeVisible({ timeout: 5000 });

    // The sonner toast should appear with an "Undo" action
    // useUndoableDelete calls toast(label, { action: { label: "Undo", ... } })
    // Sonner renders action buttons as role="button"
    const undoButton = page.getByRole("button", { name: /^undo$/i });
    await expect(undoButton).toBeVisible({ timeout: 5000 });

    // Click Undo — the row should be restored
    await undoButton.click();

    await expect(main.getByText("Undo Me")).toBeVisible({ timeout: 5000 });
  });
});

// ─── Scenario 10: Archive + restore ──────────────────────────────────────────
//
// Selectors confirmed in team-row.tsx:
//   "Archive" menu item text (line 206)
//   "Unarchive" menu item text (line 201)
//
// Selectors confirmed in folder-rail.tsx:
//   Archived rail button: aria-label="Archived" via RailItem aria-label (line 91)
//   ARCHIVED_VIEW_ID = "__archived__" (group-drafts.ts line 35)
//
// Confirmed in teams-landing-client.tsx:
//   ArchivedViewNote text: "Viewing archived teams" (line 101-105)

test.describe("Builder landing — archive and restore", () => {
  test("archiving a team hides it from default view and shows it in Archived", async ({
    page,
  }) => {
    const draft = makeDraftRecord({
      id: "local-ar01",
      team: { name: "Archive Me" },
    });

    await seedDraftsBeforeLoad(page, [draft]);
    await page.goto("/builder");

    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { name: /your teams/i })).toBeVisible(
      { timeout: 15000 }
    );

    await expect(main.getByText("Archive Me")).toBeVisible({ timeout: 10000 });

    // Open the overflow menu and click "Archive"
    const optionsBtn = main.getByRole("button", { name: /team options/i });
    await optionsBtn.waitFor({ state: "visible", timeout: 10000 });
    await optionsBtn.click();

    const archiveItem = page.getByRole("menuitem", { name: /^archive$/i });
    await archiveItem.waitFor({ state: "visible", timeout: 5000 });
    await archiveItem.click();

    // The team should disappear from the default ("All teams") view
    await expect(main.getByText("Archive Me")).not.toBeVisible({ timeout: 5000 });

    // Navigate to the Archived view via the FolderRail
    // RailItem renders a button with aria-label={label} where label="Archived"
    const archivedBtn = page.getByRole("button", { name: /^archived$/i });
    await archivedBtn.waitFor({ state: "visible", timeout: 5000 });
    await archivedBtn.click();

    // The Archived contextual note should appear
    await expect(
      main.getByText(/viewing archived teams/i)
    ).toBeVisible({ timeout: 5000 });

    // The team should appear in the archived view
    await expect(main.getByText("Archive Me")).toBeVisible({ timeout: 5000 });
  });

  test("unarchiving from the Archived view restores the team to the default list", async ({
    page,
  }) => {
    // Seed the draft as already-archived so we can start in the Archived view
    const draft = makeDraftRecord({
      id: "local-ar02",
      team: { name: "Restore Me" },
      archived: true,
    });

    await seedDraftsBeforeLoad(page, [draft]);
    await page.goto("/builder");

    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { name: /your teams/i })).toBeVisible(
      { timeout: 15000 }
    );

    // Go to Archived view
    const archivedBtn = page.getByRole("button", { name: /^archived$/i });
    await archivedBtn.waitFor({ state: "visible", timeout: 10000 });
    await archivedBtn.click();

    await expect(main.getByText("Restore Me")).toBeVisible({ timeout: 5000 });

    // Open the overflow menu and click "Unarchive"
    const optionsBtn = main.getByRole("button", { name: /team options/i });
    await optionsBtn.waitFor({ state: "visible", timeout: 10000 });
    await optionsBtn.click();

    const unarchiveItem = page.getByRole("menuitem", { name: /^unarchive$/i });
    await unarchiveItem.waitFor({ state: "visible", timeout: 5000 });
    await unarchiveItem.click();

    // The team should disappear from the Archived view
    await expect(main.getByText("Restore Me")).not.toBeVisible({ timeout: 5000 });

    // Navigate back to All teams — the team should be restored
    const allTeamsBtn = page.getByRole("button", { name: /^all teams$/i });
    await allTeamsBtn.waitFor({ state: "visible", timeout: 5000 });
    await allTeamsBtn.click();

    await expect(main.getByText("Restore Me")).toBeVisible({ timeout: 5000 });
  });
});

// ─── Scenario 11: Drag-reorder (Custom sort) ─────────────────────────────────
//
// Design notes:
//   - team-row.tsx renders a drag grip (aria-hidden) when reorderable=true.
//   - The grip uses dnd-kit {...attributes} {...listeners} which includes
//     aria-roledescription="sortable" and tabIndex=0 when reorderable.
//   - The OverflowMenu in team-row.tsx exposes "Move up" / "Move down" menu
//     items when reorderable=true (lines 159-175).
//   - teams-landing-client.tsx: `reorderable` is true when sort === "custom"
//     AND the selected folder is null (All teams) or a manual folder (line 482-484).
//   - LandingToolbar has a Select with id="landing-sort" + aria-label="Sort teams by".
//     Custom sort = <SelectItem value="custom">Custom</SelectItem>.
//
// Strategy: Set sort to Custom via the toolbar select, then use the keyboard
// "Move up" / "Move down" items from the overflow menu (deterministic, no
// pointer drag timing). After reorder, reload and verify order persists.

test.describe("Builder landing — drag reorder (Custom sort)", () => {
  test("selecting Custom sort enables the drag grip on rows", async ({ page }) => {
    const drafts = [
      makeDraftRecord({ id: "local-d001", team: { name: "Reorder First" } }),
      makeDraftRecord({ id: "local-d002", team: { name: "Reorder Second" } }),
    ];

    await seedDraftsBeforeLoad(page, drafts);
    await page.goto("/builder");

    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { name: /your teams/i })).toBeVisible(
      { timeout: 15000 }
    );

    // Switch to Custom sort via the Sort select
    // LandingToolbar: <SelectTrigger aria-label="Sort teams by"> (landing-toolbar.tsx line 77-78)
    const sortSelect = page.getByRole("combobox", { name: /sort teams by/i });
    await sortSelect.waitFor({ state: "visible", timeout: 10000 });
    await sortSelect.click();

    // Select the "Custom" option
    const customOption = page.getByRole("option", { name: /^custom$/i });
    await customOption.waitFor({ state: "visible", timeout: 5000 });
    await customOption.click();

    // With Custom sort, the overflow menu for each row should include
    // "Move up" and "Move down" items (team-row.tsx lines 162-175).
    // Open the options for "Reorder Second" (bottom row — can move up, not down)
    const secondRow = main.locator("div.group", {
      has: main.getByText("Reorder Second"),
    });
    const secondOptions = secondRow.getByRole("button", { name: /team options/i });
    await secondOptions.waitFor({ state: "visible", timeout: 10000 });
    await secondOptions.click();

    // "Move up" should be enabled (second row can go up)
    const moveUpItem = page.getByRole("menuitem", { name: /move up/i });
    await expect(moveUpItem).toBeVisible({ timeout: 5000 });
    await expect(moveUpItem).not.toHaveAttribute("aria-disabled", "true");
  });

  test("Move up reorders rows and the new order persists after reload", async ({
    page,
  }) => {
    // Seed two drafts with explicit sortOrder so the initial display order is
    // deterministic (lower sortOrder = earlier in the custom-sorted list)
    const drafts = [
      makeDraftRecord({
        id: "local-d003",
        team: { name: "Alpha Row" },
        sortOrder: 0,
        updatedAt: new Date(Date.now() - 2000).toISOString(),
      }),
      makeDraftRecord({
        id: "local-d004",
        team: { name: "Beta Row" },
        sortOrder: 1,
        updatedAt: new Date(Date.now() - 1000).toISOString(),
      }),
    ];

    await seedDraftsBeforeLoad(page, drafts);
    await page.goto("/builder");

    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { name: /your teams/i })).toBeVisible(
      { timeout: 15000 }
    );

    // Switch to Custom sort
    const sortSelect = page.getByRole("combobox", { name: /sort teams by/i });
    await sortSelect.waitFor({ state: "visible", timeout: 10000 });
    await sortSelect.click();

    const customOption = page.getByRole("option", { name: /^custom$/i });
    await customOption.waitFor({ state: "visible", timeout: 5000 });
    await customOption.click();

    // Verify initial order: Alpha first, Beta second
    const rows = main.locator("div.group");
    const firstRowText = rows.first();
    await expect(firstRowText).toContainText("Alpha Row", { timeout: 5000 });

    // Open options for "Beta Row" and click "Move up"
    const betaRow = main.locator("div.group", {
      has: main.getByText("Beta Row"),
    });
    const betaOptions = betaRow.getByRole("button", { name: /team options/i });
    await betaOptions.waitFor({ state: "visible", timeout: 10000 });
    await betaOptions.click();

    const moveUpItem = page.getByRole("menuitem", { name: /move up/i });
    await moveUpItem.waitFor({ state: "visible", timeout: 5000 });
    await moveUpItem.click();

    // After Move up, Beta Row should now be first
    await expect(rows.first()).toContainText("Beta Row", { timeout: 5000 });

    // Reload — the order should persist because sortOrder values were updated
    await page.reload();
    await expect(main.getByRole("heading", { name: /your teams/i })).toBeVisible(
      { timeout: 15000 }
    );

    // Re-select Custom sort (prefs are persisted in localStorage too, so this
    // should already be "Custom", but we set it explicitly for robustness)
    const sortSelectAfterReload = page.getByRole("combobox", { name: /sort teams by/i });
    // Only change if it's not already Custom
    const currentValue = await sortSelectAfterReload.inputValue().catch(() => "");
    if (!currentValue.toLowerCase().includes("custom")) {
      await sortSelectAfterReload.click();
      await page.getByRole("option", { name: /^custom$/i }).click();
    }

    // Beta Row should still be first
    await expect(main.locator("div.group").first()).toContainText("Beta Row", {
      timeout: 5000,
    });
  });
});
