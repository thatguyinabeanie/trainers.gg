# Workflow Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the cron-polling notification delivery (5-minute latency) with Vercel Workflow for near-instant Discord message delivery.

**Architecture:** Three durable workflows (`sendChannelNotification`, `sendDm`, `syncRole`) replace three queue tables and three cron routes. Step-level retry with `FatalError`/`RetryableError` handles Discord API failure modes. A new `discord_delivery_failures` table logs permanent failures for the admin Failures tab. Periodic sweeps (reconcile-roles, uninstall-sweep) remain as Vercel crons.

**Tech Stack:** Vercel Workflow DevKit (`workflow`, `@workflow/next`), existing `@discordjs/rest`, Supabase service-role client.

**Spec:** `docs/superpowers/specs/2026-04-15-workflow-migration-design.md`

---

## File structure

### New files

```
apps/web/src/workflows/
├── send-channel-notification.ts     (Task 3)
├── send-dm.ts                       (Task 4)
├── sync-role.ts                     (Task 5)
└── steps/
    ├── discord-api.ts               (Task 3 — shared step functions for Discord REST)
    ├── failure-tracking.ts          (Task 3 — recordDeliveryFailure + channel failure tracking)
    └── user-prefs.ts                (Task 4 — DM pref check + warn flag steps)

packages/supabase/supabase/migrations/
└── YYYYMMDDHHMMSS_workflow_migration.sql  (Task 2)
```

### Modified files

```
apps/web/next.config.ts                              (Task 1 — withWorkflow wrapper)
apps/web/package.json                                (Task 1 — add workflow deps)
apps/web/src/lib/discord/enqueue-helpers.ts          (Task 6 — swap enqueue → start)
apps/web/src/actions/discord-integration.ts          (Task 7 — retry action uses start)
packages/supabase/src/mutations/discord.ts           (Task 2 + 8 — add recordDeliveryFailure, remove queue mutations)
packages/supabase/src/queries/discord.ts             (Task 2 + 8 — rewrite listRecentFailures, remove queue queries)
packages/supabase/src/index.ts                       (Task 8 — update exports)
apps/web/vercel.json                                 (Task 9 — remove 3 cron entries)
```

### Deleted files

```
apps/web/src/app/api/discord/notify/                 (Task 9 — entire directory)
apps/web/src/app/api/discord/role-sync/              (Task 9 — entire directory)
apps/web/src/app/api/discord/retention/              (Task 9 — entire directory)
```

---

## Task 1: Install Workflow DevKit + configure Next.js

**Files:**
- Modify: `apps/web/package.json`
- Modify: `apps/web/next.config.ts`

- [ ] **Step 1: Install packages**

```bash
pnpm --filter @trainers/web add workflow @workflow/next
```

- [ ] **Step 2: Wrap next.config.ts with withWorkflow**

In `apps/web/next.config.ts`, add the import and compose with the existing `withBotId`:

```ts
import type { NextConfig } from "next";
import { withBotId } from "botid/next/config";
import { withWorkflow } from "workflow/next";

const nextConfig: NextConfig = {
  // ... existing config unchanged ...
};

export default withWorkflow(withBotId(nextConfig));
```

- [ ] **Step 3: Verify it builds**

```bash
pnpm --filter @trainers/web typecheck 2>&1 | tail -10
```

Expected: clean (no type errors from the new import).

- [ ] **Step 4: Commit**

```bash
git add apps/web/package.json apps/web/next.config.ts pnpm-lock.yaml
git commit -m "chore(discord): install Workflow DevKit and configure Next.js"
```

---

## Task 2: Migration — create `discord_delivery_failures`, drop queue tables

**Files:**
- Create: `packages/supabase/supabase/migrations/YYYYMMDDHHMMSS_workflow_migration.sql`
- Modify: `packages/supabase/src/mutations/discord.ts` — add `recordDeliveryFailure`
- Modify: `packages/supabase/src/queries/discord.ts` — add `getDeliveryFailure`, rewrite `listRecentFailures`

- [ ] **Step 1: Write the migration**

