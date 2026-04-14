import type { TypedClient } from "../client";
import type { Enums, Tables } from "../types";

// =============================================================================
// Types
// =============================================================================

export type DiscordServer = Tables<"discord_servers">;
export type DiscordChannelMapping = Tables<"discord_channels">;
export type DiscordDmSetting = Tables<"discord_dm_settings">;
export type DiscordUserDmPreference = Tables<"discord_user_dm_preferences">;
export type DiscordRoleMapping = Tables<"discord_role_mappings">;
export type DiscordChannelFailure = Tables<"discord_channel_failures">;
export type DiscordNotificationQueueItem = Tables<"discord_notification_queue">;
export type DiscordDmQueueItem = Tables<"discord_dm_queue">;
export type DiscordRoleSyncQueueItem = Tables<"discord_role_sync_queue">;

export type DiscordDmEventType = Enums<"discord_dm_event_type">;
export type DiscordRoleType = Enums<"discord_role_type">;

// =============================================================================
// discord_servers
// =============================================================================

/**
 * Get a Discord server record by guild ID.
 * Returns null if not found (no installed bot for that guild).
 */
export async function getDiscordServerByGuildId(
  supabase: TypedClient,
  guildId: string
): Promise<DiscordServer | null> {
  const { data, error } = await supabase
    .from("discord_servers")
    .select("*")
    .eq("guild_id", guildId)
    .maybeSingle();

  if (error)
    throw new Error(
      `Failed to get Discord server by guild ID: ${error.message}`
    );
  return data;
}

/**
 * Get a Discord server record by community ID.
 * Returns null if the community has not linked a Discord server.
 */
export async function getDiscordServerByCommunityId(
  supabase: TypedClient,
  communityId: number
): Promise<DiscordServer | null> {
  const { data, error } = await supabase
    .from("discord_servers")
    .select("*")
    .eq("community_id", communityId)
    .maybeSingle();

  if (error)
    throw new Error(
      `Failed to get Discord server by community ID: ${error.message}`
    );
  return data;
}

/**
 * List all Discord server installations.
 * Intended for admin dashboards. Limits to 500 rows.
 */
export async function listDiscordServers(
  supabase: TypedClient
): Promise<DiscordServer[]> {
  const { data, error } = await supabase
    .from("discord_servers")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error)
    throw new Error(`Failed to list Discord servers: ${error.message}`);
  return data;
}

// =============================================================================
// discord_channels
// =============================================================================

/**
 * List all channel-to-event-type mappings for a Discord server.
 */
export async function listChannelMappings(
  supabase: TypedClient,
  discordServerId: number
): Promise<DiscordChannelMapping[]> {
  const { data, error } = await supabase
    .from("discord_channels")
    .select("*")
    .eq("discord_server_id", discordServerId)
    .order("created_at", { ascending: true });

  if (error)
    throw new Error(`Failed to list channel mappings: ${error.message}`);
  return data;
}

/**
 * Get all channel mappings for a specific event type within a server.
 * Multiple channels may be configured for the same event type.
 */
export async function getChannelMappingsForEvent(
  supabase: TypedClient,
  discordServerId: number,
  eventType: string
): Promise<DiscordChannelMapping[]> {
  const { data, error } = await supabase
    .from("discord_channels")
    .select("*")
    .eq("discord_server_id", discordServerId)
    .eq("event_type", eventType);

  if (error)
    throw new Error(
      `Failed to get channel mappings for event: ${error.message}`
    );
  return data;
}

// =============================================================================
// discord_dm_settings
// =============================================================================

/**
 * List all DM delivery settings for a Discord server.
 */
export async function listDmSettings(
  supabase: TypedClient,
  discordServerId: number
): Promise<DiscordDmSetting[]> {
  const { data, error } = await supabase
    .from("discord_dm_settings")
    .select("*")
    .eq("discord_server_id", discordServerId);

  if (error) throw new Error(`Failed to list DM settings: ${error.message}`);
  return data;
}

