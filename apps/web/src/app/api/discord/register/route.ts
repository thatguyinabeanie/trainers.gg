/**
 * POST /api/discord/register
 *
 * Dev tool that registers all slash command definitions with Discord's API.
 * - In dev: pass `?guild_id=<id>` to register to a single test guild (instant).
 * - In prod: omit `guild_id` to register globally (up to 1 hour propagation).
 *
 * Protected by `Authorization: Bearer ${CRON_SECRET}` to prevent unauthorized
 * re-registration. POST only — registration is a side-effect operation.
 */

import {
  ApplicationCommandType,
  type RESTPostAPIApplicationCommandsJSONBody,
} from "discord-api-types/v10";

import {
  DiscordAPIError,
  registerGlobalCommands,
  registerGuildCommands,
} from "@/lib/discord/api";
import { commandRegistry } from "@/lib/discord/commands";

// =============================================================================
// POST handler
// =============================================================================

export async function POST(request: Request): Promise<Response> {
  // Verify secret — prevents randos from triggering re-registration
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const guildId = searchParams.get("guild_id");

  // Build the array of command definition bodies from the registry
  const definitions: RESTPostAPIApplicationCommandsJSONBody[] = Array.from(
    commandRegistry.values()
  ).map((def) => {
    const body: RESTPostAPIApplicationCommandsJSONBody = {
      name: def.name,
      description: def.description,
      type: ApplicationCommandType.ChatInput,
    };
    if (def.options?.length) body.options = def.options;
    if (def.defaultMemberPermissions !== undefined) {
      body.default_member_permissions = def.defaultMemberPermissions;
    }
    return body;
  });

  try {
    if (guildId) {
      await registerGuildCommands(guildId, definitions);
      return Response.json({
        registered: definitions.length,
        scope: "guild",
        guildId,
      });
    }

    await registerGlobalCommands(definitions);
    return Response.json({
      registered: definitions.length,
      scope: "global",
    });
  } catch (e) {
    if (e instanceof DiscordAPIError) {
      return Response.json(
        {
          error: "Discord API rejected the registration",
          code: e.body.code,
          status: e.status,
        },
        { status: 502 }
      );
    }
    throw e;
  }
}
