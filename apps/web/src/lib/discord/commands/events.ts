/**
 * /events
 *
 * List upcoming tournaments in this community (max 5).
 * Link to the community events page.
 */

import { listUpcomingTournaments } from "@trainers/supabase";

import { editInteractionResponse } from "../api";
import { buildEmbed, previewPlusLink, trainersggColor } from "../embeds";
import { createServiceRoleClient } from "@/lib/supabase/server";

import { registerCommand, type CommandHandler } from "./registry";
import { SITE_URL } from "./shared/site-url";

// =============================================================================
// Handler
// =============================================================================

const handleEvents: CommandHandler = async (ctx) => {
  const { interaction, communityId, communitySlug } = ctx;

  const supabase = createServiceRoleClient();
  const tournaments = await listUpcomingTournaments(supabase, communityId, {
    limit: 5,
  });

  const url = `${SITE_URL}/communities/${communitySlug}`;

  if (tournaments.length === 0) {
    await editInteractionResponse(interaction.token, {
      embed: buildEmbed({
        title: "Upcoming Events",
        description: `No upcoming tournaments at the moment.\n\n[Visit community page](${url})`,
        color: trainersggColor,
      }),
    });
    return;
  }

  const lines = tournaments.map((t) => {
    const parts: string[] = [`**${t.name}**`];
    if (t.format) parts.push(`(${t.format})`);
    if (t.start_date) {
      const date = new Date(t.start_date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      });
      parts.push(`— ${date}`);
    }
    parts.push(`[${t.status}]`);
    return parts.join(" ");
  });

  const embed = previewPlusLink(
    "Upcoming Events",
    lines,
    url,
    "View all events"
  );

  await editInteractionResponse(interaction.token, { embed });
};

// =============================================================================
// Registration
// =============================================================================

registerCommand({
  name: "events",
  handler: handleEvents,
});
