# Discord Bot — Web UI Design Spec

**Date:** 2026-04-15
**Phase:** 5 (Web UI) of the Discord bot implementation
**Parent spec:** [`2026-04-11-discord-bot-design.md`](./2026-04-11-discord-bot-design.md)
**Branch:** `discord-bot`

## Context

Phases 1–4 and Phase 6 (backend) of the Discord bot have landed on `discord-bot`. The cron routes drain queues, app flows enqueue events, analytics fire, and rate limits protect the interactions endpoint. What's missing is the surface for community leaders to **install, configure, and triage** the bot, and for players to **control their own DMs** and optionally show their Discord handle publicly.

The parent spec (§ Web UI Changes, lines 571-712) already describes the visual design in ASCII mockups. This spec locks in the **implementation architecture** decisions from the 2026-04-15 brainstorming session and records the refined UI — including the shift from a failures *drawer* to a failures *tab*.

## Scope

- **5b (primary focus):** Discord Integration admin page — the multi-tab configuration hub at `/dashboard/community/[communitySlug]/settings/integrations/discord`.
- **5a:** Routing + nav placement of the Integrations section within community settings.
- **5c (lightweight):** User Settings → Notifications (Discord DM section), Linked Identities Discord row DM summary.
- **5d (lightweight):** Public profile Discord handle opt-in display + Profile settings toggle.
- **5e (lightweight):** Tournament creation info banner, "Bot installed — configure" chip next to Discord URL field.

## Decision Summary

| Decision | Chosen | Why |
|---|---|---|
| Spec scope | Single spec focused on 5b, lightweight sections for user UI (Option B) | Admin page is the only surface with real architectural risk; others are thin additions to existing pages. |
| Install vs configured state | Single page with inline state swap (Option A) | Mental model stays simple; Discord OAuth redirect returns to the same URL; empty-state design inside the "installed" tables handles onboarding. |
| Discord REST data loading | `unstable_cache` 5-min revalidation with per-picker Refresh button (Option B) | 5-min staleness is fine for admin config; survives Discord blips; explicit Refresh on demand. |
| Tab state | URL query param `?tab=notifications|roles|failures` (Option B) | Deep-linkable from failure banner, analytics funnels, and email CTAs. |
| Save pattern | Hybrid — immediate commit for toggles/pickers, inline form for new rows (Option C) | Matches how each interaction naturally behaves; existing shadcn patterns already do this. |
| Failures view | Third tab with count badge — **not** a drawer | Failures deserve the same affordances the other tabs have (filter, bulk actions, per-row retry); drawer felt misaligned with operational triage. |

## 5a/5b — Discord Integration Admin Page

### Route

```
/dashboard/community/[communitySlug]/settings/integrations/discord
  ?tab=notifications   (default)
  ?tab=roles
  ?tab=failures
```

Nested under the existing `/dashboard/community/[communitySlug]/settings/` path. The "Integrations" sidebar entry is new under Community Settings; future integrations (Twitch, custom webhooks) will sit alongside Discord as sibling child routes or tabs under `/integrations`.

### File layout

```
apps/web/src/app/(dashboard)/dashboard/community/[communitySlug]/
└── settings/
    ├── page.tsx                      (existing community settings)
    └── integrations/
        └── discord/
            ├── page.tsx              (Server Component — auth gate, parallel data fetches)
            ├── discord-client.tsx    (Client — tab state, table UI)
            ├── loading.tsx           (skeleton for Server Component fetch)
            └── _components/
                ├── install-card.tsx              (not-installed hero)
                ├── status-header.tsx             (install status + reinstall/disconnect)
                ├── failure-banner.tsx            (conditional warning banner)
                ├── channel-mapping-table.tsx     (event → channel rows + add form)
                ├── dm-settings-table.tsx         (event → delivery mode + fallback channel)
                ├── role-mapping-table.tsx        (role type → guild role + enable toggle)
                ├── failures-table.tsx            (filter pills, per-row retry/remove)
                ├── picker-refresh-button.tsx     (🔄 icon, force-refresh cached Discord data)
                └── confirm-disconnect-dialog.tsx (confirmation before deleting discord_server row)
```

### Server Component (`page.tsx`) flow