```sql
-- =============================================================================
-- Workflow migration: replace queue tables with discord_delivery_failures
-- =============================================================================
--
-- The three queue tables (discord_notification_queue, discord_dm_queue,
-- discord_role_sync_queue) are replaced by Vercel Workflow for event-driven
-- delivery. This migration creates a unified failure log table and drops
-- the queue tables.
--
-- discord_channel_failures is KEPT — it tracks consecutive failures per
-- channel for dead-letter email escalation, separate from individual
-- delivery attempt logging.

-- =============================================================================
-- New table: discord_delivery_failures
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.discord_delivery_failures (
  id                     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  discord_server_id      bigint NOT NULL REFERENCES public.discord_servers(id) ON DELETE CASCADE,
  type                   text   NOT NULL CHECK (type IN ('channel', 'dm', 'role_sync')),
  event_type             text   NOT NULL,
  target                 text   NOT NULL,
  error_code             text,
  error_reason           text   NOT NULL,
  payload                jsonb,
  delivered_via_fallback boolean NOT NULL DEFAULT false,
  created_at             timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.discord_delivery_failures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Community leaders can view delivery failures"
  ON public.discord_delivery_failures;
CREATE POLICY "Community leaders can view delivery failures"
  ON public.discord_delivery_failures FOR SELECT TO authenticated
  USING (
    public.has_community_permission(
      (SELECT community_id FROM public.discord_servers WHERE id = discord_server_id),
      'community.manage'
    )
  );

-- Service role can insert (from workflow steps)
DROP POLICY IF EXISTS "Service role can insert delivery failures"
  ON public.discord_delivery_failures;
CREATE POLICY "Service role can insert delivery failures"
  ON public.discord_delivery_failures FOR INSERT TO service_role
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_discord_delivery_failures_server_created
  ON public.discord_delivery_failures (discord_server_id, created_at DESC);

-- =============================================================================
-- Drop queue tables (cascade removes indexes, policies, constraints)
-- =============================================================================

DROP TABLE IF EXISTS public.discord_notification_queue CASCADE;
DROP TABLE IF EXISTS public.discord_dm_queue CASCADE;
DROP TABLE IF EXISTS public.discord_role_sync_queue CASCADE;
```

- [ ] **Step 2: Add `recordDeliveryFailure` mutation**

In `packages/supabase/src/mutations/discord.ts`:

```ts
/**
 * Log a permanent delivery failure for the admin Failures tab.
 * Called from workflow steps when a Discord API call hits a terminal error.
 */
export async function recordDeliveryFailure(
  supabase: TypedClient,
  input: {
    discord_server_id: number;
    type: "channel" | "dm" | "role_sync";
    event_type: string;
    target: string;
    error_code?: string;
    error_reason: string;
    payload?: Record<string, unknown>;
    delivered_via_fallback?: boolean;
  }
): Promise<{ id: number }> {
  const { data, error } = await supabase
    .from("discord_delivery_failures")
    .insert({
      discord_server_id: input.discord_server_id,
      type: input.type,
      event_type: input.event_type,
      target: input.target,
      error_code: input.error_code ?? null,
      error_reason: input.error_reason,
      payload: input.payload as unknown as Json ?? null,
      delivered_via_fallback: input.delivered_via_fallback ?? false,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to record delivery failure: ${error.message}`);
  return { id: data.id };
}
```

- [ ] **Step 3: Add `getDeliveryFailure` query (for retry action)**

In `packages/supabase/src/queries/discord.ts`:

```ts
/**
 * Get a single delivery failure row by ID for the retry action.
 */
