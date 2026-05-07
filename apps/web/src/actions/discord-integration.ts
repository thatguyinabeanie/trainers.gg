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

import { revalidatePath, updateTag } from "next/cache";
import { start } from "workflow/api";

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
  getDeliveryFailure,
  listRecentFailures,
  type ChannelFailureRow,
  type DmFailureRow,
  ALL_DM_EVENT_TYPES,
  type DiscordDmEventType,
  ALL_CHANNEL_EVENT_TYPES,
  type RoleSyncFailureRow,
  type Json,
} from "@trainers/supabase";
import { type ActionResult } from "@trainers/validators";
import { z } from "@trainers/validators";
import { getErrorMessage } from "@trainers/utils";

import { CacheTags } from "@/lib/cache";
import { invalidateCommunityPageCaches } from "@/lib/cache-invalidation";
import { signInstallState } from "@/lib/discord/install-state";
import { createClient } from "@/lib/supabase/server";
import { sendChannelNotificationWorkflow } from "@/workflows/send-channel-notification";
import { sendDmWorkflow } from "@/workflows/send-dm";
import { syncRoleWorkflow } from "@/workflows/sync-role";
import { rejectBots } from "./utils";

// =============================================================================
// Types
// =============================================================================

/** Discord role types (matches discord_role_type enum) */
const DISCORD_ROLE_TYPES = [
  "member",
  "participant",
  "winner",
  "staff",
  "currently_playing",
  "verified",
] as const;

// =============================================================================
// Schemas
// =============================================================================

const upsertChannelMappingSchema = z.object({
  communityId: z.number().int().positive(),
  eventType: z.enum(ALL_CHANNEL_EVENT_TYPES),
  channelId: z.string().min(1, "Channel ID is required"),
});

