import type { TypedClient } from "../client";
import type { Enums, Tables } from "../types";
import { escapeLike } from "@trainers/utils";

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
 * Get the Discord server record associated with a given channel ID.
 *
 * Joins `discord_channels` on `channel_id` → `discord_servers` via
 * `discord_server_id`. Returns null when no channel mapping exists for
 * the given channel ID (e.g. the channel was not configured or the row
 * was deleted).
 *
 * @param channelId - Discord channel snowflake ID
 */
export async function getDiscordServerByChannelId(
  supabase: TypedClient,
  channelId: string
): Promise<DiscordServer | null> {
  const { data, error } = await supabase
    .from("discord_channels")
    .select("discord_servers(*)")
    .eq("channel_id", channelId)
    .limit(1)
    .maybeSingle();

  if (error)
    throw new Error(
      `Failed to get Discord server by channel ID: ${error.message}`
    );

  if (!data) return null;

  // The join returns the server as a nested object or array
  const server = data.discord_servers;
  if (!server) return null;

  // Supabase returns joined one-to-one as object, not array
  return server as unknown as DiscordServer;
}

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
// Reconcile-roles helpers (service-role only — for cron)
// =============================================================================

/**
 * Shape returned by listAllEnabledRoleMappingsWithServer.
 * Includes the guild_id and community_id from the joined discord_servers row.
 */
export type EnabledRoleMappingWithServer = {
  id: number;
  discord_server_id: number;
  discord_role_id: string;
  role_type: DiscordRoleType;
  guild_id: string;
  community_id: number;
};

/**
 * List enabled role mappings joined with their Discord server's guild_id and
 * community_id. Ordered by created_at ASC so mappings configured first get
 * priority; capped at `limit` for fair rotation.
 *
 * TODO: Add a `last_reconciled_at` column to discord_role_mappings in a
 * followup migration to implement true round-robin fairness across mappings.
 *
 * @param limit - Maximum number of mappings to return (default 20)
 */
export async function listAllEnabledRoleMappingsWithServer(
  supabase: TypedClient,
  limit = 20
): Promise<EnabledRoleMappingWithServer[]> {
  const { data, error } = await supabase
    .from("discord_role_mappings")
    .select(
      "id, discord_server_id, discord_role_id, role_type, discord_servers(guild_id, community_id)"
    )
    .eq("enabled", true)
    .order("created_at", { ascending: true, nullsFirst: true })
    .limit(limit);

  if (error)
    throw new Error(
      `Failed to list enabled role mappings with server: ${error.message}`
    );

  return (data ?? [])
    .filter(
      (row) =>
        row.discord_servers !== null && !Array.isArray(row.discord_servers)
    )
    .map((row) => {
      const server = row.discord_servers as {
        guild_id: string;
        community_id: number;
      };
      return {
        id: row.id,
        discord_server_id: row.discord_server_id,
        discord_role_id: row.discord_role_id,
        role_type: row.role_type,
        guild_id: server.guild_id,
        community_id: server.community_id,
      };
    });
}

/**
 * Resolve a list of trainers.gg user UUIDs to their linked Discord snowflake
 * IDs via `auth.identities`. Only users with a connected Discord account are
 * returned; users without Discord linked are silently omitted.
 *
 * Requires a service-role client — auth.identities is not accessible to
 * authenticated users.
 *
 * @param userIds - trainers.gg user UUIDs to look up
 */
export async function getDiscordIdsByUserIds(
  supabase: TypedClient,
  userIds: string[]
): Promise<string[]> {
  if (userIds.length === 0) return [];

  const { data, error } = await (
    supabase as TypedClient & {
      from: (table: "auth.identities") => ReturnType<TypedClient["from"]>;
    }
  )
    .from("auth.identities" as never)
    .select("identity_id")
    .eq("provider", "discord")
    .in("user_id", userIds);

  if (error)
    throw new Error(
      `Failed to resolve user IDs to Discord IDs: ${error.message}`
    );

  return (data as Array<{ identity_id: string }>).map((r) => r.identity_id);
}

/**
 * Get the trainers.gg user IDs of all staff members for a community.
 *
 * @param communityId - Community to query
 */
export async function getCommunityStaffUserIds(
  supabase: TypedClient,
  communityId: number
): Promise<string[]> {
  const { data, error } = await supabase
    .from("community_staff")
    .select("user_id")
    .eq("community_id", communityId);

  if (error)
    throw new Error(`Failed to get community staff user IDs: ${error.message}`);

  return (data ?? []).map((r) => r.user_id);
}