/**
 * Get the DM delivery setting for a specific event type within a server.
 * Returns null if no setting has been configured (caller should apply defaults).
 */
export async function getDmSetting(
  supabase: TypedClient,
  discordServerId: number,
  eventType: DiscordDmEventType
): Promise<DiscordDmSetting | null> {
  const { data, error } = await supabase
    .from("discord_dm_settings")
    .select("*")
    .eq("discord_server_id", discordServerId)
    .eq("event_type", eventType)
    .maybeSingle();

  if (error) throw new Error(`Failed to get DM setting: ${error.message}`);
  return data;
}

// =============================================================================
// discord_user_dm_preferences
// =============================================================================

/**
 * List all DM preferences for a user across all event types.
 */
export async function listDmPreferences(
  supabase: TypedClient,
  userId: string
): Promise<DiscordUserDmPreference[]> {
  const { data, error } = await supabase
    .from("discord_user_dm_preferences")
    .select("*")
    .eq("user_id", userId);

  if (error) throw new Error(`Failed to list DM preferences: ${error.message}`);
  return data;
}

/**
 * Get a user's DM preference for a specific event type.
 * Returns null if no preference row exists (default is false per opt-in model).
 */
export async function getDmPreference(
  supabase: TypedClient,
  userId: string,
  eventType: DiscordDmEventType
): Promise<DiscordUserDmPreference | null> {
  const { data, error } = await supabase
    .from("discord_user_dm_preferences")
    .select("*")
    .eq("user_id", userId)
    .eq("event_type", eventType)
    .maybeSingle();

  if (error) throw new Error(`Failed to get DM preference: ${error.message}`);
  return data;
}

/**
 * Check whether DMs are enabled for a user for a given event type.
 * Returns false when no preference row exists (opt-in model: disabled by default).
 */
export async function isDmEnabledForUser(
  supabase: TypedClient,
  userId: string,
  eventType: DiscordDmEventType
): Promise<boolean> {
  const preference = await getDmPreference(supabase, userId, eventType);
  return preference?.enabled ?? false;
}

// =============================================================================
// discord_role_mappings
// =============================================================================

/**
 * List all role mappings for a Discord server (enabled and disabled).
 */
