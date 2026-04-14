/**
 * /team [player?]
 *
 * Show a player's team sheet preview.
 * No argument → your own team (requires linked Discord account).
 * With argument → the named player's most recent public team in this community.
 * Link to the team sheet page.
 */

import {
  ApplicationCommandOptionType,
  type APIApplicationCommandInteractionDataStringOption,
} from "discord-api-types/v10";

import { getChatInputOptions } from "./shared/options";

import {
  getPlayerByUsername,
  getPublicTeamForCommunity,
} from "@trainers/supabase";

import { editInteractionResponse } from "../api";
import { buildEmbed, previewPlusLink, trainersggColor } from "../embeds";
import { createServiceRoleClient } from "@/lib/supabase/server";

import { registerCommand, type CommandHandler } from "./registry";
import { SITE_URL } from "./shared/site-url";
import { requireLinkedAccount } from "./shared/require-linked-account";

// =============================================================================
// Handler
// =============================================================================

const handleTeam: CommandHandler = async (ctx) => {
  const { interaction, communityId, communitySlug, userId } = ctx;

  const playerOpt = getChatInputOptions(interaction).find(
    (o) => o.name === "player"
  ) as APIApplicationCommandInteractionDataStringOption | undefined;

  const supabase = createServiceRoleClient();

  let targetUserId: string;
  let displayName: string;

  if (playerOpt?.value) {
    // Looking up another player's team
    const player = await getPlayerByUsername(supabase, playerOpt.value);
    if (!player) {
      await editInteractionResponse(interaction.token, {
        embed: buildEmbed({
          description: `No player found with username **${playerOpt.value}**.`,
          color: trainersggColor,
        }),
      });
      return;
    }
    targetUserId = player.userId;
    displayName = player.username;
  } else {
    // Looking up the invoking user's own team — requires linked account
    const linked = await requireLinkedAccount(supabase, userId);
    if (!linked.ok) {
      await editInteractionResponse(interaction.token, {
        embed: buildEmbed({
          description: linked.message,
          color: trainersggColor,
        }),
      });
      return;
    }
    targetUserId = linked.userId;
    displayName = "Your team";
  }

  const teamInfo = await getPublicTeamForCommunity(
    supabase,
    targetUserId,
    communityId
  );

  if (!teamInfo) {
    const who = playerOpt?.value
      ? `**${playerOpt.value}** hasn't`
      : "You haven't";
    await editInteractionResponse(interaction.token, {
      embed: buildEmbed({
        description: `${who} submitted a team in this community yet.`,
        color: trainersggColor,
      }),
    });
    return;
  }

  const lines: string[] = [`**Tournament:** ${teamInfo.tournamentName}`];
  if (teamInfo.teamName) lines.push(`**Team name:** ${teamInfo.teamName}`);

  const url = `${SITE_URL}/communities/${communitySlug}/tournaments/${teamInfo.tournamentSlug}/team-sheets`;
  const embed = previewPlusLink(
    `${displayName === "Your team" ? "Your Team" : `${displayName}'s Team`}`,
    lines,
    url,
    "View team sheet"
  );

  await editInteractionResponse(interaction.token, { embed });
};

// =============================================================================
// Registration
// =============================================================================

registerCommand({
  name: "team",
  description: "Show a team sheet (yours by default)",
  options: [
    {
      name: "player",
      description:
        "Which player's team to show? (optional — defaults to yours)",
      type: ApplicationCommandOptionType.String,
      required: false,
    },
  ],
  handler: handleTeam,
  ephemeral: false,
});
