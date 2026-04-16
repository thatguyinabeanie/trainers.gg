# Discord Bot — Web UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Phase 5 of the Discord bot — the admin integration page at `/dashboard/community/[slug]/settings/integrations/discord`, plus the lightweight user-side surfaces (DM preferences, linked identities summary, public profile opt-in, tournament creation banner, "bot installed" chip).

**Architecture:** Next.js 16 App Router Server Component for data loading + auth gate, a single Client Component owning tab state via `?tab=` query param. Discord REST data cached with `unstable_cache` 5-min, invalidated on-demand via a per-picker Refresh button. Hybrid save pattern — toggles commit immediately via Server Actions with optimistic UI; new-row inline forms have Add buttons. Failures surfaced as a third tab with a count badge.

**Tech Stack:** Next.js 16, React 19.2, Server Actions, shadcn/ui + Base UI, Tailwind CSS 4, TanStack Query (where client-side caching helps), Supabase (service role on cron, user-scoped elsewhere), PostHog analytics.

**Parent spec:** `docs/superpowers/specs/2026-04-15-discord-ui-design.md`
**Parent plan:** `docs/superpowers/plans/2026-04-11-discord-bot-plan.md`

---

## File structure

### New files

```
packages/supabase/supabase/migrations/
└── YYYYMMDDHHMMSS_add_discord_dm_warn_until.sql           (Task 1)

apps/web/src/actions/
└── discord-integration.ts                                 (Tasks 3–12 all actions live here)

apps/web/src/app/(dashboard)/dashboard/community/[communitySlug]/
└── settings/integrations/discord/
    ├── page.tsx                                           (Task 13)
    ├── discord-client.tsx                                 (Task 14)
    ├── loading.tsx                                        (Task 13)
    └── _components/
        ├── install-card.tsx                               (Task 15)
        ├── status-header.tsx                              (Task 16)
        ├── failure-banner.tsx                             (Task 16)
        ├── confirm-disconnect-dialog.tsx                  (Task 16)
        ├── channel-mapping-table.tsx                      (Task 17)
        ├── dm-settings-table.tsx                          (Task 18)
        ├── role-mapping-table.tsx                         (Task 19)
        ├── failures-table.tsx                             (Task 20)
        └── picker-refresh-button.tsx                      (Task 21)

apps/web/src/lib/discord/
└── guild-cache.ts                                          (Task 21 — unstable_cache wrappers)

apps/web/src/components/settings/
└── discord-dm-preferences-section.tsx                     (Task 22)
```

### Modified files

```
apps/web/src/app/api/discord/notify/route.ts               (Task 2 — set/clear warn flag)
apps/web/src/lib/cache.ts                                   (Task 13 — add discordGuild tag)
packages/supabase/src/queries/discord.ts                   (Tasks 5 & 11 — add helper queries)
packages/supabase/src/index.ts                             (Task 5 & 11 — re-exports)
packages/supabase/src/mutations/discord.ts                 (Task 10 — add retryNotification)
apps/web/src/app/(dashboard)/dashboard/settings/notifications/page.tsx  (Task 22)
apps/web/src/app/(dashboard)/dashboard/settings/account/page.tsx        (Task 23)
apps/web/src/app/(dashboard)/dashboard/settings/profile/page.tsx        (Task 24)
apps/web/src/app/(app)/u/[handle]/page.tsx                 (Task 25)
apps/web/src/app/(dashboard)/dashboard/community/[communitySlug]/tournaments/new/page.tsx   (Task 26)
apps/web/src/app/(dashboard)/dashboard/community/[communitySlug]/settings/page.tsx          (Task 27)
apps/web/src/app/(dashboard)/dashboard/community/[communitySlug]/layout.tsx                 (Task 28 — sidebar entry)
```

---

## Task 1: Add `users.discord_dm_warn_until` migration

**Why:** Track the 30-day TTL for the DM-blocked privacy warning banner in User Settings → Notifications.

**Files:**
- Create: `packages/supabase/supabase/migrations/YYYYMMDDHHMMSS_add_discord_dm_warn_until.sql` (use current UTC timestamp)

- [ ] **Step 1: Write the migration**

```sql
-- Adds a TTL timestamp on the users row so the UI can show a "your DMs
-- look closed from server members" warning when the bot has recently
-- tried to DM this user and hit Discord error 50007.
--
-- The notify cron sets this to `now() + interval '30 days'` on 50007
-- failure; successful DM delivery clears it to NULL. The UI banner is
-- visible while discord_dm_warn_until > now().

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS discord_dm_warn_until timestamptz;

-- Partial index — most users will have NULL, so keep the index narrow.
CREATE INDEX IF NOT EXISTS idx_users_discord_dm_warn_until_not_null
  ON public.users (id)
  WHERE discord_dm_warn_until IS NOT NULL;
```

- [ ] **Step 2: Apply + regenerate types**

Run:
```bash
pnpm db:reset 2>&1 | tail -20
pnpm generate-types 2>&1 | tail -5
```

Expected: migration replays cleanly; `Tables<"users">` now has `discord_dm_warn_until: string | null`.

- [ ] **Step 3: Commit**

```bash
git add packages/supabase/supabase/migrations/*_add_discord_dm_warn_until.sql \
        packages/supabase/src/types.ts
git commit -m "feat(discord): add users.discord_dm_warn_until for DM privacy warning"
```

---

## Task 2: Update notify cron to set/clear the DM warn flag

**Why:** The UI reads `discord_dm_warn_until > now()`; it needs to be written somewhere.

**Files:**
- Modify: `apps/web/src/app/api/discord/notify/route.ts`
- Modify: `apps/web/src/app/api/discord/notify/__tests__/route.test.ts`

- [ ] **Step 1: Add failing tests**

Extend the existing route test with two new cases:

```ts
describe("DM warn flag", () => {
  it("sets discord_dm_warn_until on DM 50007 failure", async () => {
    // Arrange: DM queue row, sendDM throws 50007
    // Act: call POST /api/discord/notify with valid bearer
    // Assert: supabase.from("users").update was called with
    //   discord_dm_warn_until set to ~30 days from now, WHERE id = user_id
  });

  it("clears discord_dm_warn_until on successful DM delivery", async () => {
    // Arrange: DM queue row, sendDM resolves, user row currently has
    //   discord_dm_warn_until = some past timestamp
    // Act: call POST /api/discord/notify
    // Assert: users.update called with discord_dm_warn_until = null,
    //   WHERE id = user_id AND discord_dm_warn_until IS NOT NULL
  });
});
```

Run: `pnpm --filter @trainers/web test -- notify 2>&1 | tail -30`
Expected: 2 new failing assertions.

- [ ] **Step 2: Update the DM pass**

In the DM pass inside `processDmQueue`:
- On catch branch where `getErrorCode(e) === 50007` and either `markDmFailed` or `markDmSent` (via fallback) is called, AFTER that mutation, also:

