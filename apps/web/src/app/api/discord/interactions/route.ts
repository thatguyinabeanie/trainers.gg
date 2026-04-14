/**
 * POST /api/discord/interactions
 *
 * Webhook entry point for all Discord interactions: slash commands, autocomplete,
 * message components, and the PING health check Discord sends when you register
 * the Interactions Endpoint URL.
 *
 * Flow for commands:
 *  1. Verify Ed25519 signature — reject non-Discord traffic
 *  2. Check rate limits — return ephemeral error immediately if exceeded
 *  3. Resolve community from guild_id (unless command is `unscoped`)
 *  4. Return deferred ACK (type 5) within Discord's 3-second window
 *  5. `waitUntil` runs the handler and edits the original response
 *
 * Phase 3c command files register themselves via `registerCommand()` imported
 * from `@/lib/discord/commands`; Phase 3d autocomplete handlers attach to the
 * same `CommandDefinition.autocomplete` field.
 */

import { waitUntil } from "@vercel/functions";
import {
  InteractionResponseType,
  InteractionType,
  MessageFlags,
  type APIApplicationCommandAutocompleteInteraction,
  type APIApplicationCommandInteraction,
  type APIInteraction,
} from "discord-api-types/v10";

import {
  getCommunityById,
  getDiscordServerByGuildId,
} from "@trainers/supabase";

import { editInteractionResponse } from "@/lib/discord/api";
import { commandRegistry } from "@/lib/discord/commands";
import { type CommandDefinition } from "@/lib/discord/commands/registry";
import { checkRateLimit } from "@/lib/discord/rate-limit";
import { verifyRequest } from "@/lib/discord/verify";
import { createServiceRoleClient } from "@/lib/supabase/server";

// =============================================================================
// Route handler
// =============================================================================

export async function POST(request: Request): Promise<Response> {
  // 1. Read the raw body — required for Ed25519 verification
  const body = await request.text();

  // 2. Verify the Discord signature — reject anything that isn't from Discord
  if (!(await verifyRequest(request, body))) {
    return new Response("Bad signature", { status: 401 });
  }

  const interaction = JSON.parse(body) as APIInteraction;

  // 3. PING — Discord health check, required when registering the endpoint URL
  if (interaction.type === InteractionType.Ping) {
    return Response.json({ type: InteractionResponseType.Pong });
  }

  // 4. Autocomplete — synchronous, no deferral
  if (interaction.type === InteractionType.ApplicationCommandAutocomplete) {
    return handleAutocomplete(interaction);
  }

  // 5. Slash command — deferred + waitUntil
  if (interaction.type === InteractionType.ApplicationCommand) {
    return handleCommand(interaction);
  }

  // 6. Unknown / unsupported interaction type
  return ephemeralReply("This interaction isn't supported yet.");
}

// =============================================================================
// Command handling
// =============================================================================

async function handleCommand(
  interaction: APIApplicationCommandInteraction
): Promise<Response> {
  // Rate limit check must happen before any DB work
  const guildId = interaction.guild_id ?? "global";
  const userId = interaction.member?.user.id ?? interaction.user?.id;

  if (!userId) {
    return ephemeralReply("Couldn't identify user.");
  }

  const limit = checkRateLimit(userId, guildId);
  if (!limit.allowed) {
    const message =
      limit.scope === "user"
        ? "Slow down — you're sending commands too fast."
        : "This server is hitting the command rate limit — try again soon.";
    return ephemeralReply(message);
  }

  // Look up the command in the registry
  const commandName = interaction.data.name;
  const definition = commandRegistry.get(commandName);
  if (!definition) {
    return ephemeralReply(`Unknown command: /${commandName}`);
  }

  // Resolve community unless the command is unscoped (e.g. /help)
  let communityContext: { communityId: number; communitySlug: string } | null =
    null;

  if (!definition.unscoped) {
    if (!interaction.guild_id) {
      return ephemeralReply("This command must be used in a server.");
    }

    const supabase = createServiceRoleClient();
    const server = await getDiscordServerByGuildId(
      supabase,
      interaction.guild_id
    );

    if (!server) {
      return ephemeralReply(
        "This server isn't linked to a trainers.gg community. " +
          "A community leader can set it up at https://trainers.gg/dashboard."
      );
    }

    const community = await getCommunityById(supabase, server.community_id);
    if (!community) {
      return ephemeralReply(
        "Community link is broken — please contact support."
      );
    }

    communityContext = {
      communityId: community.id,
      communitySlug: community.slug,
    };
  }

  // Return deferred ACK immediately (gives us up to 15 min to edit the response)
  const deferred = {
    type: InteractionResponseType.DeferredChannelMessageWithSource,
    data: definition.ephemeral ? { flags: MessageFlags.Ephemeral } : undefined,
  };

  // Schedule the real work — runs after the response is sent
  waitUntil(
    runCommand(definition, interaction, userId, communityContext).catch(
      (err) => {
        console.error(`Command /${commandName} failed:`, err);
        void editInteractionResponse(interaction.token, {
          content:
            "Something went wrong running that command. Please try again.",
        }).catch((e) => {
          console.error("Failed to send fallback error message:", e);
        });
      }
    )
  );

  return Response.json(deferred);
}

