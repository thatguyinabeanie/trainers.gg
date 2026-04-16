/**
 * /link
 *
 * Ephemeral message with a link to /dashboard/settings/account?link=discord.
 * Triggers the existing Supabase OAuth flow to connect a Discord account.
 */

import { editInteractionResponse } from "../api";
import { buildEmbed, trainersggColor } from "../embeds";

import { registerCommand, type CommandHandler } from "./registry";
import { SITE_URL } from "./shared/site-url";

// =============================================================================
// Handler
// =============================================================================

const handleLink: CommandHandler = async (ctx) => {
  const { interaction } = ctx;

  const url = `${SITE_URL}/dashboard/settings/account?link=discord`;

  await editInteractionResponse(interaction.token, {
    embed: buildEmbed({
      title: "Link your Discord account",
      description: `Visit the link below to connect your Discord account to trainers.gg. Once linked, your Discord username will be tied to your trainers.gg profile and you'll be able to use commands like \`/drop\` and \`/team\`.\n\n[Connect your account](${url})`,
      color: trainersggColor,
    }),
  });
};

// =============================================================================
// Registration
// =============================================================================

registerCommand({
  name: "link",
  description: "Link your Discord account to trainers.gg",
  handler: handleLink,
  ephemeral: true,
});
