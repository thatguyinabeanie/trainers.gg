# Discord Bot — Implementation Plan

## Context

trainers.gg needs a Discord bot ("Beanie Bot") for community servers. Channel notifications + direct messages + role management + 13 slash commands + full admin UI. Deploys on Vercel as Next.js API routes (HTTP Interactions Endpoint, no gateway). Account linking reuses existing Supabase Auth Discord OAuth. Full spec: `docs/superpowers/specs/2026-04-11-discord-bot-design.md`.

**Scope: everything in the spec is v1** — channel notifications, DMs, roles, all 13 commands, autocomplete, admin UI, user notification preferences, opt-in profile handle display.

## High-Level Phases (within v1)

These are sequenced by dependency, not by "ship vs defer." Each phase is committable; later phases build on earlier ones. All phases complete before v1 launch.

### Phase 1: Foundation

**1a. Database migration — core tables**
- `discord_servers` (UNIQUE community_id — one community, one server)
- `discord_channels` (channel ↔ event mapping)
- `discord_notification_queue` with idempotency key
- `discord_channel_failures` for dead-letter tracking
- `discord_dm_event_type` enum
- `discord_dm_queue`, `discord_user_dm_preferences`, `discord_dm_settings`
- `discord_role_type` enum
- `discord_role_mappings`, `discord_role_sync_queue`
- `users.show_discord_publicly` column
- All RLS policies (service role for queues, community leaders for configs, user-scoped for prefs)

Files:
- `packages/supabase/supabase/migrations/YYYYMMDDHHMMSS_add_discord_bot_tables.sql`

**1b. Shared Discord utilities**
- Ed25519 signature verification
- Discord REST API client helpers (send message, edit response, DM, assign/remove role, get guild channels, get guild roles)
- Embed builder helpers with truncation
- `allowed_mentions: { parse: [] }` on all outbound messages
- Rate limit header respect
- Type definitions for interactions, embeds, role payloads

Files:
- `apps/web/src/lib/discord/verify.ts`
- `apps/web/src/lib/discord/api.ts`
- `apps/web/src/lib/discord/types.ts`
- `apps/web/src/lib/discord/embeds.ts`
- `apps/web/src/lib/discord/rate-limit.ts`

**1c. Environment variables**
- `.env.local` — `DISCORD_APPLICATION_ID`, `DISCORD_PUBLIC_KEY`, `DISCORD_BOT_TOKEN`, `CRON_SECRET`
- `turbo.json` — declare env vars for cache invalidation
- Create Beanie Bot application in Discord Developer Portal (dev + prod apps)

### Phase 2: Bot Installation & Infrastructure

**2a. Install callback route**
- `/api/discord/install-callback` — receives OAuth2 redirect from Discord
- Verifies signed state token
- Creates `discord_servers` row
- Redirects to success page

**2b. Uninstall detection cron**
- Periodic sweep of `discord_servers` — validates each via Discord API
- On 404, cascade delete channel/role/DM mappings

**2c. Supabase queries + mutations package**
- Queries: servers, channels, role mappings, DM settings, failures
- Mutations: enqueue channel notification, enqueue DM, enqueue role sync, update mappings

Files:
- `apps/web/src/app/api/discord/install-callback/route.ts`
- `apps/web/src/app/api/discord/uninstall-sweep/route.ts`
- `packages/supabase/src/queries/discord.ts`
- `packages/supabase/src/mutations/discord.ts`

### Phase 3: Interactions Endpoint + Slash Commands

**3a. Interactions endpoint core**
- `/api/discord/interactions` — signature verify, PING handler, deferred ACK with `waitUntil`
- Command router (maps command name → handler)
- Autocomplete router (maps command name → autocomplete handler)
- Community resolution from guild ID
- Bot-in-unlinked-server helpful message

**3b. Command registration script**
- `/api/discord/register` — registers all commands globally (prod) or to a test guild (dev)
- Command definitions with descriptions + options + default permissions
- Autocomplete-enabled options flagged

**3c. Slash command handlers (all 13)**
- `/tournament`, `/standings`, `/pairings`, `/events`
- `/player`, `/team`, `/leaderboard`
- `/drop` (with confirmation button component)
- `/link`
- `/setchannel`, `/unsetchannel`, `/channels` (community leader auth)
- `/help`

Each handler follows the preview-plus-link pattern. Scoping rules enforced (community, current tournament default, unlinked server, auth checks).

**3d. Autocomplete handlers**
- Tournament name autocomplete (community-scoped)
- Player username autocomplete (community-scoped, recent activity)
- Per-user active tournament autocomplete (for `/drop`)
- Event type autocomplete (for `/setchannel`/`/unsetchannel`)
- Caching layer (60s TTL)

Files:
- `apps/web/src/app/api/discord/interactions/route.ts`
- `apps/web/src/app/api/discord/register/route.ts`
- `apps/web/src/lib/discord/commands/index.ts` (registry)
- `apps/web/src/lib/discord/commands/*.ts` (one file per command)
- `apps/web/src/lib/discord/autocomplete/*.ts`

