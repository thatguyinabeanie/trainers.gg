/**
 * Discord enqueue helpers for trainers.gg application flows.
 *
 * All helpers are fire-and-forget: they log errors but never rethrow.
 * A notification enqueue failure must never abort the primary action.
 *
 * Usage pattern:
 *   After a primary mutation succeeds, call the relevant helper.
 *   The helper silently no-ops when the community has no Discord server installed.
 */

import { start } from "workflow/api";

import {
  getDiscordServerByCommunityId,
  getChannelMappingsForEvent,
  getEnabledRoleMappings,
  getDmSetting,
  type DiscordDmEventType,
  type DiscordRoleType,
  type TypedClient,
} from "@trainers/supabase";

import { sendChannelNotificationWorkflow } from "@/workflows/send-channel-notification";
import { sendDmWorkflow } from "@/workflows/send-dm";
import { syncRoleWorkflow } from "@/workflows/sync-role";

// =============================================================================
// Channel notification helper
// =============================================================================

/**
 * Enqueue a channel notification for a community's configured Discord server.
 *
 * Silently no-ops if:
 * - The community has no Discord server installed
 * - No channel is configured for this event type
 *
 * Logs but never rethrows on errors — caller's primary action is not affected.
 *
 * @param supabase      - Supabase client (server or service-role)
 * @param communityId   - trainers.gg community ID
 * @param eventType     - The Discord channel event type string
 * @param sourceId      - Stable unique ID for idempotency (e.g. "tournament_created:42")
 * @param payload       - Event-specific payload stored in the queue row
 */
export async function enqueueCommunityChannelNotification(
  supabase: TypedClient,
  communityId: number,
  eventType: string,
  sourceId: string,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    const server = await getDiscordServerByCommunityId(supabase, communityId);
    if (!server) return; // Community has no Discord bot installed — no-op

    const channelMappings = await getChannelMappingsForEvent(
      supabase,
      server.id,
      eventType
    );
    if (channelMappings.length === 0) return; // No channel configured for this event

    // Start one workflow per configured channel (fire-and-forget)
    await Promise.all(
      channelMappings.map((mapping) =>
        start(sendChannelNotificationWorkflow, [
          mapping.channel_id,
          eventType,
          payload,
          server.id,
        ])
      )
    );
  } catch (error) {
    console.error(
      "[discord/enqueue-helpers] enqueueCommunityChannelNotification failed",
      {
        communityId,
        eventType,
        sourceId,
        error: String(error),
      }
    );
  }
}

// =============================================================================
// DM helper
// =============================================================================

/**
 * Enqueue DMs for a list of trainers.gg user IDs for a given event type.
 *
 * Silently skips users who have not linked a Discord account.
 * Reads delivery mode from discord_dm_settings (defaults to dm_with_fallback).
 * Logs but never rethrows on errors.
 *
 * @param supabase      - Service-role Supabase client (needs auth.identities access)
 * @param communityId   - trainers.gg community ID
 * @param userIds       - Array of trainers.gg user UUIDs to DM
 * @param eventType     - The Discord DM event type enum value
 * @param sourceId      - Stable ID for idempotency per (event_type, source_id, discord_user_id)
 * @param payload       - Event-specific payload
 */