const upsertDmSettingSchema = z
  .object({
    communityId: z.number().int().positive(),
    eventType: z.enum(ALL_DM_EVENT_TYPES),
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

const deleteDmSettingSchema = z.object({
  communityId: z.number().int().positive(),
  eventType: z.enum(ALL_DM_EVENT_TYPES),
});

const upsertRoleMappingSchema = z.object({
  communityId: z.number().int().positive(),
  roleType: z.enum(DISCORD_ROLE_TYPES),
  discordRoleId: z.string().min(1, "Discord role ID is required"),
});

const setDmPreferenceSchema = z.object({
  eventType: z.enum(ALL_DM_EVENT_TYPES),
  enabled: z.boolean(),
});

const sendTestNotificationSchema = z.object({
  serverId: z.number().int().positive(),
  channelId: z.string().min(1),
  eventType: z.enum(ALL_CHANNEL_EVENT_TYPES),
});

const updateServerSettingsSchema = z.object({
  serverId: z.number().int().positive(),
  communityId: z.number().int().positive(),
  settings: z.object({
    embed_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    setup_completed: z.boolean().optional(),
    registration_reminder_minutes: z.number().int().positive().nullable().optional(),
    link_prompt_frequency: z.string().optional(),
  }).strict(),
});

const updateChannelPingRoleSchema = z.object({
  mappingId: z.number().int().positive(),
  pingRoleId: z.string().min(1).nullable(),
  communityId: z.number().int().positive(),
});

const updateVerifiedRoleSchema = z
  .object({
    serverId: z.number().int().positive(),
    communityId: z.number().int().positive(),
    enabled: z.boolean(),
    roleId: z.string().min(1).nullable(),
  })
  .refine((data) => !data.enabled || data.roleId !== null, {
    message: "roleId is required when enabling the verified role",
    path: ["roleId"],
  });

// Payload schemas for discord_delivery_failures — each failure type carries a
// different shape. Validated at retry time to catch malformed DB rows early.
const channelFailurePayloadSchema = z.record(z.string(), z.unknown());

const dmFailurePayloadSchema = z.record(z.string(), z.unknown());

const roleSyncFailurePayloadSchema = z.object({
  role_id: z.string().min(1, "role_id is required for role_sync retry"),
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

/**
 * Require community.manage permission and a linked Discord server.
 * Returns the Discord server row or an ActionResult error.
 */
async function requireDiscordServer(
  supabase: SupabaseClient,
  communityId: number
): Promise<
  | { server: Awaited<ReturnType<typeof getDiscordServerByCommunityId>> & {} }
  | { error: ActionResult<never> }
> {
  await requireCommunityManage(supabase, communityId);
  const server = await getDiscordServerByCommunityId(supabase, communityId);
  if (!server) {
    return {
      error: {
        success: false,
        error: "Discord server not installed for this community",
      },
    };
  }
  return { server };
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
 * @returns `{ mappingId }` of the upserted channel mapping row
 */
export async function upsertChannelMappingAction(
  input: z.infer<typeof upsertChannelMappingSchema>
): Promise<ActionResult<{ mappingId: number }>> {
  try {
    await rejectBots();
    const parsed = upsertChannelMappingSchema.parse(input);
    const supabase = await createClient();
    const result = await requireDiscordServer(supabase, parsed.communityId);
    if ("error" in result) return result.error;
    const { server } = result;

    const { id: mappingId } = await upsertChannelMapping(supabase, {
      discord_server_id: server.id,
      event_type: parsed.eventType,
      channel_id: parsed.channelId,
    });

    revalidatePath(DISCORD_SETTINGS_PATH, "page");
    return { success: true, data: { mappingId } };
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
    const result = await requireDiscordServer(supabase, parsed.communityId);
    if ("error" in result) return result.error;
    const { server } = result;

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

/**
 * Delete the DM delivery setting for a specific event type on a community's
 * Discord server (e.g. when the user toggles the feature off).
 *
 * Requires `community.manage` permission.
 */
export async function deleteDmSettingAction(input: {
  communityId: number;
  eventType: DiscordDmEventType;
}): Promise<ActionResult<void>> {
  try {
    await rejectBots();
    const parsed = deleteDmSettingSchema.parse(input);
    const supabase = await createClient();
    const result = await requireDiscordServer(supabase, parsed.communityId);
    if ("error" in result) return result.error;
    const { server } = result;

    const { error } = await supabase
      .from("discord_dm_settings")
      .delete()
      .eq("discord_server_id", server.id)
      .eq("event_type", parsed.eventType);

    if (error) throw error;

    revalidatePath(DISCORD_SETTINGS_PATH, "page");
    return { success: true, data: undefined };
  } catch (error) {
    const forbidden = asForbidden(error);
    if (forbidden) return forbidden;
    return {
      success: false,
      error: getErrorMessage(error, "Failed to delete DM setting"),
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
 * @returns The new mapping id on success
 */
export async function upsertRoleMappingAction(
  input: z.infer<typeof upsertRoleMappingSchema>
): Promise<ActionResult<{ mappingId: number }>> {
  try {
    await rejectBots();
    const parsed = upsertRoleMappingSchema.parse(input);
    const supabase = await createClient();
    const result = await requireDiscordServer(supabase, parsed.communityId);
    if ("error" in result) return result.error;
    const { server } = result;

    const { id } = await upsertRoleMapping(supabase, {
      discord_server_id: server.id,
      role_type: parsed.roleType,
      discord_role_id: parsed.discordRoleId,
      enabled: true,
    });

    revalidatePath(DISCORD_SETTINGS_PATH, "page");
    return { success: true, data: { mappingId: id } };
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
    revalidatePath(DISCORD_SETTINGS_PATH, "page");
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

/**
 * Generate a signed Discord OAuth2 install URL for the given community.
 *
 * Signs an install state token (HMAC-SHA256, 10-min TTL) and embeds it as the
 * `state` parameter in the Discord authorization URL. The callback route at
 * `/api/discord/install-callback` verifies this token before creating the
 * `discord_servers` row.
 *
 * Requires an authenticated session — the user's ID is embedded in the state
 * token so the callback can verify who initiated the install.
 *
 * @param communityId - The community to link the bot to after install
 * @returns `{ url }` — the Discord authorization URL to redirect the user to
 */
export async function getDiscordInstallUrlAction(
  communityId: number
): Promise<ActionResult<{ url: string }>> {
  try {
    await rejectBots();
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const applicationId = process.env.DISCORD_APPLICATION_ID;
    if (!applicationId) {
      return {
        success: false,
        error: "Discord application is not configured",
      };
    }

    const state = await signInstallState({
      community_id: communityId,
      user_id: user.id,
    });

    const url = new URL("https://discord.com/api/oauth2/authorize");
    url.searchParams.set("client_id", applicationId);
    url.searchParams.set("scope", "bot applications.commands");
    url.searchParams.set("permissions", "274878024704");
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    url.searchParams.set(
      "redirect_uri",
      `${siteUrl}/api/discord/install-callback`
    );
    url.searchParams.set("state", state);

    return { success: true, data: { url: url.toString() } };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to generate Discord install URL"),
    };
  }
}

// =============================================================================
// Retry Actions
// =============================================================================

/**
 * Retry a failed delivery by looking up the `discord_delivery_failures` row
 * and dispatching the appropriate workflow.
 *
 * Handles all failure types:
 * - "channel" → sendChannelNotificationWorkflow
 * - "dm"      → sendDmWorkflow
 * - "role_sync" → syncRoleWorkflow
 *
 * Resolves the owning community via the failure → server join and requires
 * `community.manage` permission.
 *
 * @param failureId - discord_delivery_failures.id to retry
 */
export async function retryNotificationAction(
  failureId: number
): Promise<ActionResult<void>> {
  try {
    await rejectBots();
    const supabase = await createClient();

    const failure = await getDeliveryFailure(supabase, failureId);
    if (!failure) {
      return { success: false, error: "Failure record not found" };
    }

    const server = await getDiscordServerById(
      supabase,
      failure.discord_server_id
    );
    if (!server) {
      return { success: false, error: "Discord server not found" };
    }

    await requireCommunityManage(supabase, server.community_id);

    switch (failure.type) {
      case "channel": {
        const parsed = channelFailurePayloadSchema.safeParse(failure.payload);
        if (!parsed.success) {
          return { success: false, error: "Invalid notification payload" };
        }
        await start(sendChannelNotificationWorkflow, [
          failure.target,
          failure.event_type,
          parsed.data,
          server.id,
        ]);
        break;
      }
      case "dm": {
        const parsed = dmFailurePayloadSchema.safeParse(failure.payload);
        if (!parsed.success) {
          return { success: false, error: "Invalid notification payload" };
        }
        await start(sendDmWorkflow, [
          failure.target,
          "",
          failure.event_type as DiscordDmEventType,
          parsed.data,
          "dm_with_fallback",
          null,
          server.community_id,
          server.id,
        ]);
        break;
      }
      case "role_sync": {
        const parsed = roleSyncFailurePayloadSchema.safeParse(failure.payload);
        if (!parsed.success) {
          return { success: false, error: "Invalid notification payload" };
        }
        if (!parsed.data.role_id) {
          return {
            success: false,
            error: "Missing role_id in role_sync payload",
          };
        }
        await start(syncRoleWorkflow, [
          server.guild_id,
          failure.target,
          parsed.data.role_id,
          "add",
          server.id,
          failure.event_type,
        ]);
        break;
      }
      default:
        return {
          success: false,
          error: `Unknown failure type: ${String(failure.type)}`,
        };
    }

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
 * Fetch the last 24 hours of delivery failures for a Discord server.
 *
 * Returns channel notification failures, DM failures, and role-sync failures.
 * Requires `community.manage` permission on the server's community.
 *
 * Called on-demand from the Failures tab (not loaded with the page) to keep
 * the initial page load fast.
 *
 * @param serverId - discord_servers.id
 */
export async function listRecentFailuresAction(serverId: number): Promise<
  ActionResult<{
    channelFailures: ChannelFailureRow[];
    dmFailures: DmFailureRow[];
    roleSyncFailures: RoleSyncFailureRow[];
  }>
> {
  try {
    await rejectBots();
    const supabase = await createClient();

    const server = await getDiscordServerById(supabase, serverId);
    if (!server) {
      return { success: false, error: "Discord server not found" };
    }

    await requireCommunityManage(supabase, server.community_id);

    const { channels, dms, roleSyncs } = await listRecentFailures(
      supabase,
      serverId
    );

    return {
      success: true,
      data: {
        channelFailures: channels,
        dmFailures: dms,
        roleSyncFailures: roleSyncs,
      },
    };
  } catch (error) {
    const forbidden = asForbidden(error);
    if (forbidden) return forbidden;
    return {
      success: false,
      error: getErrorMessage(error, "Failed to load failure details"),
    };
  }
}

// =============================================================================
// Test Notification
// =============================================================================

/**
 * Send a test notification to a specific Discord channel to verify the bot
 * can post there. Creates a friendly test embed.
 */
export async function sendTestNotificationAction(
  input: z.infer<typeof sendTestNotificationSchema>
): Promise<ActionResult<void>> {
  try {
    await rejectBots();
    const supabase = await createClient();
    const parsed = sendTestNotificationSchema.parse(input);

    const server = await getDiscordServerById(supabase, parsed.serverId);
    if (!server) {
      return { success: false, error: "Discord server not found" };
    }
    await requireCommunityManage(supabase, server.community_id);

    await start(sendChannelNotificationWorkflow, [
      parsed.channelId,
      parsed.eventType,
      {
        __test: true,
        title: "Test Notification",
        description: `This is a test notification for the **${parsed.eventType}** event type. If you can see this, the bot is working correctly!`,
      },
      server.id,
    ]);

    return { success: true, data: undefined };
  } catch (error) {
    const forbidden = asForbidden(error);
    if (forbidden) return forbidden;
    return {
      success: false,
      error: getErrorMessage(error, "Failed to send test notification"),
    };
  }
}

// =============================================================================
// Server Settings
// =============================================================================

/**
 * Update the discord_servers.settings JSONB for a community's Discord server.
 * Merges the provided settings into the existing object (does not replace).
 */
export async function updateServerSettingsAction(
  input: z.infer<typeof updateServerSettingsSchema>
): Promise<ActionResult<void>> {
  try {
    await rejectBots();
    const parsed = updateServerSettingsSchema.parse(input);
    const supabase = await createClient();
    await requireCommunityManage(supabase, parsed.communityId);

    const server = await getDiscordServerById(supabase, parsed.serverId);
    if (!server) {
      return { success: false, error: "Discord server not found" };
    }
    if (server.community_id !== parsed.communityId) {
      return {
        success: false,
        error: "Server does not belong to this community",
      };
    }

    const existing = server.settings;
    const base =
      existing && typeof existing === "object" && !Array.isArray(existing)
        ? (existing as Record<string, unknown>)
        : {};
    const mergedSettings = { ...base, ...parsed.settings } as Record<
      string,
      unknown
    >;

    const { error } = await supabase
      .from("discord_servers")
      .update({ settings: mergedSettings as unknown as Json })
      .eq("id", parsed.serverId);

    if (error) throw new Error(`Failed to update settings: ${error.message}`);

    revalidatePath(DISCORD_SETTINGS_PATH, "page");
    return { success: true, data: undefined };
  } catch (error) {
    const forbidden = asForbidden(error);
    if (forbidden) return forbidden;
    return {
      success: false,
      error: getErrorMessage(error, "Failed to update server settings"),
    };
  }
}

// =============================================================================
// Channel Ping Role
// =============================================================================

/**
 * Update the ping_role_id for a specific channel mapping.
 */
export async function updateChannelPingRoleAction(
  input: z.infer<typeof updateChannelPingRoleSchema>
): Promise<ActionResult<void>> {
  try {
    await rejectBots();
    const parsed = updateChannelPingRoleSchema.parse(input);
    const supabase = await createClient();
    await requireCommunityManage(supabase, parsed.communityId);

    // Verify mapping belongs to this community's server
    const { data: mapping, error: selectError } = await supabase
      .from("discord_channels")
      .select("id, discord_server_id, discord_servers!inner(community_id)")
      .eq("id", parsed.mappingId)
      .maybeSingle();

    if (selectError)
      throw new Error(`Failed to look up channel mapping: ${selectError.message}`);
    if (!mapping) {
      return { success: false, error: "Channel mapping not found" };
    }
    const serverJoin = mapping.discord_servers;
    const mappingCommunityId = Array.isArray(serverJoin)
      ? (serverJoin[0] as { community_id: number } | undefined)?.community_id
      : (serverJoin as { community_id: number } | null)?.community_id;

    if (!mappingCommunityId || mappingCommunityId !== parsed.communityId) {
      return {
        success: false,
        error: "Mapping does not belong to this community",
      };
    }

    const { error } = await supabase
      .from("discord_channels")
      .update({ ping_role_id: parsed.pingRoleId })
      .eq("id", parsed.mappingId);

    if (error) throw new Error(`Failed to update ping role: ${error.message}`);

    revalidatePath(DISCORD_SETTINGS_PATH, "page");
    return { success: true, data: undefined };
  } catch (error) {
    const forbidden = asForbidden(error);
    if (forbidden) return forbidden;
    return {
      success: false,
      error: getErrorMessage(error, "Failed to update ping role"),
    };
  }
}

// =============================================================================
// Verified Role
// =============================================================================

/**
 * Configure the verified role auto-assignment feature.
 * Stored in discord_role_mappings with role_type='verified'.
 */
export async function updateVerifiedRoleAction(input: {
  serverId: number;
  communityId: number;
  enabled: boolean;
  roleId: string | null;
}): Promise<ActionResult<void>> {
  try {
    await rejectBots();
    const parsed = updateVerifiedRoleSchema.parse(input);
    const supabase = await createClient();
    await requireCommunityManage(supabase, parsed.communityId);

    const server = await getDiscordServerById(supabase, parsed.serverId);
    if (!server) {
      return { success: false, error: "Discord server not found" };
    }
    if (server.community_id !== parsed.communityId) {
      return { success: false, error: "Server does not belong to this community" };
    }

    if (parsed.enabled && parsed.roleId) {
      // Upsert the verified role mapping with enabled:true in one operation
      await upsertRoleMapping(supabase, {
        discord_server_id: parsed.serverId,
        role_type: "verified",
        discord_role_id: parsed.roleId,
        enabled: true,
      });
    } else {
      // Disable the verified role mapping if it exists
      const { data: mapping, error: lookupError } = await supabase
        .from("discord_role_mappings")
        .select("id")
        .eq("discord_server_id", parsed.serverId)
        .eq("role_type", "verified")
        .maybeSingle();
      if (lookupError)
        throw new Error(`Failed to look up role mapping: ${lookupError.message}`);
      if (mapping) {
        await toggleRoleMapping(supabase, mapping.id, false);
      }
    }

    revalidatePath(DISCORD_SETTINGS_PATH, "page");
    return { success: true, data: undefined };
  } catch (error) {
    const forbidden = asForbidden(error);
    if (forbidden) return forbidden;
    return {
      success: false,
      error: getErrorMessage(error, "Failed to update verified role"),
    };
  }
}

// =============================================================================
// Delivery Stats & Activity Feed
// =============================================================================

export interface DeliveryStatsData {
  channelMessages: number;
  dmsDelivered: number;
  roleSyncs: number;
  failures: number;
  period: string;
}

/**
 * Fetch delivery statistics for the last 24 hours.
 */
export async function getDeliveryStatsAction(
  serverId: number
): Promise<ActionResult<DeliveryStatsData>> {
  try {
    await rejectBots();
    const supabase = await createClient();
    const server = await getDiscordServerById(supabase, serverId);
    if (!server) {
      return { success: false, error: "Discord server not found" };
    }
    await requireCommunityManage(supabase, server.community_id);

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [channelResult, dmResult, roleResult, failedResult] = await Promise.all([
      supabase.from("discord_delivery_log").select("*", { count: "exact", head: true })
        .eq("discord_server_id", serverId).eq("type", "channel").gte("created_at", since),
      supabase.from("discord_delivery_log").select("*", { count: "exact", head: true })
        .eq("discord_server_id", serverId).eq("type", "dm").gte("created_at", since),
      supabase.from("discord_delivery_log").select("*", { count: "exact", head: true })
        .eq("discord_server_id", serverId).eq("type", "role_sync").gte("created_at", since),
      supabase.from("discord_delivery_failures").select("*", { count: "exact", head: true })
        .eq("discord_server_id", serverId).gte("created_at", since),
    ]);

    if (channelResult.error || dmResult.error || roleResult.error || failedResult.error) {
      return { success: false, error: "Failed to load delivery stats" };
    }

    const channelMessages = channelResult.count ?? 0;
    const dmsDelivered = dmResult.count ?? 0;
    const roleSyncs = roleResult.count ?? 0;
    const failureCount = failedResult.count ?? 0;

    return {
      success: true,
      data: {
        channelMessages,
        dmsDelivered,
        roleSyncs,
        failures: failureCount,
        period: "Last 24 hours",
      },
    };
  } catch (error) {
    const forbidden = asForbidden(error);
    if (forbidden) return forbidden;
    return {
      success: false,
      error: getErrorMessage(error, "Failed to fetch delivery stats"),
    };
  }
}

export interface ActivityItem {
  id: number;
  type: string;
  eventType: string;
  target: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

/**
 * Fetch recent activity (delivery log) for a Discord server.
 */
export async function getActivityFeedAction(
  serverId: number
): Promise<ActionResult<ActivityItem[]>> {
  try {
    await rejectBots();
    const supabase = await createClient();
    const server = await getDiscordServerById(supabase, serverId);
    if (!server) {
      return { success: false, error: "Discord server not found" };
    }
    await requireCommunityManage(supabase, server.community_id);

    const { data: logs, error } = await supabase
      .from("discord_delivery_log")
      .select("id, type, event_type, target, metadata, created_at")
      .eq("discord_server_id", serverId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error)
      throw new Error(`Failed to fetch activity feed: ${error.message}`);

    return {
      success: true,
      data: (logs ?? []).map((log) => ({
        id: log.id,
        type: log.type,
        eventType: log.event_type,
        target: log.target,
        metadata: (log.metadata as Record<string, unknown>) ?? {},
        createdAt: log.created_at,
      })),
    };
  } catch (error) {
    const forbidden = asForbidden(error);
    if (forbidden) return forbidden;
    return {
      success: false,
      error: getErrorMessage(error, "Failed to fetch activity feed"),
    };
  }
}

// =============================================================================
// Linked Accounts Stats
// =============================================================================