```ts
const warnUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
await supabase
  .from("users")
  .update({ discord_dm_warn_until: warnUntil })
  .eq("id", item.user_id);
// Note: warn flag write failure is noisy but non-fatal. Swallow into a
// console.error — DM bookkeeping already succeeded.
```

On the success branch (after `markDmSent`), also:

```ts
await supabase
  .from("users")
  .update({ discord_dm_warn_until: null })
  .eq("id", item.user_id)
  .not("discord_dm_warn_until", "is", null);
```

Wrap both writes in per-item try/catch with `console.error` — a failed warn-flag write must not abort the DM loop.

- [ ] **Step 3: Run tests**

```bash
pnpm --filter @trainers/web test -- notify 2>&1 | tail -30
```
Expected: all tests pass (including the 14 previous + 2 new).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/api/discord/notify/route.ts \
        apps/web/src/app/api/discord/notify/__tests__/route.test.ts
git commit -m "feat(discord): set/clear DM warn flag from notify cron"
```

---

## Task 3: Channel mapping Server Actions (upsert + delete)

**Why:** The Channel Announcements table on the admin page commits changes via these actions.

**Files:**
- Create: `apps/web/src/actions/discord-integration.ts`
- Create: `apps/web/src/actions/__tests__/discord-integration.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// apps/web/src/actions/__tests__/discord-integration.test.ts
import {
  upsertChannelMappingAction,
  deleteChannelMappingAction,
} from "../discord-integration";

jest.mock("@/lib/supabase/server");

describe("upsertChannelMappingAction", () => {
  it("rejects when user lacks community.manage permission", async () => {
    // Mock has_community_permission → false
    const result = await upsertChannelMappingAction({
      communityId: 1,
      eventType: "tournament_created",
      channelId: "123",
    });
    expect(result).toEqual({ success: false, error: expect.any(String), code: "FORBIDDEN" });
  });

  it("calls upsertChannelMapping on valid input", async () => {
    // Mock permission true, mock upsertChannelMapping → { id: 42 }
    const result = await upsertChannelMappingAction({
      communityId: 1,
      eventType: "tournament_created",
      channelId: "123",
    });
    expect(result).toEqual({ success: true, data: { id: 42 } });
  });

  it("validates eventType against a whitelist", async () => {
    const result = await upsertChannelMappingAction({
      communityId: 1,
      eventType: "arbitrary_garbage" as never,
      channelId: "123",
    });
    expect(result.success).toBe(false);
  });
});

describe("deleteChannelMappingAction", () => {
  it("rejects when caller lacks permission", async () => { /* ... */ });
  it("calls deleteChannelMapping on valid input", async () => { /* ... */ });
});
```

Run: `pnpm --filter @trainers/web test -- discord-integration`
Expected: FAIL (file not found).

- [ ] **Step 2: Create the actions file**

```ts
// apps/web/src/actions/discord-integration.ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  upsertChannelMapping,
  deleteChannelMapping,
  getDiscordServerByCommunityId,
  hasCommunityPermission, // add if missing; otherwise call the RPC directly
} from "@trainers/supabase";
import { type ActionResult } from "@trainers/validators";
import { getErrorMessage } from "@trainers/utils";
import { rejectBots } from "@/lib/bot-rejection";
import { createClient } from "@/lib/supabase/server";

// =============================================================================
// Schema
// =============================================================================

const CHANNEL_EVENT_TYPES = [
  "tournament_created",
  "registration_opens",
  "tournament_ended",
  "match_result_reported",
  // Add any others from the spec § Notification Event Types
] as const;

const upsertChannelMappingSchema = z.object({
  communityId: z.number().int().positive(),
  eventType: z.enum(CHANNEL_EVENT_TYPES),
  channelId: z.string().min(1),
});

// =============================================================================
// Helpers
// =============================================================================

async function requireCommunityManage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  communityId: number
): Promise<void> {
  const { data, error } = await supabase.rpc("has_community_permission", {
    community_id: communityId,
    permission: "community.manage",
  });
  if (error) throw new Error(`Permission check failed: ${error.message}`);
  if (!data) throw new Error("FORBIDDEN");
}

// =============================================================================
// Channel mappings
// =============================================================================

export async function upsertChannelMappingAction(
  input: z.infer<typeof upsertChannelMappingSchema>
): Promise<ActionResult<{ id: number }>> {
  try {
    await rejectBots();
    const parsed = upsertChannelMappingSchema.parse(input);
    const supabase = await createClient();
    await requireCommunityManage(supabase, parsed.communityId);

    const server = await getDiscordServerByCommunityId(supabase, parsed.communityId);
    if (!server) throw new Error("Discord server not installed for this community");

    const result = await upsertChannelMapping(supabase, {
      discord_server_id: server.id,
      event_type: parsed.eventType,
      channel_id: parsed.channelId,
    });

    revalidatePath(
      `/dashboard/community/[communitySlug]/settings/integrations/discord`,
      "page"
    );
    return { success: true, data: { id: result.id } };
  } catch (error) {
    const msg = error instanceof Error && error.message === "FORBIDDEN"
      ? "You do not have permission to manage this community's Discord integration."
      : getErrorMessage(error, "Failed to save channel mapping");
    return {
      success: false,
      error: msg,
      code: error instanceof Error && error.message === "FORBIDDEN" ? "FORBIDDEN" : undefined,
    };
  }
}

export async function deleteChannelMappingAction(
  mappingId: number
): Promise<ActionResult<void>> {
  // ... mirror the pattern above
}
```

- [ ] **Step 3: Run tests**

```bash
pnpm --filter @trainers/web test -- discord-integration 2>&1 | tail -25
```
Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/actions/discord-integration.ts \
        apps/web/src/actions/__tests__/discord-integration.test.ts
git commit -m "feat(discord): add channel mapping server actions"
```

---

## Task 4: DM setting Server Action (upsert)

**Why:** The Direct Messages table on the admin page commits delivery-mode changes via this action.

**Files:**
- Modify: `apps/web/src/actions/discord-integration.ts`
- Modify: `apps/web/src/actions/__tests__/discord-integration.test.ts`

- [ ] **Step 1: Write failing test**

```ts
describe("upsertDmSettingAction", () => {
  it("rejects when user lacks community.manage", async () => { /* ... */ });
  it("saves delivery_mode + fallback_channel_id", async () => {
    const result = await upsertDmSettingAction({
      communityId: 1,
      eventType: "match_ready",
      deliveryMode: "dm_with_fallback",
      fallbackChannelId: "456",
    });
    expect(result.success).toBe(true);
  });
  it("rejects fallback_channel_id mismatch with dm_only mode", async () => {
    const result = await upsertDmSettingAction({
      communityId: 1,
      eventType: "match_ready",
      deliveryMode: "dm_only",
      fallbackChannelId: "456", // invalid combination
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Add the action**

Use `Zod` with `.refine` to enforce the fallback/mode combination rules matching the DB CHECK constraint:
- `dm_only` → `fallbackChannelId` must be null/undefined
- `channel_only` or `dm_with_fallback` → `fallbackChannelId` required

```ts
const upsertDmSettingSchema = z
  .object({
    communityId: z.number().int().positive(),
    eventType: z.enum([/* 11 DM events from the enum */]),
    deliveryMode: z.enum(["dm_only", "channel_only", "dm_with_fallback"]),
    fallbackChannelId: z.string().optional().nullable(),
  })
  .refine(
    (v) => v.deliveryMode === "dm_only" ? !v.fallbackChannelId : !!v.fallbackChannelId,
    "fallback_channel_id required for channel_only and dm_with_fallback modes"
  );

