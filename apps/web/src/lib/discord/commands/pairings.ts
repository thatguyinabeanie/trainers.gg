/**
 * /pairings [tournament?]
 *
 * Show current round pairings for the active tournament.
 * Preview: round number + first 10 pairings.
 * Link to bracket/pairings page.
 */

import {
  ApplicationCommandOptionType,
  type APIApplicationCommandInteractionDataStringOption,
} from "discord-api-types/v10";

import { getChatInputOptions } from "./shared/options";

import {
  listCurrentPairings,
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

const handlePairings: CommandHandler = async (ctx) => {
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

  const { pairings, roundNumber } = await listCurrentPairings(
    supabase,
    tournament.value.id,
    { limit: 10 }
  );

  const url = `${SITE_URL}/communities/${communitySlug}/tournaments/${tournament.value.slug}/bracket`;

  if (!roundNumber || pairings.length === 0) {
    await editInteractionResponse(interaction.token, {
      embed: buildEmbed({
        title: `Pairings — ${tournament.value.name}`,
        description: `No pairings posted yet.\n\n[View bracket](${url})`,
        color: trainersggColor,
      }),
    });
    return;
  }

  const lines = pairings.map((p) => {
    const table = p.table_number != null ? `Table ${p.table_number}: ` : "";
    const opponent = p.is_bye ? "BYE" : (p.player2_name ?? "TBD");
    return `${table}**${p.player1_name}** vs ${opponent}`;
  });

  const embed = previewPlusLink(
    `Round ${roundNumber} Pairings — ${tournament.value.name}`,
    [`${pairings.length} pairings`, ...lines],
    url,
    "View all pairings"
  );

  await editInteractionResponse(interaction.token, { embed });
};

// =============================================================================
// Autocomplete
// =============================================================================

const pairingsTournamentQuery = cached(
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

const handlePairingsAutocomplete: AutocompleteHandler = async (ctx) => {
  const supabase = createServiceRoleClient();
  return pairingsTournamentQuery(
    supabase,
    ctx.communityId,
    ctx.focusedOption.value
  );
};

// =============================================================================
// Registration
// =============================================================================

registerCommand({
  name: "pairings",
  description: "Show the current round's pairings",
  options: [
    {
      name: "tournament",
      description: "Which tournament? (optional — defaults to current active)",
      type: ApplicationCommandOptionType.String,
      required: false,
      autocomplete: true,
    },
  ],
  handler: handlePairings,
  autocomplete: handlePairingsAutocomplete,
});
