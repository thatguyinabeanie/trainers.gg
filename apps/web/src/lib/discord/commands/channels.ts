/**
 * /channels
 *
 * Admin command — list all channel-to-event-type mappings for this server.
 * Requires community-leader permission.
 */

import {
  getDiscordServerByGuildId,
  listChannelMappings,
} from "@trainers/supabase";

import { editInteractionResponse } from "../api";
import { buildEmbed, trainersggColor } from "../embeds";
import { createServiceRoleClient } from "@/lib/supabase/server";

import { registerCommand, type CommandHandler } from "./registry";
import { requireCommunityLeader } from "./shared/require-community-leader";

// =============================================================================
// Handler
// =============================================================================

const handleChannels: CommandHandler = async (ctx) => {
  const { interaction, communityId, guildId, userId } = ctx;

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

  const mappings = await listChannelMappings(supabase, server.id);

  if (mappings.length === 0) {
    await editInteractionResponse(interaction.token, {
      embed: buildEmbed({
        title: "Channel Mappings",
        description:
          "No channels configured yet. Use `/setchannel` to map a channel to an event type.",
        color: trainersggColor,
      }),
    });
    return;
  }

  const lines = mappings.map((m) => `<#${m.channel_id}> → **${m.event_type}**`);

  await editInteractionResponse(interaction.token, {
    embed: buildEmbed({
      title: "Channel Mappings",
      description: lines.join("\n"),
      color: trainersggColor,
    }),
  });
};

// =============================================================================
// Registration
// =============================================================================

registerCommand({
  name: "channels",
  handler: handleChannels,
  ephemeral: true,
});