export async function upsertDmSettingAction(
  input: z.infer<typeof upsertDmSettingSchema>
): Promise<ActionResult<{ id: number }>> {
  // rejectBots → createClient → requireCommunityManage → resolve server →
  // call upsertDmSetting mutation → revalidatePath
}
```

- [ ] **Step 3: Verify + commit**

```bash
pnpm --filter @trainers/web test -- discord-integration 2>&1 | tail -10
git add apps/web/src/actions/discord-integration.ts apps/web/src/actions/__tests__/discord-integration.test.ts
git commit -m "feat(discord): add DM setting server action"
```

---

## Task 5: Role mapping Server Actions (toggle + upsert)

**Why:** Roles tab toggles + pickers commit via these actions.

**Files:**
- Modify: `apps/web/src/actions/discord-integration.ts`
- Modify: `apps/web/src/actions/__tests__/discord-integration.test.ts`
- Modify: `packages/supabase/src/queries/discord.ts` — add helper `getRoleMappingById(supabase, mappingId): Promise<{ discord_server_id, community_id } | null>` so the action can resolve community for the permission check from just a mapping ID. Export from `packages/supabase/src/index.ts`.

- [ ] **Step 1: Write failing tests**

```ts
describe("toggleRoleMappingAction", () => {
  it("rejects when caller lacks community.manage for the mapping's community", async () => { /* ... */ });
  it("toggles enabled flag", async () => { /* ... */ });
});

describe("upsertRoleMappingAction", () => {
  it("rejects invalid role type", async () => { /* ... */ });
  it("saves role mapping with given discord_role_id", async () => { /* ... */ });
});
```

- [ ] **Step 2: Add `getRoleMappingById` query**

```ts
// packages/supabase/src/queries/discord.ts
export async function getRoleMappingById(
  supabase: TypedClient,
  mappingId: number
): Promise<{ id: number; discord_server_id: number; community_id: number | null } | null> {
  const { data, error } = await supabase
    .from("discord_role_mappings")
    .select("id, discord_server_id, discord_servers!inner(community_id)")
    .eq("id", mappingId)
    .maybeSingle();
  if (error) throw new Error(`Failed to fetch role mapping: ${error.message}`);
  if (!data) return null;
  return {
    id: data.id,
    discord_server_id: data.discord_server_id,
    community_id: data.discord_servers?.community_id ?? null,
  };
}
```

Re-export from `packages/supabase/src/index.ts`.

- [ ] **Step 3: Add actions**

```ts
export async function toggleRoleMappingAction(
  mappingId: number,
  enabled: boolean
): Promise<ActionResult<void>> {
  // rejectBots → createClient → getRoleMappingById →
  // requireCommunityManage(communityId) → toggleRoleMapping(mappingId, enabled) →
  // revalidatePath
}

export async function upsertRoleMappingAction(input: {
  communityId: number;
  roleType: DiscordRoleType;
  discordRoleId: string;
}): Promise<ActionResult<{ id: number }>> {
  // rejectBots → createClient → requireCommunityManage(communityId) →
  // getDiscordServerByCommunityId → upsertRoleMapping → revalidatePath
}
```

- [ ] **Step 4: Verify + commit**

```bash
pnpm --filter @trainers/web test -- discord-integration 2>&1 | tail -10
pnpm --filter @trainers/supabase test 2>&1 | tail -10
git add apps/web/src/actions/discord-integration.ts apps/web/src/actions/__tests__/discord-integration.test.ts \
        packages/supabase/src/queries/discord.ts packages/supabase/src/index.ts
git commit -m "feat(discord): add role mapping server actions"
```

---

## Task 6: User DM preference Server Action

**Why:** The per-event Discord DM checkboxes in User Settings → Notifications commit via this action.

**Files:**
- Modify: `apps/web/src/actions/discord-integration.ts`
- Modify: `apps/web/src/actions/__tests__/discord-integration.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
describe("setDmPreferenceAction", () => {
  it("rejects when unauthenticated", async () => { /* ... */ });
  it("upserts the preference for the current user", async () => {
    // Arrange: session has user_id = "abc"
    // Act: setDmPreferenceAction({ eventType: "match_ready", enabled: true })
    // Assert: setDmPreference(supabase, "abc", "match_ready", true) called
  });
});
```

- [ ] **Step 2: Add action**

```ts
export async function setDmPreferenceAction(input: {
  eventType: DiscordDmEventType;
  enabled: boolean;
}): Promise<ActionResult<void>> {
  try {
    await rejectBots();
    const parsed = setDmPreferenceSchema.parse(input);
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };
    await setDmPreference(supabase, user.id, parsed.eventType, parsed.enabled);
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: getErrorMessage(error, "Failed to save preference") };
  }
}
```

- [ ] **Step 3: Verify + commit**

---

## Task 7: `setShowDiscordPubliclyAction`

**Why:** Profile settings toggle for the public handle display.

**Files:**
- Modify: `apps/web/src/actions/discord-integration.ts`
- Modify: `apps/web/src/actions/__tests__/discord-integration.test.ts`

- [ ] **Step 1: Write failing test**

```ts
describe("setShowDiscordPubliclyAction", () => {
  it("updates users.show_discord_publicly for current user", async () => { /* ... */ });
  it("invalidates the player profile cache for this user's handle", async () => {
    // Verify updateTag(CacheTags.player(username)) was called
  });
});
```

- [ ] **Step 2: Implement**

```ts
export async function setShowDiscordPubliclyAction(
  enabled: boolean
): Promise<ActionResult<void>> {
  try {
    await rejectBots();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const { data: userRow, error } = await supabase
      .from("users")
      .update({ show_discord_publicly: enabled })
      .eq("id", user.id)
      .select("username")
      .single();
    if (error) throw new Error(error.message);

    if (userRow?.username) {
      const { updateTag } = await import("next/cache");
      updateTag(CacheTags.player(userRow.username));
    }
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: getErrorMessage(error, "Failed to update setting") };
  }
}
```

If `CacheTags.player` doesn't exist, use whichever tag the profile page uses — grep `apps/web/src/app/(app)/u/[handle]/page.tsx` for `unstable_cache` and match it.

- [ ] **Step 3: Verify + commit**

---

## Task 8: `refreshDiscordGuildCacheAction`

**Why:** Per-picker 🔄 button to force-fetch guild channels/roles.

**Files:**
- Modify: `apps/web/src/actions/discord-integration.ts`
- Modify: `apps/web/src/actions/__tests__/discord-integration.test.ts`
- Modify: `apps/web/src/lib/cache.ts` — add `discordGuild(serverId: number)` tag generator

- [ ] **Step 1: Add cache tag generator**

In `apps/web/src/lib/cache.ts`, inside the `CacheTags` object:

```ts
/**
 * Tag for cached Discord REST data (guild channels + roles) for a specific server.
 * Invalidated explicitly via the per-picker Refresh button — no auto-invalidation
 * because the data changes in Discord, not trainers.gg.
 */
