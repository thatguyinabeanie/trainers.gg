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
 *
 * Migration note: converted from unstable_cache to 'use cache' (Cache
 * Components). guildId + serverId are function params — they become the cache
 * key automatically. cacheLife custom profile matches the old 300s TTL;
 * expire is 3600s to keep it a real cache (expire < 5min silently uncaches).
 */

import { cacheTag, cacheLife } from "next/cache";

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
export async function getCachedGuildChannels(
  guildId: string,
  serverId: number
): Promise<GuildChannel[]> {
  "use cache";
  cacheTag(CacheTags.discordGuild(serverId));
  // 300s stale + revalidate matches the old TTL; expire=3600 prevents
  // the <5min "dynamic hole" where Next.js would skip caching entirely.
  cacheLife({ stale: 300, revalidate: 300, expire: 3600 });

  const channels = await getGuildChannels(guildId);
  return channels.filter((ch) => ch.type === TEXT_CHANNEL_TYPE);
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
export async function getCachedGuildRoles(
  guildId: string,
  serverId: number
): Promise<GuildRole[]> {
  "use cache";
  cacheTag(CacheTags.discordGuild(serverId));
  cacheLife({ stale: 300, revalidate: 300, expire: 3600 });

  const roles = await getGuildRoles(guildId);
  return roles.filter((r) => !r.managed);
}
