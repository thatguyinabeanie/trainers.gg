/**
 * /player [username]
 *
 * Show a player's profile. Preview: community ELO, W-L, last played.
 * Link button to the global player profile page.
 */

import { type APIApplicationCommandInteractionDataStringOption } from "discord-api-types/v10";

import { getChatInputOptions } from "./shared/options";

import {
  getPlayerByUsername,
  getPlayerCommunityStats,
} from "@trainers/supabase";

import { editInteractionResponse } from "../api";
import { buildEmbed, previewPlusLink, trainersggColor } from "../embeds";
import { createServiceRoleClient } from "@/lib/supabase/server";

import { registerCommand, type CommandHandler } from "./registry";
import { SITE_URL } from "./shared/site-url";

// =============================================================================
// Handler
// =============================================================================

const handlePlayer: CommandHandler = async (ctx) => {
  const { interaction, communityId } = ctx;

  const usernameOpt = getChatInputOptions(interaction).find(
    (o) => o.name === "username"
  ) as APIApplicationCommandInteractionDataStringOption | undefined;

  if (!usernameOpt?.value) {
    await editInteractionResponse(interaction.token, {
      embed: buildEmbed({
        description:
          "Please provide a username. Example: `/player ash_ketchum`",
        color: trainersggColor,
      }),
    });
    return;
  }

  const supabase = createServiceRoleClient();
  const player = await getPlayerByUsername(supabase, usernameOpt.value);

  if (!player) {
    await editInteractionResponse(interaction.token, {
      embed: buildEmbed({
        description: `No player found with username **${usernameOpt.value}**.`,
        color: trainersggColor,
      }),
    });
    return;
  }

  const stats = await getPlayerCommunityStats(
    supabase,
    player.userId,
    communityId
  );

  const lines: string[] = [
    `**Record:** ${stats.wins}-${stats.losses}`,
    `**Tournaments played:** ${stats.tournamentsPlayed}`,
  ];

  if (stats.lastPlayedAt) {
    const date = new Date(stats.lastPlayedAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
    lines.push(`**Last played:** ${date}`);
  }

  if (player.country) {
    lines.push(`**Country:** ${player.country}`);
  }

  const url = `${SITE_URL}/players/${player.username}`;
  const embed = previewPlusLink(
    player.username,
    lines,
    url,
    "View full profile"
  );

  await editInteractionResponse(interaction.token, { embed });
};

// =============================================================================
// Registration
// =============================================================================

registerCommand({
  name: "player",
  handler: handlePlayer,
});