discordGuild: (serverId: number) => `discord-guild:${serverId}`,
```

- [ ] **Step 2: Write failing test**

```ts
describe("refreshDiscordGuildCacheAction", () => {
  it("rejects when caller lacks community.manage", async () => { /* ... */ });
  it("calls updateTag with the server-scoped tag", async () => {
    await refreshDiscordGuildCacheAction(42);
    expect(updateTagMock).toHaveBeenCalledWith("discord-guild:42");
  });
});
```

- [ ] **Step 3: Implement**

```ts
export async function refreshDiscordGuildCacheAction(
  serverId: number
): Promise<ActionResult<void>> {
  try {
    await rejectBots();
    const supabase = await createClient();
    const server = await getDiscordServerById(supabase, serverId);
    if (!server) return { success: false, error: "Discord server not found" };
    await requireCommunityManage(supabase, server.community_id);
    const { updateTag } = await import("next/cache");
    updateTag(CacheTags.discordGuild(serverId));
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: getErrorMessage(error, "Failed to refresh") };
  }
}
```

Add `getDiscordServerById(supabase, id)` to `packages/supabase/src/queries/discord.ts` if it doesn't exist.

- [ ] **Step 4: Verify + commit**

---

## Task 9: `disconnectDiscordServerAction`

**Why:** "Disconnect" button in the Status Header.

**Files:**
- Modify: `apps/web/src/actions/discord-integration.ts`
- Modify: `apps/web/src/actions/__tests__/discord-integration.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
describe("disconnectDiscordServerAction", () => {
  it("rejects when caller lacks community.manage", async () => { /* ... */ });
  it("deletes discord_servers row and invalidates caches", async () => { /* ... */ });
});
```

- [ ] **Step 2: Implement**

```ts
export async function disconnectDiscordServerAction(
  serverId: number
): Promise<ActionResult<void>> {
  // rejectBots → createClient → getDiscordServerById → requireCommunityManage
  // → deleteDiscordServer(supabase, serverId)
  // → invalidateCommunityPageCaches(slug, communityId)
  // → updateTag(CacheTags.discordGuild(serverId))
}
```

- [ ] **Step 3: Verify + commit**

---

## Task 10: `retryNotificationAction` + `retryDmNotificationAction`

**Why:** Per-row "Retry" button on the Failures tab.

**Files:**
- Modify: `apps/web/src/actions/discord-integration.ts`
- Modify: `apps/web/src/actions/__tests__/discord-integration.test.ts`
- Modify: `packages/supabase/src/mutations/discord.ts` — add `resetNotificationForRetry(supabase, id)` and `resetDmForRetry(supabase, id)` that set `status='pending'`, reset `attempts = 0`, clear `failed_reason`.

- [ ] **Step 1: Add the mutations**

```ts
export async function resetNotificationForRetry(
  supabase: TypedClient,
  id: number
): Promise<void> {
  const { error } = await supabase
    .from("discord_notification_queue")
    .update({ status: "pending", attempts: 0, failed_reason: null })
    .eq("id", id);
  if (error) throw new Error(`Failed to reset notification: ${error.message}`);
}

export async function resetDmForRetry(/* ...same */) { /* ... */ }
```

Re-export from `packages/supabase/src/index.ts`.

- [ ] **Step 2: Write failing tests**

Permission + resets row to pending. Both channel and DM variants.

- [ ] **Step 3: Implement actions**

```ts
export async function retryNotificationAction(
  notificationId: number
): Promise<ActionResult<void>> {
  // rejectBots → createClient → resolve notification → communityId → requireCommunityManage
  // → resetNotificationForRetry → revalidatePath
}
export async function retryDmNotificationAction(dmId: number): Promise<ActionResult<void>> { /* ... */ }
```

- [ ] **Step 4: Verify + commit**

---

## Task 11: Add supporting queries for the integration page

**Why:** The Server Component does a single `Promise.all` fetch; these queries make that possible.

**Files:**
- Modify: `packages/supabase/src/queries/discord.ts`
- Modify: `packages/supabase/src/index.ts`
- Modify: `packages/supabase/src/queries/__tests__/discord.test.ts` (or create)

- [ ] **Step 1: Add queries (one function each)**

```ts
// Gets all data the integration page needs in one round trip.
// Returns null when the bot isn't installed for this community.
export async function getDiscordIntegrationOverview(
  supabase: TypedClient,
  communityId: number
): Promise<{
  server: DiscordServer;
  channelMappings: DiscordChannelMapping[];
  dmSettings: DiscordDmSetting[];
  roleMappings: DiscordRoleMapping[];
  recentFailureCount: number;
} | null> {
  const server = await getDiscordServerByCommunityId(supabase, communityId);
  if (!server) return null;
  const [channelMappings, dmSettings, roleMappings, failures] = await Promise.all([
    listChannelMappings(supabase, server.id),
    listDmSettings(supabase, server.id),
    listRoleMappings(supabase, server.id),
    listChannelFailures(supabase, server.id, 24), // hours
  ]);
  return {
    server,
    channelMappings,
    dmSettings,
    roleMappings,
    recentFailureCount: failures.length,
  };
}

// For the Failures tab: pending + recently-failed items across all three queues.
export async function listRecentFailures(
  supabase: TypedClient,
  serverId: number,
  hours: number = 24
): Promise<{
  channels: ChannelFailureRow[];  // joined with mapping + channel name
  dms: DmFailureRow[];             // joined with user handle
  roleSyncs: RoleSyncFailureRow[]; // joined with role + user
}>
```

If any of the sub-queries referenced (`listChannelMappings`, etc.) don't exist yet, add them following the patterns in `queries/discord.ts`. The spec's § Data Model section describes all tables.

- [ ] **Step 2: Unit tests for each new query**

Spot-check: returns null when no server, returns counts correctly with seeded data. Use existing factory patterns from `packages/supabase/src/queries/__tests__/`.

- [ ] **Step 3: Verify + commit**

```bash
pnpm --filter @trainers/supabase test 2>&1 | tail -15
pnpm --filter @trainers/supabase typecheck
git add packages/supabase/src/queries/discord.ts packages/supabase/src/index.ts \
        packages/supabase/src/queries/__tests__/discord.test.ts
