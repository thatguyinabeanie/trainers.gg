# Discord Bot — Remaining Work

**Status:** Phases 1–6 (backend + web UI + analytics) are feature-complete on branch `discord-bot`. This document covers what's left before the bot can ship to production.

---

## 1. Push + CI

The branch has ~157 commits ahead of `origin/discord-bot`. Pre-push checks:

| Check                | Status                                                                                                                                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm typecheck`     | All 11 packages green                                                                                                                                                                      |
| `pnpm lint` (web)    | Clean                                                                                                                                                                                      |
| `pnpm lint` (mobile) | Pre-existing failure (unused eslint-disable directives in mobile — not our code)                                                                                                           |
| `pnpm test`          | 3947 pass, 4 skipped, 1 known flaky (`install-state.test.ts` "tampered token" — passes in isolation, fails intermittently in full suite due to test-pollution from parallel JSDOM workers) |

**Action:** `git push` when ready. CI will run on the PR. The mobile lint failure needs a separate 1-line fix (remove the stale `eslint-disable` comments) — can be done on this branch or separately.

---

## 2. Discord Developer Portal Setup

Before the bot can receive interactions or be installed, two Discord applications need to be created.

### Dev application

1. Go to https://discord.com/developers/applications
2. Click "New Application" → name it "Beanie Bot (Dev)"
3. **Bot tab:**
   - Click "Add Bot"
   - Copy the **Bot Token** → set as `DISCORD_BOT_TOKEN` in `.env.local`
   - Enable "Message Content Intent" if needed (currently we don't read message content, so likely not needed)
4. **General Information tab:**
   - Copy **Application ID** → set as `DISCORD_APPLICATION_ID` in `.env.local`
   - Copy **Public Key** → set as `DISCORD_PUBLIC_KEY` in `.env.local`
5. **OAuth2 tab:**
   - Add redirect URL: `http://localhost:3000/api/discord/install-callback` (for local dev)
6. **Interactions Endpoint URL:** leave blank for now — set after deploying to Vercel (see section 4)

### Production application

Same steps as above but:

- Name: "Beanie Bot"
- Redirect URL: `https://trainers.gg/api/discord/install-callback`
- Interactions Endpoint URL: `https://trainers.gg/api/discord/interactions` (set after first deploy)
- Store production credentials in Vercel environment variables (not `.env.local`)

### Environment variables checklist

| Variable                             | Where                 | Value                                                                           |
| ------------------------------------ | --------------------- | ------------------------------------------------------------------------------- |
| `DISCORD_APPLICATION_ID`             | `.env.local` + Vercel | Application ID from Discord Developer Portal                                    |
| `DISCORD_PUBLIC_KEY`                 | `.env.local` + Vercel | Public key for Ed25519 signature verification                                   |
| `DISCORD_BOT_TOKEN`                  | `.env.local` + Vercel | Bot token for REST API calls                                                    |
| `CRON_SECRET`                        | `.env.local` + Vercel | Vercel cron authentication token (any random string)                            |
| `NEXT_PUBLIC_DISCORD_APPLICATION_ID` | `.env.local` + Vercel | Same as `DISCORD_APPLICATION_ID` — needed client-side for the OAuth install URL |

All env vars are already declared in `turbo.json` for build cache invalidation.

---

## 3. Command Registration

After setting up the Discord app and deploying, register all 13 slash commands:

```bash
# Dev — register to a specific test guild (instant, only visible in that guild):
curl -X POST https://localhost:3000/api/discord/register \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"guildId": "YOUR_TEST_GUILD_ID"}'

# Production — register globally (takes up to 1 hour to propagate):
curl -X POST https://trainers.gg/api/discord/register \
  -H "Authorization: Bearer $CRON_SECRET"
```

The register route is at `apps/web/src/app/api/discord/register/route.ts`. It reads command definitions from `apps/web/src/lib/discord/commands/registry.ts`.

---

## 4. Interactions Endpoint Configuration

After the first production deploy:

1. Go to Discord Developer Portal → your production application → General Information
2. Set **Interactions Endpoint URL** to `https://trainers.gg/api/discord/interactions`
3. Discord will send a PING to verify. The endpoint handles this automatically.

For local dev, use ngrok or a similar tunnel:

```bash
ngrok http 3000
# Set the ngrok URL as the Interactions Endpoint in the dev application
```

---

## 5. Phase 6d — Brand Polish

**Scope:** Personality pass on the bot's public-facing text. No code architecture changes.

### Beanie Bot Avatar

