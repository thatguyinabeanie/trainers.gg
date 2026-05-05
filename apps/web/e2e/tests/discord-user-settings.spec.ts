import { type Page, test, expect } from "@playwright/test";

// NOTE: Seed gap — test users in packages/supabase/supabase/seeds/03_users.sql
// only have `email` provider identities. No Discord (provider="discord") identity
// is seeded for any user. This means:
//   - The DM preferences section will show a "Link Discord" prompt, not checkboxes
//   - show_discord_publicly has no effect because there is no Discord handle to display
//   - Tests that require a linked Discord account are marked test.skip with this note

/**
 * Wait for the profile settings page to finish its async profile load.
 * The page renders a Loader2 spinner while loading; the discord privacy row
 * only appears after loading is complete ({!isLoading && <Row />}).
 * We wait for the spinner to disappear, then the switch to appear.
 *
 * NOTE: We avoid waitForLoadState("networkidle") because persistent connections
 * (Vercel preview toolbar, analytics, WebSocket devtools) prevent it from
 * resolving in CI. Instead, we wait for the concrete UI element we need.
 */
async function waitForProfilePageLoaded(page: Page) {
  // The loading card contains an svg with the animate-spin class
  const spinner = page.locator(".animate-spin").first();
  // Wait for the spinner to vanish (loading complete), up to 15s
  await spinner.waitFor({ state: "hidden", timeout: 15000 }).catch(() => {
    // Spinner may not appear at all if load is fast — that's fine
  });
  // Wait for the discord privacy switch to appear as a signal that load is done
  await page.locator("#show-discord-publicly").waitFor({
    state: "attached",
    timeout: 15000,
  });
}