git commit -m "feat(discord): add integration overview + failure listing queries"
```

---

## Task 12: Discord REST cache wrappers

**Why:** The Server Component fetches guild channels/roles behind `unstable_cache`.

**Files:**
- Create: `apps/web/src/lib/discord/guild-cache.ts`
- Create: `apps/web/src/lib/discord/__tests__/guild-cache.test.ts`
- Modify: `apps/web/src/lib/discord/api.ts` — ensure `getGuildChannels(guildId)` and `getGuildRoles(guildId)` are exported (they may already be for other uses; confirm)

- [ ] **Step 1: Add raw REST fetchers (if missing)**

In `apps/web/src/lib/discord/api.ts`:
```ts
export async function getGuildChannels(guildId: string): Promise<GuildChannel[]>
export async function getGuildRoles(guildId: string): Promise<GuildRole[]>
```
Use the existing `rest` client + `Routes` from `discord-api-types/v10`. Filter for text channels only in `getGuildChannels`.

- [ ] **Step 2: Add cache wrappers**

```ts
// apps/web/src/lib/discord/guild-cache.ts
import { unstable_cache } from "next/cache";
import { getGuildChannels, getGuildRoles } from "./api";
import { CacheTags } from "@/lib/cache";

const CACHE_TTL_SECONDS = 300; // 5 minutes

/**
 * Returns cached text channels for a guild. Cache is keyed by guild snowflake
 * but tagged by the trainers.gg discord_servers.id for explicit invalidation
 * via the Refresh button.
 */
export function getCachedGuildChannels(guildId: string, serverId: number) {
  return unstable_cache(
    async () => getGuildChannels(guildId),
    ["discord-guild-channels", guildId],
    { revalidate: CACHE_TTL_SECONDS, tags: [CacheTags.discordGuild(serverId)] }
  )();
}

export function getCachedGuildRoles(guildId: string, serverId: number) {
  return unstable_cache(
    async () => getGuildRoles(guildId),
    ["discord-guild-roles", guildId],
    { revalidate: CACHE_TTL_SECONDS, tags: [CacheTags.discordGuild(serverId)] }
  )();
}
```

- [ ] **Step 3: Tests**

Mock `getGuildChannels`/`getGuildRoles`; verify the wrappers pass the right cache key and tag.

- [ ] **Step 4: Verify + commit**

```bash
git add apps/web/src/lib/discord/guild-cache.ts \
        apps/web/src/lib/discord/__tests__/guild-cache.test.ts \
        apps/web/src/lib/discord/api.ts
git commit -m "feat(discord): cache guild channels and roles with 5min TTL"
```

---

## Task 13: Scaffold the integrations page — Server Component + loading

**Why:** Establishes the route, auth gate, and parallel data fetch that everything else hangs off of.

**Files:**
- Create: `apps/web/src/app/(dashboard)/dashboard/community/[communitySlug]/settings/integrations/discord/page.tsx`
- Create: `apps/web/src/app/(dashboard)/dashboard/community/[communitySlug]/settings/integrations/discord/loading.tsx`
- Create: `apps/web/src/app/(dashboard)/dashboard/community/[communitySlug]/settings/integrations/discord/discord-client.tsx` (empty stub for now; filled in later tasks)

- [ ] **Step 1: Page Server Component**

```tsx
// page.tsx
import { notFound } from "next/navigation";
import { rejectBots } from "@/lib/bot-rejection";
import { createClient } from "@/lib/supabase/server";
import {
  getCommunityBySlug,
  getDiscordIntegrationOverview,
} from "@trainers/supabase";
import {
  getCachedGuildChannels,
  getCachedGuildRoles,
} from "@/lib/discord/guild-cache";
import { DiscordClient } from "./discord-client";

interface PageProps {
  params: Promise<{ communitySlug: string }>;
}

export default async function DiscordIntegrationPage({ params }: PageProps) {
  await rejectBots();
  const { communitySlug } = await params;
  const supabase = await createClient();

  const community = await getCommunityBySlug(supabase, communitySlug);
  if (!community) notFound();

  const { data: canManage } = await supabase.rpc("has_community_permission", {
    community_id: community.id,
    permission: "community.manage",
  });
  if (!canManage) notFound();

  const overview = await getDiscordIntegrationOverview(supabase, community.id);

  let guildChannels = null;
  let guildRoles = null;
  if (overview?.server) {
    [guildChannels, guildRoles] = await Promise.all([
      getCachedGuildChannels(overview.server.guild_id, overview.server.id),
      getCachedGuildRoles(overview.server.guild_id, overview.server.id),
    ]);
  }

  return (
    <DiscordClient
      community={community}
      overview={overview}
      guildChannels={guildChannels}
      guildRoles={guildRoles}
    />
  );
}
```

- [ ] **Step 2: Loading skeleton**

```tsx
// loading.tsx
import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return (
    <div className="p-8 space-y-4">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-[400px] w-full" />
    </div>
  );
}
```

- [ ] **Step 3: Stub client**

```tsx
// discord-client.tsx — placeholder
"use client";
export function DiscordClient(props: unknown) {
  return <div>Discord integration page — implemented in subsequent tasks.</div>;
}
```

- [ ] **Step 4: Verify route reachable**

Start the dev server, navigate to `/dashboard/community/vgc-league/settings/integrations/discord` as the admin test user. Page loads (even if content is placeholder), 404 as non-admin.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/\(dashboard\)/dashboard/community/\[communitySlug\]/settings/integrations/discord/
git commit -m "feat(discord): scaffold integrations page route with auth gate"
```

---

## Task 14: Client Component shell + tab state via query param

**Why:** Tab navigation must be URL-backed per the design decisions.

**Files:**
- Modify: `apps/web/src/app/(dashboard)/dashboard/community/[communitySlug]/settings/integrations/discord/discord-client.tsx`

- [ ] **Step 1: Implement tab shell**

```tsx
"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// ... other imports

type Tab = "notifications" | "roles" | "failures";

export function DiscordClient({ community, overview, guildChannels, guildRoles }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = (searchParams.get("tab") as Tab | null) ?? "notifications";

  function onTabChange(tab: Tab) {
    const params = new URLSearchParams(searchParams);
    params.set("tab", tab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  if (!overview) {
    return <InstallCard community={community} />;
  }

  return (
    <div className="p-6 space-y-4 max-w-5xl mx-auto">
      <PageHeader title="Discord" description="..." />
      <StatusHeader server={overview.server} />
      {overview.recentFailureCount > 0 && (
        <FailureBanner count={overview.recentFailureCount} onView={() => onTabChange("failures")} />
      )}
      <Tabs value={currentTab} onValueChange={(v) => onTabChange(v as Tab)}>
        <TabsList>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="failures" className="gap-2">
            Failures
            {overview.recentFailureCount > 0 && (
              <span className="bg-destructive text-destructive-foreground rounded-full px-2 py-0.5 text-[10px]">
                {overview.recentFailureCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="notifications"><NotificationsTab ... /></TabsContent>
        <TabsContent value="roles"><RolesTab ... /></TabsContent>
        <TabsContent value="failures"><FailuresTab ... /></TabsContent>
      </Tabs>
    </div>
  );
}
```