async function runCommand(
  definition: CommandDefinition,
  interaction: APIApplicationCommandInteraction,
  userId: string,
  communityContext: { communityId: number; communitySlug: string } | null
): Promise<void> {
  await definition.handler({
    interaction,
    guildId: interaction.guild_id ?? "",
    userId,
    communityId: communityContext?.communityId ?? 0,
    communitySlug: communityContext?.communitySlug ?? "",
  });
}

// =============================================================================
// Autocomplete handling
// =============================================================================

async function handleAutocomplete(
  interaction: APIApplicationCommandAutocompleteInteraction
): Promise<Response> {
  const emptyChoices = Response.json({
    type: InteractionResponseType.ApplicationCommandAutocompleteResult,
    data: { choices: [] },
  });

  const commandName = interaction.data.name;
  const definition = commandRegistry.get(commandName);

  if (!definition?.autocomplete) {
    return emptyChoices;
  }

  // Find the currently-focused option
  const focused = findFocusedOption(interaction.data.options);
  if (!focused) {
    return emptyChoices;
  }

  // Autocomplete requires a linked guild
  if (!interaction.guild_id) {
    return emptyChoices;
  }

  const supabase = createServiceRoleClient();
  const server = await getDiscordServerByGuildId(
    supabase,
    interaction.guild_id
  );
  if (!server) {
    return emptyChoices;
  }

  const community = await getCommunityById(supabase, server.community_id);
  if (!community) {
    return emptyChoices;
  }

  const userId = interaction.member?.user.id ?? interaction.user?.id ?? "";

  const choices = await definition.autocomplete({
    interaction,
    guildId: interaction.guild_id,
    userId,
    communityId: community.id,
    communitySlug: community.slug,
    focusedOption: { name: focused.name, value: String(focused.value ?? "") },
  });

  // Discord caps autocomplete responses at 25 choices
  return Response.json({
    type: InteractionResponseType.ApplicationCommandAutocompleteResult,
    data: { choices: choices.slice(0, 25) },
  });
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Build an immediate ephemeral reply (not deferred).
 * Used for pre-flight errors: invalid signature, rate limits, unlinked server.
 */
function ephemeralReply(content: string): Response {
  return Response.json({
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      content,
      flags: MessageFlags.Ephemeral,
      allowed_mentions: { parse: [] },
    },
  });
}

/**
 * Recursively find the focused option in an autocomplete payload.
 * Options can be nested inside subcommand groups and subcommands.
 */
function findFocusedOption(
  options: APIApplicationCommandAutocompleteInteraction["data"]["options"]
): { name: string; value: string | number | boolean | undefined } | undefined {
  for (const opt of options ?? []) {
    if ("focused" in opt && opt.focused) {
      return {
        name: opt.name,
        value: "value" in opt ? opt.value : undefined,
      };
    }
    if ("options" in opt && opt.options) {
      const nested = findFocusedOption(
        opt.options as APIApplicationCommandAutocompleteInteraction["data"]["options"]
      );
      if (nested) return nested;
    }
  }
  return undefined;
}