### Phase 4: Notification Delivery

**4a. Channel notification cron**
- `/api/discord/notify` — processes `discord_notification_queue`
- Sends to mapped channels
- Rate limit handling
- Retry logic (3 attempts)
- Failure tracking in `discord_channel_failures`
- Dead-letter email trigger at 5 consecutive failures

**4b. DM notification cron**
- Same cron endpoint or separate — processes `discord_dm_queue`
- Checks user pref + community delivery mode
- DM with fallback to channel @mention
- Failure bucketing (skipped vs failed)
- 50007 handling → user settings warning flag

**4c. Role sync cron**
- Processes `discord_role_sync_queue`
- Reconciliation pass every 15 min (enqueues adds/removes based on trainers.gg state)
- Role hierarchy violation handling (403)
- Deleted role handling (auto-pause mapping)

**4d. Vercel cron config**
- `vercel.json` — add cron entries:
  - `/api/discord/notify` every 5 min (channel + DM queue)
  - `/api/discord/role-sync` every 5 min (role sync queue)
  - `/api/discord/reconcile-roles` every 15 min (reconciliation)
  - `/api/discord/uninstall-sweep` daily

**4e. Application code integration (enqueue from events)**
- Integrate notification enqueue calls into existing trainers.gg flows:
  - Tournament creation → channel notification
  - Registration opens → channel notification
  - Match seeded → DM to participants
  - Match starting soon → DM to participants
  - Match result reported → channel notification + DM confirmation
  - Tournament ends → channel notification + Winner role assignment
  - Community leader role change → Staff role sync
  - User joins/leaves community → Member role sync

Files:
- `apps/web/src/app/api/discord/notify/route.ts`
- `apps/web/src/app/api/discord/role-sync/route.ts`
- `apps/web/src/app/api/discord/reconcile-roles/route.ts`
- `vercel.json`
- Various existing files where events fire (Server Actions, edge functions)

### Phase 5: Web UI

**5a. Community Settings → Integrations section**
- New route: `/communities/[slug]/settings/integrations/`
- Integrations list page (Discord as first)

**5b. Discord Integration page**
- Route: `/communities/[slug]/settings/integrations/discord`
- Persistent header: install status, failure banner, reinstall/disconnect
- Tab 1: Notifications (Channel Announcements + DM subsections)
- Tab 2: Roles (role assignments + hierarchy warnings)
- Failures detail modal

**5c. User Settings UI**
- Notifications page: Discord DMs section with master toggle + per-event toggles grouped by category
- Linked Identities: compact DM summary in Discord row
- Profile: "Show Discord handle on profile" toggle

**5d. Public profile Discord handle display**
- Conditional icon + handle next to username
- Gated by `users.show_discord_publicly`

**5e. Small touches**
- Tournament creation flow tooltip
- "🤖 Bot installed" link next to Discord invite URL field

Files:
- `apps/web/src/app/[community]/settings/integrations/**/*.tsx`
- `apps/web/src/app/(user)/settings/notifications/page.tsx` (extend or create)
- `apps/web/src/components/settings/linked-identities-section.tsx` (extend)
- `apps/web/src/app/(profile)/[username]/page.tsx` (extend)
- Various component files

### Phase 6: Analytics + Polish

**6a. PostHog events**
- All events from the Analytics section of the spec
- Server-side emission from bot routes + UI actions

**6b. Data retention cron**
- Weekly cron to purge old queue entries per retention policies

**6c. Rate limiting**
- Per-user and per-guild command limits
- Autocomplete result caching

**6d. Custom mascot + brand polish**
- Design Beanie Bot avatar
- Write command descriptions in warm tone
- Write error messages with personality
- Write bot "About" description

### Phase 7: Testing

**7a. Unit tests**
- Signature verification
- All command handlers (with mocked Supabase)
- Embed builders + truncation
- Rate limiter
- Queue state machines

**7b. Integration tests**
- Install flow end-to-end
- Full command flow in dev guild
- Notification delivery
- DM delivery with fallback
- Role sync

**7c. E2E tests**
- Web UI for community leader config
- User settings DM prefs
- Linked identities DM summary

Files:
- Tests colocated in `__tests__/` folders
- E2E tests in `apps/web/e2e/`

## Verification

After each phase:
1. `pnpm db:reset` — migration applies cleanly (Phase 1 only)
2. `pnpm generate-types` — TypeScript types regenerate
3. `pnpm typecheck` — no type errors
4. `pnpm lint` — no lint errors
5. `pnpm test` — relevant tests pass
6. Manual: run flows end-to-end in dev Discord guild

Final v1 launch verification:
1. Install Beanie Bot in a test community's Discord server
2. Configure all channel mappings
3. Configure role mappings
4. Configure DM delivery modes
5. Opt in as a user to all DM event types
6. Run through complete tournament lifecycle (create → register → start → match → result → end)
7. Verify all notifications, DMs, and role assignments fire correctly
8. Verify dead-letter UX by deliberately breaking a channel mapping
9. Verify `/api/discord/notify` handles queue backlog gracefully
