import type { TypedClient } from "../client";
import type { Enums, Json } from "../types";

type DiscordDmEventType = Enums<"discord_dm_event_type">;
type DiscordRoleType = Enums<"discord_role_type">;

// =============================================================================
// discord_servers — install / uninstall
// =============================================================================

/**
 * Record a new Discord server installation for a community.
 * Fails if the community already has a server linked (UNIQUE constraint).
 */
export async function createDiscordServer(
  supabase: TypedClient,
  input: {
    guild_id: string;
    community_id: number;
    installed_by: string;
    settings?: Record<string, unknown>;
  }
): Promise<void> {
  const { error } = await supabase.from("discord_servers").insert({
    guild_id: input.guild_id,
    community_id: input.community_id,
    installed_by: input.installed_by,
    settings: (input.settings ?? {}) as unknown as Json,
  });

  if (error)
    throw new Error(`Failed to create Discord server: ${error.message}`);
}

/**
 * Remove a Discord server installation by ID.
 * Cascades to all related channel mappings, queue items, etc.
 */
export async function deleteDiscordServer(
  supabase: TypedClient,
  id: number
): Promise<void> {
  const { error } = await supabase
    .from("discord_servers")
    .delete()
    .eq("id", id);

  if (error)
    throw new Error(`Failed to delete Discord server: ${error.message}`);
}

/**
 * Remove a Discord server installation by guild ID (Discord snowflake).
 * Used when the bot receives an uninstall webhook from Discord.
 */
export async function deleteDiscordServerByGuildId(
  supabase: TypedClient,
  guildId: string
): Promise<void> {
  const { error } = await supabase
    .from("discord_servers")
    .delete()
    .eq("guild_id", guildId);

  if (error)
    throw new Error(
      `Failed to delete Discord server by guild ID: ${error.message}`
    );
}

// =============================================================================
// discord_channels — channel mappings
// =============================================================================

/**
 * Upsert a channel-to-event-type mapping for a Discord server.
 * Idempotent: conflicts on (discord_server_id, channel_id, event_type) are ignored.
 *
 * TODO(phase-6a): emit DISCORD_CHANNEL_MAPPED when called from a server action
 * once Phase 5 UI wires it (community_id, event_type properties).
 */
export async function upsertChannelMapping(
  supabase: TypedClient,
  input: {
    discord_server_id: number;
    channel_id: string;
    event_type: string;
  }
): Promise<{ id: number }> {
  const { data, error } = await supabase
    .from("discord_channels")
    .upsert(
      {
        discord_server_id: input.discord_server_id,
        channel_id: input.channel_id,
        event_type: input.event_type,
      },
      { onConflict: "discord_server_id,channel_id,event_type" }
    )
    .select("id")
    .single();

  if (error)
    throw new Error(`Failed to upsert channel mapping: ${error.message}`);

  return { id: data.id };
}

/**
 * Delete a channel mapping by ID.
 */
export async function deleteChannelMapping(
  supabase: TypedClient,
  id: number
): Promise<void> {
  const { error } = await supabase
    .from("discord_channels")
    .delete()
    .eq("id", id);

  if (error)
    throw new Error(`Failed to delete channel mapping: ${error.message}`);
}

// =============================================================================
// discord_dm_settings — community-level DM delivery config
// =============================================================================

/**
 * Upsert the DM delivery setting for a specific event type on a server.
 * Conflicts on (discord_server_id, event_type) update the existing row.
 */
export async function upsertDmSetting(
  supabase: TypedClient,
  input: {
    discord_server_id: number;
    event_type: DiscordDmEventType;
    delivery_mode: "dm_only" | "channel_only" | "dm_with_fallback";
    fallback_channel_id?: string | null;
  }
): Promise<void> {
  const { error } = await supabase.from("discord_dm_settings").upsert(
    {
      discord_server_id: input.discord_server_id,
      event_type: input.event_type,
      delivery_mode: input.delivery_mode,
      fallback_channel_id: input.fallback_channel_id ?? null,
    },
    { onConflict: "discord_server_id,event_type" }
  );

  if (error) throw new Error(`Failed to upsert DM setting: ${error.message}`);
}

/**
 * Delete a DM setting by ID.
 */
export async function deleteDmSetting(
  supabase: TypedClient,
  id: number
): Promise<void> {
  const { error } = await supabase
    .from("discord_dm_settings")
    .delete()
    .eq("id", id);

  if (error) throw new Error(`Failed to delete DM setting: ${error.message}`);
}

// =============================================================================
// discord_user_dm_preferences — per-user opt-in settings
// =============================================================================

/**
 * Set a user's DM preference for a specific event type.
 * Creates the row if it doesn't exist, updates it if it does.
 *
 * @param userId    - trainers.gg user UUID
 * @param eventType - Discord DM event type to set preference for
 * @param enabled   - Whether the user wants DMs for this event type
 */
export async function setDmPreference(
  supabase: TypedClient,
  userId: string,
  eventType: DiscordDmEventType,
  enabled: boolean
): Promise<void> {
  const { error } = await supabase
    .from("discord_user_dm_preferences")
    .upsert(
      { user_id: userId, event_type: eventType, enabled },
      { onConflict: "user_id,event_type" }
    );

  if (error) throw new Error(`Failed to set DM preference: ${error.message}`);
}

// =============================================================================
// discord_role_mappings — community → Discord role config
// =============================================================================

/**
 * Upsert a role mapping for a Discord server.
 * Conflicts on (discord_server_id, role_type) update discord_role_id and enabled.
 *
 * TODO(phase-6a): emit DISCORD_ROLE_MAPPED when called from a server action
 * once Phase 5 UI wires it (community_id, role_type properties).
 */