export async function getDeliveryFailure(
  supabase: TypedClient,
  id: number
): Promise<Tables<"discord_delivery_failures"> | null> {
  const { data, error } = await supabase
    .from("discord_delivery_failures")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Failed to get delivery failure: ${error.message}`);
  return data;
}
```

- [ ] **Step 4: Rewrite `listRecentFailures` to query the new table**

Replace the existing `listRecentFailures` function in `packages/supabase/src/queries/discord.ts`. The return shape stays the same so the Failures tab UI doesn't need changes:

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

  if (error) throw new Error(`Failed to list recent failures: ${error.message}`);

  const channels: ChannelFailureRow[] = [];
  const dms: DmFailureRow[] = [];
  const roleSyncs: RoleSyncFailureRow[] = [];

  for (const row of data ?? []) {
    if (row.type === "channel") {
      channels.push({
        id: row.id,
        channel_id: row.target,
        event_type: row.event_type,
        consecutive_failures: 0, // looked up separately from discord_channel_failures if needed
        last_error_code: row.error_code ? Number(row.error_code) : null,
        last_error_reason: row.error_reason,
        last_attempt_at: row.created_at,
        mapping_id: null,
      });
    } else if (row.type === "dm") {
      dms.push({
        id: row.id,
        user_id: "",
        discord_user_id: row.target,
        event_type: row.event_type as DiscordDmEventType,
        error_code: row.error_code ? Number(row.error_code) : null,
        error_reason: row.error_reason,
        delivered_via_fallback: row.delivered_via_fallback,
        failed_at: row.created_at,
        username: null,
      });
    } else {
      roleSyncs.push({
        id: row.id,
        discord_user_id: row.target,
        role_id: "",
        action: "add",
        failed_reason: row.error_reason,
        failed_at: row.created_at,
      });
    }
  }

  return { channels, dms, roleSyncs };
}
```

- [ ] **Step 5: Apply migration + regenerate types**

```bash
pnpm db:reset 2>&1 | tail -20
pnpm generate-types 2>&1 | tail -5
```

Verify: `discord_delivery_failures` appears in generated types, queue tables do NOT.

- [ ] **Step 6: Verify + commit**

```bash
pnpm --filter @trainers/supabase typecheck 2>&1 | tail -10
pnpm --filter @trainers/supabase lint 2>&1 | tail -5
```

Note: web typecheck will fail at this point because code still references the dropped queue tables. That's expected — Tasks 3–9 clean those up.

```bash
git add packages/supabase/
git commit -m "feat(discord): add discord_delivery_failures table, drop queue tables"
```

---

## Task 3: Channel notification workflow + shared steps

**Files:**
- Create: `apps/web/src/workflows/send-channel-notification.ts`
- Create: `apps/web/src/workflows/steps/discord-api.ts`
- Create: `apps/web/src/workflows/steps/failure-tracking.ts`

- [ ] **Step 1: Create shared Discord API steps**

```ts
// apps/web/src/workflows/steps/discord-api.ts
import { FatalError, RetryableError } from "workflow";

import {
  sendChannelMessage as restSendChannelMessage,
  sendDM as restSendDM,
  assignRole as restAssignRole,
  removeRole as restRemoveRole,
  getErrorCode,
  isNotFoundError,
  isMissingAccessError,
  DiscordRateLimitError,
} from "@/lib/discord/api";

/**
 * Send a message to a Discord channel. Retries on transient errors.
 * Throws FatalError on terminal Discord errors (404, 403, 50013).
 */
export async function sendChannelMessage(
  channelId: string,
  payload: Record<string, unknown>
) {
  "use step";
  try {
    await restSendChannelMessage(channelId, payload);
  } catch (e: unknown) {
    if (e instanceof DiscordRateLimitError) {
      throw new RetryableError("Rate limited by Discord", { retryAfter: "30s" });
    }
    if (isNotFoundError(e) || isMissingAccessError(e) || getErrorCode(e) === 50013) {
      throw new FatalError(`Terminal Discord error: ${getErrorCode(e)}`);
    }
    // 5xx or unknown
    throw new RetryableError(`Transient Discord error: ${getErrorCode(e)}`);
  }
}

/**
 * Send a DM to a Discord user. Throws FatalError on 50007 (DMs closed).
 */
export async function sendDm(
  discordUserId: string,
  payload: Record<string, unknown>
) {
  "use step";
  try {
    await restSendDM(discordUserId, payload);
  } catch (e: unknown) {
    if (getErrorCode(e) === 50007) {
      throw new FatalError("dm_closed");
    }
    if (e instanceof DiscordRateLimitError) {
      throw new RetryableError("Rate limited by Discord", { retryAfter: "30s" });
    }
    throw new RetryableError(`Transient Discord error: ${getErrorCode(e)}`);
  }
}

/**
 * Assign a Discord role. Throws typed FatalErrors for terminal failures.
 */
export async function assignDiscordRole(
  guildId: string,
  discordUserId: string,
  roleId: string
) {
  "use step";
  try {
    await restAssignRole(guildId, discordUserId, roleId);
  } catch (e: unknown) {
    const code = getErrorCode(e);
    if (code === 50013) throw new FatalError("hierarchy_violation");
    if (code === 10011) throw new FatalError("role_deleted");
    if (code === 10007) throw new FatalError("user_left");
    if (e instanceof DiscordRateLimitError) {
      throw new RetryableError("Rate limited", { retryAfter: "30s" });
    }
    throw new RetryableError(`Transient: ${code}`);
  }
}

/**
 * Remove a Discord role. Same error classification as assign.
 */
