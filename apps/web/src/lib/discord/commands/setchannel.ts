/**
 * /setchannel [event_type]
 *
 * Admin command — map the current channel to an event type.
 * Requires community-leader permission (owner or staff).
 */

import { type APIApplicationCommandInteractionDataStringOption } from "discord-api-types/v10";

import { getChatInputOptions } from "./shared/options";

import {
  upsertChannelMapping,
  getDiscordServerByGuildId,
} from "@trainers/supabase";

import { editInteractionResponse } from "../api";
import { buildEmbed, trainersggColor } from "../embeds";
import { createServiceRoleClient } from "@/lib/supabase/server";

import { registerCommand, type CommandHandler } from "./registry";
import { requireCommunityLeader } from "./shared/require-community-leader";

// =============================================================================
// Handler
// =============================================================================

const handleSetChannel: CommandHandler = async (ctx) => {
  const { interaction, communityId, guildId, userId } = ctx;

  const eventTypeOpt = getChatInputOptions(interaction).find(
    (o) => o.name === "event_type"
  ) as APIApplicationCommandInteractionDataStringOption | undefined;

  if (!eventTypeOpt?.value) {
    await editInteractionResponse(interaction.token, {
      embed: buildEmbed({
        description:
          "Please specify an event type. Example: `/setchannel event_type:tournament_started`",
        color: trainersggColor,
      }),
    });
    return;
  }

  const supabase = createServiceRoleClient();

  // Resolve community name for error messages
  const server = await getDiscordServerByGuildId(supabase, guildId);
  if (!server) {
    await editInteractionResponse(interaction.token, {
      embed: buildEmbed({
        description: "This server is not linked to a trainers.gg community.",
        color: trainersggColor,
      }),
    });
    return;
  }

  // Permission check
  const leader = await requireCommunityLeader(
    supabase,
    userId,
    communityId,
    "this community"
  );
  if (!leader.ok) {
    await editInteractionResponse(interaction.token, {
      embed: buildEmbed({
        description: leader.message,
        color: trainersggColor,
      }),
    });
    return;
  }

  // Get channel ID from interaction context
  const channelId = (interaction as unknown as { channel_id?: string })
    .channel_id;
  if (!channelId) {
    await editInteractionResponse(interaction.token, {
      embed: buildEmbed({
        description: "Could not determine the current channel.",
        color: trainersggColor,
      }),
    });
    return;
  }

  await upsertChannelMapping(supabase, {
    discord_server_id: server.id,
    channel_id: channelId,
    event_type: eventTypeOpt.value,
  });

  await editInteractionResponse(interaction.token, {
    embed: buildEmbed({
      title: "Channel mapped",
      description: `This channel will now receive **${eventTypeOpt.value}** notifications.`,
      color: trainersggColor,
    }),
  });
};

// =============================================================================
// Registration
// =============================================================================

registerCommand({
  name: "setchannel",
  handler: handleSetChannel,
  ephemeral: true,
});
