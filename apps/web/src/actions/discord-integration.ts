/**
 * Discord Integration Server Actions
 *
 * Server actions for managing a community's Discord bot integration:
 * channel event mappings, DM delivery settings, role mappings, user DM
 * preferences, public handle visibility, guild cache refresh, server
 * disconnect, and notification retry.
 *
 * All community-scoped actions require the `community.manage` permission.
 * All actions go through bot detection before any DB interaction.
 */

"use server";

import { revalidatePath } from "next/cache";
import { updateTag } from "next/cache";
import { z } from "@trainers/validators";

import {
  getDiscordServerByCommunityId,
  getDiscordServerById,
  getRoleMappingById,
  upsertChannelMapping,
  deleteChannelMapping,
  upsertDmSetting,
  upsertRoleMapping,
  toggleRoleMapping,
  setDmPreference,
  deleteDiscordServer,
  resetNotificationForRetry,
  resetDmForRetry,
} from "@trainers/supabase";
import { type ActionResult } from "@trainers/validators";
import { getErrorMessage } from "@trainers/utils";

import { CacheTags } from "@/lib/cache";
import { invalidateCommunityPageCaches } from "@/lib/cache-invalidation";
import { createClient } from "@/lib/supabase/server";
import { rejectBots } from "./utils";

// =============================================================================
// Types
// =============================================================================

/** Discord DM event types (matches discord_dm_event_type enum) */
const DISCORD_DM_EVENT_TYPES = [
  "match_ready",
  "match_starting_soon",
  "match_result_to_confirm",
  "match_disputed",
  "team_sheet_needed",
  "team_sheet_approved",
  "team_sheet_rejected",
  "you_dropped",
  "top_cut_made",
  "tournament_starting",
  "tournament_cancelled",
] as const;

/** Discord channel notification event types (matches discord_channels.event_type usage) */
const CHANNEL_EVENT_TYPES = [
  "tournament_created",
  "registration_opens",
  "tournament_ended",
  "match_result_reported",
] as const;

/** Discord role types (matches discord_role_type enum) */
const DISCORD_ROLE_TYPES = [
  "member",
  "participant",
  "winner",
  "staff",
  "currently_playing",
] as const;

// =============================================================================
// Schemas
// =============================================================================

const upsertChannelMappingSchema = z.object({
  communityId: z.number().int().positive(),
  eventType: z.enum(CHANNEL_EVENT_TYPES),
  channelId: z.string().min(1, "Channel ID is required"),
});

const upsertDmSettingSchema = z
  .object({
    communityId: z.number().int().positive(),
    eventType: z.enum(DISCORD_DM_EVENT_TYPES),
    deliveryMode: z.enum(["dm_only", "channel_only", "dm_with_fallback"]),
    fallbackChannelId: z.string().optional().nullable(),
  })
  .refine(
    (v) =>
      v.deliveryMode === "dm_only"
        ? !v.fallbackChannelId
        : !!v.fallbackChannelId,
    {
      message:
        "fallback_channel_id is required for channel_only and dm_with_fallback modes, and must be omitted for dm_only",
    }
  );

const upsertRoleMappingSchema = z.object({
  communityId: z.number().int().positive(),
  roleType: z.enum(DISCORD_ROLE_TYPES),
  discordRoleId: z.string().min(1, "Discord role ID is required"),
});

const setDmPreferenceSchema = z.object({
  eventType: z.enum(DISCORD_DM_EVENT_TYPES),
  enabled: z.boolean(),
});

// =============================================================================
// Helpers
// =============================================================================

/** The supabase client type used in this file, resolved from the async factory */
type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Assert the current user has `community.manage` permission for the given
 * community. Throws a FORBIDDEN-coded error when permission is denied.
 */
async function requireCommunityManage(
  supabase: SupabaseClient,
  communityId: number
): Promise<void> {
  const { data, error } = await supabase.rpc("has_community_permission", {
    p_community_id: communityId,
    permission_key: "community.manage",
  });
  if (error) throw new Error(`Permission check failed: ${error.message}`);
  if (!data) {
    const err = new Error(
      "You do not have permission to manage this community's Discord integration."
    );
    (err as Error & { code?: string }).code = "FORBIDDEN";
    throw err;
  }
}

/**
 * Build a FORBIDDEN ActionResult from a caught error.
 * Returns undefined when the error is not a FORBIDDEN sentinel.
 */
function asForbidden(error: unknown): ActionResult<never> | undefined {
  if (
    error instanceof Error &&
    (error as Error & { code?: string }).code === "FORBIDDEN"
  ) {
    return {
      success: false,
      error: error.message,
      code: "FORBIDDEN",
    };
  }
  return undefined;
}

/** The revalidatePath target for the Discord integration settings page. */
const DISCORD_SETTINGS_PATH =
  "/dashboard/community/[communitySlug]/settings/integrations/discord";