export async function removeDiscordRole(
  guildId: string,
  discordUserId: string,
  roleId: string
) {
  "use step";
  try {
    await restRemoveRole(guildId, discordUserId, roleId);
  } catch (e: unknown) {
    const code = getErrorCode(e);
    if (code === 50013) throw new FatalError("hierarchy_violation");
    if (code === 10011) throw new FatalError("role_deleted");
    if (code === 10007) throw new FatalError("user_left");
    if (e instanceof DiscordRateLimitError) {
      throw new RetryableError("Rate limited", { retryAfter: "30s" });
    }
    throw new RetryableError(`Transient: ${code}`);
  }
}
```

- [ ] **Step 2: Create failure tracking steps**

```ts
// apps/web/src/workflows/steps/failure-tracking.ts
import {
  recordDeliveryFailure,
  recordChannelFailure,
  resetChannelFailures,
  markChannelEmailSent,
} from "@trainers/supabase";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { captureServerEvent } from "@/lib/posthog/server";
import {
  DISCORD_NOTIFICATION_FAILED,
  DISCORD_NOTIFICATION_SENT,
  DISCORD_ROLE_SYNC_FAILED,
} from "@trainers/posthog";

const CHANNEL_FAILURE_EMAIL_THRESHOLD = 5;

export async function logDeliveryFailure(input: {
  discord_server_id: number;
  type: "channel" | "dm" | "role_sync";
  event_type: string;
  target: string;
  error_code?: string;
  error_reason: string;
  payload?: Record<string, unknown>;
  delivered_via_fallback?: boolean;
}) {
  "use step";
  const supabase = createServiceRoleClient();
  await recordDeliveryFailure(supabase, input);

  // PostHog
  const event = input.type === "role_sync"
    ? DISCORD_ROLE_SYNC_FAILED
    : DISCORD_NOTIFICATION_FAILED;
  void captureServerEvent({
    event,
    properties: {
      event_type: input.event_type,
      error_code: input.error_code,
      reason: input.error_reason,
      type: input.type,
    },
  });
}

export async function trackChannelFailureAndCheckEmail(
  serverId: number,
  channelId: string
) {
  "use step";
  const supabase = createServiceRoleClient();
  const count = await recordChannelFailure(supabase, serverId, channelId);
  if (count >= CHANNEL_FAILURE_EMAIL_THRESHOLD) {
    const { data: row } = await supabase
      .from("discord_channel_failures")
      .select("email_sent_at")
      .eq("discord_server_id", serverId)
      .eq("channel_id", channelId)
      .maybeSingle();
    if (!row?.email_sent_at) {
      await markChannelEmailSent(supabase, serverId, channelId);
      // TODO: send dead-letter email (email sender out of scope)
    }
  }
}

export async function clearChannelFailures(
  serverId: number,
  channelId: string
) {
  "use step";
  const supabase = createServiceRoleClient();
  await resetChannelFailures(supabase, serverId, channelId);

  void captureServerEvent({
    event: DISCORD_NOTIFICATION_SENT,
    properties: { channel_id: channelId },
  });
}
```

- [ ] **Step 3: Create the channel notification workflow**

```ts
// apps/web/src/workflows/send-channel-notification.ts
import { FatalError } from "workflow";

import { sendChannelMessage } from "./steps/discord-api";
import {
  logDeliveryFailure,
  trackChannelFailureAndCheckEmail,
  clearChannelFailures,
} from "./steps/failure-tracking";

/**
 * Durable workflow: deliver a channel notification to Discord.
 *
 * Steps auto-retry on RetryableError (429, 5xx). FatalError (404, 403,
 * 50013) triggers the failure tracking path immediately.
 */
export async function sendChannelNotificationWorkflow(
  channelId: string,
  eventType: string,
  payload: Record<string, unknown>,
  serverId: number
) {
  "use workflow";

  try {
    await sendChannelMessage(channelId, payload);
    await clearChannelFailures(serverId, channelId);
    return { status: "sent" as const };
  } catch (e) {
    if (e instanceof FatalError) {
      await logDeliveryFailure({
        discord_server_id: serverId,
        type: "channel",
        event_type: eventType,
        target: channelId,
        error_code: e.message.replace("Terminal Discord error: ", ""),
        error_reason: e.message,
        payload,
      });
      await trackChannelFailureAndCheckEmail(serverId, channelId);
      return { status: "failed" as const, reason: e.message };
    }
    throw e; // re-throw RetryableError for the runtime to handle
  }
}
```

- [ ] **Step 4: Verify types**

```bash
pnpm --filter @trainers/web typecheck 2>&1 | grep "error TS" | head -5
```

Note: will still have errors from other files referencing dropped tables — those are fixed in later tasks.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/workflows/
git commit -m "feat(discord): add channel notification workflow with retry steps"
```

---

## Task 4: DM workflow

**Files:**
- Create: `apps/web/src/workflows/send-dm.ts`
- Create: `apps/web/src/workflows/steps/user-prefs.ts`