/**
 * Get the trainers.gg user IDs of all registered participants across any
 * tournament in a community. Joins tournament_registrations → alts to resolve
 * the user_id. Only includes non-dropped registrations.
 *
 * @param communityId - Community to query
 */
export async function getCommunityParticipantUserIds(
  supabase: TypedClient,
  communityId: number
): Promise<string[]> {
  const { data, error } = await supabase
    .from("tournament_registrations")
    .select(
      "alts!tournament_registrations_alt_id_fkey(user_id), tournaments!inner(community_id)"
    )
    .eq("tournaments.community_id", communityId)
    .is("dropped_at", null);

  if (error)
    throw new Error(
      `Failed to get community participant user IDs: ${error.message}`
    );

  const ids = new Set<string>();
  for (const row of data ?? []) {
    const alt = row.alts as { user_id: string } | null;
    if (alt?.user_id) ids.add(alt.user_id);
  }
  return [...ids];
}

/**
 * Get the trainers.gg user IDs of all players who have placed rank 1 in any
 * tournament in a community (honorific winner role). Looks at the latest
 * tournament_standings snapshot per tournament.
 *
 * @param communityId - Community to query
 */
export async function getCommunityWinnerUserIds(
  supabase: TypedClient,
  communityId: number
): Promise<string[]> {
  const { data, error } = await supabase
    .from("tournament_standings")
    .select("alts(user_id), tournaments!inner(community_id)")
    .eq("tournaments.community_id", communityId)
    .eq("rank", 1);

  if (error)
    throw new Error(
      `Failed to get community winner user IDs: ${error.message}`
    );

  const ids = new Set<string>();
  for (const row of data ?? []) {
    const alt = row.alts as { user_id: string } | null;
    if (alt?.user_id) ids.add(alt.user_id);
  }
  return [...ids];
}

/**
 * Get the trainers.gg user IDs of all players currently in an active match
 * within any tournament in a community (currently_playing role).
 *
 * Queries tournament_matches with status='active', joining through
 * tournament_rounds → tournament_phases → tournaments to filter by community.
 *
 * @param communityId - Community to query
 */
export async function getCommunityCurrentlyPlayingUserIds(
  supabase: TypedClient,
  communityId: number
): Promise<string[]> {
  // Query active matches; join alts for both players via alt1_id / alt2_id
  const { data, error } = await supabase
    .from("tournament_matches")
    .select(
      "alt1:alts!tournament_matches_alt1_id_fkey(user_id), alt2:alts!tournament_matches_alt2_id_fkey(user_id), tournament_rounds!inner(tournament_phases!inner(tournaments!inner(community_id)))"
    )
    .eq("status", "active")
    .eq(
      "tournament_rounds.tournament_phases.tournaments.community_id",
      communityId
    );

  if (error)
    throw new Error(
      `Failed to get currently playing user IDs: ${error.message}`
    );

  const ids = new Set<string>();
  for (const row of data ?? []) {
    const alt1 = row.alt1 as { user_id: string } | null;
    const alt2 = row.alt2 as { user_id: string } | null;
    if (alt1?.user_id) ids.add(alt1.user_id);
    if (alt2?.user_id) ids.add(alt2.user_id);
  }
  return [...ids];
}

/**
 * Get the trainers.gg user IDs of all "members" of a community.
 *
 * Approximation: there is no community_members table, so membership is
 * defined as: users who are community staff OR have any non-dropped
 * tournament registration in the community. This covers the most common
 * use-case for a "member" role — users who have meaningfully engaged with
 * the community's events.
 *
 * TODO: When a first-class community_members table is added, update this
 * query to use it directly.
 *
 * @param communityId - Community to query
 */