Stub each tab sub-component as `<div>{tab name} — TODO</div>` for now.

- [ ] **Step 2: Verify + commit**

Navigate with `?tab=roles` in URL; Roles tab active. Click tabs; URL updates. Refresh preserves tab.

```bash
git commit -am "feat(discord): integrations page tab shell with URL query state"
```

---

## Task 15: Install card (State A)

**Why:** Renders when the bot isn't installed — hero CTA + feature grid + commands strip.

**Files:**
- Create: `apps/web/src/app/(dashboard)/dashboard/community/[communitySlug]/settings/integrations/discord/_components/install-card.tsx`

- [ ] **Step 1: Write component following the approved mockup `layout-not-installed.html`**

Key elements:
- Centered card with 🤖 icon, title, description, primary button
- Install button calls the existing install-state-token helper + redirects to Discord OAuth URL (look at `apps/web/src/lib/discord/install-state.ts` for the signing helper)
- 3-card feature grid below (Channel announcements / Player DMs / Role sync)
- Strip of 13 slash command code chips

- [ ] **Step 2: Wire install button**

```tsx
async function handleInstall() {
  const state = await signInstallStateAction(communityId, userId); // existing server action
  const url = new URL("https://discord.com/oauth2/authorize");
  url.searchParams.set("client_id", process.env.NEXT_PUBLIC_DISCORD_APPLICATION_ID!);
  url.searchParams.set("scope", "bot applications.commands");
  url.searchParams.set("permissions", "274878024704"); // from spec § Discord Permissions & Intents
  url.searchParams.set("state", state);
  url.searchParams.set("redirect_uri", `${origin}/api/discord/install-callback`);
  window.location.href = url.toString();
}
```

Check `install-state.ts` for the actual API — may be synchronous, may return the full URL already.

- [ ] **Step 3: Verify + commit**

Visit the page as admin of a community without a discord_servers row; install card renders; button navigates to Discord.

---

## Task 16: Status header + failure banner + disconnect dialog

**Why:** Persistent chrome above the tabs when the bot is installed.

**Files:**
- Create: `_components/status-header.tsx`
- Create: `_components/failure-banner.tsx`
- Create: `_components/confirm-disconnect-dialog.tsx`

- [ ] **Step 1: `status-header.tsx`**

Per mockup `layout-installed.html`:
- "✅ Installed in **{guild_name}**" (fetch guild name from the guild object — may need one more REST lookup; cache similarly)
- "Added {installedAt} by @{installedByUsername}"
- [Reinstall] button → same as install (Task 15)
- [Disconnect] button → opens `<ConfirmDisconnectDialog>`

- [ ] **Step 2: `confirm-disconnect-dialog.tsx`**

shadcn `<AlertDialog>`:
- Title: "Remove Beanie Bot from {guild_name}?"
- Description: "All channel mappings, DM settings, and role assignments will be deleted. This cannot be undone."
- Cancel + Confirm (red) buttons
- Confirm calls `disconnectDiscordServerAction(serverId)` → toast on success → `router.refresh()` (page re-renders into State A)

- [ ] **Step 3: `failure-banner.tsx`**

Yellow banner, conditional. Props: `count`, `onView`. Click "View ›" → calls `onView` which is `onTabChange("failures")` from the parent.

- [ ] **Step 4: Verify + commit**

Seed a failure row manually, confirm banner appears, clicking View switches tab. Disconnect flow removes the bot row, page reverts to State A.

---

## Task 17: Notifications tab — Channel Mapping table

**Why:** First editable table on the page.

**Files:**
- Create: `_components/channel-mapping-table.tsx`

- [ ] **Step 1: Implement table**

