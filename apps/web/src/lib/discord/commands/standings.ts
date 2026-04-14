/**
 * /standings [tournament?]
 *
 * Show the current standings for the active tournament.
 * Preview: top 5 players with W-L record.
 * Link to full standings page.
 */

import { type APIApplicationCommandInteractionDataStringOption } from "discord-api-types/v10";

import { getChatInputOptions } from "./shared/options";

import { listStandings } from "@trainers/supabase";

import { editInteractionResponse } from "../api";
import { buildEmbed, previewPlusLink, trainersggColor } from "../embeds";
import { createServiceRoleClient } from "@/lib/supabase/server";

import { registerCommand, type CommandHandler } from "./registry";
import { SITE_URL } from "./shared/site-url";
import { resolveTournament } from "./shared/resolve-tournament";

// =============================================================================
// Handler
// =============================================================================

const handleStandings: CommandHandler = async (ctx) => {
  const { interaction, communityId, communitySlug } = ctx;

  const tournamentOpt = getChatInputOptions(interaction).find(
    (o) => o.name === "tournament"
  ) as APIApplicationCommandInteractionDataStringOption | undefined;

  const supabase = createServiceRoleClient();
  const tournament = await resolveTournament(
    supabase,
    communityId,
    tournamentOpt?.value
  );

  if (!tournament.ok) {
    await editInteractionResponse(interaction.token, {
      embed: buildEmbed({
        description: tournament.message,
        color: trainersggColor,
      }),
    });
    return;
  }

  const standings = await listStandings(supabase, tournament.value.id, {
    limit: 5,
  });

  const url = `${SITE_URL}/communities/${communitySlug}/tournaments/${tournament.value.slug}/standings`;

  if (standings.length === 0) {
    await editInteractionResponse(interaction.token, {
      embed: buildEmbed({
        title: `Standings — ${tournament.value.name}`,
        description: `No standings yet.\n\n[View tournament](${url})`,
        color: trainersggColor,
      }),
    });
    return;
  }

  const lines = standings.map(
    (s) => `**${s.rank ?? "?"}**. ${s.player_name} — ${s.wins}-${s.losses}`
  );

  const embed = previewPlusLink(
    `Standings — ${tournament.value.name}`,
    lines,
    url,
    "View full standings"
  );

  await editInteractionResponse(interaction.token, { embed });
};

// =============================================================================
// Registration
// =============================================================================

registerCommand({
  name: "standings",
  handler: handleStandings,
});