export async function enqueueCommunityDms(
  supabase: TypedClient,
  communityId: number,
  userIds: string[],
  eventType: DiscordDmEventType,
  sourceId: string,
  payload: Record<string, unknown>
): Promise<void> {
  if (userIds.length === 0) return;

  try {
    const server = await getDiscordServerByCommunityId(supabase, communityId);
    if (!server) return; // No Discord server — no-op

    // Resolve user IDs to Discord snowflake IDs (only linked accounts returned)
    const discordIdMap = await resolveUserIdsToDiscordIds(supabase, userIds);
    if (discordIdMap.size === 0) return;

    // Look up DM delivery setting for this event type (default: dm_with_fallback)
    const dmSetting = await getDmSetting(supabase, server.id, eventType);
    // The CHECK constraint guarantees one of these three values; the row
    // column returns as plain string so we narrow it explicitly.
    const deliveryMode = (dmSetting?.delivery_mode ?? "dm_with_fallback") as
      | "dm_only"
      | "channel_only"
      | "dm_with_fallback";
    const fallbackChannelId = dmSetting?.fallback_channel_id ?? null;

    await Promise.all(
      Array.from(discordIdMap.entries()).map(([userId, discordUserId]) =>
        start(sendDmWorkflow, [
          discordUserId,
          userId,
          eventType,
          payload,
          deliveryMode,
          fallbackChannelId,
          communityId,
          server.id,
        ])
      )
    );
  } catch (error) {
    console.error("[discord/enqueue-helpers] enqueueCommunityDms failed", {
      communityId,
      eventType,
      sourceId,
      userCount: userIds.length,
      error: String(error),
    });
  }
}

// =============================================================================
// Role sync helper
// =============================================================================

/**
 * Enqueue a role add/remove for a list of trainers.gg user IDs.
 *
 * Silently skips users who have not linked a Discord account.
 * Silently no-ops if no enabled role mapping exists for this role_type.
 * Logs but never rethrows on errors.
 *
 * @param supabase      - Service-role Supabase client (needs auth.identities)
 * @param communityId   - trainers.gg community ID
 * @param userIds       - Array of trainers.gg user UUIDs
 * @param roleType      - Role type to add/remove ("staff" | "member" | "winner" | ...)
 * @param action        - "add" or "remove"
 * @param sourceEvent   - Descriptive source event string for audit trail
 */
export async function enqueueCommunityRoleSync(
  supabase: TypedClient,
  communityId: number,
  userIds: string[],
  roleType: DiscordRoleType,
  action: "add" | "remove",
  sourceEvent: string
): Promise<void> {
  if (userIds.length === 0) return;

  try {
    const server = await getDiscordServerByCommunityId(supabase, communityId);
    if (!server) return; // No Discord server — no-op

    // Find enabled role mapping for this role type
    const roleMappings = await getEnabledRoleMappings(supabase, server.id);
    const mapping = roleMappings.find((m) => m.role_type === roleType);
    if (!mapping) return; // No role configured — no-op

    // Resolve user IDs to Discord snowflake IDs
    const discordIdMap = await resolveUserIdsToDiscordIds(supabase, userIds);
    if (discordIdMap.size === 0) return;

    await Promise.all(
      Array.from(discordIdMap.values()).map((discordUserId) =>
        start(syncRoleWorkflow, [
          server.guild_id,
          discordUserId,
          mapping.discord_role_id,
          action,
          server.id,
          sourceEvent,
        ])
      )
    );
  } catch (error) {
    console.error("[discord/enqueue-helpers] enqueueCommunityRoleSync failed", {
      communityId,
      roleType,
      action,
      sourceEvent,
      userCount: userIds.length,
      error: String(error),
    });
  }
}

// =============================================================================
// Internal: user ID → Discord ID resolution
// =============================================================================

/**
 * Resolve an array of trainers.gg user UUIDs to a Map<userId, discordSnowflake>.
 * Users without a linked Discord account are omitted from the result.
 *
 * Requires a service-role client — auth.identities is not visible to regular users.
 */
async function resolveUserIdsToDiscordIds(
  supabase: TypedClient,
  userIds: string[]
): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();

  // getDiscordIdsByUserIds only returns the discord snowflake IDs, not the user_id mapping.
  // We need to query auth.identities ourselves to get the (user_id → discord_id) pairs.
  const result = await (
    supabase as TypedClient & {
      from: (table: "auth.identities") => ReturnType<TypedClient["from"]>;
    }
  )
    .from("auth.identities" as never)
    .select("user_id, identity_id")
    .eq("provider", "discord")
    .in("user_id", userIds);

  if (result.error) throw result.error;

  const map = new Map<string, string>();
  for (const row of result.data as Array<{
    user_id: string;
    identity_id: string;
  }>) {
    map.set(row.user_id, row.identity_id);
  }
  return map;
}