export async function getCommunityMemberUserIds(
  supabase: TypedClient,
  communityId: number
): Promise<string[]> {
  const [staffIds, participantIds] = await Promise.all([
    getCommunityStaffUserIds(supabase, communityId),
    getCommunityParticipantUserIds(supabase, communityId),
  ]);

  const ids = new Set([...staffIds, ...participantIds]);
  return [...ids];
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

// =============================================================================
// Discord bot slash-command query helpers
// =============================================================================

/** A minimal tournament row used by slash commands. */
export type DiscordTournamentRow = {
  id: number;
  name: string;
  slug: string;
  /** Nullable to match the generated DB enum column type. */
  status: string | null;
  format: string | null;
  start_date: string | null;
  community_id: number;
};

/**
 * List active tournaments for a community (status = 'active').
 * Used by slash commands as the default tournament selection.
 */
export async function listActiveTournaments(
  supabase: TypedClient,
  communityId: number
): Promise<DiscordTournamentRow[]> {
  const { data, error } = await supabase
    .from("tournaments")
    .select("id, name, slug, status, format, start_date, community_id")
    .eq("community_id", communityId)
    .eq("status", "active")
    .is("archived_at", null)
    .order("start_date", { ascending: true, nullsFirst: false })
    .limit(10);

  if (error)
    throw new Error(`Failed to list active tournaments: ${error.message}`);
  return data ?? [];
}

/**
 * List upcoming tournaments for a community (status = 'upcoming').
 * Used by the /events command.
 */
export async function listUpcomingTournaments(
  supabase: TypedClient,
  communityId: number,
  options: { limit?: number } = {}
): Promise<DiscordTournamentRow[]> {
  const { limit = 5 } = options;
  const { data, error } = await supabase
    .from("tournaments")
    .select("id, name, slug, status, format, start_date, community_id")
    .eq("community_id", communityId)
    .in("status", ["active", "upcoming"])
    .is("archived_at", null)
    .order("start_date", { ascending: true, nullsFirst: false })
    .limit(limit);

  if (error)
    throw new Error(`Failed to list upcoming tournaments: ${error.message}`);
  return data ?? [];
}

/**
 * Find a tournament by slug or name (ILIKE) within a community.
 * Used when the user provides a tournament argument to a slash command.
 */
export async function getTournamentByNameOrSlugInCommunity(
  supabase: TypedClient,
  communityId: number,
  identifier: string
): Promise<DiscordTournamentRow | null> {
  const escaped = escapeLike(identifier);

  // Try exact slug match first
  const { data: bySlug, error: slugError } = await supabase
    .from("tournaments")
    .select("id, name, slug, status, format, start_date, community_id")
    .eq("community_id", communityId)
    .eq("slug", identifier)
    .is("archived_at", null)
    .maybeSingle();

  if (slugError)
    throw new Error(
      `Failed to get tournament by slug in community: ${slugError.message}`
    );
  if (bySlug) return bySlug;

  // Fall back to ILIKE name match
  const { data: byName, error: nameError } = await supabase
    .from("tournaments")
    .select("id, name, slug, status, format, start_date, community_id")
    .eq("community_id", communityId)
    .ilike("name", `%${escaped}%`)
    .is("archived_at", null)
    .order("start_date", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (nameError)
    throw new Error(
      `Failed to get tournament by name in community: ${nameError.message}`
    );
  return byName;
}

/** A standings row with player name for Discord previews. */
export type DiscordStandingRow = {
  /** Nullable to match the generated DB column type on tournament_standings. */
  rank: number | null;
  player_name: string;
  wins: number;
  losses: number;
};

/**
 * Get top N standings for a tournament for Discord preview.
 * Returns rank, player name (alt username), wins, and losses.
 */
export async function listStandings(
  supabase: TypedClient,
  tournamentId: number,
  options: { limit?: number } = {}
): Promise<DiscordStandingRow[]> {
  const { limit = 5 } = options;

  const { data, error } = await supabase
    .from("tournament_standings")
    .select(
      `
      rank,
      game_wins,
      game_losses,
      alt:alts(username)
    `
    )
    .eq("tournament_id", tournamentId)
    .order("rank", { ascending: true })
    .limit(limit);

  if (error) throw new Error(`Failed to list standings: ${error.message}`);

  return (data ?? []).map((row) => ({
    rank: row.rank,
    player_name:
      (row.alt as { username: string } | null)?.username ?? "Unknown",
    wins: row.game_wins ?? 0,
    losses: row.game_losses ?? 0,
  }));
}

/** A pairing row for Discord preview. */
export type DiscordPairingRow = {
  table_number: number | null;
  player1_name: string;
  player2_name: string | null;
  is_bye: boolean;
};

/**
 * Get current-round pairings for a tournament for Discord preview.
 * Looks up the most recently started round across all phases.
 */
export async function listCurrentPairings(
  supabase: TypedClient,
  tournamentId: number,
  options: { limit?: number } = {}
): Promise<{ pairings: DiscordPairingRow[]; roundNumber: number | null }> {
  const { limit = 10 } = options;

  // Find the most recent active or completed round for this tournament
  const { data: rounds, error: roundError } = await supabase
    .from("tournament_rounds")
    .select(
      `
      id,
      round_number,
      tournament_phases!inner(tournament_id)
    `
    )
    .eq("tournament_phases.tournament_id", tournamentId)
    .in("status", ["active", "completed"])
    .order("round_number", { ascending: false })
    .limit(1);

  if (roundError)
    throw new Error(`Failed to get tournament rounds: ${roundError.message}`);

  const round = rounds?.[0];
  if (!round) return { pairings: [], roundNumber: null };

  const { data: matches, error: matchError } = await supabase
    .from("tournament_matches")
    .select(
      `
      table_number,
      is_bye,
      player1:alts!tournament_matches_alt1_id_fkey(username),
      player2:alts!tournament_matches_alt2_id_fkey(username)
    `
    )
    .eq("round_id", round.id)
    .order("table_number", { ascending: true, nullsFirst: false })
    .limit(limit);

  if (matchError)
    throw new Error(`Failed to get pairings: ${matchError.message}`);

  const pairings: DiscordPairingRow[] = (matches ?? []).map((m) => ({
    table_number: m.table_number,
    player1_name:
      (m.player1 as { username: string } | null)?.username ?? "Unknown",
    player2_name: (m.player2 as { username: string } | null)?.username ?? null,
    is_bye: m.is_bye ?? false,
  }));

  return { pairings, roundNumber: round.round_number };
}

/** A leaderboard entry for Discord preview. */
export type DiscordLeaderboardRow = {
  rank: number;
  player_name: string;
  rating: number;
  wins: number;
  losses: number;
};

/**
 * Get community leaderboard for Discord preview.
 * scope='current': ratings from current/most recent active tournament
 * scope='all-time': global ELO ratings
 */
export async function listCommunityLeaderboard(
  supabase: TypedClient,
  communityId: number,
  options: { scope?: "current" | "all-time"; limit?: number } = {}
): Promise<DiscordLeaderboardRow[]> {
  const { limit = 10 } = options;

  // For both scopes, fetch tournament_player_stats for this community's tournaments
  const { data: tournaments, error: tErr } = await supabase
    .from("tournaments")
    .select("id")
    .eq("community_id", communityId)
    .in("status", ["active", "completed"])
    .is("archived_at", null)
    .order("start_date", { ascending: false, nullsFirst: false })
    .limit(options.scope === "current" ? 1 : 100);

  if (tErr)
    throw new Error(
      `Failed to fetch tournaments for leaderboard: ${tErr.message}`
    );

  const tournamentIds = (tournaments ?? []).map((t) => t.id);
  if (tournamentIds.length === 0) return [];

  const { data: stats, error: statsError } = await supabase
    .from("tournament_player_stats")
    .select(
      `
      alt_id,
      match_wins,
      match_losses,
      tournament_id,
      alt:alts(username)
    `
    )
    .in("tournament_id", tournamentIds)
    .or("is_dropped.is.null,is_dropped.eq.false");

  if (statsError)
    throw new Error(`Failed to fetch leaderboard stats: ${statsError.message}`);

  // Aggregate per player
  const playerMap = new Map<
    number,
    { name: string; wins: number; losses: number }
  >();
  for (const row of stats ?? []) {
    const existing = playerMap.get(row.alt_id);
    const name =
      (row.alt as { username: string } | null)?.username ?? "Unknown";
    if (existing) {
      existing.wins += row.match_wins ?? 0;
      existing.losses += row.match_losses ?? 0;
    } else {
      playerMap.set(row.alt_id, {
        name,
        wins: row.match_wins ?? 0,
        losses: row.match_losses ?? 0,
      });
    }
  }

  return Array.from(playerMap.entries())
    .sort(([, a], [, b]) => {
      // Sort by win rate descending, then wins descending
      const totalA = a.wins + a.losses;
      const totalB = b.wins + b.losses;
      const rateA = totalA > 0 ? a.wins / totalA : 0;
      const rateB = totalB > 0 ? b.wins / totalB : 0;
      if (rateB !== rateA) return rateB - rateA;
      return b.wins - a.wins;
    })
    .slice(0, limit)
    .map(([, player], idx) => ({
      rank: idx + 1,
      player_name: player.name,
      rating: 0, // Not using ELO here — using win/loss record
      wins: player.wins,
      losses: player.losses,
    }));
}

// =============================================================================
// Autocomplete query helpers
// =============================================================================

/**
 * Search tournaments in a community by name or slug (ILIKE) for autocomplete.
 *
 * Returns up to `limit` results ordered by recency. When `partial` is empty,
 * returns the most recent tournaments. Uses case-insensitive ILIKE with
 * wildcard injection prevention via `escapeLike`.
 */
export async function searchTournamentsInCommunity(
  supabase: TypedClient,
  communityId: number,
  partial: string,
  options: { limit?: number } = {}
): Promise<{ name: string; slug: string }[]> {
  const { limit = 25 } = options;

  let query = supabase
    .from("tournaments")
    .select("name, slug")
    .eq("community_id", communityId)
    .is("archived_at", null)
    .order("start_date", { ascending: false, nullsFirst: false });

  if (partial.trim().length > 0) {
    const escaped = escapeLike(partial.trim());
    query = query.ilike("name", `%${escaped}%`);
  }

  const { data, error } = await query.limit(limit);

  if (error)
    throw new Error(
      `Failed to search tournaments in community: ${error.message}`
    );
  return data ?? [];
}

/**
 * Search tournaments that a user is actively registered in (not ended/dropped).
 *
 * Used by `/drop` autocomplete — only surfaces tournaments the invoking user
 * can still drop from. Requires a service-role client (joins auth.identities).
 *
 * @param userId      - trainers.gg user UUID (resolved from Discord identity)
 * @param communityId - Community scope
 * @param partial     - Prefix the user has typed so far
 */
export async function searchUserActiveTournamentRegistrations(
  supabase: TypedClient,
  userId: string,
  communityId: number,
  partial: string,
  options: { limit?: number } = {}
): Promise<{ name: string; slug: string }[]> {
  const { limit = 25 } = options;

  // Get user's alts
  const { data: alts, error: altsError } = await supabase
    .from("alts")
    .select("id")
    .eq("user_id", userId);

  if (altsError)
    throw new Error(
      `Failed to get alts for autocomplete: ${altsError.message}`
    );

  const altIds = (alts ?? []).map((a) => a.id);
  if (altIds.length === 0) return [];

  // Find active registrations (not dropped) in this community's active tournaments
  let tournamentQuery = supabase
    .from("tournament_registrations")
    .select(
      `
      tournament:tournaments!inner(name, slug, status, community_id, archived_at)
    `
    )
    .in("alt_id", altIds)
    .neq("status", "dropped")
    .eq("tournaments.community_id", communityId)
    .eq("tournaments.status", "active")
    .is("tournaments.archived_at", null);

  if (partial.trim().length > 0) {
    const escaped = escapeLike(partial.trim());
    tournamentQuery = tournamentQuery.ilike("tournaments.name", `%${escaped}%`);
  }

  const { data, error } = await tournamentQuery.limit(limit);

  if (error)
    throw new Error(
      `Failed to search user active tournament registrations: ${error.message}`
    );

  return (data ?? [])
    .map((r) => {
      const t = r.tournament as { name: string; slug: string } | null;
      return t ? { name: t.name, slug: t.slug } : null;
    })
    .filter((t): t is { name: string; slug: string } => t !== null);
}

/**
 * Search players who have participated in a community's tournaments (ILIKE username).
 *
 * Returns players scoped to this community — users who have at least one
 * tournament registration in any of the community's tournaments.
 */
export async function searchPlayersInCommunity(
  supabase: TypedClient,
  communityId: number,
  partial: string,
  options: { limit?: number } = {}
): Promise<{ username: string }[]> {
  const { limit = 25 } = options;

  // Find alts that have registrations in this community's tournaments
  let query = supabase
    .from("alts")
    .select(
      `
      username,
      tournament_registrations!inner(
        tournament:tournaments!inner(community_id)
      )
    `
    )
    .eq("tournament_registrations.tournaments.community_id", communityId)
    .order("username", { ascending: true });

  if (partial.trim().length > 0) {
    const escaped = escapeLike(partial.trim());
    query = query.ilike("username", `%${escaped}%`);
  }

  const { data, error } = await query.limit(limit);

  if (error)
    throw new Error(`Failed to search players in community: ${error.message}`);

  // Deduplicate (a player may have multiple registrations)
  const seen = new Set<string>();
  const results: { username: string }[] = [];
  for (const row of data ?? []) {
    if (!seen.has(row.username)) {
      seen.add(row.username);
      results.push({ username: row.username });
    }
  }
  return results.slice(0, limit);
}

// =============================================================================
// Player profile
// =============================================================================

/**
 * Get a player's profile by username (looks up alt by username).
 * Returns basic stats for /player command.
 */
export async function getPlayerByUsername(
  supabase: TypedClient,
  username: string
): Promise<{
  userId: string;
  altId: number;
  username: string;
  country: string | null;
} | null> {
  const { data, error } = await supabase
    .from("alts")
    .select("id, user_id, username, user:users(country)")
    .eq("username", username)
    .maybeSingle();

  if (error)
    throw new Error(`Failed to get player by username: ${error.message}`);
  if (!data) return null;

  return {
    userId: data.user_id,
    altId: data.id,
    username: data.username,
    country: (data.user as { country: string | null } | null)?.country ?? null,
  };
}

/**
 * Get a player's community-scoped stats (W-L record in this community's tournaments).
 */
export async function getPlayerCommunityStats(
  supabase: TypedClient,
  userId: string,
  communityId: number
): Promise<{
  wins: number;
  losses: number;
  tournamentsPlayed: number;
  lastPlayedAt: string | null;
}> {
  // Get the user's alts
  const { data: alts, error: altsError } = await supabase
    .from("alts")
    .select("id")
    .eq("user_id", userId);

  if (altsError)
    throw new Error(
      `Failed to get alts for player stats: ${altsError.message}`
    );

  const altIds = (alts ?? []).map((a) => a.id);
  if (altIds.length === 0) {
    return { wins: 0, losses: 0, tournamentsPlayed: 0, lastPlayedAt: null };
  }

  // Get all tournaments for this community
  const { data: tournaments, error: tErr } = await supabase
    .from("tournaments")
    .select("id")
    .eq("community_id", communityId)
    .is("archived_at", null);

  if (tErr)
    throw new Error(
      `Failed to get community tournaments for player stats: ${tErr.message}`
    );

  const tournamentIds = (tournaments ?? []).map((t) => t.id);
  if (tournamentIds.length === 0) {
    return { wins: 0, losses: 0, tournamentsPlayed: 0, lastPlayedAt: null };
  }

  const { data: stats, error: statsError } = await supabase
    .from("tournament_player_stats")
    .select("match_wins, match_losses, tournament_id, created_at")
    .in("alt_id", altIds)
    .in("tournament_id", tournamentIds);

  if (statsError)
    throw new Error(
      `Failed to get player community stats: ${statsError.message}`
    );

  const rows = stats ?? [];
  const totalWins = rows.reduce((s, r) => s + (r.match_wins ?? 0), 0);
  const totalLosses = rows.reduce((s, r) => s + (r.match_losses ?? 0), 0);
  const uniqueTournaments = new Set(rows.map((r) => r.tournament_id)).size;
  const lastPlayed = rows.reduce<string | null>((latest, r) => {
    if (!r.created_at) return latest;
    if (!latest) return r.created_at;
    return r.created_at > latest ? r.created_at : latest;
  }, null);

  return {
    wins: totalWins,
    losses: totalLosses,
    tournamentsPlayed: uniqueTournaments,
    lastPlayedAt: lastPlayed,
  };
}

/**
 * Get the most recent public team sheet for a user in this community's tournaments.
 * Returns the team name and tournament context.
 */
export async function getPublicTeamForCommunity(
  supabase: TypedClient,
  userId: string,
  communityId: number
): Promise<{
  teamId: number;
  teamName: string | null;
  tournamentId: number;
  tournamentName: string;
  tournamentSlug: string;
} | null> {
  // Get the user's alts
  const { data: alts, error: altsError } = await supabase
    .from("alts")
    .select("id")
    .eq("user_id", userId);

  if (altsError)
    throw new Error(`Failed to get alts for public team: ${altsError.message}`);

  const altIds = (alts ?? []).map((a) => a.id);
  if (altIds.length === 0) return null;

  // Find the most recent registration with a team in this community
  const { data: regs, error: regError } = await supabase
    .from("tournament_registrations")
    .select(
      `
      team_id,
      tournament:tournaments!inner(id, name, slug, community_id),
      team:teams(name)
    `
    )
    .in("alt_id", altIds)
    .eq("tournaments.community_id", communityId)
    .not("team_id", "is", null)
    .order("registered_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (regError)
    throw new Error(
      `Failed to get public team for community: ${regError.message}`
    );
  if (!regs) return null;

  const tournament = regs.tournament as {
    id: number;
    name: string;
    slug: string;
  } | null;
  if (!tournament || !regs.team_id) return null;

  return {
    teamId: regs.team_id,
    teamName: (regs.team as { name: string } | null)?.name ?? null,
    tournamentId: tournament.id,
    tournamentName: tournament.name,
    tournamentSlug: tournament.slug,
  };
}