Rows for each existing mapping:
- Event label + description (look up from a channel event type registry — add `apps/web/src/lib/discord/channel-event-labels.ts` mirroring the spec's event list)
- `<Select>` of text channels from `guildChannels` prop; `onValueChange` → `upsertChannelMappingAction(...)` with optimistic update + toast
- `<PickerRefreshButton serverId={...} />` next to the select (Task 21)
- ✕ icon → `deleteChannelMappingAction(mapping.id)` with confirm

Inline form row at the bottom:
- Event type dropdown (only event types not already mapped), channel dropdown, `[Add]` button → `upsertChannelMappingAction`

- [ ] **Step 2: Inline failure indicator**

If `failures.byChannelAndEventType.get(`${channelId}:${eventType}`)` has recent failure, show 🔴 `<Tooltip>` with last failure reason next to the picker.

- [ ] **Step 3: Empty state**

When no mappings exist: single centered row — "👋 Add your first channel mapping below to start getting tournament announcements in Discord."

- [ ] **Step 4: Component test**

Render table with 2 mappings; simulate select change → action called with correct args; simulate ✕ → delete action called. Mock the server actions.

- [ ] **Step 5: Verify + commit**

---

## Task 18: Notifications tab — DM Settings table

**Why:** Second table on the Notifications tab.

**Files:**
- Create: `_components/dm-settings-table.tsx`

- [ ] **Step 1: Implement table**

For each DM event type from the enum (11 values), render one row even if no `discord_dm_settings` row exists (default mode: `channel_only`):
- Event label + description (add `apps/web/src/lib/discord/dm-event-labels.ts`)
- `<Select>` for mode (3 options); `onValueChange` → `upsertDmSettingAction(...)`
- Fallback channel `<Select>` — visible when mode is `channel_only` or `dm_with_fallback`, hidden when `dm_only`
- Optimistic UI + toast

- [ ] **Step 2: Test + commit**

---

## Task 19: Roles tab

**Why:** Role assignments + hierarchy warning.

**Files:**
- Create: `_components/role-mapping-table.tsx`

- [ ] **Step 1: Hierarchy warning banner**

Conditional red banner at the top — visible when any role mapping has had a `hierarchy_violation` failure in the last 24h. (For v1, just pass a `hasHierarchyViolation: boolean` prop from the Server Component after scanning `listRecentFailures`.)

- [ ] **Step 2: Role mapping table**

For each `discord_role_type` enum value (`staff`, `member`, `participant`, `winner`, `currently_playing`):
- Row with toggle, label + description, role picker (from `guildRoles` prop), sync status
- Toggle → `toggleRoleMappingAction(mappingId, enabled)` with optimistic update
- Role picker change → `upsertRoleMappingAction(communityId, roleType, discordRoleId)`
- Sync status: "✓ Synced" (no recent failure), "⚠ Hierarchy" (recent 50013 failure), "—" (disabled)

Winner row gets 🏆 + "honorific, never auto-removed" in description.

Footer note: "Reconciliation runs every 15 min. Force a sync anytime with Refresh."

- [ ] **Step 3: Test + commit**

---

## Task 20: Failures tab

**Why:** Triage view — the third tab.

**Files:**
- Create: `_components/failures-table.tsx`

- [ ] **Step 1: Filter pill bar**

Three pills — `All`, `Channels`, `DMs`. Client-side `useState<"all"|"channels"|"dms">`. Selected pill styled teal; counts shown inline.

- [ ] **Step 2: Action bar**

[Retry all] → iterate pending visible items, call the matching retry action for each (with simple sequential loop, not Promise.all — avoid hammering the backend).
[Refresh] → `router.refresh()` to re-fetch failures.

- [ ] **Step 3: Table**

Columns: Type badge (CHANNEL/DM), Event, Target (channel code or @handle), Reason (HTTP status + short), When (relative time), Actions (Retry / Remove mapping, or "No action" for DM 50007 delivered-via-fallback).

Props: `channelFailures`, `dmFailures` (from `listRecentFailures`).

Row-level DM fallback-success pill: when `dmRow.delivered_via_fallback`, show "✓ Delivered via fallback #channel" under the event label in teal text.

- [ ] **Step 4: Footer guidance note**

"Resolve persistent channel failures by re-mapping or reinstalling the bot. DM failures usually mean the player has DMs from server members turned off."

- [ ] **Step 5: Test + commit**

---

## Task 21: Picker Refresh button

**Why:** The 🔄 icon next to each picker that calls `refreshDiscordGuildCacheAction`.

**Files:**
- Create: `_components/picker-refresh-button.tsx`

- [ ] **Step 1: Implement**

```tsx
interface Props {
  serverId: number;
}
export function PickerRefreshButton({ serverId }: Props) {
  const [pending, setPending] = useState(false);
  const router = useRouter();
  async function onClick() {
    setPending(true);
    const result = await refreshDiscordGuildCacheAction(serverId);
    setPending(false);
    if (result.success) {
      toast.success("Discord channel/role list refreshed");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }
  return (
    <Button variant="ghost" size="icon" onClick={onClick} disabled={pending} aria-label="Refresh">
      <RefreshCw className={cn("h-4 w-4", pending && "animate-spin")} />
    </Button>
  );
}
```

- [ ] **Step 2: Wire into the three tables**

Import + render next to channel/role pickers. (Already referenced in Tasks 17, 18, 19.)

- [ ] **Step 3: Verify + commit**

---

## Task 22: User DM preferences section on `/dashboard/settings/notifications`

**Why:** Player-facing opt-in for each DM event type.

**Files:**
- Create: `apps/web/src/components/settings/discord-dm-preferences-section.tsx`
- Modify: `apps/web/src/app/(dashboard)/dashboard/settings/notifications/page.tsx` — add `<DiscordDmPreferencesSection />` below existing content with `id="discord-dms"`

- [ ] **Step 1: Component**

Per mockup `user-dm-prefs.html`:
- Header row with Discord icon, "Discord direct messages" label, "Connected as @{handle}" subtitle (reads from `auth.identities` for current user)
- Master Enable `<Switch>` — when off, all event checkboxes are disabled (greyed)
- Conditional red banner when `user.discord_dm_warn_until > now()` — text matching spec + "Learn how ›" link to a docs page (TODO: determine target URL; use `/help/discord-dms` placeholder if no page exists — note in commit)
- Three grouped sections (Match / Team sheet / Tournament) with checkboxes per event

Each checkbox bound to a row in `discord_user_dm_preferences`. Commits via `setDmPreferenceAction` on change. Master toggle writes a single pseudo-preference (`event_type = 'master'`?) — OR just tracks in user-side state and on flip, enables/disables all rows. Prefer the latter to avoid schema additions.

- [ ] **Step 2: Data loading**

The enclosing page is already a Client Component; fetch preferences via a Server Action loader or TanStack Query.

- [ ] **Step 3: Test + commit**

---

## Task 23: Linked Identities Discord row DM summary

**Why:** Deep link from the user's identity list into their DM preferences.

**Files:**
- Modify: `apps/web/src/components/settings/linked-identities-section.tsx` (or whichever file renders the Discord row on `/dashboard/settings/account`)

- [ ] **Step 1: Extend the Discord row**

Per mockup `user-linked-identities-profile.html`:
- Below "Connected as @{handle}", add a line: "DM notifications: **N of 11 enabled** · [Manage →]" where N comes from `listDmPreferences(supabase, userId)`.
- The [Manage →] link points to `/dashboard/settings/notifications#discord-dms`.

- [ ] **Step 2: Test + commit**

---

## Task 24: Profile settings — "Show Discord handle on profile" toggle

**Why:** Gates the public profile opt-in.

**Files:**
- Modify: `apps/web/src/app/(dashboard)/dashboard/settings/profile/page.tsx`

- [ ] **Step 1: Add Privacy section + toggle**

Per mockup `user-linked-identities-profile.html` (second block):
- If a "Privacy" card exists, append a row; otherwise create a new `<DashboardCard>` with heading "Privacy".
- Single row: label "Show Discord handle on profile", description per spec, `<Switch>` bound to `users.show_discord_publicly`.
- Commits via `setShowDiscordPubliclyAction(enabled)` on flip.

- [ ] **Step 2: Test + commit**

---

## Task 25: Public profile — Discord handle display

**Why:** The actual public rendering of the opted-in handle.

**Files:**
- Modify: `apps/web/src/app/(app)/u/[handle]/page.tsx`

- [ ] **Step 1: Query user + discord identity**

Extend the existing profile data fetch to also return:
- `users.show_discord_publicly` for this user
- Their Discord handle from `auth.identities` (if linked) — needs a helper like `getPublicDiscordHandle(supabase, userId)` in `packages/supabase/src/queries/discord.ts` that returns the Discord username or null

- [ ] **Step 2: Render in identity strip**

Conditionally render the Discord icon + handle next to the country chip:
```tsx
{showDiscordPublicly && discordHandle && (
  <>
    <span className="text-border">·</span>
    <span className="flex items-center gap-1 text-sm text-muted-foreground">
      <DiscordIcon className="size-3 text-[#5865F2]" />
      @{discordHandle}
    </span>
  </>
)}
```

- [ ] **Step 3: Test + commit**

Test with a seeded user (opt-in true, Discord linked) → handle visible; opt-in false → handle hidden; Discord not linked → handle hidden.

---

## Task 26: Tournament creation info banner

**Why:** Gentle nudge to admins about Discord announcements.

**Files:**
- Modify: `apps/web/src/app/(dashboard)/dashboard/community/[communitySlug]/tournaments/new/page.tsx`

- [ ] **Step 1: Conditional banner**

Above the form, after resolving the community:
```tsx
const discordServer = await getDiscordServerByCommunityId(supabase, community.id);
```

Pass `discordInstalled={!!discordServer}` to the client form. In the client form, render a dismissible banner:
```tsx
{discordInstalled && !dismissed && (
  <Alert variant="default" className="mb-4 bg-primary/5 border-primary/20">
    <span className="text-xl">🤖</span>
    <AlertDescription>
      Discord notifications are configured for this community — announcements will auto-post to mapped channels.
    </AlertDescription>
    <Button variant="ghost" size="icon" onClick={() => setDismissed(true)} aria-label="Dismiss">
      <X className="h-4 w-4" />
    </Button>
  </Alert>
)}
```

Dismissal is client-state only (no persistence).

- [ ] **Step 2: Test + commit**

---

## Task 27: "Bot installed — configure" chip in community general settings

**Why:** Quick nav from the Discord URL field into the integration page.

**Files:**
- Modify: `apps/web/src/app/(dashboard)/dashboard/community/[communitySlug]/settings/page.tsx`

- [ ] **Step 1: Conditional chip next to the Discord URL input**

Find the social links section where Discord URL lives. Next to that input, when `getDiscordServerByCommunityId(supabase, community.id)` returns a row, render:
```tsx
<Link
  href={`/dashboard/community/${communitySlug}/settings/integrations/discord`}
  className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs font-medium text-primary no-underline"
>
  🤖 Bot installed — configure ›
</Link>
```

Only appears for the Discord row (not other social platforms), only when the bot is installed.

- [ ] **Step 2: Test + commit**

---

## Task 28: Sidebar entry for Integrations under Community Settings

**Why:** Discoverability — admins need to reach the integrations page.

**Files:**
- Modify: `apps/web/src/app/(dashboard)/dashboard/community/[communitySlug]/layout.tsx` (or wherever the community-scoped sidebar is defined)

- [ ] **Step 1: Add nav entry**

Under the Settings section of the community nav, add a child entry:
```
Settings
├── General
├── Members
└── Integrations      ← new, links to /settings/integrations/discord (only integration for now)
```

The link goes to the Discord page directly since there's only one integration. When more integrations ship, this becomes a parent that lists them.

- [ ] **Step 2: Visual verification**

Dev server, admin test user, navigate to community; Integrations entry appears, is highlighted when on the page.

- [ ] **Step 3: Commit**

---

## Task 29: E2E test — admin golden path

**Why:** Integration-level confidence that the page works end-to-end.

**Files:**
- Create: `apps/web/e2e/discord-integration.spec.ts`

- [ ] **Step 1: Test the golden path**

Log in as admin → navigate to integrations page → seed a `discord_servers` row for the test community (bypassing OAuth) → see installed state → add a channel mapping → toggle a role → seed a failure row → verify count badge → verify Retry button resets the row.

Use existing `apps/web/e2e/` patterns for auth + setup.

- [ ] **Step 2: Verify + commit**

```bash
pnpm test:e2e -- discord-integration 2>&1 | tail -30
git add apps/web/e2e/discord-integration.spec.ts
git commit -m "test(discord): e2e admin integration golden path"
```

---

## Task 30: E2E test — user-side golden path

**Why:** Cover the player-facing surfaces.

**Files:**
- Create: `apps/web/e2e/discord-user-settings.spec.ts`

- [ ] **Step 1: Test**

Log in as a player → navigate to `/dashboard/settings/notifications` → toggle master Discord DM switch → check a per-event checkbox → navigate to `/dashboard/settings/profile` → toggle "Show Discord handle" → visit `/u/{handle}` → verify handle is visible → toggle it off → verify hidden.

- [ ] **Step 2: Verify + commit**

---

## Task 31: Final pass — typecheck, lint, full test suite, pre-push readiness

**Why:** Project rule: never push with known failures.

- [ ] **Step 1: Run all four pre-push checks**

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
```

Everything green. If the known-flaky `install-state.test.ts` "tampered token" fails in the full suite run, confirm it passes in isolation (`pnpm --filter @trainers/web test -- install-state`) and proceed.

- [ ] **Step 2: Summary commit**

If any small fixups were needed:
```bash
git commit -am "fix(discord): address pre-push check findings"
```

The branch is now ready to push.

---

## Verification

After all tasks land:

1. **Local dev**: `pnpm dev` → visit `/dashboard/community/vgc-league/settings/integrations/discord` as the admin test user.
   - Initial state shows install card (State A) since no `discord_servers` row exists.
   - After seeding one, refresh → status header + failure banner (conditional) + tabs visible.
   - Click each tab, confirm URL updates.
   - Add a channel mapping → toggle persists across refresh.
   - Flip a role toggle → optimistic UI + reconcile row appears in `discord_role_sync_queue` on next cron run.

2. **User surfaces**: log in as `player@trainers.local`:
   - `/dashboard/settings/notifications` → Discord DMs section renders.
   - Toggle master + one event checkbox → row appears in `discord_user_dm_preferences`.
   - `/dashboard/settings/profile` → Privacy section has the toggle; flip it, visit `/u/ash_ketchum`, handle shows.
   - `/dashboard/settings/account` → Linked Identities Discord row shows "N of 11 enabled".

3. **Tournament creation**: as admin in a community with Discord installed, visit the new-tournament page; info banner visible, dismissible.

4. **Community general settings**: Discord URL field → "🤖 Bot installed — configure ›" chip visible when bot is present.

5. **All four checks green**: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e`.

6. **E2E**: both golden-path specs green.

## Self-review

**Spec coverage:**
- [x] 5a routing / file layout — Tasks 13, 28
- [x] 5b State A install — Task 15
- [x] 5b State B status header + failure banner + disconnect — Task 16
- [x] 5b Notifications tab (channel + DM tables) — Tasks 17, 18
- [x] 5b Roles tab (mappings + hierarchy banner) — Task 19
- [x] 5b Failures tab — Task 20
- [x] 5b Discord REST caching + Refresh — Tasks 12, 21
- [x] 5c User DM preferences section — Task 22
- [x] 5c Linked Identities DM summary — Task 23
- [x] 5d Profile Discord toggle — Task 24
- [x] 5d Public profile Discord handle display — Task 25
- [x] 5e Tournament creation banner — Task 26
- [x] 5e Community settings "Bot installed" chip — Task 27
- [x] Schema migration — Task 1
- [x] Notify cron additive (set/clear warn flag) — Task 2
- [x] Server actions — Tasks 3–10
- [x] Supporting queries — Task 11
- [x] E2E — Tasks 29, 30
- [x] Pre-push readiness — Task 31

**Known placeholders in the plan:**
- Task 22 references `/help/discord-dms` as a placeholder "Learn how ›" URL. Resolve during implementation — either create the help page or link to Discord's own privacy docs page directly.
- Task 22 mentions "master pseudo-preference" as an implementation choice; plan recommends client-side state instead. Engineer picks.
- Task 5 and 11 add helper queries (`getRoleMappingById`, `getDiscordServerById`, `getDiscordIntegrationOverview`, `listRecentFailures`, `getPublicDiscordHandle`) — confirm they don't already exist before adding.
