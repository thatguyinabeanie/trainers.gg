# Discord Bot — Design Spec

## Context

trainers.gg communities use Discord as their primary communication hub. Currently, the platform only stores Discord invite URLs — there's no programmatic integration. A Discord bot would bridge this gap: pushing tournament notifications into community channels and letting users query trainers.gg data directly from Discord.

Discord OAuth login and account linking are already implemented via Supabase Auth. The bot builds on this existing identity infrastructure.

## Scope

**Everything in this spec is v1 scope** — channel notifications, DM system, full role management, all 13 slash commands, autocomplete, opt-in profile handle display, the full community settings Integrations UI, and user notification preferences. This is a substantial build; the phasing is left to the implementation plan.

Items in the "Future / Deferred" section are explicitly NOT in v1.

## Decision: Vercel Deployment (HTTP Interactions Only)

**Chosen over Fly.io and Supabase Edge Functions.**

The bot uses Discord's HTTP Interactions Endpoint (webhook-based) rather than the Gateway (WebSocket). This means:

- No persistent process — runs as Next.js API routes on Vercel
- Scales automatically with zero infrastructure management
- No "online" presence dot in Discord (acceptable trade-off)
- Leverages existing deploy pipeline, logging, and monitoring

**Why not Fly.io:** Adds another service to maintain. trainers.gg already has enough infrastructure surface area (Vercel, Supabase, Fly.io PDS). The bot doesn't need a persistent connection.

**Why not Supabase Edge Functions:** Deno runtime limits library choices. Cold starts could make the 3-second Discord ACK deadline tight.

## Architecture

```
Discord slash command
  -> POST /api/discord/interactions (signed)
  -> Verify Ed25519 signature
  -> Return deferred ACK (< 3 seconds)
  -> waitUntil: query Supabase, build response, PATCH back via Discord REST API

Notification flow
  -> Event inserted into discord_notification_queue (by app code or DB trigger)
  -> Vercel cron hits /api/discord/notify (every 5 minutes)
  -> Sends pending notifications to mapped Discord channels
  -> Marks as sent
```

### Route Structure

```
apps/web/src/app/api/discord/
  interactions/route.ts    # Slash command handler (Interactions Endpoint)
  notify/route.ts          # Cron-triggered notification sender
  register/route.ts        # One-time command registration script (dev tool)
```

### Request Flow — Slash Commands

1. User types `/standings` in Discord
2. Discord POSTs signed payload to `/api/discord/interactions`
3. Route verifies Ed25519 signature using Discord's public key
4. Route returns HTTP 200 with type `5` (DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE) — this ACKs within 3 seconds
5. `waitUntil` from `@vercel/functions` kicks in:
   - Parse command name + options from the interaction payload
   - Query Supabase for the requested data
   - Build a Discord embed (rich formatted message)
   - PATCH to `https://discord.com/api/v10/webhooks/{app_id}/{token}/messages/@original`
6. User sees "Bot is thinking..." then the final response appears

### Request Flow — Notifications

1. Application code (Server Action, edge function, etc.) inserts a row into `discord_notification_queue`
2. Vercel cron triggers `/api/discord/notify` every 5 minutes
3. Route queries `discord_notification_queue` WHERE `status = 'pending'`
4. For each notification:
   - Look up channel mapping in `discord_channels`
   - POST embed to `https://discord.com/api/v10/channels/{channel_id}/messages`
   - Update queue row: `status = 'sent'`, `sent_at = now()`
5. Failed sends: `status = 'failed'`, retry on next cron run (up to 3 attempts)

## Authentication

Five distinct auth flows, each handled differently.

### 1. Discord → Interactions Endpoint (inbound)

Ed25519 signature verification. Discord signs every request; the bot verifies with Discord's public key before processing.

```ts
import { verifyKey } from 'discord-interactions'

const isValid = verifyKey(body, signature, timestamp, process.env.DISCORD_PUBLIC_KEY)
if (!isValid) return new Response('Bad signature', { status: 401 })
```

Discord enforces this — it sends test requests with invalid signatures when you register the Interactions Endpoint URL, rejecting the URL if it doesn't return 401.

### 2. Vercel Cron → Notify Endpoint (inbound)

`CRON_SECRET` bearer token. Vercel cron automatically sends `Authorization: Bearer $CRON_SECRET` when set as an env var.

```ts
const authHeader = req.headers.get('authorization')
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return new Response('Unauthorized', { status: 401 })
}
```

### 3. Bot → Discord REST API (outbound)

Bot token in `Authorization` header for sending messages, editing responses, and registering commands.

```ts
headers: {
  'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
  'Content-Type': 'application/json',
}
```

Bot token is generated in the Discord Developer Portal and is distinct from the public key (which is only for signature verification).

### 4. Discord User → trainers.gg Account (identity resolution)

Query `auth.identities` — Supabase Auth already stores Discord identities when users link via the existing OAuth flow.

```ts
const { data } = await supabase
  .from('auth.identities')
  .select('user_id')
  .eq('provider', 'discord')
  .eq('identity_id', discordUserId)
  .single()
```

If no linked account, reply ephemerally with a link to `/dashboard/settings/account?link=discord`.

### 5. Bot → Supabase (database access)

Service role key — bypasses RLS, used for server-to-server access.

**Critical:** Since the bot bypasses RLS, authorization must be enforced in bot code, not via RLS. For example, `/team [player]` must explicitly check `team.is_public === true` in the handler before returning data.

### What We're NOT Doing

