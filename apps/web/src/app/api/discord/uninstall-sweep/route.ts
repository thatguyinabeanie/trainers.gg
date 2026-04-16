/**
 * Discord Uninstall Detection Cron
 *
 * Runs daily (via Vercel cron, 07:00 UTC) to validate each installed
 * `discord_servers` row against the Discord API. When the bot is no longer
 * a member of a guild (404 / 50001 Missing Access), the row is deleted and
 * the cascade removes all child rows (discord_channels, discord_dm_settings,
 * discord_role_mappings, etc.).
 *
 * Transient errors (rate-limit, 5xx, network) leave the row intact so a
 * single API hiccup does not trigger accidental uninstalls.
 *
 * Authorization: Vercel cron token via `CRON_SECRET` env var.
 * DB access: service-role client — RLS policies gate on auth.uid(), which
 * is not set in server-to-server cron context.
 *
 * GET /api/discord/uninstall-sweep
 */

import { DISCORD_BOT_UNINSTALLED } from "@trainers/posthog";
import { listDiscordServers, deleteDiscordServer } from "@trainers/supabase";

import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  getGuild,
  isNotFoundError,
  isMissingAccessError,
  getErrorCode,
} from "@/lib/discord/api";
import { captureServerEvent } from "@/lib/posthog/server";

// =============================================================================
// Route handler
// =============================================================================

export async function GET(request: Request): Promise<Response> {
  // Verify Vercel cron authorization
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const servers = await listDiscordServers(supabase);

  let removedCount = 0;
  let errorCount = 0;
  const errors: Array<{ guildId: string; code: number | string }> = [];

  for (const server of servers) {
    try {
      await getGuild(server.guild_id);
      // Bot is still in the guild — nothing to do
    } catch (e) {
      if (isNotFoundError(e) || isMissingAccessError(e)) {
        // Discord returned 404 "Unknown Guild" or 50001 "Missing Access" —
        // the bot is no longer in this server. Delete the row (cascades to
        // discord_channels, discord_dm_settings, discord_role_mappings, etc.)
        await deleteDiscordServer(supabase, server.id);
        // Emit uninstall event — fire-and-forget
        void captureServerEvent({
          event: DISCORD_BOT_UNINSTALLED,
          distinctId: `guild:${server.guild_id}`,
          properties: {
            community_id: server.community_id,
            guild_id: server.guild_id,
          },
        });
        removedCount++;
      } else {
        // Transient error (rate-limit, 5xx, network). Leave the row alone
        // and surface the details in the response for observability.
        errorCount++;
        errors.push({ guildId: server.guild_id, code: getErrorCode(e) });
      }
    }
  }

  return Response.json({
    scanned: servers.length,
    removed: removedCount,
    errors: errorCount,
    errorDetails: errors,
  });
}
