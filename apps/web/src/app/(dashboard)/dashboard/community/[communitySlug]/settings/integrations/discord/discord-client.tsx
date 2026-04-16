"use client";

import { type DiscordIntegrationOverview } from "@trainers/supabase";

import { type GuildChannel, type GuildRole } from "@/lib/discord/guild-cache";

interface Props {
  community: { id: number; name: string; slug: string };
  communitySlug: string;
  overview: DiscordIntegrationOverview | null;
  guildChannels: GuildChannel[] | null;
  guildRoles: GuildRole[] | null;
}

export function DiscordClient({ overview }: Props) {
  return (
    <div className="mx-auto max-w-5xl space-y-4 p-6">
      <h1 className="text-2xl font-bold">Discord</h1>
      <p className="text-muted-foreground text-sm">
        Let Beanie Bot announce events, DM players, and sync roles in your
        community&apos;s Discord server.
      </p>
      {overview === null ? (
        <div className="text-muted-foreground rounded-md border p-6">
          Not installed — install card will render here (T15).
        </div>
      ) : (
        <div className="text-muted-foreground rounded-md border p-6">
          Installed in {overview.server.guild_id}. Status header, failure
          banner, and tabs will render here (T14–T20).
        </div>
      )}
    </div>
  );
}
