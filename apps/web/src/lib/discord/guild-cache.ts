/**
 * Cache wrappers for Discord REST guild-channel and guild-role lookups.
 *
 * These are server-side only (Next.js Server Components, Server Actions).
 * The 5-minute TTL keeps admin-facing pages snappy without hammering Discord.
 * The `discord-guild:${serverId}` tag lets the Refresh button invalidate on
 * demand via the refreshDiscordGuildCacheAction server action.
 *
 * Why tagged by serverId (int) rather than guildId (snowflake): tags are
 * generated from the trainers.gg id so mutations on the discord_servers
 * row (delete, reinstall) can invalidate via the same surface that created
 * the cache.
 */

import { unstable_cache } from "next/cache";

import {
  type APIGuildChannel,
  type APIRole,
  type GuildChannelType,
} from "discord-api-types/v10";

import { getGuildChannels, getGuildRoles } from "./api";
import { CacheTags } from "@/lib/cache";

// =============================================================================
// Types
// =============================================================================

/** Discord text channel shape returned by guild-cache helpers. */
export type GuildChannel = APIGuildChannel<GuildChannelType>;

/** Discord role shape returned by guild-cache helpers. */
export type GuildRole = APIRole;

// =============================================================================
// Constants
// =============================================================================

const CACHE_TTL_SECONDS = 300;

/** Discord ChannelType 0 = GUILD_TEXT (plain text channel). */
const TEXT_CHANNEL_TYPE = 0;

// =============================================================================
// Cache wrappers
// =============================================================================

/**
 * Fetch + cache text channels for a guild (5-minute TTL).
 *
 * Only returns text channels (ChannelType 0). Categories, voice channels,
 * and announcement channels are excluded — they are not valid notification
 * targets in the Discord integration UI.
 *
 * @param guildId  - Discord guild snowflake ID
 * @param serverId - trainers.gg `discord_servers.id` — used for cache tagging
 */
export function getCachedGuildChannels(
  guildId: string,
  serverId: number
): Promise<GuildChannel[]> {
  return unstable_cache(
    async () => {
      const channels = await getGuildChannels(guildId);
      return channels.filter((ch) => ch.type === TEXT_CHANNEL_TYPE);
    },
    ["discord-guild-channels", guildId],
    { revalidate: CACHE_TTL_SECONDS, tags: [CacheTags.discordGuild(serverId)] }
  )();
}

/**
 * Fetch + cache non-managed roles for a guild (5-minute TTL).
 *
 * Managed roles (e.g., bot roles, Nitro Booster) are excluded — they
 * cannot be assigned by the bot and are not useful as selectable roles
 * in the integration UI.
 *
 * @param guildId  - Discord guild snowflake ID
 * @param serverId - trainers.gg `discord_servers.id` — used for cache tagging
 */
export function getCachedGuildRoles(
  guildId: string,
  serverId: number
): Promise<GuildRole[]> {
  return unstable_cache(
    async () => {
      const roles = await getGuildRoles(guildId);
      return roles.filter((r) => !r.managed);
    },
    ["discord-guild-roles", guildId],
    { revalidate: CACHE_TTL_SECONDS, tags: [CacheTags.discordGuild(serverId)] }
  )();
}