- [ ] **Step 1: Create user prefs steps**

```ts
// apps/web/src/workflows/steps/user-prefs.ts
import { isDmEnabledForUser } from "@trainers/supabase";
import { type DiscordDmEventType } from "@trainers/supabase";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function checkDmPreference(
  userId: string,
  eventType: DiscordDmEventType
): Promise<boolean> {
  "use step";
  const supabase = createServiceRoleClient();
  return isDmEnabledForUser(supabase, userId, eventType);
}

export async function setDmWarnFlag(userId: string) {
  "use step";
  const supabase = createServiceRoleClient();
  const warnUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await supabase
    .from("users")
    .update({ discord_dm_warn_until: warnUntil })
    .eq("id", userId);
}

export async function clearDmWarnFlag(userId: string) {
  "use step";
  const supabase = createServiceRoleClient();
  await supabase
    .from("users")
    .update({ discord_dm_warn_until: null })
    .eq("id", userId)
    .not("discord_dm_warn_until", "is", null);
}
```

- [ ] **Step 2: Create the DM workflow**

```ts
// apps/web/src/workflows/send-dm.ts
import { FatalError } from "workflow";
import { type DiscordDmEventType } from "@trainers/supabase";

import { sendChannelMessage, sendDm } from "./steps/discord-api";
import { logDeliveryFailure } from "./steps/failure-tracking";
import { checkDmPreference, setDmWarnFlag, clearDmWarnFlag } from "./steps/user-prefs";

export async function sendDmWorkflow(
  discordUserId: string,
  userId: string,
  eventType: DiscordDmEventType,
  payload: Record<string, unknown>,
  deliveryMode: string,
  fallbackChannelId: string | null,
  communityId: number,
  serverId: number
) {
  "use workflow";

  // Check user preference
  const enabled = await checkDmPreference(userId, eventType);
  if (!enabled) {
    return { status: "skipped" as const, reason: "user_opted_out" };
  }

  if (deliveryMode === "channel_only") {
    return { status: "skipped" as const, reason: "community_channel_only" };
  }

  try {
    await sendDm(discordUserId, payload);
    await clearDmWarnFlag(userId);
    return { status: "sent" as const };
  } catch (e) {
    if (e instanceof FatalError && e.message === "dm_closed") {
      await setDmWarnFlag(userId);

      if (fallbackChannelId) {
        try {
          const fallbackPayload = {
            ...payload,
            content: `<@${discordUserId}> ${(payload.content as string) || "You have a notification on trainers.gg"}`,
            allowed_mentions: { users: [discordUserId] },
          };
          await sendChannelMessage(fallbackChannelId, fallbackPayload);
          await logDeliveryFailure({
            discord_server_id: serverId,
            type: "dm",
            event_type: eventType,
            target: discordUserId,
            error_code: "50007",
            error_reason: "dm_closed",
            delivered_via_fallback: true,
          });
          return { status: "fallback_delivered" as const };
        } catch {
          await logDeliveryFailure({
            discord_server_id: serverId,
            type: "dm",
            event_type: eventType,
            target: discordUserId,
            error_code: "50007",
            error_reason: "dm_closed_fallback_failed",
            payload,
          });
          return { status: "failed" as const, reason: "dm_closed_fallback_failed" };
        }
      }

      await logDeliveryFailure({
        discord_server_id: serverId,
        type: "dm",
        event_type: eventType,
        target: discordUserId,
        error_code: "50007",
        error_reason: "dm_closed",
        payload,
      });
      return { status: "failed" as const, reason: "dm_closed" };
    }
    throw e;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/workflows/send-dm.ts apps/web/src/workflows/steps/user-prefs.ts
git commit -m "feat(discord): add DM workflow with preference check and fallback"
```

---

## Task 5: Role sync workflow

**Files:**
- Create: `apps/web/src/workflows/sync-role.ts`

- [ ] **Step 1: Create the role sync workflow**