export async function listRoleMappings(
  supabase: TypedClient,
  discordServerId: number
): Promise<DiscordRoleMapping[]> {
  const { data, error } = await supabase
    .from("discord_role_mappings")
    .select("*")
    .eq("discord_server_id", discordServerId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Failed to list role mappings: ${error.message}`);
  return data;
}

/**
 * Get the role mapping for a specific role type within a server.
 * Returns null if no mapping is configured for that role type.
 */
export async function getRoleMapping(
  supabase: TypedClient,
  discordServerId: number,
  roleType: DiscordRoleType
): Promise<DiscordRoleMapping | null> {
  const { data, error } = await supabase
    .from("discord_role_mappings")
    .select("*")
    .eq("discord_server_id", discordServerId)
    .eq("role_type", roleType)
    .maybeSingle();

  if (error) throw new Error(`Failed to get role mapping: ${error.message}`);
  return data;
}

/**
 * List only the enabled role mappings for a Discord server.
 * Used when determining which roles should be synced.
 */
export async function getEnabledRoleMappings(
  supabase: TypedClient,
  discordServerId: number
): Promise<DiscordRoleMapping[]> {
  const { data, error } = await supabase
    .from("discord_role_mappings")
    .select("*")
    .eq("discord_server_id", discordServerId)
    .eq("enabled", true)
    .order("created_at", { ascending: true });

  if (error)
    throw new Error(`Failed to get enabled role mappings: ${error.message}`);
  return data;
}

// =============================================================================
// discord_channel_failures
// =============================================================================

/**
 * List all channel failure records for a Discord server.
 * Community leaders use this to identify channels that need attention.
 */
export async function listChannelFailures(
  supabase: TypedClient,
  discordServerId: number
): Promise<DiscordChannelFailure[]> {
  const { data, error } = await supabase
    .from("discord_channel_failures")
    .select("*")
    .eq("discord_server_id", discordServerId)
    .order("last_failed_at", { ascending: false });

  if (error)
    throw new Error(`Failed to list channel failures: ${error.message}`);
  return data;
}

/**
 * Get the consecutive failure count for a specific channel within a server.
 * Returns 0 if no failure record exists for that channel.
 */
export async function getChannelFailureCount(
  supabase: TypedClient,
  discordServerId: number,
  channelId: string
): Promise<number> {
  const { data, error } = await supabase
    .from("discord_channel_failures")
    .select("consecutive_failures")
    .eq("discord_server_id", discordServerId)
    .eq("channel_id", channelId)
    .maybeSingle();

  if (error)
    throw new Error(`Failed to get channel failure count: ${error.message}`);
  return data?.consecutive_failures ?? 0;
}

// =============================================================================
// discord_notification_queue (service-role only — for cron)
// =============================================================================

/**
 * List pending notification queue items, ordered by oldest first.
 * Intended for use by the cron worker (service role client required).
 *
 * @param limit - Maximum number of items to return (default 100)
 */
export async function listPendingNotifications(
  supabase: TypedClient,
  limit = 100
): Promise<DiscordNotificationQueueItem[]> {
  const { data, error } = await supabase
    .from("discord_notification_queue")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error)
    throw new Error(`Failed to list pending notifications: ${error.message}`);
  return data;
}

// =============================================================================
// discord_dm_queue (service-role only — for cron)
// =============================================================================

/**
 * List pending DM queue items, ordered by oldest first.
 * Intended for use by the cron worker (service role client required).
 *
 * @param limit - Maximum number of items to return (default 100)
 */
export async function listPendingDmNotifications(
  supabase: TypedClient,
  limit = 100
): Promise<DiscordDmQueueItem[]> {
  const { data, error } = await supabase
    .from("discord_dm_queue")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error)
    throw new Error(
      `Failed to list pending DM notifications: ${error.message}`
    );
  return data;
}

// =============================================================================
// discord_role_sync_queue (service-role only — for cron)
// =============================================================================

/**
 * List pending role sync queue items, ordered by oldest first.
 * Intended for use by the cron worker (service role client required).
 *
 * @param limit - Maximum number of items to return (default 100)
 */
export async function listPendingRoleSyncs(
  supabase: TypedClient,
  limit = 100
): Promise<DiscordRoleSyncQueueItem[]> {
  const { data, error } = await supabase
    .from("discord_role_sync_queue")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error)
    throw new Error(`Failed to list pending role syncs: ${error.message}`);
  return data;
}

// =============================================================================
// Identity resolution
// =============================================================================

/**
 * Resolve a Discord user ID to a trainers.gg user ID via auth.identities.
 *
 * Requires a service-role client — auth.identities is not accessible to
 * authenticated users. Returns null if the Discord account is not linked
 * to any trainers.gg account.
 *
 * @param discordUserId - Discord snowflake ID (identity_id in auth.identities)
 */
export async function getUserByDiscordId(
  supabase: TypedClient,
  discordUserId: string
): Promise<{ user_id: string } | null> {
  const { data, error } = await (
    supabase as TypedClient & {
      from: (table: "auth.identities") => ReturnType<TypedClient["from"]>;
    }
  )
    .from("auth.identities" as never)
    .select("user_id")
    .eq("provider", "discord")
    .eq("identity_id", discordUserId)
    .maybeSingle();

  if (error)
    throw new Error(
      `Failed to resolve Discord user ID to trainers.gg account: ${error.message}`
    );

  if (!data) return null;
  return { user_id: (data as { user_id: string }).user_id };
}