// =============================================================================
// Channel Mapping Actions
// =============================================================================

/**
 * Upsert a channel-to-event-type mapping for the community's Discord server.
 *
 * Requires `community.manage` permission. The community must already have a
 * Discord server linked. Conflicts on (discord_server_id, channel_id, event_type)
 * are idempotent (Supabase upsert).
 *
 * @returns `{ id }` of the created/updated channel mapping row
 */
export async function upsertChannelMappingAction(
  input: z.infer<typeof upsertChannelMappingSchema>
): Promise<ActionResult<{ id: number }>> {
  try {
    await rejectBots();
    const parsed = upsertChannelMappingSchema.parse(input);
    const supabase = await createClient();
    await requireCommunityManage(supabase, parsed.communityId);

    const server = await getDiscordServerByCommunityId(
      supabase,
      parsed.communityId
    );
    if (!server) {
      return {
        success: false,
        error: "Discord server not installed for this community",
      };
    }

    await upsertChannelMapping(supabase, {
      discord_server_id: server.id,
      event_type: parsed.eventType,
      channel_id: parsed.channelId,
    });

    revalidatePath(DISCORD_SETTINGS_PATH, "page");
    // upsertChannelMapping returns void; callers only need success confirmation
    return { success: true, data: { id: server.id } };
  } catch (error) {
    const forbidden = asForbidden(error);
    if (forbidden) return forbidden;
    return {
      success: false,
      error: getErrorMessage(error, "Failed to save channel mapping"),
    };
  }
}

/**
 * Delete a channel-to-event-type mapping by ID.
 *
 * Resolves the mapping's community via the `discord_channels` → `discord_servers`
 * join and requires `community.manage` permission on that community.
 *
 * @param mappingId - discord_channels.id to delete
 */
export async function deleteChannelMappingAction(
  mappingId: number
): Promise<ActionResult<void>> {
  try {
    await rejectBots();
    const supabase = await createClient();

    // Resolve community from mapping → server join
    const { data: channelRow, error: channelError } = await supabase
      .from("discord_channels")
      .select("id, discord_server_id, discord_servers!inner(community_id)")
      .eq("id", mappingId)
      .maybeSingle();

    if (channelError)
      throw new Error(`Failed to resolve mapping: ${channelError.message}`);
    if (!channelRow) {
      return { success: false, error: "Channel mapping not found" };
    }

    const server = channelRow.discord_servers;
    const communityId = Array.isArray(server)
      ? (server[0] as { community_id: number } | undefined)?.community_id
      : (server as { community_id: number } | null)?.community_id;

    if (!communityId) {
      return {
        success: false,
        error: "Could not resolve community for mapping",
      };
    }

    await requireCommunityManage(supabase, communityId);
    await deleteChannelMapping(supabase, mappingId);

    revalidatePath(DISCORD_SETTINGS_PATH, "page");
    return { success: true, data: undefined };
  } catch (error) {
    const forbidden = asForbidden(error);
    if (forbidden) return forbidden;
    return {
      success: false,
      error: getErrorMessage(error, "Failed to delete channel mapping"),
    };
  }
}

// =============================================================================
// DM Setting Actions
// =============================================================================

/**
 * Upsert the DM delivery setting for a specific event type on a community's
 * Discord server.
 *
 * Enforces the mode/fallback contract via Zod:
 * - `dm_only` → no fallbackChannelId
 * - `channel_only` / `dm_with_fallback` → fallbackChannelId required
 *
 * Requires `community.manage` permission.
 *
 * @returns void on success
 */
export async function upsertDmSettingAction(
  input: z.infer<typeof upsertDmSettingSchema>
): Promise<ActionResult<void>> {
  try {
    await rejectBots();
    const parsed = upsertDmSettingSchema.parse(input);
    const supabase = await createClient();
    await requireCommunityManage(supabase, parsed.communityId);

    const server = await getDiscordServerByCommunityId(
      supabase,
      parsed.communityId
    );
    if (!server) {
      return {
        success: false,
        error: "Discord server not installed for this community",
      };
    }

    await upsertDmSetting(supabase, {
      discord_server_id: server.id,
      event_type: parsed.eventType,
      delivery_mode: parsed.deliveryMode,
      fallback_channel_id: parsed.fallbackChannelId ?? null,
    });

    revalidatePath(DISCORD_SETTINGS_PATH, "page");
    return { success: true, data: undefined };
  } catch (error) {
    const forbidden = asForbidden(error);
    if (forbidden) return forbidden;
    return {
      success: false,
      error: getErrorMessage(error, "Failed to save DM setting"),
    };
  }
}

// =============================================================================
// Role Mapping Actions
// =============================================================================