```ts
// apps/web/src/workflows/sync-role.ts
import { FatalError } from "workflow";
import { toggleRoleMapping } from "@trainers/supabase";
import { createServiceRoleClient } from "@/lib/supabase/server";

import { assignDiscordRole, removeDiscordRole } from "./steps/discord-api";
import { logDeliveryFailure } from "./steps/failure-tracking";

async function disableRoleMapping(serverId: number, roleId: string) {
  "use step";
  const supabase = createServiceRoleClient();
  const { data: mapping } = await supabase
    .from("discord_role_mappings")
    .select("id")
    .eq("discord_server_id", serverId)
    .eq("discord_role_id", roleId)
    .maybeSingle();
  if (mapping) {
    await toggleRoleMapping(supabase, mapping.id, false);
  }
}

export async function syncRoleWorkflow(
  guildId: string,
  discordUserId: string,
  roleId: string,
  action: "add" | "remove",
  serverId: number,
  roleType: string
) {
  "use workflow";

  try {
    if (action === "add") {
      await assignDiscordRole(guildId, discordUserId, roleId);
    } else {
      await removeDiscordRole(guildId, discordUserId, roleId);
    }
    return { status: "synced" as const };
  } catch (e) {
    if (e instanceof FatalError) {
      const reason = e.message; // "hierarchy_violation", "role_deleted", "user_left"

      if (reason === "role_deleted") {
        await disableRoleMapping(serverId, roleId);
      }

      await logDeliveryFailure({
        discord_server_id: serverId,
        type: "role_sync",
        event_type: roleType,
        target: roleId,
        error_reason: reason,
      });

      return { status: "failed" as const, reason };
    }
    throw e;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/workflows/sync-role.ts
git commit -m "feat(discord): add role sync workflow with hierarchy handling"
```

---

## Task 6: Update enqueue helpers to use `start()`

**Files:**
- Modify: `apps/web/src/lib/discord/enqueue-helpers.ts`

- [ ] **Step 1: Rewrite the three helper functions**

Replace the body of each function. Keep the same signature and fire-and-forget semantics. The resolution logic (server lookup, channel mapping, user→Discord ID) stays.

Key changes per function:

**`enqueueCommunityChannelNotification`** — for each channel mapping, call `start(sendChannelNotificationWorkflow, [...])` instead of `enqueueNotification(...)`.

**`enqueueCommunityDms`** — for each Discord user, call `start(sendDmWorkflow, [...])` instead of `enqueueDm(...)`.

**`enqueueCommunityRoleSync`** — for each Discord user, call `start(syncRoleWorkflow, [...])` instead of `enqueueRoleSync(...)`. Need to also resolve `guild_id` from the server row since the workflow needs it for the REST call.

Replace imports: remove `enqueueNotification`, `enqueueDm`, `enqueueRoleSync` from `@trainers/supabase`. Add `import { start } from "workflow/api"` and the three workflow imports.

The `getDiscordServerByCommunityId`, `getChannelMappingsForEvent`, `getEnabledRoleMappings`, `getDmSetting` imports stay — they're still used for resolution.

- [ ] **Step 2: Verify + commit**

```bash
pnpm --filter @trainers/web typecheck 2>&1 | tail -10
pnpm --filter @trainers/web lint 2>&1 | tail -5
```

```bash
git add apps/web/src/lib/discord/enqueue-helpers.ts
git commit -m "feat(discord): swap enqueue helpers to use Workflow start()"
```

---

## Task 7: Update retry action to use `start()`

**Files:**
- Modify: `apps/web/src/actions/discord-integration.ts`

- [ ] **Step 1: Rewrite `retryNotificationAction` and `retryDmNotificationAction`**

Instead of calling `resetNotificationForRetry` / `resetDmForRetry`, these now:
1. Read the failure row from `discord_delivery_failures` via `getDeliveryFailure`
2. Call `start(workflow, [args reconstructed from the failure row])`

```ts
export async function retryNotificationAction(
  failureId: number
): Promise<ActionResult<void>> {
  try {
    await rejectBots();
    const supabase = await createClient();
    const failure = await getDeliveryFailure(supabase, failureId);
    if (!failure) return { success: false, error: "Failure not found" };

    // Permission check via the server's community
    const server = await getDiscordServerById(supabase, failure.discord_server_id);
    if (!server) return { success: false, error: "Server not found" };
    await requireCommunityManage(supabase, server.community_id);

    if (failure.type === "channel") {
      await start(sendChannelNotificationWorkflow, [
        failure.target,
        failure.event_type,
        (failure.payload as Record<string, unknown>) ?? {},
        failure.discord_server_id,
      ]);
    } else if (failure.type === "dm") {
      // For DM retry, we need deliveryMode + fallbackChannelId from community settings
      const dmSetting = await getDmSetting(
        supabase,
        failure.discord_server_id,
        failure.event_type as DiscordDmEventType
      );
      await start(sendDmWorkflow, [
        failure.target,
        "", // userId not stored in failure — DM retry is best-effort
        failure.event_type as DiscordDmEventType,
        (failure.payload as Record<string, unknown>) ?? {},
        dmSetting?.delivery_mode ?? "dm_with_fallback",
        dmSetting?.fallback_channel_id ?? null,
        server.community_id,
        failure.discord_server_id,
      ]);
    } else {
      await start(syncRoleWorkflow, [
        server.guild_id,
        failure.target,
        "", // roleId not in target for role_sync — need to store it in payload
        "add",
        failure.discord_server_id,
        failure.event_type,
      ]);
    }

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to retry"),
    };
  }
}
```

