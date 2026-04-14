/**
 * /standings [tournament?]
 *
 * Show the current standings for the active tournament.
 * Preview: top 5 players with W-L record.
 * Link to full standings page.
 */

import {
  ApplicationCommandOptionType,
  type APIApplicationCommandInteractionDataStringOption,
} from "discord-api-types/v10";

import { getChatInputOptions } from "./shared/options";

import {
  listStandings,
  searchTournamentsInCommunity,
} from "@trainers/supabase";

import { editInteractionResponse } from "../api";
import { buildEmbed, previewPlusLink, trainersggColor } from "../embeds";
import { createServiceRoleClient } from "@/lib/supabase/server";

import {
  registerCommand,
  type CommandHandler,
  type AutocompleteHandler,
} from "./registry";
import { SITE_URL } from "./shared/site-url";
import { resolveTournament } from "./shared/resolve-tournament";
import { cached } from "./shared/autocomplete";

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
// Autocomplete
// =============================================================================

const standingsTournamentQuery = cached(
  "tournament",
  async (supabase, communityId, partial) => {
    const rows = await searchTournamentsInCommunity(
      supabase,
      communityId,
      partial,
      {
        limit: 25,
      }
    );
    return rows.map((r) => ({ name: r.name, value: r.slug }));
  }
);

const handleStandingsAutocomplete: AutocompleteHandler = async (ctx) => {
  const supabase = createServiceRoleClient();
  return standingsTournamentQuery(
    supabase,
    ctx.communityId,
    ctx.focusedOption.value
  );
};

// =============================================================================
// Registration
// =============================================================================

registerCommand({
  name: "standings",
  description: "See the top players in a tournament",
  options: [
    {
      name: "tournament",
      description: "Which tournament? (optional — defaults to current active)",
      type: ApplicationCommandOptionType.String,
      required: false,
      autocomplete: true,
    },
  ],
  handler: handleStandings,
  autocomplete: handleStandingsAutocomplete,
});