1. `await rejectBots()`
2. Resolve community by slug → `notFound()` if missing
3. Check `has_community_permission(community_id, 'community.manage')` → `notFound()` if false (404, not 403 — don't disclose existence to non-admins)
4. Parallel data fetch via `Promise.all`:
   - `getDiscordServerByCommunityId(supabase, communityId)` — null if not installed
   - If server present: `listChannelMappings`, `listDmSettings`, `listRoleMappings`, `listChannelFailures` (last 24h)
   - If server present: Discord REST data via `unstable_cache`:
     - `getGuildChannels(guildId)` — text channels only, with category grouping
     - `getGuildRoles(guildId)` — non-@everyone, non-managed roles
     - Cached 5 min with tag `CacheTags.discordGuild(serverId)` for explicit invalidation on Refresh
5. Pass all data to `<DiscordClient>`; Client Component owns `useSearchParams` tab state

### State A — Not installed

Single centered hero with install CTA. Full page layout (sidebar, breadcrumbs, page title persist) — only the content area changes. See mockup `layout-not-installed.html`.

Elements:
- Hero card (centered, icon, title, description, primary button, fine-print requirements)
- 3-card feature grid (Channel announcements / Player DMs / Role sync)
- Slash commands strip (13 commands as code chips)

**Install click** → signs an install state token (`apps/web/src/lib/discord/install-state.ts`) and redirects to the Discord OAuth URL. Return lands on `/api/discord/install-callback`, which creates the `discord_servers` row and redirects back to the integrations page — State B renders.

### State B — Installed

Full admin hub. See mockups `layout-installed.html`, `layout-roles-tab.html`, `failures-tab.html`.

**Persistent sections (above the tabs):**
- `<StatusHeader>` — "Installed in **{guild_name}**", installed-by handle + timestamp, [Reinstall] [Disconnect] buttons.
- `<FailureBanner>` (conditional) — "⚠ N delivery failures in the last 24h [View ›]" → tab switches to `?tab=failures`.

**Tabs (shadcn `<Tabs>` driven by `useSearchParams`):**
- `Notifications` — channel mappings + DM settings
- `Roles` — role assignments + hierarchy warning
- `Failures {count}` — count badge visible when failures exist

**Reinstall** — same OAuth flow; lets admin re-authorize after the bot was kicked and re-added.

**Disconnect** — confirmation dialog ("Remove bot from {guild_name}? All mappings will be deleted."), deletes the `discord_servers` row via server action (cascade removes child rows), page reloads into State A.

### Notifications tab

Two stacked cards:

**Channel announcements** — table of event types → channels.
- Columns: Event (label + description), Channel (shadcn `<Select>` populated from cached guild channels), Actions (✕ remove).
- "Add mapping" inline form at the bottom: `[Event type ▾] [Channel ▾] [Add]` button.
- Per-row inline warning if this (event, channel) has recent failures: small 🔴 next to the channel picker with tooltip showing the last failure reason.
- Immediate commit on channel change (Server Action `upsertChannelMapping`), optimistic UI + toast on failure.

**Direct messages to players** — table of DM-capable events → delivery mode.
- Columns: Event (label + description), Mode (shadcn `<Select>` with `channel_only`/`dm_only`/`dm_with_fallback`), Fallback channel (only visible when mode is `channel_only` or `dm_with_fallback`; populated from cached channels).
- Every row present from the `discord_dm_event_type` enum (~11 events); mode defaults to `channel_only`.
- Immediate commit on mode/channel change via `upsertDmSetting`.

### Roles tab

**Hierarchy warning banner** (conditional, red) — shown when any enabled role mapping has had a `hierarchy_violation` failure in the last 24h OR when the bot's role is known to be below one of the managed roles (future enhancement — for v1, just show the banner when any recent `hierarchy_violation` exists). Text: "Move **Beanie Bot** above {role names} in your Discord server's role list."

**Role assignments table** — one row per `discord_role_type` enum value (`staff`, `member`, `participant`, `winner`, `currently_playing`).
- Columns: Enable toggle (shadcn `<Switch>`), Role (label + description), Discord role picker (shadcn `<Select>` from cached guild roles; disabled when toggle is off), Status (✓ Synced / ⚠ Hierarchy / — disabled).
- Winner row marked 🏆 with "honorific, never auto-removed" in the description.
- Footer note: "Reconciliation runs every 15 min. Force a sync anytime with Refresh."
- Immediate commit on toggle change via `toggleRoleMapping` + optimistic UI.
- Immediate commit on role picker change via `upsertRoleMapping`.

### Failures tab

Count badge on the tab itself (e.g. "Failures · 3") — rendered whenever `listChannelFailures(last-24h) || listFailedDms(last-24h) || listFailedRoleSyncs(last-24h)` returns anything.

**Filter bar** — pills: `All · N`, `Channels · N`, `DMs · N`. Selected pill in teal.

**Action bar** — `[Retry all]` `[Refresh]` buttons top-right.

**Table** — columns: Type (CHANNEL / DM badge), Event (label + consecutive-failure count), Target (channel name or @user), Reason (HTTP status + short reason), When (relative), Actions (Retry / Remove mapping or "No action" for non-retryable DMs).

DM rows that were delivered via fallback channel show "✓ Delivered via fallback `#channel`" in green beneath the failure reason — signals that the user doesn't need to act.

**Footer note** — remediation guidance ("Resolve persistent channel failures by re-mapping or reinstalling the bot. DM failures usually mean the player has DMs from server members turned off.").

### Data freshness

Discord REST channel and role lists are wrapped in `unstable_cache`:

```ts
const getCachedGuildChannels = unstable_cache(
  async (guildId: string) => fetchGuildChannels(guildId),
  ["discord-guild-channels"],
  { revalidate: 300, tags: [CacheTags.discordGuild(serverId)] }
);
```

A small **🔄 Refresh** icon next to each picker calls a Server Action that `updateTag(CacheTags.discordGuild(serverId))` + `revalidatePath(...)` to force a fresh fetch.

New cache tag to add: `CacheTags.discordGuild(serverId: number)` → `discord-guild-${serverId}`. Mutation hooks: nothing in trainers.gg invalidates this automatically — channels/roles change in Discord, not in our app. The tag is only used for explicit Refresh.

### Permission gating — server AND client

- Server: `page.tsx` does the authoritative `has_community_permission('community.manage')` check and `notFound()` on fail.
- Client: the mutation Server Actions repeat the permission check before writing; a compromised client is harmless.
- No `usePermission` gating on the client — the entire page is either rendered or 404. Nothing inside the page is conditionally visible based on permission.

## 5c — User Settings (DM preferences + Linked Identities)

### `/dashboard/settings/notifications` — add Discord DMs section

New card with `id="discord-dms"` (used by the Linked Identities deep link).

**Header row:** Discord icon + "Discord direct messages" label + "Connected as **@handle**" subtitle, Enable `<Switch>` (master toggle) on the right.

**Conditional privacy warning** — red banner shown when the user has recent DM failures with code 50007. Requires a new schema column: `users.discord_dm_warn_until timestamptz` — set to `now() + interval '30 days'` when the notify cron records a 50007 failure for this user (new migration under Phase 5). Banner visible while `discord_dm_warn_until > now()`. Clears automatically via TTL or when the user successfully receives a DM (successful `markDmSent` clears the timestamp). Text:
> ⚠ Your Discord DMs appear to be blocked from server members. Update your Discord privacy settings (Server Settings → Privacy → Allow direct messages from server members). [Learn how ›]

**Event checkboxes**, grouped into three sections by category:

- **Match events**: `match_ready`, `match_starting_soon`, `match_result_to_confirm`, `match_disputed`
- **Team sheet events**: `team_sheet_needed`, `team_sheet_approved`, `team_sheet_rejected`
- **Tournament events**: `you_dropped`, `top_cut_made`, `tournament_starting`, `tournament_cancelled`

Each checkbox is a shadcn `<Checkbox>` bound to a row in `discord_user_dm_preferences` with immediate commit on change via a `setDmPreference` Server Action. Disabled (greyed) when master toggle is off, but the group headers and descriptions remain visible.

### `/dashboard/settings/account` — Linked Identities Discord row

Extend the existing Discord row in the linked identities list (no new card).

**Row contents (when linked):**
- Discord logo
- "Discord"
- "Connected as **@handle**"
- Below that, on its own line: "DM notifications: **N of 11 enabled** · [Manage ›](/dashboard/settings/notifications#discord-dms)"
- `[Unlink]` button on the right (existing)

When not linked, the row shows the existing "Link" button with no DM summary.

## 5d — Public Profile Discord Handle

### `/dashboard/settings/profile` — add toggle

New row in the profile page. If a "Privacy" card already exists, append to it; otherwise create a new "Privacy" card section below the existing fields. Single toggle for now:

- **Show Discord handle on profile** (`<Switch>`, default off) bound to `users.show_discord_publicly` column.
- Description: "Your public profile will show @{discord_handle} next to your display name. Default: off."

Commit immediately on change via a Server Action (`setShowDiscordPublicly`) + optimistic UI.

### Public profile page — conditional display

On the public player profile at `/u/[handle]/page.tsx`, in the identity strip under the display name:

```
🌎 United States · 🟦 @ash_ketchum · Joined Mar 2026
```

The Discord icon + handle only render when:
1. The user has a linked Discord identity (`auth.identities` row with provider=discord), AND
2. `users.show_discord_publicly = true`.

Icon is a `<svg>` Discord logo inline (existing SVG path in the bot's branding), sized to match surrounding icons. No link from the handle — just display text.

## 5e — Small Touches

### Tournament creation info banner

On `/dashboard/community/[communitySlug]/tournaments/new`, above the form:

```
🤖 Discord notifications are configured for this community — 
   announcements will auto-post to mapped channels.         ×
```

Shown when `getDiscordServerByCommunityId(communityId)` returns a row. Dismissible (client-side, no persistence needed). Teal/mint background to match the site's primary. Does not block tournament creation.

### "Bot installed — configure" chip

In the community general settings page, next to the existing Discord invite URL input. Shown only when `getDiscordServerByCommunityId(communityId)` returns a row:

```
[ https://discord.gg/vgc-hub        ] [ 🤖 Bot installed — configure › ]
```

Chip is a small `<Link>` styled as a teal pill; links to `/dashboard/community/[slug]/settings/integrations/discord`.

## Schema changes

One new migration under Phase 5 to support the DM-blocked privacy warning:

```sql
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS discord_dm_warn_until timestamptz;
```

Additive change to `apps/web/src/app/api/discord/notify/route.ts` (already landed in Phase 4a):
- On DM failure with code 50007, also `UPDATE users SET discord_dm_warn_until = now() + interval '30 days' WHERE id = {user_id}`.
- On successful DM delivery via `markDmSent`, also `UPDATE users SET discord_dm_warn_until = NULL WHERE id = {user_id} AND discord_dm_warn_until IS NOT NULL` (skip when already null — avoids pointless writes).

These writes stay fire-and-forget in the notify cron — failing to update the flag should not block the DM bookkeeping.

## Server Actions (new)

Each follows the existing `ActionResult<T>` pattern, calls `rejectBots()` + `createClient()` + mutation + `updateTag`:

| Action | Mutation | Tag(s) |
|---|---|---|
| `upsertChannelMappingAction(communityId, eventType, channelId)` | `upsertChannelMapping` | community page caches |
| `deleteChannelMappingAction(mappingId)` | `deleteChannelMapping` | — |
| `upsertDmSettingAction(communityId, eventType, mode, fallbackChannelId?)` | `upsertDmSetting` | — |
| `toggleRoleMappingAction(mappingId, enabled)` | `toggleRoleMapping` | — |
| `upsertRoleMappingAction(communityId, roleType, discordRoleId)` | `upsertRoleMapping` | — |
| `setDmPreferenceAction(eventType, enabled)` | `setDmPreference` | — |
| `setShowDiscordPublicly(enabled)` | (updates `users` row) | player profile cache for this user |
| `refreshDiscordGuildCache(serverId)` | — | `CacheTags.discordGuild(serverId)` |
| `disconnectDiscordServerAction(serverId)` | `deleteDiscordServer` | community page caches + `discordGuild(serverId)` |
| `retryNotificationAction(notificationId)` | (resets attempts, marks pending) | — |

All mutations re-check `has_community_permission('community.manage')` server-side.

## Testing

- Unit tests for each new Server Action (happy path + unauth + not-found + validation) using existing action test patterns in `apps/web/src/actions/__tests__/`.
- Component tests for `channel-mapping-table`, `dm-settings-table`, `role-mapping-table`, `failures-table` — immediate-commit behavior, optimistic UI, empty states.
- E2E (Playwright) covering the admin golden path: install (mock OAuth callback) → add channel mapping → configure DM setting → enable role → view failure → retry failure. Land in `apps/web/e2e/discord-integration.spec.ts`.
- E2E for the user-side: toggle DM preferences, flip profile Discord opt-in, verify public profile renders the handle.

## Verification

1. **Local dev**: `pnpm dev`, visit `/dashboard/community/vgc-league/settings/integrations/discord` as the admin test user → see State A. Trigger the install flow with the local dev Discord app. Hit the callback; page renders State B.
2. **Visual smoke**: each mockup in `.superpowers/brainstorm/12107-1776296035/content/` represents an expected state; confirm the implementation matches.
3. **E2E**: `pnpm test:e2e` — the discord spec passes.
4. **Typecheck + lint + unit tests** pass across web + supabase packages.

## Out of scope

- Mobile-specific design — the admin page is desktop-first per the parent spec; narrow viewports just stack tabs and tables naturally via Tailwind responsive classes.
- Beanie Bot avatar + brand polish — Phase 6d.
- Twitch / YouTube / webhook integrations — only Discord lives under `/integrations` for now.
- Real-time guild state (live channel creation listener, gateway presence) — not designed; `unstable_cache` + Refresh is sufficient.
