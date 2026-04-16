# Discord Bot — Workflow Migration Design Spec

**Date:** 2026-04-15
**Branch:** `discord-bot`
**Depends on:** All Phase 1–6 work (complete)

## Context

The Discord bot's notification delivery (channel announcements, DMs, role sync) currently uses a cron-polling pattern: app flows write rows to queue tables, Vercel cron routes drain them every 5 minutes. This introduces up to 5 minutes of latency between an event (match paired, tournament created) and the Discord message.

Vercel Workflow DevKit provides durable, event-driven execution — `start(workflow)` fires within seconds, steps retry automatically, and the runtime survives function restarts. Migrating the three event-driven queues to Workflow eliminates the polling delay and the queue table infrastructure.

## Scope

**Migrate to Workflow:**
- Channel notification delivery (currently `discord_notification_queue` + `/api/discord/notify`)
- DM delivery (currently `discord_dm_queue` + same cron route)
- Role sync delivery (currently `discord_role_sync_queue` + `/api/discord/role-sync`)

**Keep as Vercel crons:**
- `/api/discord/reconcile-roles` — periodic 15-min sweep, not event-driven
- `/api/discord/uninstall-sweep` — daily guild validation sweep

**Remove:**
- `discord_notification_queue` table (migration drops it)
- `discord_dm_queue` table (migration drops it)
- `discord_role_sync_queue` table (migration drops it)
- `/api/discord/notify` cron route
- `/api/discord/role-sync` cron route
- `/api/discord/retention` cron route (no queue rows to purge)
- 3 cron entries from `vercel.json`
- `enqueueNotification`, `enqueueDm`, `enqueueRoleSync` mutations
- `markNotificationSent`, `markNotificationFailed`, `markDmSent`, `markDmFailed`, `markDmSkipped`, `markRoleSyncComplete`, `markRoleSyncFailed` mutations
- `listPendingNotifications`, `listPendingDmNotifications`, `listPendingRoleSyncs` queries
- `resetNotificationForRetry`, `resetDmForRetry` mutations
- `purgeOldNotifications`, `purgeOldDmQueue`, `purgeOldRoleSyncQueue` mutations

**Add:**
- `discord_delivery_failures` table (individual failure log for Failures tab)
- `workflow` + `@workflow/next` packages
- 3 workflow functions + step functions
- `withWorkflow` wrapper in Next.js config

## Decision summary

| Decision | Chosen | Why |
|---|---|---|
| Periodic sweeps | Keep as crons (not workflows) | No triggering event — crons are the right tool for time-driven sweeps |
| Retry strategy | Workflow step-level retry with FatalError/RetryableError | Maps cleanly to terminal vs transient Discord errors; less code than manual retry loops |
| Failure storage | New `discord_delivery_failures` table | Single table for the Failures tab UI; decoupled from Workflow internals (beta API) |
| Resolution logic placement | Stays in enqueue helpers, before workflow start | "Should we send?" answered before spending a workflow invocation; failures surface to the caller |

## New table: `discord_delivery_failures`

```sql
CREATE TABLE IF NOT EXISTS public.discord_delivery_failures (
  id                     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  discord_server_id      bigint NOT NULL REFERENCES public.discord_servers(id) ON DELETE CASCADE,
  type                   text NOT NULL CHECK (type IN ('channel', 'dm', 'role_sync')),
  event_type             text NOT NULL,
  target                 text NOT NULL,
  error_code             text,
  error_reason           text NOT NULL,
  payload                jsonb,
  delivered_via_fallback boolean NOT NULL DEFAULT false,
  created_at             timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.discord_delivery_failures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Community leaders can view delivery failures" ON public.discord_delivery_failures;
CREATE POLICY "Community leaders can view delivery failures"
  ON public.discord_delivery_failures FOR SELECT TO authenticated
  USING (
    public.has_community_permission(
      (SELECT community_id FROM public.discord_servers WHERE id = discord_server_id),
      'community.manage'
    )
  );

CREATE INDEX IF NOT EXISTS idx_discord_delivery_failures_server_created
  ON public.discord_delivery_failures (discord_server_id, created_at DESC);
```

Columns:
- `type` — `'channel'`, `'dm'`, or `'role_sync'`
- `target` — channel_id for channel failures, discord_user_id for DM failures, role_id for role sync failures
- `error_code` — Discord API error code or HTTP status as string
- `error_reason` — human-readable description
- `payload` — the original notification payload (for retry)
- `delivered_via_fallback` — true when a DM failed but fallback channel delivery succeeded

`discord_channel_failures` table is kept separately — it tracks consecutive failures per channel for dead-letter email escalation at 5 failures. `discord_delivery_failures` logs individual attempts for the UI.

## Three workflows

### 1. `sendChannelNotificationWorkflow`

**Arguments:** `channelId: string`, `eventType: string`, `payload: Record<string, unknown>`, `serverId: number`

