"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { type DiscordIntegrationOverview } from "@trainers/supabase";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type GuildChannel, type GuildRole } from "@/lib/discord/guild-cache";

import { ChannelMappingTable } from "./_components/channel-mapping-table";
import { DmSettingsTable } from "./_components/dm-settings-table";
import { FailureBanner } from "./_components/failure-banner";
import { FailuresTabContent } from "./_components/failures-tab-content";
import { InstallCard } from "./_components/install-card";
import { RoleMappingTable } from "./_components/role-mapping-table";
import { StatusHeader } from "./_components/status-header";

// =============================================================================
// Types
// =============================================================================

type Tab = "notifications" | "roles" | "failures";

const TABS: Tab[] = ["notifications", "roles", "failures"];

function isTab(v: string | null): v is Tab {
  return v !== null && (TABS as string[]).includes(v);
}

interface Props {
  community: { id: number; name: string; slug: string };
  communitySlug: string;
  overview: DiscordIntegrationOverview | null;
  guildChannels: GuildChannel[] | null;
  guildRoles: GuildRole[] | null;
}

// =============================================================================
// Component
// =============================================================================

export function DiscordClient({
  community,
  communitySlug,
  overview,
  guildChannels,
  guildRoles,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab");
  const currentTab: Tab = isTab(rawTab) ? rawTab : "notifications";

  function onTabChange(tab: Tab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  if (overview === null) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 p-6">
        <PageHeader />
        <InstallCard communityId={community.id} />
      </div>
    );
  }

  const failureCount = overview.recentFailureCount;

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-6">
      <PageHeader />
      {/* Status header */}
      <StatusHeader
        server={overview.server}
        communitySlug={communitySlug}
        communityId={community.id}
      />
      {/* Failure banner */}
      {failureCount > 0 && (
        <FailureBanner
          count={failureCount}
          onView={() => onTabChange("failures")}
        />
      )}

      <Tabs
        value={currentTab}
        onValueChange={(v) => onTabChange(isTab(v) ? v : "notifications")}
      >
        <TabsList>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="failures" className="gap-2">
            Failures
            {failureCount > 0 && (
              <span className="bg-destructive text-destructive-foreground rounded-full px-2 py-0.5 text-[10px] font-semibold">
                {failureCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="notifications">
          <div className="space-y-4">
            <ChannelMappingTable
              channelMappings={overview.channelMappings}
              guildChannels={guildChannels ?? []}
              serverId={overview.server.id}
              communityId={community.id}
            />
            <DmSettingsTable
              dmSettings={overview.dmSettings}
              guildChannels={guildChannels ?? []}
              serverId={overview.server.id}
              communityId={community.id}
            />
          </div>
        </TabsContent>
        <TabsContent value="roles">
          <RoleMappingTable
            roleMappings={overview.roleMappings}
            guildRoles={guildRoles ?? []}
            serverId={overview.server.id}
            communityId={community.id}
            hasHierarchyViolation={false}
          />
        </TabsContent>
        <TabsContent value="failures">
          {failureCount > 0 ? (
            <FailuresTabContent
              failureCount={failureCount}
              serverId={overview.server.id}
            />
          ) : (
            <div className="text-muted-foreground p-4 text-sm">
              No failures in the last 24 hours.
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

function PageHeader() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Discord</h1>
      <p className="text-muted-foreground text-sm">
        Let Beanie Bot announce events, DM players, and sync roles in your
        community&apos;s Discord server.
      </p>
    </div>
  );
}