- No OAuth2 with Discord user tokens (bot doesn't act on behalf of users)
- No JWT verification in the bot (Discord users don't have trainers.gg sessions)
- No custom auth layer (Discord signature + cron secret are sufficient)

## Data Model

### New Tables

**`discord_servers`** — one row per Discord server (guild) where the bot is installed

| Column | Type | Notes |
|--------|------|-------|
| `id` | `bigint GENERATED ALWAYS AS IDENTITY` | PK |
| `guild_id` | `text UNIQUE NOT NULL` | Discord server snowflake ID |
| `community_id` | `bigint UNIQUE NOT NULL` (FK → communities) | Link to trainers.gg community. **One community = one server** |
| `installed_by` | `uuid NOT NULL` (FK → auth.users) | User who added the bot |
| `settings` | `jsonb NOT NULL DEFAULT '{}'` | Per-server preferences |
| `created_at` | `timestamptz NOT NULL DEFAULT now()` | |

**`discord_channels`** — maps channels to notification event types

| Column | Type | Notes |
|--------|------|-------|
| `id` | `bigint GENERATED ALWAYS AS IDENTITY` | PK |
| `discord_server_id` | `bigint NOT NULL` (FK → discord_servers) | |
| `channel_id` | `text NOT NULL` | Discord channel snowflake ID |
| `event_type` | `text NOT NULL` | e.g. `tournament_start`, `match_result`, `registration_open` |
| `created_at` | `timestamptz NOT NULL DEFAULT now()` | |
| | UNIQUE | `(discord_server_id, channel_id, event_type)` |

**`discord_notification_queue`** — outbox for pending notifications

| Column | Type | Notes |
|--------|------|-------|
| `id` | `bigint GENERATED ALWAYS AS IDENTITY` | PK |
| `channel_id` | `text NOT NULL` | Target Discord channel |
| `event_type` | `text NOT NULL` | Denormalized for idempotency key |
| `source_id` | `text NOT NULL` | The entity that caused the event (tournament_id, match_id, etc.) |
| `payload` | `jsonb NOT NULL` | Message embed data |
| `status` | `text NOT NULL DEFAULT 'pending'` | `pending`, `sent`, `failed` |
| `attempts` | `int NOT NULL DEFAULT 0` | Retry counter (max 3) |
| `failed_reason` | `text` | HTTP status + error code on failure |
| `created_at` | `timestamptz NOT NULL DEFAULT now()` | |
| `sent_at` | `timestamptz` | When successfully delivered |
| | UNIQUE | `(event_type, source_id)` — strict idempotency |

**`discord_channel_failures`** — aggregate failure counter for dead-letter email triggers

| Column | Type | Notes |
|--------|------|-------|
| `id` | `bigint GENERATED ALWAYS AS IDENTITY` | PK |
| `discord_server_id` | `bigint NOT NULL` (FK → discord_servers) | |
| `channel_id` | `text NOT NULL` | Discord channel snowflake |
| `consecutive_failures` | `int NOT NULL DEFAULT 0` | Reset to 0 on successful delivery |
| `last_failed_at` | `timestamptz` | |
| `email_sent_at` | `timestamptz` | Nullable; set when dead-letter email is sent, cleared on recovery |
| | UNIQUE | `(discord_server_id, channel_id)` |

### No `discord_user_links` Table

Discord user ↔ trainers.gg account mapping already exists in Supabase Auth's `auth.identities` table (provider = `'discord'`). The bot queries this directly:

```sql
SELECT user_id FROM auth.identities
WHERE provider = 'discord' AND identity_id = :discord_user_id;
```

### RLS Policies

- `discord_servers`: SELECT for authenticated users; INSERT/UPDATE/DELETE for community leaders of the linked community
- `discord_channels`: Same as discord_servers (scoped via discord_server_id → community_id)
- `discord_notification_queue`: Service role only (no direct client access)

## Account Linking

### Existing Flows (no changes needed)

- **Login with Discord**: Supabase OAuth, already configured in `auth.ts`
- **Link Discord in Settings**: `linked-identities-section.tsx`, uses `signInWithOAuth`
- **Unlink Discord**: `identities.ts` server action, uses `unlinkIdentity`

### New Flow — `/link` Slash Command

1. User types `/link` in Discord
2. Bot responds with an ephemeral message containing a URL: `https://trainers.gg/dashboard/settings/account?link=discord`
3. User clicks, logs in (or is already logged in), Discord identity links via existing Supabase OAuth
4. Next time user runs a slash command, bot recognizes them via `auth.identities`

## Slash Commands (v1)

### Design Philosophy

**Every command is a "preview + link" — the bot drives traffic to trainers.gg, it does not replace it.** Commands show a compact embed with the most useful info (3-10 data points) plus a button/link to the full page on the website. Commands never attempt to fully reproduce web UI functionality.

### Scoping Rules

**All commands are implicitly scoped to the community that owns the Discord server.** Every command looks up `discord_servers.community_id` from the guild ID and filters all queries by that community.

**"Current tournament" default:** When a command takes a `[tournament]` parameter, it is optional when unambiguous:

| State | Behavior |
|-------|----------|
| 0 active tournaments | Error: "No active tournaments. Try `/events` to see upcoming." |
| 1 active tournament | Default to that tournament |
| 2+ active tournaments | Require `tournament` param; list active ones in the error |

**Player stats scope:** Stats shown in `/player` are scoped to the community's tournaments (ELO, W-L within this community). The link in the preview goes to the global profile on trainers.gg.

**Team scope:** `/team [player]` shows the player's team for the current tournament in this community. If the player isn't registered for an active tournament, the preview says so and links to their team history.

**Leaderboard scope:** `/leaderboard` defaults to the current season / active tournament. `/leaderboard scope:all-time` shows the community's all-time leaderboard.

**Bot in unlinked server:** If a Discord server has no `discord_servers` row (bot added but never linked to a community), every command returns a helpful ephemeral message: "This server isn't linked to a trainers.gg community. A community leader can set it up at [link]." No data leaks.

### Commands

All commands scoped to the Discord server's linked community (see Scoping Rules above). `[tournament?]` = optional, defaults to current tournament when unambiguous.

| Command | Purpose | Preview Content | Auth Required |
|---------|---------|-----------------|---------------|
| `/tournament [name?]` | Tournament details | Format, date, # registered, status | No |
| `/standings [tournament?]` | Current standings | Top 5 players + link to full | No |
| `/pairings [tournament?]` | Current round pairings | Round #, count + link | No |
| `/events` | Upcoming tournaments | Up to 5 upcoming in this community | No |
| `/player [username]` | Player profile | Community ELO, W-L, last played | No |
| `/team [player?]` | Team sheet preview | Team name + link. No arg = your team | No arg: yes. Arg: no |
| `/leaderboard [scope?]` | Community leaderboard | Top 10 (default current season; `scope:all-time` for overall) | No |
| `/drop [tournament?]` | Drop from tournament | Confirmation prompt, then drop | Yes (linked account) |
| `/link` | Link Discord ↔ trainers.gg | Ephemeral link to settings | No (initiates OAuth) |
| `/setchannel [event_type]` | Map current channel to event type | Confirmation embed | Community leader |
| `/unsetchannel [event_type]` | Remove channel mapping | Confirmation embed | Community leader |
| `/channels` | List current mappings | List of configured channels | Community leader |
| `/help` | List all commands | Categorized command reference | No |

### Command Notes

- **`/tournament` without a name** defaults to the current tournament (same "current tournament" rule as `[tournament?]` params).
- **`/team` without arguments** shows the current user's team in the current tournament. Requires a linked trainers.gg account — if not linked, responds with a prompt to run `/link`.
- **`/drop`** is irreversible in most tournament formats. Show a confirmation button before dropping. Defaults to current tournament; errors if ambiguous.
- **`/player`** stats are community-scoped (ELO and record within this community's tournaments). The "View full profile" link goes to the global trainers.gg profile.

### Admin Commands — Available Both In-Discord and On-Site

`/setchannel`, `/unsetchannel`, and `/channels` have equivalent UI on trainers.gg (community settings → Discord integration). Both paths produce the same result in `discord_channels`. In-Discord commands exist for convenience; the website has the full UI.

### Explicitly Excluded from v1

- **Pokemon data utilities** (`/legality`, `/coverage`, `/damage`, `/pokemon`, `/move`) — belong on the site, not duplicated in Discord
- **Match-level actions** (`/checkin`, `/report`) — should happen on the match page where users play. `/drop` is different — it's a tournament-level action, not match-level.
- **Personal stats shortcuts** (`/mystats`) — `/player [username]` covers this. `/myteam` is covered by `/team` with no arguments.
- **Redundant navigation** (`/register`, `/bracket`) — covered by link buttons in `/tournament`
- **Account management** (`/unlink`) — belongs in settings where the full picture is visible
- **Manual announcements** (`/announce`) — notifications are automatic via the queue; manual announcements are a different workflow

Commands are registered once globally via the Discord API (not per-server). The `/api/discord/register` route is a dev tool for this.

## Libraries

- **[discord-interactions](https://github.com/discord/discord-interactions-js)** — Ed25519 signature verification + interaction type/response type constants
- **Discord REST API via `fetch()`** — No heavy SDK needed. Direct calls for sending messages, editing responses, registering commands, and OAuth2.

No dependency on discord.js (gateway-focused library, unnecessary overhead for HTTP-only bot).

## Environment Variables

All server-only — none should have the `NEXT_PUBLIC_` prefix.

| Variable | Purpose | Used By |
|----------|---------|---------|
| `DISCORD_APPLICATION_ID` | Bot's application ID | Command registration, webhook URLs |
| `DISCORD_PUBLIC_KEY` | Verifying inbound interaction signatures | `/api/discord/interactions` |
| `DISCORD_BOT_TOKEN` | Outbound Discord REST API calls | Sending messages, editing responses |
| `CRON_SECRET` | Protecting `/api/discord/notify` endpoint | Notification cron route |
| `SUPABASE_SERVICE_ROLE_KEY` | Bot DB access (already exists) | All bot routes |

## Vercel Configuration

```jsonc
// vercel.json (additions)
{
  "crons": [
    {
      "path": "/api/discord/notify",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

## Notification Event Types

| Event Type | Trigger | Message Content |
|------------|---------|-----------------|
| `tournament_created` | New tournament in community | Title, format, date, registration link |
| `registration_open` | Registration period opens | Tournament name, deadline, register link |
| `tournament_start` | Tournament begins | Tournament name, round 1 pairings link |
| `match_result` | Match reported | Winner, score, updated standings link |
| `tournament_end` | Tournament concludes | Final standings, winner highlight |

## Scaling Characteristics

- Each slash command runs as an independent serverless function invocation
- Fluid Compute reuses warm instances across concurrent requests
- Notification cron processes queue in batches — handles spikes gracefully
- At 10-50 community servers: well within Vercel's free/Pro tier limits
- No capacity planning needed — scales automatically

## Role Management

### Role Types (v1)

Community leaders map trainers.gg state to Discord roles. Each mapping is optional and configured independently.

| Role type | Granted when | Removed when |
|-----------|-------------|--------------|
| `member` | User links Discord + is in community | User unlinks or leaves community |
| `participant` | User registers for any active tournament | Tournament ends or user drops |
| `winner` | User wins a tournament (1st place) | Never removed (honorific) |
| `staff` | User is a community leader | User's leadership role revoked |
| `currently_playing` | User has an in-progress match | Match concludes |

### Admin Verification for Command Access

Admin commands (`/setchannel`, `/unsetchannel`, `/channels`) verify the caller in two layers:

1. **Discord native permissions:** commands register with default permissions requiring `MANAGE_CHANNELS`. Server admins can override this in Discord's UI (e.g., allow a specific role).
2. **Server-side check:** bot resolves Discord user → `auth.identities` → trainers.gg user, then verifies community leader status for the community linked to this guild. Ephemeral error on failure: "You need to be a community leader for [community] to use this command."

Both layers matter. Discord native perms block the command at the UI; server-side verification enforces trainers.gg authorization regardless of Discord role configuration.

### Sync Mechanism

Two paths, both write to `discord_role_sync_queue`:

**Real-time:** Application code triggers role changes on events (tournament registration, drop, match start/end, leader role change). The notification-enqueue pattern from `discord_notification_queue` extends here.

**Reconciliation cron:** Runs every 15 minutes. For each `discord_role_mappings` row, compare the authoritative trainers.gg state (who SHOULD have the role) against the Discord state (who currently HAS the role) and enqueue adds/removes to correct drift.

The queue is processed on the same 5-minute notification cron cadence, hitting Discord's `PUT /guilds/{id}/members/{user_id}/roles/{role_id}` for adds and `DELETE` for removes.

### Data Model

**`discord_role_mappings`**

| Column | Type | Notes |
|--------|------|-------|
| `id` | `bigint GENERATED ALWAYS AS IDENTITY` | PK |
| `discord_server_id` | `bigint NOT NULL` (FK → discord_servers) | |
| `role_type` | `discord_role_type` (enum) | `member`, `participant`, `winner`, `staff`, `currently_playing` |
| `discord_role_id` | `text NOT NULL` | Role snowflake |
| `enabled` | `boolean NOT NULL DEFAULT true` | Can pause without deleting |
| `created_at` | `timestamptz NOT NULL DEFAULT now()` | |
| | UNIQUE | `(discord_server_id, role_type)` |

**`discord_role_sync_queue`**

| Column | Type | Notes |
|--------|------|-------|
| `id` | `bigint GENERATED ALWAYS AS IDENTITY` | PK |
| `discord_server_id` | `bigint NOT NULL` (FK → discord_servers) | |
| `discord_user_id` | `text NOT NULL` | User snowflake |
| `discord_role_id` | `text NOT NULL` | Role snowflake |
| `action` | `text NOT NULL` | `add` or `remove` |
| `source_event` | `text NOT NULL` | e.g., `tournament_registered:123`, `reconciliation` |
| `status` | `text NOT NULL DEFAULT 'pending'` | `pending`, `sent`, `failed` |
| `attempts` | `int NOT NULL DEFAULT 0` | |
| `failed_reason` | `text` | |
| `created_at` | `timestamptz NOT NULL DEFAULT now()` | |
| `completed_at` | `timestamptz` | |
| | UNIQUE | `(discord_server_id, discord_user_id, discord_role_id, action, source_event)` |

### UI — Roles Tab (see full page structure under Web UI Changes)

- One row per role type (member, participant, winner, staff, currently_playing)
- Each row: enable toggle + Discord role picker (populated from the server's role list)
- Role list refreshed on page load via bot token calling `GET /guilds/{id}/roles`
- Warning banner if bot's role is below any configured role ("Bot role must be above X to assign it — drag the bot role higher in Server Settings → Roles")
- Sync status indicator per row (last sync time, last failure if any)

### Role-Specific Edge Cases

- **Deleted Discord role:** sync returns 404. Mark mapping as errored, show in UI, auto-pause (set `enabled = false`).
- **Role hierarchy violation (403):** bot can't assign a role higher than its own. Surface warning in UI, keep mapping enabled (user will fix hierarchy).
- **Stale user (unlinked Discord):** if user unlinks after receiving a role, we can't map them back. Acceptable — they leave the community or re-link.
- **Discord role mentions `@everyone` / `@here`:** roles can be mentionable; always set `allowed_mentions: { parse: [], roles: [] }` on bot messages to avoid accidental pings.
- **Member leaves Discord server:** sync for removed member returns 404. Clear their role sync queue entries for that guild.
- **Honorific role immutability:** `winner` role is never removed by the bot. If a community leader wants to remove it from a user, they do so manually in Discord.

## Direct Message Notifications

### Concept

Time-sensitive events that are **personal to a specific player** (not broad community announcements) deliver via Discord DM with a deep link to the relevant trainers.gg page.

### Events Delivered via DM

| Event | Link Destination |
|-------|------------------|
| `match_ready` | Match page (pairings seeded, opponent assigned) |
| `match_starting_soon` | Match page (5-minute warning) |
| `match_result_to_confirm` | Match page (opponent reported result) |
| `match_disputed` | Match page (confirmation failed) |
| `team_sheet_needed` | Team sheet page (submission deadline approaching) |
| `team_sheet_approved` | Team sheet page |
| `team_sheet_rejected` | Team sheet page (with issues highlighted) |
| `you_dropped` | Tournament page (confirmation) |
| `top_cut_made` | Tournament page (bracket) |
| `tournament_starting` | Tournament page (1-hour warning for registrants) |
| `tournament_cancelled` | Tournament page |

### User Preferences — Opt-in, Per-Event

- **Default:** All DMs OFF. Users must explicitly enable each event type they want to receive.
- **UI:** User Settings → Notifications → Discord DMs — one toggle per event type
- **Master toggle:** Single "Enable Discord DMs" switch that gates everything. Must be on + specific event toggles on for a DM to send.
- **Requires linked Discord account** — toggles are disabled (grayed out) if the user hasn't linked Discord

### Community Leader Delivery Mode Config

For each DM-capable event, community leaders configure delivery mode (in the Discord Integration page):

| Mode | Behavior |
|------|----------|
| `dm_only` | Only DM the user. If DM fails, mark skipped (no channel post). |
| `channel_only` | Never DM. Always post to a channel, @mentioning the user. |
| `dm_with_fallback` | Try DM first. If DM fails/blocked, fall back to a channel @mention. |

**Default:** `channel_only` for all DM-capable events (safer; requires explicit leader opt-in for DMs to activate at the community level).

Both user AND community must have DMs enabled for an event type before a DM is sent. Community config acts as a ceiling; user pref acts as a personal switch.

### DM Failure Handling

Discord DM failures split into two buckets:

**User-choice failures (not errors):**
- `50007` "Cannot send messages to this user" — user has DMs disabled from server members → mark as `skipped`
- Surface a warning in the user's trainers.gg Discord settings: "⚠ DMs appear to be blocked. Enable DMs from server members to receive alerts."

**True errors:**
- `10013` "Unknown User" — deleted account → mark failed, do not retry
- `429` rate limit → retryable (respect `Retry-After`)
- Network / 5xx → retryable

When delivery mode is `dm_with_fallback` and a DM fails (for any reason), fall back to posting in the configured channel with an @mention.

### Data Model

**`discord_dm_queue`**

| Column | Type | Notes |
|--------|------|-------|
| `id` | `bigint GENERATED ALWAYS AS IDENTITY` | PK |
| `discord_user_id` | `text NOT NULL` | Recipient snowflake |
| `user_id` | `uuid NOT NULL` (FK → auth.users) | For preference lookup |
| `community_id` | `bigint NOT NULL` (FK → communities) | Scope |
| `event_type` | `discord_dm_event_type` enum | See event list above |
| `source_id` | `text NOT NULL` | Match ID, tournament ID, etc. |
| `payload` | `jsonb NOT NULL` | Embed content + link URL |
| `delivery_mode` | `text NOT NULL` | Snapshot at enqueue time (config could change) |
| `fallback_channel_id` | `text` | If delivery_mode allows fallback |
| `status` | `text NOT NULL DEFAULT 'pending'` | `pending`, `sent`, `failed`, `skipped` |
| `attempts` | `int NOT NULL DEFAULT 0` | Max 3 |
| `failed_reason` | `text` | |
| `created_at` | `timestamptz NOT NULL DEFAULT now()` | |
| `sent_at` | `timestamptz` | |
| | UNIQUE | `(event_type, source_id, discord_user_id)` — strict idempotency |

**`discord_user_dm_preferences`**

| Column | Type | Notes |
|--------|------|-------|
| `user_id` | `uuid NOT NULL` (FK → auth.users) | |
| `event_type` | `discord_dm_event_type` enum | |
| `enabled` | `boolean NOT NULL DEFAULT false` | |
| | PRIMARY KEY | `(user_id, event_type)` |

**`discord_dm_settings`** — community-level delivery mode config

| Column | Type | Notes |
|--------|------|-------|
| `id` | `bigint GENERATED ALWAYS AS IDENTITY` | PK |
| `discord_server_id` | `bigint NOT NULL` (FK → discord_servers) | |
| `event_type` | `discord_dm_event_type` enum | |
| `delivery_mode` | `text NOT NULL DEFAULT 'channel_only'` | `dm_only`, `channel_only`, `dm_with_fallback` |
| `fallback_channel_id` | `text` | Required when mode is `channel_only` or `dm_with_fallback` |
| | UNIQUE | `(discord_server_id, event_type)` |

### Processing Flow

```
Event fires in trainers.gg (e.g., round seeded)
  → Application code: for each match, enqueue DM for each participant
  → discord_dm_queue receives one row per participant
  → Cron (shared with notification cron) processes pending DMs
  → For each:
      1. Look up user's discord_user_dm_preferences for this event
      2. If user disabled this event type → status = 'skipped'
      3. If user enabled → attempt DM via Discord REST API
      4. On 50007 (DMs blocked):
         - If delivery_mode = 'dm_with_fallback' → post to fallback_channel_id with @mention
         - Else → status = 'skipped', surface warning in user settings
      5. On success → status = 'sent'
```

### DM Embed Design

Match-ready DM example:
```
┌─────────────────────────────────────────┐
│ ⚔ Your Round 3 Match Is Ready!          │
├─────────────────────────────────────────┤
│ Spring Invitational — Round 3           │
│                                         │
│ You vs @Brock                           │
│ Format: VGC 2026                        │
│                                         │
│ Match opens in 10 minutes               │
│                                         │
│ [Go to Match]                           │
└─────────────────────────────────────────┘
```

Every DM includes:
- Community name (so user knows which Discord server this is about, since they may be in many)
- Event-specific headline and context
- Deep link button to the relevant page

## Web UI Changes

### Community Settings — New "Integrations" Section

Adds a new top-level Integrations section to community settings, positioned to accommodate future integrations (Twitch, YouTube, custom webhooks). The existing `discord_invite_url` field stays in its current location and gains a subtle "🤖 Bot installed — configure" link that jumps to Integrations → Discord.

```
Community Settings
├── General (existing)
├── Members (existing)
├── Discord URL field (existing + new "configure bot" link)
├── Integrations ← NEW
│   └── Discord (rich UI, see below)
└── Danger Zone (existing)
```

### Discord Integration Page Layout

Located at `/communities/{slug}/settings/integrations/discord`. Structure: persistent header + two tabs.

```
┌───────────────────────────────────────────────────┐
│ Discord Integration                               │
├───────────────────────────────────────────────────┤
│ Persistent Header (always visible)                │
│ • Install status: "Installed in [Server Name]"    │
│   or "Not installed — [Add to Server]"            │
│ • Installed-by user + timestamp                   │
│ • [Reinstall] [Disconnect] buttons                │
│ • Failure summary banner if any recent failures:  │
│   "⚠ 3 delivery failures in last 24h — [View]"   │
├───────────────────────────────────────────────────┤
│ [ Notifications ]  [ Roles ]                      │
├───────────────────────────────────────────────────┤
│ Tab content                                       │
└───────────────────────────────────────────────────┘
```

### Tab 1: Notifications

Two subsections stacked vertically:

**Channel Announcements** — table of event types mapped to Discord channels. Each row:
- Event type (label + description)
- Channel picker (populated from bot's cached guild channel list)
- Remove button
- Add-mapping row at the bottom

**Direct Messages to Players** — table of DM-capable event types with delivery mode selector. Each row:
- Event type (label + description)
- Delivery mode dropdown: `channel_only` / `dm_only` / `dm_with_fallback`
- Fallback channel picker (visible when mode is `channel_only` or `dm_with_fallback`)

Failures inline — if a specific channel or event type has recent failures, show a small inline warning on that row ("Last send failed — permission denied").

### Tab 2: Roles

Role assignments table (design already specified in Role Management section):
- One row per role type
- Enable toggle + Discord role picker
- Sync status + failure indicators per row
- Bot hierarchy warning banner at top if applicable

### Failures Detail View

Clicking "View" in the failure banner opens a modal or drawer listing recent failures:
- Event type
- Target (channel name or user handle)
- Reason (HTTP status + human-readable explanation)
- Attempt count
- Retry or dismiss actions

### User Settings — Notifications Page

New "Discord Direct Messages" section on the existing Notifications settings page:

```
Discord Direct Messages
──────────────────────────────────────────────
Requires a linked Discord account.
[● Connected as @username]  or  [Link Discord]

[○ Enable Discord DMs]  ← master toggle

MATCH EVENTS
[ ] Match ready
[ ] Match starting soon
[ ] Result to confirm
[ ] Match disputed

TEAM SHEET EVENTS
[ ] Team sheet needed
[ ] Team sheet approved
[ ] Team sheet rejected

TOURNAMENT EVENTS
[ ] You dropped
[ ] Top cut made
[ ] Tournament starting
[ ] Tournament cancelled

⚠ Your Discord DMs appear to be blocked from server
  members. Update Discord privacy settings to
  receive alerts.  [Learn how]
```

The warning banner is conditional — appears only when the bot has received a 50007 response when attempting to DM this user (tracked via a flag on the user record or `discord_user_dm_preferences`).

### User Settings — Linked Identities Section

The existing Discord row in Linked Identities gets a compact DM summary:

```
🔗 Discord                              [Unlink]
   Connected as @username
   DM notifications: 3 of 11 enabled  [Manage →]
```

`[Manage →]` deep-links to the Notifications page → Discord DMs section (anchor scroll). Does not duplicate the full toggle UI.

### Public User Profile — Discord Handle Display (Opt-In)

Users can toggle public display of their Discord handle on their profile:
- Settings location: User Settings → Profile → "Show Discord handle on profile" toggle (default: off)
- Public profile display: small Discord icon + handle next to username
- Database: existing `auth.identities.identity_data.username` stores the handle; a new `users.show_discord_publicly boolean NOT NULL DEFAULT false` column gates visibility

### Tournament Creation Flow — Info Tooltip

When creating a tournament as a community with Discord integration enabled, show a subtle info banner:

> 🤖 Discord notifications are configured for this community — announcements will auto-post to mapped channels.

Dismissible. Does not block creation.

### Mobile Considerations

The Integration page is not a mobile-first surface — it's an admin-only page for community leaders — but it should still work. On narrow viewports:
- Tabs stack vertically or become a dropdown
- Tables become card lists (stacked rows)
- Dropdowns use native mobile pickers

## Bot Installation & Onboarding

### Entry Point

**Dashboard → Discord Integration** (new standalone page under community dashboard).

This page contains:
- **Install status** — "Not installed" or "Installed in [Server Name]"
- **Install/reinstall button** — generates the Discord OAuth2 authorization URL and redirects the user
- **Channel mappings table** — same data as `/channels` command, with add/edit/remove UI
- **Failed notifications panel** — lists recent failed deliveries with reason (see Dead Letters)
- **Troubleshooting section** — common issues (missing permissions, deleted channels) with resolution steps

### Installation Flow

1. Community leader clicks **"Add to Discord Server"** on the integration page
2. Redirect to Discord OAuth2 authorization URL:
   ```
   https://discord.com/api/oauth2/authorize
     ?client_id=DISCORD_APPLICATION_ID
     &scope=bot+applications.commands
     &permissions=PERMISSIONS_INTEGER
     &redirect_uri=https://trainers.gg/api/discord/install-callback
     &state=COMMUNITY_ID_SIGNED_TOKEN
   ```
3. User selects their Discord server, clicks **Authorize**
4. Discord redirects back to `/api/discord/install-callback` with `code`, `guild_id`, and `state`
5. Route verifies the signed state token (prevents CSRF + community hijacking)
6. Route creates a `discord_servers` row linking `guild_id` → `community_id` → `installed_by = auth.uid()`
7. Success page shows next steps: configure channel mappings, test with `/tournament`

### Uninstallation

- Bot removed from Discord server → Discord sends a `GUILD_DELETE` event (but we don't have a gateway)
- Detection via cron: periodically validate `discord_servers` rows by hitting Discord's `/guilds/{id}` endpoint with the bot token. 404 → mark server as uninstalled, cascade-delete `discord_channels` rows.
- UI "Disconnect bot" button: deletes the `discord_servers` row (cascade). User must also remove the bot in Discord (we can't force this without gateway).

## Discord Permissions & Intents

### Required Permissions (combined integer in install URL)

| Permission | Why |
|------------|-----|
| `VIEW_CHANNEL` | Send messages to channels |
| `SEND_MESSAGES` | Post notifications |
| `EMBED_LINKS` | Rich embeds for commands/notifications |
| `USE_EXTERNAL_EMOJIS` | Pokemon type emojis in embeds |
| `MANAGE_ROLES` | Assign/remove roles based on trainers.gg state (see Role Management) |

### OAuth2 Scopes

- `bot` — install as a bot user
- `applications.commands` — register and receive slash commands

### Intents

**None required.** HTTP Interactions Endpoint does not use intents — that's a gateway concept. No message content reading, no presence tracking, no member list access.

## Testing Strategy

### Local Development

- **Tunnel:** Reuse existing ngrok infrastructure at `infra/ngrok/` (already used for PDS local dev)
- **Dev Discord application:** Create a separate "trainers.gg Dev" application in the Discord Developer Portal with its own credentials (dev bot token, public key, application ID)
- **Env-scoped registration:** Commands register to a single **test guild** in dev (guild-scoped), but globally in production. Discord's test-guild registration is instant; global registration takes up to 1 hour to propagate.
- **Local env vars:** `.env.local` uses dev credentials; production/preview uses prod credentials via Vercel env settings

### Unit Tests

- Signature verification (valid, invalid, expired)
- Command handler logic with mocked Supabase responses
- Embed builder output (truncation, size limits)
- Notification queue state machine (pending → sent, pending → failed)
- Cron auth verification

### Integration Tests

- E2E: install bot in test guild → run each slash command → verify response
- Notification flow: insert queue row → trigger cron → assert Discord API called with correct payload
- Autocomplete: query partial names → assert filtered results

## Autocomplete UX

Tournament and player name options in slash commands support Discord's autocomplete API, giving users a filtered dropdown as they type.

**Interaction type:** `APPLICATION_COMMAND_AUTOCOMPLETE` (type 4)

**Flow:**
1. User starts typing `/standings tournament:spri...`
2. Discord sends an autocomplete interaction to `/api/discord/interactions`
3. Route detects type 4, queries Supabase for matching tournaments in this community (ILIKE, limited to 25 results — Discord's cap)
4. Responds with `APPLICATION_COMMAND_AUTOCOMPLETE_RESULT` (type 8) containing choices
5. User picks one, Discord sends the resolved command

**Commands with autocomplete:**
- `/tournament [name]` — tournament names in this community
- `/standings [tournament]` — same
- `/pairings [tournament]` — same
- `/drop [tournament]` — user's active tournament registrations
- `/player [username]` — players with recent activity in this community
- `/team [player]` — same

## Response Visibility (Ephemeral vs Public)

| Command | Visibility | Why |
|---------|-----------|-----|
| `/tournament`, `/standings`, `/pairings`, `/events`, `/leaderboard`, `/player`, `/team` (with arg) | Public | Shared community info — everyone benefits from seeing it |
| `/team` (no arg) | Ephemeral | Personal query; avoid cluttering public channels |
| `/link`, `/help`, `/channels`, `/setchannel`, `/unsetchannel` | Ephemeral | Personal/config — noise if public |
| `/drop` (confirmation prompt) | Ephemeral | Prevents accidental public confirmation |
| `/drop` (after confirm) | Public | Community should see when someone drops |
| **All error responses** | Ephemeral | Don't clutter channels with error messages |

## Analytics & Observability

### PostHog Events (server-side, emitted from bot routes)

| Event | Properties |
|-------|------------|
| `discord_command_executed` | command_name, community_id, is_linked, success, latency_ms |
| `discord_command_failed` | command_name, community_id, error_code |
| `discord_notification_sent` | event_type, community_id |
| `discord_notification_failed` | event_type, community_id, reason, attempts |
| `discord_bot_installed` | community_id, guild_id |
| `discord_bot_uninstalled` | community_id, guild_id |
| `discord_account_linked` | user_id (via existing OAuth linking event) |
| `discord_channel_mapped` | community_id, event_type |
| `discord_role_mapped` | community_id, role_type |
| `discord_role_sync_failed` | community_id, role_type, reason |

### Server Metrics

- Signature verification failure rate (should be near-zero; spike = attack or config drift)
- Queue depth over time (should stay low; growth = cron not keeping up)
- Rate-limit encounters per cron run (should be low; high = need per-channel concurrency)

### Dead-Letter Surface

Already covered in Edge Cases — the community's Discord Integration page shows failed notifications with reasons. Email escalates at 5 consecutive channel failures.

## Edge Cases & Failure Handling

### Notification Delivery

- **Idempotency:** Strict — `UNIQUE (event_type, source_id)` on the queue. Duplicate inserts silently dropped via `ON CONFLICT DO NOTHING`.
- **Retry policy:** 3 attempts per notification. On each failure, increment `attempts` and `discord_channel_failures.consecutive_failures`. After 3 attempts, mark `status = 'failed'`.
- **Dead-letter surface:**
  - **Primary:** Community settings → "Discord integration" panel shows failed notifications with reason (deleted channel, lost permissions, rate limit, etc.).
  - **Email escalation:** When `discord_channel_failures.consecutive_failures >= 5` AND `email_sent_at IS NULL`, send one email to the community's leaders. Set `email_sent_at`. Clear both fields on the next successful delivery to the channel.
- **Recovery:** A successful delivery to a channel resets `consecutive_failures = 0` and clears `email_sent_at`, re-arming the email trigger for future persistent failures.

### Discord API Resilience

- **Rate limits:** Respect `X-RateLimit-Remaining` and `Retry-After` headers. Serialize sends per channel. Failed-due-to-429 is retryable, not a dead-letter candidate.
- **Channel deleted (404):** Terminal failure. Mark notification failed and increment channel failure counter.
- **Permissions revoked (403):** Terminal failure. Same handling as 404.
- **Discord outage (5xx):** Retryable — increment attempts but don't count as terminal until exceeding the retry budget.
- **Bot kicked from server:** Sweep the queue for the guild's channels on the next cron run, mark all pending as failed.

### Discord Interaction Handling

- **3-second ACK deadline:** Verify signature and return deferred ACK BEFORE any DB queries. `waitUntil` handles the actual work.
- **Duplicate interactions:** Discord retries on timeout. Use the interaction `id` as an idempotency key on any side effects (e.g., `/drop` should dedupe by interaction ID).
- **15-minute followup window:** Longer than our function max. Not a practical concern.
- **Embed size limits:** 6000 chars / 25 fields / 1024 chars per field. Truncate with "...and N more, see [link]" when exceeded.

### Security

- **Signature replay:** `verifyKey` from `discord-interactions` validates the timestamp window. No additional handling needed.
- **Allowed mentions:** Every outbound message sets `allowed_mentions: { parse: [] }` to prevent user-controlled content from pinging `@everyone`, roles, or users.
- **Bot token rotation:** Use Vercel environment variables. Rotating requires updating the env var and redeploying — no code changes.
- **Service role RLS bypass:** Bot uses service role key, so RLS does NOT protect it. All authorization checks happen in bot code (e.g., is this team public, is this user a community leader).

### Preview Deploys

- **Non-issue.** Discord only sends interactions to the URL configured in the Developer Portal (production). Vercel crons only run on production deploys. Command registration is a manual dev-tool action against production. Preview deploys never receive Discord traffic.

## Future / Deferred (Explored, Not Designed Yet)

These surfaced during brainstorming. Each needs its own design pass before implementation:

- **Predictions league** — users predict match outcomes, earn points, leaderboards. Core mechanics are interesting, but scoring, seasons, and UX need more thought to be both simple and compelling.
- **Gateway upgrade** — for real-time features (member join reactions, VC match lobbies, presence, etc.). Architectural shift to hybrid Vercel + Fly.io. Not needed for current use cases.
- **Meta tracker** — weekly usage stats scoped to both global (all of trainers.gg) AND this community. Needs data aggregation design and privacy considerations for team sheet exposure.
- **`/challenge` (matchmaking)** — suggest opponents at your ELO looking for matches. Needs "looking for match" status design and opponent scoring algorithm.
- **Per-tournament auto-created roles** — bot creates `@{tournament} Participant`, `@Champion`, `@Top Cut` roles per tournament with lifecycle (expire participant roles, permanent champion). Needs role naming scheme and cleanup job design.
- **Stream go-live integration** — Twitch/YouTube API, auto-post when a linked streamer goes live. Needs OAuth extension + API polling design.
- **Match hype threads / temporary VCs** — auto-created Discord threads per featured match. Requires gateway for VC lifecycle.
- **Weekly digest** — automated Sunday summary post. Simple to design once notification delivery patterns are stable.
- **Team paste preview (`/team` with paste)** — validates and previews a Showdown team paste in Discord. Needs Discord modal input handling.

## What's Excluded (Intentionally)

- No Gateway/WebSocket connection (no "online" status)
- No message content monitoring (privileged intent, not needed)
- No prefix commands (slash commands only)
- No music, moderation, or general-purpose bot features
- No per-server command customization (global command registration)

## Bot Identity & Branding

- **Display name:** Beanie Bot
- **Username:** `beaniebot` (or `beanie-bot`, final choice at bot registration time)
- **Avatar:** Custom mascot illustration — to be designed. Should feel warm and playful, not corporate. Fits the trainers.gg "Clean, Playful, Community-driven" brand personality.
- **Tone:** Warm, personable, teammate-like. The bot is a friendly assistant, not a formal system. Example voice:
  - ✅ "Nice win! You've moved up to #4 in the leaderboard."
  - ✅ "Your Round 3 match is ready — good luck out there!"
  - ❌ "USER_ID=abc123 MATCH_STATE=READY"
  - ❌ "Dear valued user, we regret to inform you..."
- **Command descriptions:** Written in the same warm tone, visible in Discord's command picker (max 100 chars each).
- **Error messages:** Helpful over technical. "I couldn't find a tournament called 'sprng-invitatonal' — did you mean 'Spring Invitational'?" not "404 Not Found."
- **About / description:** "Beanie Bot — Your trainers.gg companion. Tournament updates, match alerts, and personal notifications for your Pokemon community."

## Rate Limiting & Abuse Prevention

### Per-User Command Rate Limit

- **Limit:** 10 commands per minute per Discord user
- **Implementation:** In-memory LRU cache on the interactions route (survives within a function instance; approximate but good enough). For stricter enforcement, Supabase-backed counter with short TTL.
- **Response on limit hit:** Ephemeral "Slow down! Try again in a few seconds."

### Per-Guild Rate Limit

- **Limit:** 60 commands per minute per guild (prevents one server from DoSing the bot)
- **Response on limit hit:** Ephemeral "This server has hit the command rate limit — try again in a minute."

### Autocomplete Debounce

Discord sends autocomplete interactions on every keystroke. Heavy query load.
- **Implementation:** Cache autocomplete results keyed by `(community_id, option_name, partial_input)` for 60 seconds.
- **Fallback:** If cache miss and query slow, return empty list (Discord shows no suggestions rather than timing out).

### Admin Command Protection

Admin commands (`/setchannel`, `/unsetchannel`, `/channels`) don't need rate limiting beyond the general per-user limit — they're already gated by community leader auth.

### Signature Verification Abuse

Bulk invalid signatures on `/api/discord/interactions` could indicate attack attempts.
- **Monitoring:** Alert if signature verification failure rate > 1% sustained
- **Response:** Rate limit by IP at the Vercel edge if needed (unlikely, Discord controls source IPs)

## Deep Link & Login Flow

### DM Link Handling

Every DM notification includes a deep link to a trainers.gg page (e.g., `/matches/123`). Discord itself adds `?utm_source=discord` for tracking.

**Unauthenticated click handling:**

1. User clicks `/matches/123` from a Discord DM
2. If logged in → render match page directly
3. If NOT logged in → existing Supabase auth middleware redirects to `/auth/sign-in?next=/matches/123`
4. After sign-in → redirect back to the intended page
5. If the user has linked Discord AND their Discord identity matches the DM recipient, the signed-in user is automatically correct. No extra validation needed.

**Mobile deep linking (future):**
- If trainers.gg has a mobile app installed, links could open in the app via custom URL scheme (`trainersgg://matches/123`)
- Not required for v1 since the mobile app is unreleased
- Add Universal Links / App Links later

### DM Link Parameters

All DM links include:
- The resource path (`/matches/123`)
- `?utm_source=discord_dm&utm_campaign={event_type}` for analytics
- No sensitive tokens in the URL — auth handled by standard session flow

## Integration With Existing Notifications

### Existing Email Notifications (Assumed)

trainers.gg already has email-based notifications via `send-auth-email` edge function and `api-notifications` edge function (from the existing codebase). Discord DMs should **extend** the existing notification system rather than duplicate it.

### Recommended Approach

A single notification pipeline with multiple delivery channels:

```
Event fires (e.g., match_ready)
  → Enqueue in unified notifications queue
  → For each user subscribed:
      - If email pref on → send email
      - If Discord DM pref on + linked → send Discord DM
      - If push notification pref on (mobile) → send push
  → Each delivery tracked separately for status
```

### What This Changes

During implementation, the Discord DM preferences table should be unified with (or parallel to) the existing notification preferences system. The specific schema merger is an implementation-time decision after auditing the existing code.

### Avoiding Duplicate Notifications

If a user has BOTH email and Discord DM enabled for the same event, they receive both. This is expected — users who want both channels have explicitly opted in. Don't silently deduplicate.

## Data Retention

- **`discord_notification_queue`** — purge `sent` and `failed` rows older than 30 days via weekly cron
- **`discord_dm_queue`** — same retention as above
- **`discord_role_sync_queue`** — purge completed entries older than 7 days
- **`discord_channel_failures`** — keep indefinitely (small table, audit trail)
- **`discord_servers`, `discord_channels`, `discord_role_mappings`, `discord_dm_settings`, `discord_user_dm_preferences`** — retained for lifetime of community

## Verification Plan

1. **Signature verification**: Test with Discord's documented test vectors
2. **Slash commands**: Register test commands, verify deferred response + followup works
3. **Notifications**: Insert test rows into queue, verify cron delivers to Discord channel
4. **Account linking**: Verify `/link` flow connects Discord identity via existing Supabase OAuth
5. **RLS**: Verify discord_servers/channels are scoped to community leaders
6. **E2E**: Install bot in a test server, run through all commands, verify notifications arrive