```
"use workflow"
  → step sendMessage: sendChannelMessage(channelId, payload)
    - 404 / 403 / 50013 → throw FatalError (terminal — channel deleted or permissions lost)
    - 429 → throw RetryableError({ retryAfter: headerValue })
    - 5xx → throw RetryableError("transient")
  → on success:
    → step resetFailures: resetChannelFailures(serverId, channelId)
  → on FatalError (workflow-level catch):
    → step logFailure: insert into discord_delivery_failures
    → step trackConsecutive: recordChannelFailure(serverId, channelId)
    → step checkEmail: if consecutive >= 5 && !email_sent_at, markChannelEmailSent
```

### 2. `sendDmWorkflow`

**Arguments:** `discordUserId: string`, `userId: string`, `eventType: DiscordDmEventType`, `payload: Record<string, unknown>`, `deliveryMode: string`, `fallbackChannelId: string | null`, `communityId: number`, `serverId: number`

```
"use workflow"
  → step checkPref: isDmEnabledForUser(userId, eventType)
    - if disabled: return { status: "skipped", reason: "user_opted_out" }
  → if deliveryMode === "channel_only":
    return { status: "skipped", reason: "community_channel_only" }
  → step sendDm: sendDM(discordUserId, payload)
    - 50007 → throw FatalError("dm_closed")
    - 429 → throw RetryableError
    - 5xx → throw RetryableError
  → on success:
    → step clearWarn: clearDmWarnFlag(userId)
    → return { status: "sent" }
  → on FatalError "dm_closed":
    → step setWarn: setDmWarnFlag(userId)
    → if fallbackChannelId:
      → step fallback: sendChannelMessage(fallbackChannelId, fallbackPayload)
      → step logFallback: insert into discord_delivery_failures with delivered_via_fallback=true
      → return { status: "fallback_delivered" }
    → else:
      → step logFailure: insert into discord_delivery_failures
      → return { status: "failed", reason: "dm_closed" }
```

### 3. `syncRoleWorkflow`

**Arguments:** `guildId: string`, `discordUserId: string`, `roleId: string`, `action: "add" | "remove"`, `serverId: number`, `roleType: string`

```
"use workflow"
  → step syncRole:
    - if action === "add": assignRole(guildId, discordUserId, roleId)
    - if action === "remove": removeRole(guildId, discordUserId, roleId)
    - 50013 (hierarchy) → throw FatalError("hierarchy_violation")
    - 10011 (unknown role) → throw FatalError("role_deleted")
    - 10007 (unknown member) → throw FatalError("user_left")
    - 429 → throw RetryableError
    - 5xx → throw RetryableError
  → on success: return { status: "synced" }
  → on FatalError "role_deleted":
    → step disableMapping: toggleRoleMapping off for this (serverId, roleId)
    → step logFailure: insert into discord_delivery_failures
  → on other FatalError:
    → step logFailure: insert into discord_delivery_failures
```

## File structure

```
apps/web/
├── src/
│   ├── workflows/
│   │   ├── send-channel-notification.ts
│   │   ├── send-dm.ts
│   │   ├── sync-role.ts
│   │   └── steps/
│   │       ├── discord-api.ts          (sendChannelMessage, sendDM, assignRole, removeRole steps)
│   │       ├── failure-tracking.ts     (recordDeliveryFailure, trackConsecutive, checkEmail steps)
│   │       └── user-prefs.ts           (isDmEnabledForUser, setDmWarnFlag, clearDmWarnFlag steps)
│   ├── lib/discord/
│   │   └── enqueue-helpers.ts          (MODIFIED — swap enqueue calls for start() calls)
│   ├── actions/
│   │   └── discord-integration.ts      (MODIFIED — retryNotificationAction calls start() instead of resetForRetry)
│   └── app/api/discord/
│       ├── notify/                     (DELETE entire directory)
│       ├── role-sync/                  (DELETE entire directory)
│       ├── retention/                  (DELETE entire directory)
│       ├── reconcile-roles/            (KEEP — still a cron)
│       └── uninstall-sweep/            (KEEP — still a cron)
├── next.config.ts                      (MODIFY — add withWorkflow wrapper)
└── vercel.json                         (MODIFY — remove 3 cron entries)

packages/supabase/
├── src/
│   ├── mutations/discord.ts            (MODIFY — remove queue mutations, add recordDeliveryFailure)
│   ├── queries/discord.ts              (MODIFY — remove queue queries, update listRecentFailures to use new table)
│   └── index.ts                        (MODIFY — update exports)
└── supabase/migrations/
    └── YYYYMMDDHHMMSS_workflow_migration.sql  (drop 3 queue tables, create discord_delivery_failures)
```

## Enqueue helpers change

The three functions in `apps/web/src/lib/discord/enqueue-helpers.ts` keep their signatures and fire-and-forget semantics. Only the internal call changes:

