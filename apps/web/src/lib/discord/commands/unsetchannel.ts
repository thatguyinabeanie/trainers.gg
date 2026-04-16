/**
 * /unsetchannel [event_type]
 *
 * Admin command — remove the channel mapping for an event type.
 * Requires community-leader permission.
 */

import {
  ApplicationCommandOptionType,
  type APIApplicationCommandInteractionDataStringOption,
} from "discord-api-types/v10";

import { getChatInputOptions } from "./shared/options";

import {
  getDiscordServerByGuildId,
  getChannelMappingsForEvent,
  deleteChannelMapping,
} from "@trainers/supabase";

import { editInteractionResponse } from "../api";
import { buildEmbed, trainersggColor } from "../embeds";
import { createServiceRoleClient } from "@/lib/supabase/server";

import { registerCommand, type CommandHandler } from "./registry";
import { requireCommunityLeader } from "./shared/require-community-leader";

// =============================================================================
// Handler
// =============================================================================

const handleUnsetChannel: CommandHandler = async (ctx) => {
  const { interaction, communityId, guildId, userId } = ctx;

  const eventTypeOpt = getChatInputOptions(interaction).find(
    (o) => o.name === "event_type"
  ) as APIApplicationCommandInteractionDataStringOption | undefined;

  if (!eventTypeOpt?.value) {
    await editInteractionResponse(interaction.token, {
      embed: buildEmbed({
        description:
          "Please specify an event type. Example: `/unsetchannel event_type:tournament_started`",
        color: trainersggColor,
      }),
    });
    return;
  }

  const supabase = createServiceRoleClient();

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

  // Find the specific mapping for this channel + event type
  const mappings = await getChannelMappingsForEvent(
    supabase,
    server.id,
    eventTypeOpt.value
  );
  const mapping = mappings.find((m) => m.channel_id === channelId);

  if (!mapping) {
    await editInteractionResponse(interaction.token, {
      embed: buildEmbed({
        description: `This channel is not mapped to **${eventTypeOpt.value}**.`,
        color: trainersggColor,
      }),
    });
    return;
  }

  await deleteChannelMapping(supabase, mapping.id);

  await editInteractionResponse(interaction.token, {
    embed: buildEmbed({
      title: "Channel mapping removed",
      description: `This channel will no longer receive **${eventTypeOpt.value}** notifications.`,
      color: trainersggColor,
    }),
  });
};

// =============================================================================
// Registration
// =============================================================================

registerCommand({
  name: "unsetchannel",
  description: "Remove a channel mapping (leaders only)",
  options: [
    {
      name: "event_type",
      description: "The event type mapping to remove",
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: [
        { name: "Tournament started", value: "tournament_started" },
        { name: "Round posted", value: "round_posted" },
        { name: "Tournament completed", value: "tournament_completed" },
        { name: "Registration opened", value: "registration_opened" },
        { name: "Registration closed", value: "registration_closed" },
      ],
    },
  ],
  defaultMemberPermissions: "16",
  handler: handleUnsetChannel,
  ephemeral: true,
});
