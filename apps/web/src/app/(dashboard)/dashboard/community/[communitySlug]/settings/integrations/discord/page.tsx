import { notFound } from "next/navigation";

import {
  getCommunityBySlug,
  getDiscordIntegrationOverview,
} from "@trainers/supabase";

import { rejectBots } from "@/actions/utils";
import { createClient } from "@/lib/supabase/server";
import {
  getCachedGuildChannels,
  getCachedGuildRoles,
} from "@/lib/discord/guild-cache";

import { DiscordClient } from "./discord-client";
import { DashboardContent } from "@/components/dashboard/dashboard-content";

interface PageProps {
  params: Promise<{ communitySlug: string }>;
}

export default async function DiscordIntegrationPage({ params }: PageProps) {
  await rejectBots();
  const { communitySlug } = await params;
  const supabase = await createClient();

  const community = await getCommunityBySlug(supabase, communitySlug);
  if (!community) notFound();

  const { data: canManage } = await supabase.rpc("has_community_permission", {
    p_community_id: community.id,
    permission_key: "community.manage",
  });
  if (!canManage) notFound();

  const overview = await getDiscordIntegrationOverview(supabase, community.id);

  let guildChannels = null;
  let guildRoles = null;
  if (overview) {
    [guildChannels, guildRoles] = await Promise.all([
      getCachedGuildChannels(overview.server.guild_id, overview.server.id),
      getCachedGuildRoles(overview.server.guild_id, overview.server.id),
    ]);
  }

  return (
    <DashboardContent>
      <DiscordClient
        community={community}
        communitySlug={communitySlug}
        overview={overview}
        guildChannels={guildChannels}
        guildRoles={guildRoles}
      />
    </DashboardContent>
  );
}