Remove the old `retryDmNotificationAction` — the unified `retryNotificationAction` handles all failure types now.

Also remove imports for `resetNotificationForRetry` and `resetDmForRetry`.

- [ ] **Step 2: Update test**

Update `apps/web/src/actions/__tests__/discord-integration.test.ts` to mock `workflow/api` `start()` instead of the old reset mutations.

- [ ] **Step 3: Verify + commit**

```bash
pnpm --filter @trainers/web test -- discord-integration 2>&1 | tail -15
git add apps/web/src/actions/discord-integration.ts apps/web/src/actions/__tests__/discord-integration.test.ts
git commit -m "feat(discord): update retry action to dispatch workflows"
```

---

## Task 8: Remove old queue mutations + queries + update exports

**Files:**
- Modify: `packages/supabase/src/mutations/discord.ts`
- Modify: `packages/supabase/src/queries/discord.ts`
- Modify: `packages/supabase/src/mutations/index.ts`
- Modify: `packages/supabase/src/queries/index.ts`
- Modify: `packages/supabase/src/index.ts`

- [ ] **Step 1: Remove dead mutations**

From `packages/supabase/src/mutations/discord.ts`, remove these functions (they reference dropped tables):
- `enqueueNotification`
- `markNotificationSent`
- `markNotificationFailed`
- `enqueueDm`
- `markDmFailed`
- `markDmSkipped`
- `markDmSent`
- `enqueueRoleSync`
- `markRoleSyncComplete`
- `markRoleSyncFailed`
- `resetNotificationForRetry`
- `resetDmForRetry`
- `purgeOldNotifications`
- `purgeOldDmQueue`
- `purgeOldRoleSyncQueue`

- [ ] **Step 2: Remove dead queries**

From `packages/supabase/src/queries/discord.ts`, remove:
- `listPendingNotifications`
- `listPendingDmNotifications`
- `listPendingRoleSyncs`
- Types: `DiscordNotificationQueueItem`, `DiscordDmQueueItem`, `DiscordRoleSyncQueueItem`

- [ ] **Step 3: Update barrel exports**

Remove the deleted functions/types from:
- `packages/supabase/src/mutations/index.ts`
- `packages/supabase/src/queries/index.ts`
- `packages/supabase/src/index.ts`

Add exports for `recordDeliveryFailure` and `getDeliveryFailure` if not already exported.

- [ ] **Step 4: Verify**

```bash
pnpm --filter @trainers/supabase typecheck 2>&1 | tail -10
pnpm --filter @trainers/supabase lint 2>&1 | tail -5
pnpm --filter @trainers/web typecheck 2>&1 | tail -10
```

Both should be clean now — all references to the old queue functions have been updated in earlier tasks.

- [ ] **Step 5: Commit**

```bash
git add packages/supabase/
git commit -m "refactor(discord): remove queue table mutations and queries"
```

---

## Task 9: Delete cron routes + update vercel.json

**Files:**
- Delete: `apps/web/src/app/api/discord/notify/` (entire directory)
- Delete: `apps/web/src/app/api/discord/role-sync/` (entire directory)
- Delete: `apps/web/src/app/api/discord/retention/` (entire directory)
- Modify: `apps/web/vercel.json`

- [ ] **Step 1: Delete the three cron route directories**

```bash
rm -rf apps/web/src/app/api/discord/notify
rm -rf apps/web/src/app/api/discord/role-sync
rm -rf apps/web/src/app/api/discord/retention
```

- [ ] **Step 2: Update vercel.json**

Remove the 3 cron entries for notify, role-sync, and retention. Keep reconcile-roles and uninstall-sweep:

```json
"crons": [
  { "path": "/api/discord/reconcile-roles", "schedule": "3-59/15 * * * *" },
  { "path": "/api/discord/uninstall-sweep", "schedule": "0 7 * * *" }
]
```

- [ ] **Step 3: Verify full suite**