/**
 * Toggle the `enabled` flag on an existing role mapping.
 *
 * Resolves the community via `getRoleMappingById` (joins through discord_servers)
 * and requires `community.manage` permission.
 *
 * @param mappingId - discord_role_mappings.id to toggle
 * @param enabled   - New enabled state
 */
export async function toggleRoleMappingAction(
  mappingId: number,
  enabled: boolean
): Promise<ActionResult<void>> {
  try {
    await rejectBots();
    const supabase = await createClient();

    const mapping = await getRoleMappingById(supabase, mappingId);
    if (!mapping) {
      return { success: false, error: "Role mapping not found" };
    }

    await requireCommunityManage(supabase, mapping.community_id);
    await toggleRoleMapping(supabase, mappingId, enabled);

    revalidatePath(DISCORD_SETTINGS_PATH, "page");
    return { success: true, data: undefined };
  } catch (error) {
    const forbidden = asForbidden(error);
    if (forbidden) return forbidden;
    return {
      success: false,
      error: getErrorMessage(error, "Failed to toggle role mapping"),
    };
  }
}

/**
 * Upsert a role mapping for the community's Discord server.
 *
 * Conflicts on (discord_server_id, role_type) update the discord_role_id and
 * reset enabled to true. Requires `community.manage` permission.
 *
 * @returns void on success
 */
export async function upsertRoleMappingAction(
  input: z.infer<typeof upsertRoleMappingSchema>
): Promise<ActionResult<void>> {
  try {
    await rejectBots();
    const parsed = upsertRoleMappingSchema.parse(input);
    const supabase = await createClient();
    await requireCommunityManage(supabase, parsed.communityId);

    const server = await getDiscordServerByCommunityId(
      supabase,
      parsed.communityId
    );
    if (!server) {
      return {
        success: false,
        error: "Discord server not installed for this community",
      };
    }

    await upsertRoleMapping(supabase, {
      discord_server_id: server.id,
      role_type: parsed.roleType,
      discord_role_id: parsed.discordRoleId,
      enabled: true,
    });

    revalidatePath(DISCORD_SETTINGS_PATH, "page");
    return { success: true, data: undefined };
  } catch (error) {
    const forbidden = asForbidden(error);
    if (forbidden) return forbidden;
    return {
      success: false,
      error: getErrorMessage(error, "Failed to save role mapping"),
    };
  }
}

// =============================================================================
// User DM Preference Actions
// =============================================================================

/**
 * Set the current user's DM preference for a specific Discord event type.
 *
 * No community permission required — this is a per-user preference.
 * Creates the preference row if it doesn't exist (opt-in model).
 *
 * @returns void on success
 */
export async function setDmPreferenceAction(
  input: z.infer<typeof setDmPreferenceSchema>
): Promise<ActionResult<void>> {
  try {
    await rejectBots();
    const parsed = setDmPreferenceSchema.parse(input);
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    await setDmPreference(supabase, user.id, parsed.eventType, parsed.enabled);
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to save DM preference"),
    };
  }
}

// =============================================================================
// User Profile Actions
// =============================================================================

/**
 * Set whether the current user's Discord handle is shown publicly on their
 * trainers.gg profile page.
 *
 * Invalidates the player profile cache so the public profile reflects the
 * change immediately.
 *
 * @param enabled - Whether to display the Discord handle publicly
 */
export async function setShowDiscordPubliclyAction(
  enabled: boolean
): Promise<ActionResult<void>> {
  try {
    await rejectBots();
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const { data: userRow, error } = await supabase
      .from("users")
      .update({ show_discord_publicly: enabled })
      .eq("id", user.id)
      .select("username")
      .single();

    if (error) throw new Error(error.message);

    if (userRow?.username) {
      updateTag(CacheTags.player(userRow.username));
    }

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to update setting"),
    };
  }
}

// =============================================================================
// Server Lifecycle Actions
// =============================================================================

/**
 * Invalidate the Discord guild cache for a server, forcing the next page load
 * to re-fetch channels and roles from Discord's REST API.
 *
 * Requires `community.manage` permission on the server's community.
 *
 * @param serverId - discord_servers.id whose guild cache should be busted
 */
export async function refreshDiscordGuildCacheAction(
  serverId: number
): Promise<ActionResult<void>> {
  try {
    await rejectBots();
    const supabase = await createClient();

    const server = await getDiscordServerById(supabase, serverId);
    if (!server) {
      return { success: false, error: "Discord server not found" };
    }

    await requireCommunityManage(supabase, server.community_id);
    updateTag(CacheTags.discordGuild(serverId));

    return { success: true, data: undefined };
  } catch (error) {
    const forbidden = asForbidden(error);
    if (forbidden) return forbidden;
    return {
      success: false,
      error: getErrorMessage(error, "Failed to refresh Discord guild cache"),
    };
  }
}