```ts
// Before
await enqueueNotification(supabase, {
  channel_id: mapping.channel_id,
  event_type: eventType,
  source_id: sourceId,
  payload,
});

// After
import { start } from "workflow/api";
import { sendChannelNotificationWorkflow } from "@/workflows/send-channel-notification";

await start(sendChannelNotificationWorkflow, [
  mapping.channel_id,
  eventType,
  payload,
  server.id,
]);
```

Same try/catch + console.error wrapping. Same `void` at the call site. Callers (`actions/tournaments.ts`, `actions/staff.ts`) do not change.

## Failures tab data source change

`listRecentFailures` query (in `packages/supabase/src/queries/discord.ts`) currently queries 3 queue tables. Rewrite to query `discord_delivery_failures` with the same return shape:

```ts
export async function listRecentFailures(
  supabase: TypedClient,
  serverId: number,
  hours: number = 24
): Promise<{
  channels: ChannelFailureRow[];
  dms: DmFailureRow[];
  roleSyncs: RoleSyncFailureRow[];
}> {
  const since = new Date(Date.now() - hours * 3600_000).toISOString();
  const { data, error } = await supabase
    .from("discord_delivery_failures")
    .select("*")
    .eq("discord_server_id", serverId)
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  // Split by type into the three arrays
}
```

UI components read the same shape — no changes to the Failures tab components.

## Retry from Failures tab

Currently: `resetNotificationForRetry` sets the queue row back to pending.

After: `retryNotificationAction` reads the failure row's payload and calls `start(workflow, [args])` to fire a new delivery attempt immediately. The failure row stays for audit.

```ts
export async function retryNotificationAction(failureId: number): Promise<ActionResult<void>> {
  // ... auth check ...
  const failure = await getDeliveryFailure(supabase, failureId);
  if (!failure) return { success: false, error: "Failure not found" };

  if (failure.type === "channel") {
    await start(sendChannelNotificationWorkflow, [
      failure.target, failure.event_type, failure.payload, failure.discord_server_id,
    ]);
  } else if (failure.type === "dm") {
    // reconstruct DM workflow args from failure payload
    await start(sendDmWorkflow, [...]);
  } else {
    await start(syncRoleWorkflow, [...]);
  }
  return { success: true, data: undefined };
}
```

## PostHog analytics

Emission points move from the cron routes into the workflow steps:
- `DISCORD_NOTIFICATION_SENT` / `DISCORD_NOTIFICATION_FAILED` — emitted in `sendChannelNotificationWorkflow` steps
- `DISCORD_ROLE_SYNC_FAILED` — emitted in `syncRoleWorkflow` failure step

The interactions-route and install-callback emissions are unaffected.

## Package setup

```bash
pnpm --filter @trainers/web add workflow @workflow/next
```

In `next.config.ts`:
```ts
import { withWorkflow } from "workflow/next";

const nextConfig = { /* existing config */ };
export default withWorkflow(nextConfig);
```

## vercel.json after migration

```json
"crons": [
  { "path": "/api/discord/reconcile-roles", "schedule": "3-59/15 * * * *" },
  { "path": "/api/discord/uninstall-sweep", "schedule": "0 7 * * *" }
]
```

## What does NOT change

- Install flow (OAuth callback)
- Slash command interactions endpoint
- All 13 command handlers
- Autocomplete handlers
- Rate limiting on interactions
- All Phase 5 UI components (admin page, user settings, profile, etc.)
- `discord_servers`, `discord_channels`, `discord_dm_settings`, `discord_user_dm_preferences`, `discord_role_mappings`, `discord_channel_failures` tables
- reconcile-roles cron (periodic sweep)
- uninstall-sweep cron (daily guild validation)

## Testing

- Unit tests for each workflow (mock Discord API steps, verify retry/fatal branching)
- Unit tests for updated enqueue helpers (mock `start()`, verify args)
- Unit tests for updated `listRecentFailures` query (new table schema)
- Integration test: start workflow → step succeeds → verify no failure row
- Integration test: start workflow → step throws FatalError → verify failure row created
- Existing Failures tab component tests still pass (same data shape from `listRecentFailures`)
- Existing server action tests for retryNotificationAction updated (mock `start()` instead of `resetForRetry`)

## Migration order

1. Install `workflow` + `@workflow/next`, add `withWorkflow` to next.config
2. Create the 3 workflows + step functions
3. Create the migration (new table + drop old tables)
4. Update enqueue helpers to call `start()` instead of enqueue mutations
5. Update `listRecentFailures` to query new table
6. Update retry actions
7. Move PostHog emissions into workflow steps
8. Delete cron routes (notify, role-sync, retention)
9. Delete old mutations + queries for queue tables
10. Update `vercel.json`
11. Update exports in `@trainers/supabase`
12. Run full test suite, fix broken tests
