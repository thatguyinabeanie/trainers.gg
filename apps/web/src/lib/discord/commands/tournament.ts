/**
 * /tournament [name?]
 *
 * Show details for the active tournament in this community.
 * If no name supplied, defaults to the single active tournament.
 * Preview: format, start date, registration count, status.
 * Link button to the tournament page on trainers.gg.
 */

import { type APIApplicationCommandInteractionDataStringOption } from "discord-api-types/v10";

import { getChatInputOptions } from "./shared/options";

import { editInteractionResponse } from "../api";
import { buildEmbed, previewPlusLink, trainersggColor } from "../embeds";
import { createServiceRoleClient } from "@/lib/supabase/server";

import { registerCommand, type CommandHandler } from "./registry";
import { SITE_URL } from "./shared/site-url";
import { resolveTournament } from "./shared/resolve-tournament";

// =============================================================================
// Handler
// =============================================================================

const handleTournament: CommandHandler = async (ctx) => {
  const { interaction, communityId, communitySlug } = ctx;

  const nameOpt = getChatInputOptions(interaction).find(
    (o) => o.name === "name"
  ) as APIApplicationCommandInteractionDataStringOption | undefined;

  const supabase = createServiceRoleClient();
  const result = await resolveTournament(supabase, communityId, nameOpt?.value);

  if (!result.ok) {
    await editInteractionResponse(interaction.token, {
      embed: buildEmbed({
        description: result.message,
        color: trainersggColor,
      }),
    });
    return;
  }

  const t = result.value;

  // Get registration count
  const { count } = await supabase
    .from("tournament_registrations")
    .select("*", { count: "exact", head: true })
    .eq("tournament_id", t.id);

  const lines: string[] = [];
  if (t.format) lines.push(`**Format:** ${t.format}`);
  if (t.start_date) {
    const date = new Date(t.start_date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
    lines.push(`**Date:** ${date}`);
  }
  lines.push(`**Status:** ${t.status}`);
  lines.push(`**Registered:** ${count ?? 0} players`);

  const url = `${SITE_URL}/communities/${communitySlug}/tournaments/${t.slug}`;
  const embed = previewPlusLink(t.name, lines, url, "View tournament");

  await editInteractionResponse(interaction.token, { embed });
};

// =============================================================================
// Registration
// =============================================================================

registerCommand({
  name: "tournament",
  handler: handleTournament,
});