/**
 * Disconnect and delete the Discord server integration for the given server.
 *
 * Cascades to all related channel mappings, DM settings, role mappings, and
 * queue items via the DB ON DELETE CASCADE constraint. Invalidates community
 * page caches and the guild cache.
 *
 * Requires `community.manage` permission.
 *
 * @param serverId - discord_servers.id to disconnect
 */
export async function disconnectDiscordServerAction(
  serverId: number
): Promise<ActionResult<void>> {
  try {
    await rejectBots();
    const supabase = await createClient();

    const server = await getDiscordServerById(supabase, serverId);
    if (!server) {
      return { success: false, error: "Discord server not found" };
    }

    await requireCommunityManage(supabase, server.community_id);

    // Resolve community slug for cache invalidation before deleting
    const { data: community, error: communityError } = await supabase
      .from("communities")
      .select("slug")
      .eq("id", server.community_id)
      .maybeSingle();

    if (communityError)
      throw new Error(`Failed to resolve community: ${communityError.message}`);

    await deleteDiscordServer(supabase, serverId);

    invalidateCommunityPageCaches(community?.slug, server.community_id);
    updateTag(CacheTags.discordGuild(serverId));

    return { success: true, data: undefined };
  } catch (error) {
    const forbidden = asForbidden(error);
    if (forbidden) return forbidden;
    return {
      success: false,
      error: getErrorMessage(error, "Failed to disconnect Discord server"),
    };
  }
}

// =============================================================================
// Retry Actions
// =============================================================================

/**
 * Reset a failed channel notification queue item back to pending so the cron
 * worker will re-attempt delivery.
 *
 * Resolves the owning community via the notification → channel → server join
 * and requires `community.manage` permission.
 *
 * @param notificationId - discord_notification_queue.id to retry
 */
export async function retryNotificationAction(
  notificationId: number
): Promise<ActionResult<void>> {
  try {
    await rejectBots();
    const supabase = await createClient();

    // Fetch the notification row (channel_id is a Discord text snowflake, not a FK)
    const { data: notifRow, error: notifError } = await supabase
      .from("discord_notification_queue")
      .select("id, channel_id")
      .eq("id", notificationId)
      .maybeSingle();

    if (notifError)
      throw new Error(`Failed to resolve notification: ${notifError.message}`);
    if (!notifRow) {
      return { success: false, error: "Notification not found" };
    }

    // Resolve community via discord_channels (channel_id text → discord_server_id → community_id)
    const { data: channelRow, error: channelError } = await supabase
      .from("discord_channels")
      .select("discord_server_id, discord_servers!inner(community_id)")
      .eq("channel_id", notifRow.channel_id)
      .limit(1)
      .maybeSingle();

    if (channelError)
      throw new Error(`Failed to resolve channel: ${channelError.message}`);

    const serverData = channelRow?.discord_servers;
    const communityId = Array.isArray(serverData)
      ? (serverData[0] as { community_id: number } | undefined)?.community_id
      : (serverData as { community_id: number } | null)?.community_id;

    if (!communityId) {
      return {
        success: false,
        error: "Could not resolve community for notification",
      };
    }

    await requireCommunityManage(supabase, communityId);
    await resetNotificationForRetry(supabase, notificationId);

    revalidatePath(DISCORD_SETTINGS_PATH, "page");
    return { success: true, data: undefined };
  } catch (error) {
    const forbidden = asForbidden(error);
    if (forbidden) return forbidden;
    return {
      success: false,
      error: getErrorMessage(error, "Failed to retry notification"),
    };
  }
}

/**
 * Reset a failed DM queue item back to pending so the cron worker will
 * re-attempt delivery.
 *
 * Uses `discord_dm_queue.community_id` directly (denormalized column) and
 * requires `community.manage` permission on that community.
 *
 * @param dmId - discord_dm_queue.id to retry
 */
export async function retryDmNotificationAction(
  dmId: number
): Promise<ActionResult<void>> {
  try {
    await rejectBots();
    const supabase = await createClient();

    const { data: dmRow, error: dmError } = await supabase
      .from("discord_dm_queue")
      .select("id, community_id")
      .eq("id", dmId)
      .maybeSingle();

    if (dmError)
      throw new Error(`Failed to resolve DM queue item: ${dmError.message}`);
    if (!dmRow) {
      return { success: false, error: "DM notification not found" };
    }

    await requireCommunityManage(supabase, dmRow.community_id);
    await resetDmForRetry(supabase, dmId);

    revalidatePath(DISCORD_SETTINGS_PATH, "page");
    return { success: true, data: undefined };
  } catch (error) {
    const forbidden = asForbidden(error);
    if (forbidden) return forbidden;
    return {
      success: false,
      error: getErrorMessage(error, "Failed to retry DM notification"),
    };
  }
}