Design a mascot avatar for the bot's Discord profile. Requirements:

- Square image, at least 512×512px
- Fits the trainers.gg brand: clean, playful, community-driven (NOT aggressive gamer aesthetic)
- Teal primary accent to match the site
- Could feature: the egg logo with headphones, a friendly character, a stylized controller, etc.
- Upload via Discord Developer Portal → Bot → Icon

### Command Descriptions

Currently all 13 command descriptions are functional/dry. Rewrite each with warm personality:

| File                                            | What to change                                  |
| ----------------------------------------------- | ----------------------------------------------- |
| `apps/web/src/lib/discord/commands/registry.ts` | `description` field for each command definition |

Examples of the tone shift:

| Current                   | Warm rewrite                                                  |
| ------------------------- | ------------------------------------------------------------- |
| "View tournament details" | "Look up a tournament — schedule, format, and how to sign up" |
| "View current standings"  | "See who's climbing the ladder right now"                     |
| "Drop from a tournament"  | "Withdraw from a tournament (we'll miss you 💔)"              |

Keep descriptions under 100 characters (Discord's limit). Each must still be informative — personality should enhance clarity, not replace it.

### Error Messages

The interactions endpoint and command handlers return error text in several places. Files to audit:

| File                                                 | Error locations                                              |
| ---------------------------------------------------- | ------------------------------------------------------------ |
| `apps/web/src/app/api/discord/interactions/route.ts` | Rate limit messages, fallback error message                  |
| `apps/web/src/lib/discord/commands/*.ts`             | Per-command error responses (not found, no permission, etc.) |

Current: "Something went wrong running that command. Please try again."
Warm: "Oops — something went sideways. Try that again in a sec, and if it keeps happening, let a community leader know."

Guidelines:

- Never blame the user
- Offer a next step when possible ("try again" / "check with a leader" / "make sure you're registered")
- Use contractions and casual tone
- Avoid exclamation marks in errors (they read as shouting)
- One emoji max per error message, and only when it genuinely helps

### Bot "About Me" Description

Set in Discord Developer Portal → Bot → About Me:

> Beanie Bot keeps your trainers.gg community connected in Discord — tournament announcements, match DMs, role sync, and 13 slash commands. Powered by trainers.gg 🥚

---

## 6. Phase 7 — Testing

### Skipped tests to fix

These tests were skipped during implementation due to test-infrastructure issues, not missing functionality:

| File                                                                                                                                               | Test                                                                  | Why skipped                                                                                                       | Fix approach                                                                                                                                                                                           |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `apps/web/src/app/(dashboard)/dashboard/community/[communitySlug]/__tests__/settings-page.test.tsx`                                                | "shows the chip on the Discord row when bot is installed"             | `useSupabaseQuery` mock call-order collision — 3rd query returns discord_servers mock where component expects org | Fix the mock's `mockImplementation` to handle 3+ calls by checking the query key argument, not just call order                                                                                         |
| `apps/web/src/app/(dashboard)/dashboard/community/[communitySlug]/settings/integrations/discord/_components/__tests__/role-mapping-table.test.tsx` | 3 tests: hierarchy banner, toggle error rollback, no-mapping toggle   | JSDOM + Base UI `Switch` rendering mismatch — `waitFor` timeout on role resolution                                | Mock the `Switch` component to render a native `<input type="checkbox">` in tests, or use `fireEvent` instead of `userEvent` for the toggle interaction                                                |
| `apps/web/e2e/tests/discord-user-settings.spec.ts`                                                                                                 | 2 tests: individual DM checkbox toggle, public profile handle display | Seed data gap — no Discord identity (provider="discord") in auth.identities for the player test user              | Add a Discord identity row to `packages/supabase/supabase/seeds/03_users.sql` for the player user with `provider: "discord"`, `identity_data: { username: "ash_ketchum", global_name: "Ash Ketchum" }` |

### Known flaky test

| File                                                       | Test                                | Behavior                                                                                                                                                                                                                                                                                    |
| ---------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/lib/discord/__tests__/install-state.test.ts` | "returns null for a tampered token" | Passes in isolation, fails intermittently in the full suite. Likely cause: another test file's global `crypto` mock bleeds into this file's JSDOM environment. Fix: add explicit `crypto` setup in the test's `beforeEach`, or move the test to its own Jest project with isolated globals. |

### E2E admin golden path (T29)

Not yet written. Requires:

1. A running dev server (`pnpm dev`)
2. A seeded `discord_servers` row for the test community (bypass OAuth by inserting directly)
3. Discord REST API mocks (or a real dev app)

Spec for the test:

```
File: apps/web/e2e/tests/discord-admin-integration.spec.ts

1. Log in as admin@trainers.local
2. Navigate to /dashboard/community/vgc-league/settings/integrations/discord
3. Verify install card renders (State A) — assert "Add Beanie Bot" heading visible
4. Seed a discord_servers row via Supabase SQL (direct insert, bypassing OAuth):
   INSERT INTO discord_servers (guild_id, community_id, installed_by)
   VALUES ('test-guild-123', {community_id}, '{admin_user_id}');
5. Refresh the page → State B renders
6. Verify status header shows "Installed in test-guild-123"
7. Click Notifications tab → verify channel mapping table renders (empty state)
8. Click Roles tab → verify 5 role type rows render
9. Click Failures tab → verify "0 failures" or empty state
10. Click Disconnect → confirm dialog → click Confirm
11. Verify page reverts to State A (install card)
12. Clean up: DELETE FROM discord_servers WHERE guild_id = 'test-guild-123'
```

Mock approach: intercept Discord REST calls at the network level (Playwright `route` API) to avoid needing a real Discord app during CI.

### Integration tests with real Discord

Manual verification checklist for QA before launch:

1. [ ] Create a dev Discord server for testing
2. [ ] Install Beanie Bot via the install flow on the integrations page
3. [ ] Verify install-callback creates the `discord_servers` row
4. [ ] Map `#announcements` to `tournament_created` events
5. [ ] Create a tournament in the community → verify the announcement posts to `#announcements`
6. [ ] Open registration → verify `registration_opens` notification
7. [ ] Register as a player, generate pairings → verify `match_ready` DM (if Discord identity linked) or fallback channel post
8. [ ] Report a match result → verify `match_result_to_confirm` DM to opponent
9. [ ] Complete the tournament → verify `tournament_ended` channel notification + winner role assigned
10. [ ] Configure a Staff role mapping → verify staff members get the role
11. [ ] Run `/tournament` in Discord → verify embed renders with tournament details
12. [ ] Run `/standings` → verify current standings embed
13. [ ] Run `/player @username` → verify player stats embed
14. [ ] Run `/drop` → verify confirmation button + actual drop
15. [ ] Run `/link` → verify account linking flow
16. [ ] Run `/setchannel` as a community leader → verify channel mapping created
17. [ ] Test rate limiting: spam 11 commands in 60 seconds → verify ephemeral "Slow down" message
18. [ ] Disconnect the bot from the integrations page → verify cascade delete of all mappings
19. [ ] Verify uninstall-sweep cron detects the disconnected bot on next run (or manually trigger)
20. [ ] Check PostHog for `discord_command_executed` events with correct properties

---

## 7. Merge Checklist

Before merging `discord-bot` → `main`:

- [ ] All pre-push checks pass (`pnpm lint`, `pnpm typecheck`, `pnpm test`)
- [ ] Discord dev application created with correct env vars
- [ ] Commands registered (at least to a test guild)
- [ ] Interactions endpoint verified (Discord PING succeeds)
- [ ] Manual smoke test: install → map channel → create tournament → verify notification
- [ ] PR approved by at least one reviewer
- [ ] Squash or rebase as appropriate (157 commits — consider squash-merge for a cleaner main history)
- [ ] After merge: set production Interactions Endpoint URL in Discord Developer Portal
- [ ] After merge: register commands globally (1-hour propagation)
- [ ] After merge: verify Vercel cron jobs are running (`/api/discord/notify`, `/api/discord/role-sync`, etc.)

---

## 8. Post-Launch Monitoring

First 48 hours after enabling in production:

- **PostHog dashboard:** watch `discord_command_executed` volume and `discord_command_failed` rate. Spike in failures = config issue.
- **Queue depth:** query `discord_notification_queue WHERE status = 'pending'` — should drain to ~0 between cron runs. Growing = cron not keeping up or Discord rate-limited.
- **Channel failure accumulation:** `discord_channel_failures` table. Consecutive failures above 3 = a channel was deleted or permissions revoked. The admin UI surfaces these, but proactively check in the first few days.
- **DM 50007 rate:** how many users have DMs blocked. High rate = fallback channel is important. Consider a community-wide default of `dm_with_fallback` rather than `dm_only`.
- **Rate limit encounters:** check bot route logs for 429 responses from Discord. If frequent, consider batching notifications or increasing the cron interval.