export async function upsertRoleMapping(
  supabase: TypedClient,
  input: {
    discord_server_id: number;
    role_type: DiscordRoleType;
    discord_role_id: string;
    enabled?: boolean;
  }
): Promise<{ id: number }> {
  const { data, error } = await supabase
    .from("discord_role_mappings")
    .upsert(
      {
        discord_server_id: input.discord_server_id,
        role_type: input.role_type,
        discord_role_id: input.discord_role_id,
        enabled: input.enabled ?? true,
      },
      { onConflict: "discord_server_id,role_type" }
    )
    .select("id")
    .single();

  if (error) throw new Error(`Failed to upsert role mapping: ${error.message}`);
  return { id: data.id };
}

/**
 * Toggle the enabled flag on a role mapping.
 * enabled=false pauses sync without deleting the mapping configuration.
 */
export async function toggleRoleMapping(
  supabase: TypedClient,
  id: number,
  enabled: boolean
): Promise<void> {
  const { error } = await supabase
    .from("discord_role_mappings")
    .update({ enabled })
    .eq("id", id);

  if (error) throw new Error(`Failed to toggle role mapping: ${error.message}`);
}

/**
 * Delete a role mapping by ID.
 */
export async function deleteRoleMapping(
  supabase: TypedClient,
  id: number
): Promise<void> {
  const { error } = await supabase
    .from("discord_role_mappings")
    .delete()
    .eq("id", id);

  if (error) throw new Error(`Failed to delete role mapping: ${error.message}`);
}

// =============================================================================
// discord_channel_failures — failure tracking
// =============================================================================

/**
 * Record a channel send failure, incrementing the consecutive failure counter.
 * Creates the row if this is the first failure for the (server, channel) pair.
 * Returns the updated consecutive_failures count for threshold checks.
 */
export async function recordChannelFailure(
  supabase: TypedClient,
  discordServerId: number,
  channelId: string
): Promise<{ consecutive_failures: number }> {
  // Upsert: on first failure create the row; on subsequent failures increment
  const { data: existing } = await supabase
    .from("discord_channel_failures")
    .select("id, consecutive_failures")
    .eq("discord_server_id", discordServerId)
    .eq("channel_id", channelId)
    .maybeSingle();

  const now = new Date().toISOString();

  if (existing) {
    const newCount = existing.consecutive_failures + 1;
    const { error } = await supabase
      .from("discord_channel_failures")
      .update({
        consecutive_failures: newCount,
        last_failed_at: now,
      })
      .eq("id", existing.id);

    if (error)
      throw new Error(`Failed to record channel failure: ${error.message}`);

    return { consecutive_failures: newCount };
  }

  // First failure — insert a new row
  const { data: inserted, error: insertError } = await supabase
    .from("discord_channel_failures")
    .insert({
      discord_server_id: discordServerId,
      channel_id: channelId,
      consecutive_failures: 1,
      last_failed_at: now,
    })
    .select("consecutive_failures")
    .single();

  if (insertError)
    throw new Error(
      `Failed to record channel failure (insert): ${insertError.message}`
    );

  return { consecutive_failures: inserted.consecutive_failures };
}

/**
 * Reset the consecutive failure counter for a channel after a successful send.
 * Also clears email_sent_at so a future failure can trigger a new dead-letter email.
 */
export async function resetChannelFailures(
  supabase: TypedClient,
  discordServerId: number,
  channelId: string
): Promise<void> {
  const { error } = await supabase
    .from("discord_channel_failures")
    .update({
      consecutive_failures: 0,
      last_failed_at: null,
      email_sent_at: null,
    })
    .eq("discord_server_id", discordServerId)
    .eq("channel_id", channelId);

  if (error)
    throw new Error(`Failed to reset channel failures: ${error.message}`);
}

/**
 * Record that a dead-letter email has been sent for this channel.
 * Prevents duplicate alert emails until the channel recovers and fails again.
 */
export async function markChannelEmailSent(
  supabase: TypedClient,
  discordServerId: number,
  channelId: string
): Promise<void> {
  const { error } = await supabase
    .from("discord_channel_failures")
    .update({ email_sent_at: new Date().toISOString() })
    .eq("discord_server_id", discordServerId)
    .eq("channel_id", channelId);

  if (error)
    throw new Error(`Failed to mark channel email sent: ${error.message}`);
}

// =============================================================================
// discord_delivery_failures — unified workflow failure log
// =============================================================================

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
  // Denormalized community_id allows the Failures-tab SELECT policy to avoid a
  // correlated subquery on discord_servers. One-shot lookup on the failure
  // path is cheap; the read-side win compounds as the table grows.
  const { data: server, error: serverError } = await supabase
    .from("discord_servers")
    .select("community_id")
    .eq("id", input.discord_server_id)
    .single();

  if (serverError)
    throw new Error(
      `Failed to resolve community for delivery failure: ${serverError.message}`
    );

  const { data, error } = await supabase
    .from("discord_delivery_failures")
    .insert({
      discord_server_id: input.discord_server_id,
      community_id: server.community_id,
      type: input.type,
      event_type: input.event_type,
      target: input.target,
      error_code: input.error_code ?? null,
      error_reason: input.error_reason,
      payload: (input.payload as unknown as Json) ?? null,
      delivered_via_fallback: input.delivered_via_fallback ?? false,
    })
    .select("id")
    .single();

  if (error)
    throw new Error(`Failed to record delivery failure: ${error.message}`);
  return { id: data.id };
}