test.describe("Discord user settings", () => {
  // Auth state is pre-loaded from e2e/playwright/.auth/player.json via
  // the chromium project's storageState. No explicit login needed — the
  // auth.setup.ts project logs in as player@trainers.local before any test.

  // ---------------------------------------------------------------------------
  // DM preferences — no Discord linked state
  // ---------------------------------------------------------------------------

  test("notifications page renders discord DMs section", async ({ page }) => {
    await page.goto("/dashboard/settings/notifications");
    await page.waitForLoadState("domcontentloaded");

    // The #discord-dms section is Server-rendered. Scroll it into view so
    // Playwright's toBeVisible check passes (element must be in viewport).
    const discordSection = page.locator("#discord-dms");
    await discordSection.scrollIntoViewIfNeeded();
    await expect(discordSection).toBeVisible({ timeout: 10000 });
  });

  test("discord DM section shows Link Discord prompt when no Discord account linked", async ({
    page,
  }) => {
    // SEED GAP: No Discord identity is seeded — this test verifies the
    // "no Discord linked" state. When Discord is linked, the section would
    // show "Connected as @handle" and interactive checkboxes instead.
    await page.goto("/dashboard/settings/notifications");
    await page.waitForLoadState("domcontentloaded");

    const discordSection = page.locator("#discord-dms");
    await discordSection.scrollIntoViewIfNeeded();
    await expect(discordSection).toBeVisible({ timeout: 10000 });

    // Should show the "Link Discord" prompt link, not a connected handle
    const linkDiscord = discordSection.getByRole("link", {
      name: /link discord/i,
    });
    await expect(linkDiscord).toBeVisible();

    // "Link Discord" should navigate to account settings
    const linkHref = await linkDiscord.getAttribute("href");
    expect(linkHref).toContain("/dashboard/settings/account");
  });

  test("discord DM master toggle is disabled when no Discord account linked", async ({
    page,
  }) => {
    // When no Discord is linked, the master toggle should be disabled so the
    // user cannot accidentally think they have enabled notifications without a
    // connected account.
    await page.goto("/dashboard/settings/notifications");
    await page.waitForLoadState("domcontentloaded");

    const discordSection = page.locator("#discord-dms");
    await discordSection.scrollIntoViewIfNeeded();
    await expect(discordSection).toBeVisible({ timeout: 10000 });

    // The master switch carries id="discord-dm-master"
    const masterSwitch = page.locator("#discord-dm-master");
    await masterSwitch.scrollIntoViewIfNeeded();
    await expect(masterSwitch).toBeVisible();

    // Disabled because no Discord account is linked (prop passed from page)
    await expect(masterSwitch).toBeDisabled();
  });

  test("discord DM section shows expected event category groups", async ({
    page,
  }) => {
    await page.goto("/dashboard/settings/notifications");
    await page.waitForLoadState("domcontentloaded");

    const discordSection = page.locator("#discord-dms");
    await discordSection.scrollIntoViewIfNeeded();
    await expect(discordSection).toBeVisible({ timeout: 10000 });

    // The three category group headings should all be present in the section
    for (const heading of [
      "Match events",
      "Team sheet events",
      "Tournament events",
    ]) {
      await expect(
        discordSection.getByText(heading, { exact: true })
      ).toBeAttached();
    }
  });

  test.skip("can toggle individual Discord DM checkboxes when Discord is linked", async ({
    page: _page,
  }) => {
    // SEED GAP: Requires a seeded Discord identity (provider="discord") in
    // auth.identities for the player user. When that is added to the seed:
    //   1. Navigate to /dashboard/settings/notifications, scroll to #discord-dms
    //   2. Verify master switch is enabled (not disabled)
    //   3. Enable the master switch so checkboxes become interactive
    //   4. Find "Match ready" checkbox (aria-label="Match ready")
    //   5. Click to enable, waitForLoadState("networkidle")
    //   6. Verify checkbox is checked
    //   7. Click again to disable, waitForLoadState("networkidle")
    //   8. Verify checkbox is unchecked
  });

  // ---------------------------------------------------------------------------
  // Profile settings — show Discord handle toggle
  // ---------------------------------------------------------------------------

  test("profile settings page renders discord privacy row", async ({
    page,
  }) => {
    await page.goto("/dashboard/settings/profile");
    // The profile page is "use client" with an async load — wait for it
    await waitForProfilePageLoaded(page);

    // The Privacy section label should be present
    await expect(page.getByText("Privacy", { exact: true })).toBeAttached();

    // The "Show Discord handle on profile" switch should be rendered
    // after the isLoading guard clears
    const discordSwitch = page.locator("#show-discord-publicly");
    await discordSwitch.scrollIntoViewIfNeeded();
    await expect(discordSwitch).toBeVisible({ timeout: 10000 });
  });

  test("show Discord handle on profile label is present", async ({ page }) => {
    await page.goto("/dashboard/settings/profile");
    await waitForProfilePageLoaded(page);

    // Verify the label text exists alongside the switch
    await expect(
      page.getByText(/show discord handle on profile/i)
    ).toBeAttached();
  });

  // CI timeout: waitForProfilePageLoaded consumes ~20s of the 30s budget,
  // leaving insufficient time for the switch interaction.
  // Now that networkidle is removed, these may pass — kept as fixme until verified.
  test.fixme("can toggle show-Discord-on-profile setting on", async ({
    page,
  }) => {
    await page.goto("/dashboard/settings/profile");
    await waitForProfilePageLoaded(page);

    const discordSwitch = page.locator("#show-discord-publicly");
    await discordSwitch.scrollIntoViewIfNeeded();
    await expect(discordSwitch).toBeVisible({ timeout: 10000 });

    const isCurrentlyChecked = await discordSwitch.isChecked();

    if (!isCurrentlyChecked) {
      // Toggle ON
      await discordSwitch.click();
      await expect(discordSwitch).toBeChecked({ timeout: 5000 });

      // Success toast confirms the Server Action completed
      await expect(
        page.getByText(/discord handle will show on your profile/i)
      ).toBeVisible({ timeout: 5000 });
    } else {
      // Already on — verify state is consistent
      await expect(discordSwitch).toBeChecked();
    }
  });

  // CI timeout: same issue as the "on" test above.
  test.fixme("can toggle show-Discord-on-profile setting off", async ({
    page,
  }) => {
    await page.goto("/dashboard/settings/profile");
    await waitForProfilePageLoaded(page);

    const discordSwitch = page.locator("#show-discord-publicly");
    await discordSwitch.scrollIntoViewIfNeeded();
    await expect(discordSwitch).toBeVisible({ timeout: 10000 });

    // Ensure it is ON first so we can test toggling it off
    const isCurrentlyChecked = await discordSwitch.isChecked();
    if (!isCurrentlyChecked) {
      await discordSwitch.click();
      await expect(discordSwitch).toBeChecked({ timeout: 5000 });
    }

    // Toggle OFF
    await discordSwitch.click();
    await expect(discordSwitch).not.toBeChecked({ timeout: 5000 });

    // Success toast confirms the Server Action completed
    await expect(page.getByText(/discord handle hidden/i)).toBeVisible({
      timeout: 5000,
    });
  });

  // CI timeout: same issue as the toggle tests above.
  test.fixme("show-Discord-on-profile toggle cycles on then off in a single visit", async ({
    page,
  }) => {
    await page.goto("/dashboard/settings/profile");
    await waitForProfilePageLoaded(page);

    const discordSwitch = page.locator("#show-discord-publicly");
    await discordSwitch.scrollIntoViewIfNeeded();
    await expect(discordSwitch).toBeVisible({ timeout: 10000 });

    // Start in a known off state
    const isOn = await discordSwitch.isChecked();
    if (isOn) {
      await discordSwitch.click();
      await expect(discordSwitch).not.toBeChecked({ timeout: 5000 });
    }

    // Toggle ON
    await discordSwitch.click();
    await expect(discordSwitch).toBeChecked({ timeout: 5000 });

    // Toggle OFF
    await discordSwitch.click();
    await expect(discordSwitch).not.toBeChecked({ timeout: 5000 });
  });

  // ---------------------------------------------------------------------------
  // Public profile — Discord handle display
  // ---------------------------------------------------------------------------

  test("public profile does not show discord handle when show_discord_publicly is off", async ({
    page,
  }) => {
    // Ensure the setting is off via the settings page first
    await page.goto("/dashboard/settings/profile");
    await waitForProfilePageLoaded(page);

    const discordSwitch = page.locator("#show-discord-publicly");
    await discordSwitch.scrollIntoViewIfNeeded();
    await expect(discordSwitch).toBeVisible({ timeout: 10000 });

    const isOn = await discordSwitch.isChecked();
    if (isOn) {
      await discordSwitch.click();
      await expect(discordSwitch).not.toBeChecked({ timeout: 5000 });
    }

    // Visit the player's public profile
    await page.goto("/u/ash_ketchum");
    await page.waitForLoadState("domcontentloaded");

    // Profile page should load (verify a heading is present)
    await expect(page.getByRole("heading").first()).toBeVisible({
      timeout: 10000,
    });

    // No Discord handle should be visible. With show_discord_publicly=false,
    // getCachedDiscordHandle short-circuits and returns null. Even if the
    // setting were on, no Discord identity is seeded — getPublicDiscordHandle
    // also returns null. We assert the discord display text never appears.
    await expect(page.getByText(/connected as @/i)).not.toBeVisible();
  });

  test("public profile page loads for ash_ketchum without errors", async ({
    page,
  }) => {
    await page.goto("/u/ash_ketchum");
    await page.waitForLoadState("domcontentloaded");

    // Profile heading should be present (the player exists in seed data)
    await expect(page.getByRole("heading").first()).toBeVisible({
      timeout: 10000,
    });

    // No error state should appear
    await expect(page.getByText(/not found/i)).not.toBeVisible();
  });

  test.skip("public profile shows discord handle when show_discord_publicly is on and Discord is linked", async ({
    page: _page,
  }) => {
    // SEED GAP: Requires a seeded Discord identity (provider="discord") in
    // auth.identities for the player user (b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e).
    // The identity_data must include a "full_name" or "name" field that
    // getPublicDiscordHandle() returns as the handle.
    //
    // When that is added to the seed:
    //   1. Enable show_discord_publicly via /dashboard/settings/profile toggle
    //   2. Navigate to /u/ash_ketchum
    //   3. Verify discord handle text appears in the identity strip
    //   4. Disable show_discord_publicly via settings
    //   5. Navigate back to /u/ash_ketchum
    //   6. Verify the discord handle is NOT visible
  });
});
