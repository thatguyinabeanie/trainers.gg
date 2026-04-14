/**
 * /leaderboard [scope?]
 *
 * Community leaderboard. Scope: 'current' (default) or 'all-time'.
 * Preview: top 10 by win/loss record.
 * Link to full leaderboard.
 */

import { type APIApplicationCommandInteractionDataStringOption } from "discord-api-types/v10";

import { getChatInputOptions } from "./shared/options";

import { listCommunityLeaderboard } from "@trainers/supabase";

import { editInteractionResponse } from "../api";
import { buildEmbed, previewPlusLink, trainersggColor } from "../embeds";
import { createServiceRoleClient } from "@/lib/supabase/server";

import { registerCommand, type CommandHandler } from "./registry";
import { SITE_URL } from "./shared/site-url";

// =============================================================================
// Handler
// =============================================================================

const handleLeaderboard: CommandHandler = async (ctx) => {
  const { interaction, communityId, communitySlug } = ctx;

  const scopeOpt = getChatInputOptions(interaction).find(
    (o) => o.name === "scope"
  ) as APIApplicationCommandInteractionDataStringOption | undefined;

  const scope =
    scopeOpt?.value === "all-time"
      ? ("all-time" as const)
      : ("current" as const);

  const supabase = createServiceRoleClient();
  const entries = await listCommunityLeaderboard(supabase, communityId, {
    scope,
    limit: 10,
  });

  const title =
    scope === "all-time" ? "All-Time Leaderboard" : "Current Leaderboard";

  const url = `${SITE_URL}/communities/${communitySlug}#leaderboard`;

  if (entries.length === 0) {
    await editInteractionResponse(interaction.token, {
      embed: buildEmbed({
        title,
        description: `No data yet.\n\n[View community](${url})`,
        color: trainersggColor,
      }),
    });
    return;
  }

  const lines = entries.map(
    (e) => `**${e.rank ?? "?"}**. ${e.player_name} — ${e.wins}-${e.losses}`
  );

  const embed = previewPlusLink(title, lines, url, "View full leaderboard");
  await editInteractionResponse(interaction.token, { embed });
};

// =============================================================================
// Registration
// =============================================================================

registerCommand({
  name: "leaderboard",
  handler: handleLeaderboard,
});