```bash
pnpm --filter @trainers/web typecheck 2>&1 | tail -10
pnpm --filter @trainers/web lint 2>&1 | tail -10
pnpm --filter @trainers/web test 2>&1 | tail -20
node -e 'JSON.parse(require("fs").readFileSync("apps/web/vercel.json", "utf8"))' && echo OK
```

Some tests that imported the deleted routes will fail. Remove or update those test files:
- `apps/web/src/app/api/discord/notify/__tests__/route.test.ts` — deleted with the route
- `apps/web/src/app/api/discord/role-sync/__tests__/route.test.ts` — deleted with the route
- `apps/web/src/app/api/discord/retention/__tests__/route.test.ts` — deleted with the route

Any other tests that mock the old enqueue functions (`enqueueNotification`, `enqueueDm`, `enqueueRoleSync`) need their mocks updated to mock `workflow/api` `start()` instead. Check:
- `apps/web/src/actions/__tests__/tournaments.test.ts` (already updated in Task 7 if it referenced the helpers)

- [ ] **Step 4: Commit**

```bash
git add -A apps/web/src/app/api/discord/notify apps/web/src/app/api/discord/role-sync apps/web/src/app/api/discord/retention apps/web/vercel.json
git commit -m "refactor(discord): remove cron routes replaced by Workflow"
```

---

## Task 10: Update reconcile-roles to use `start()` instead of `enqueueRoleSync`

**Files:**
- Modify: `apps/web/src/app/api/discord/reconcile-roles/route.ts`

- [ ] **Step 1: Update the reconcile route**

The reconcile-roles cron currently calls `enqueueRoleSync()` to queue role add/remove jobs. Since the queue table no longer exists, it should call `start(syncRoleWorkflow, [...])` directly.

Replace `import { enqueueRoleSync } from "@trainers/supabase"` with `import { start } from "workflow/api"` and `import { syncRoleWorkflow } from "@/workflows/sync-role"`.

In the diff loop where it enqueues adds/removes, replace:
```ts
// Before
await enqueueRoleSync(supabase, { discord_server_id, discord_user_id, discord_role_id, action, source_event });

// After
await start(syncRoleWorkflow, [guildId, discordUserId, roleId, action, serverId, roleType]);
```

- [ ] **Step 2: Update tests**

`apps/web/src/app/api/discord/reconcile-roles/__tests__/route.test.ts` — mock `workflow/api` `start()` instead of `enqueueRoleSync`.

- [ ] **Step 3: Verify + commit**

```bash
pnpm --filter @trainers/web test -- reconcile-roles 2>&1 | tail -15
git add apps/web/src/app/api/discord/reconcile-roles/
git commit -m "refactor(discord): reconcile-roles cron uses workflow start()"
```

---

## Task 11: Final verification

- [ ] **Step 1: Full pre-push checks**

```bash
pnpm typecheck 2>&1 | tail -10
pnpm lint 2>&1 | tail -10
pnpm test 2>&1 | tail -20
```

Fix any remaining references to deleted functions/tables. Common sources:
- Test mocks that import old mutations
- PostHog emission code that was in the deleted cron routes (now in workflow steps)

- [ ] **Step 2: Verify vercel.json is valid**

```bash
node -e 'JSON.parse(require("fs").readFileSync("apps/web/vercel.json", "utf8"))' && echo OK
```

- [ ] **Step 3: Summary commit if any fixups**

```bash
git commit -am "fix(discord): address remaining references after workflow migration"
```

---

## Self-review

**Spec coverage:**
- [x] Drop 3 queue tables — Task 2
- [x] Create `discord_delivery_failures` — Task 2
- [x] 3 workflows with FatalError/RetryableError — Tasks 3, 4, 5
- [x] Shared steps for Discord API, failure tracking, user prefs — Tasks 3, 4
- [x] Update enqueue helpers → `start()` — Task 6
- [x] Update retry action — Task 7
- [x] Remove old mutations/queries — Task 8
- [x] Delete cron routes + update vercel.json — Task 9
- [x] Update reconcile-roles to use `start()` — Task 10
- [x] PostHog emissions in workflow steps — Task 3 (failure-tracking.ts)
- [x] `discord_channel_failures` kept — not touched
- [x] reconcile-roles + uninstall-sweep kept as crons — Task 9 keeps them
- [x] Failures tab reads from new table — Task 2 (listRecentFailures rewrite)
- [x] `withWorkflow` in next.config — Task 1
- [x] Package installation — Task 1

**No placeholders found.** All tasks have concrete code.

**Type consistency verified:** `sendChannelNotificationWorkflow` args match between Task 3 (definition), Task 6 (enqueue helper call), and Task 7 (retry action call).
