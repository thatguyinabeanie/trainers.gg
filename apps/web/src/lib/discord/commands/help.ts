/**
 * /help
 *
 * List all slash commands, categorized. Unscoped — works in any server,
 * even ones not linked to a trainers.gg community.
 */

import { editInteractionResponse } from "../api";
import { buildEmbed, trainersggColor } from "../embeds";

import { registerCommand, type CommandHandler } from "./registry";
import { SITE_URL } from "./shared/site-url";

// =============================================================================
// Handler
// =============================================================================

const handleHelp: CommandHandler = async (ctx) => {
  const { interaction } = ctx;

  const sections = [
    {
      heading: "**Tournament Info**",
      commands: [
        "`/tournament [name]` — Tournament details and status",
        "`/standings [tournament]` — Top 5 standings with W-L record",
        "`/pairings [tournament]` — Current round pairings",
        "`/events` — Upcoming tournaments in this community",
      ],
    },
    {
      heading: "**Players**",
      commands: [
        "`/player <username>` — Player profile and community record",
        "`/team [player]` — Team sheet preview (own team if no player given)",
        "`/leaderboard [scope]` — Top 10 players (`current` or `all-time`)",
      ],
    },
    {
      heading: "**Tournament Actions**",
      commands: ["`/drop [tournament]` — Drop from the active tournament"],
    },
    {
      heading: "**Account**",
      commands: ["`/link` — Connect your Discord to your trainers.gg account"],
    },
    {
      heading: "**Admin** *(community leaders only)*",
      commands: [
        "`/setchannel <event_type>` — Map this channel to an event type",
        "`/unsetchannel <event_type>` — Remove a channel mapping",
        "`/channels` — List all current channel mappings",
      ],
    },
  ];

  const lines: string[] = [];
  for (const section of sections) {
    lines.push(section.heading);
    for (const cmd of section.commands) {
      lines.push(`  ${cmd}`);
    }
    lines.push("");
  }

  lines.push(`[Learn more at ${SITE_URL}](${SITE_URL})`);

  await editInteractionResponse(interaction.token, {
    embed: buildEmbed({
      title: "Beanie Bot — Command Reference",
      description: lines.join("\n"),
      color: trainersggColor,
    }),
  });
};

// =============================================================================
// Registration
// =============================================================================

registerCommand({
  name: "help",
  description: "Show all Beanie Bot commands",
  handler: handleHelp,
  unscoped: true,
  ephemeral: true,
});
