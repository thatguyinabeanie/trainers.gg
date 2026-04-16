/**
 * /drop [tournament?]
 *
 * Drop from the active tournament. Requires a linked Discord account.
 *
 * v1 implementation: drops immediately (no confirmation button) to keep scope
 * small. A clear, permanent-sounding message is shown so users know this isn't
 * easily reversible. A follow-up task should add the button confirmation flow.
 *
 * TODO (Phase 3e): Add button confirmation using MESSAGE_COMPONENT interactions.
 * custom_id pattern: `drop:confirm:{tournamentId}:{altId}` / `drop:cancel`
 */

import {
  ApplicationCommandOptionType,
  type APIApplicationCommandInteractionDataStringOption,
} from "discord-api-types/v10";

import { getChatInputOptions } from "./shared/options";

import {
  type TypedClient,
  getUserByDiscordId,
  searchUserActiveTournamentRegistrations,
} from "@trainers/supabase";

import { editInteractionResponse } from "../api";
import { buildEmbed, trainersggColor } from "../embeds";
import { createServiceRoleClient } from "@/lib/supabase/server";

import {
  registerCommand,
  type CommandHandler,
  type AutocompleteHandler,
} from "./registry";
import { SITE_URL } from "./shared/site-url";
import { resolveTournament } from "./shared/resolve-tournament";
import { requireLinkedAccount } from "./shared/require-linked-account";

// =============================================================================
// Handler
// =============================================================================

const handleDrop: CommandHandler = async (ctx) => {
  const { interaction, communityId, communitySlug, userId } = ctx;

  const tournamentOpt = getChatInputOptions(interaction).find(
    (o) => o.name === "tournament"
  ) as APIApplicationCommandInteractionDataStringOption | undefined;

  const supabase = createServiceRoleClient();

  // Require linked account
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

  // Resolve tournament
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

  // Get user's alt for this community's tournament
  const { data: alts, error: altsError } = await (supabase as TypedClient)
    .from("alts")
    .select("id")
    .eq("user_id", linked.userId)
    .limit(1)
    .maybeSingle();

  if (altsError || !alts) {
    await editInteractionResponse(interaction.token, {
      embed: buildEmbed({
        description:
          "You don't have a player profile linked to your account. Visit trainers.gg to set one up.",
        color: trainersggColor,
      }),
    });
    return;
  }

  // Check if they are registered for this tournament
  const { data: registration, error: regError } = await (
    supabase as TypedClient
  )
    .from("tournament_registrations")
    .select("id, status")
    .eq("tournament_id", tournament.value.id)
    .eq("alt_id", alts.id)
    .maybeSingle();

  if (regError || !registration) {
    await editInteractionResponse(interaction.token, {
      embed: buildEmbed({
        description: `You are not registered for **${tournament.value.name}**.`,
        color: trainersggColor,
      }),
    });
    return;
  }

  if (registration.status === "dropped") {
    await editInteractionResponse(interaction.token, {
      embed: buildEmbed({
        description: `You have already dropped from **${tournament.value.name}**.`,
        color: trainersggColor,
      }),
    });
    return;
  }

  // Perform the drop — uses service role client so the permission check inside
  // dropPlayer must be handled differently. We pass the alt directly.
  // dropPlayer() uses getCurrentUser() internally which won't work for service role.
  // So we use the low-level mutation directly here.
  const { error: dropError } = await (supabase as TypedClient)
    .from("tournament_player_stats")
    .update({ is_dropped: true })
    .eq("tournament_id", tournament.value.id)
    .eq("alt_id", alts.id);

  if (dropError) {
    throw new Error(`Failed to mark player as dropped: ${dropError.message}`);
  }

  const { error: regUpdateError } = await (supabase as TypedClient)
    .from("tournament_registrations")
    .update({ status: "dropped" })
    .eq("tournament_id", tournament.value.id)
    .eq("alt_id", alts.id);

  if (regUpdateError) {
    console.error(
      "[/drop] Failed to update registration status:",
      regUpdateError
    );
  }

  const url = `${SITE_URL}/communities/${communitySlug}/tournaments/${tournament.value.slug}`;

  await editInteractionResponse(interaction.token, {
    embed: buildEmbed({
      title: "Dropped from tournament",
      description: `You have been dropped from **${tournament.value.name}**. This cannot be undone from Discord — contact the tournament organizer if this was a mistake.\n\n[View tournament](${url})`,
      color: trainersggColor,
    }),
  });
};

// =============================================================================
// Autocomplete
// =============================================================================

/**
 * `/drop` autocomplete: only surfaces tournaments the invoking user is
 * registered in AND still active. Returns empty when the Discord account is
 * not linked (silent — Discord shows "No matches").
 *
 * `cached` is keyed by communityId + partial, so we cannot include userId in
 * the cache key at the `cached` wrapper level. Instead, we skip caching and
 * query directly — the /drop autocomplete is user-specific, so a shared cache
 * would leak user A's registrations to user B. We call the raw query without
 * the cached() wrapper.
 */
const handleDropAutocomplete: AutocompleteHandler = async (ctx) => {
  const supabase = createServiceRoleClient();

  // Resolve Discord user → trainers.gg user (requires linked account)
  const linked = await getUserByDiscordId(supabase, ctx.userId);
  if (!linked) return [];

  const rows = await searchUserActiveTournamentRegistrations(
    supabase,
    linked.user_id,
    ctx.communityId,
    ctx.focusedOption.value,
    { limit: 25 }
  );

  return rows.map((r) => ({ name: r.name, value: r.slug }));
};

// =============================================================================
// Registration
// =============================================================================

registerCommand({
  name: "drop",
  description: "Drop from a tournament (requires linked account)",
  options: [
    {
      name: "tournament",
      description: "Which tournament? (optional — defaults to current active)",
      type: ApplicationCommandOptionType.String,
      required: false,
      autocomplete: true,
    },
  ],
  handler: handleDrop,
  autocomplete: handleDropAutocomplete,
  ephemeral: true,
});
