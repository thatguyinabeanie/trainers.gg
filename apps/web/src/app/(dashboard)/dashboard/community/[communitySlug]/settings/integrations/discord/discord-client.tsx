"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { type DiscordIntegrationOverview } from "@trainers/supabase";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type GuildChannel, type GuildRole } from "@/lib/discord/guild-cache";

import { ActivityFeed } from "@/components/discord/activity-feed";
import { BotHealthIndicator } from "@/components/discord/bot-health-indicator";
import { ChannelMappingTable } from "@/components/discord/channel-mapping-table";
import { DeliveryStatsCard } from "@/components/discord/delivery-stats-card";
import { DmSettingsTable } from "@/components/discord/dm-settings-table";
import { EmbedColorPicker } from "@/components/discord/embed-color-picker";
import { EmbedPreview } from "@/components/discord/embed-preview";
import { FailureBanner } from "@/components/discord/failure-banner";
import { FailuresTabContent } from "@/components/discord/failures-tab-content";
import { InstallCard } from "@/components/discord/install-card";
import { PingRoleConfig } from "@/components/discord/ping-role-config";
import { RecommendedDefaultsButton } from "@/components/discord/recommended-defaults-button";
import { RoleMappingTable } from "@/components/discord/role-mapping-table";
import { SetupWizard } from "@/components/discord/setup-wizard";
import { StatusHeader } from "@/components/discord/status-header";
import { TournamentAutomationSettings } from "@/components/discord/tournament-automation-settings";
import { VerifiedRoleConfig } from "@/components/discord/verified-role-config";

import {
  getDeliveryStatsAction,
  getActivityFeedAction,
  type DeliveryStatsData,
  type ActivityItem,
} from "@/actions/discord-integration";

// =============================================================================
// Types
// =============================================================================

type Tab = "overview" | "notifications" | "roles" | "automation" | "failures";

const TABS: Tab[] = [
  "overview",
  "notifications",
  "roles",
  "automation",
  "failures",
];

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
  const currentTab: Tab = isTab(rawTab) ? rawTab : "overview";

  // Local state for async-loaded data
  const [stats, setStats] = useState<DeliveryStatsData | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [statsLoaded, setStatsLoaded] = useState(false);
  const [wizardDismissed, setWizardDismissed] = useState(false);

  // Reset stats when overview changes (e.g., after router.refresh())
  const prevOverviewRef = useRef(overview);
  useEffect(() => {
    if (prevOverviewRef.current !== overview) {
      prevOverviewRef.current = overview;
      setStatsLoaded(false);
      setStats(null);
      setActivities([]);
    }
  }, [overview]);

  // Determine if setup wizard should be shown
  const settings = (overview?.server?.settings ?? {}) as Record<
    string,
    unknown
  >;
  const setupCompleted = settings.setup_completed === true;
  const showWizard = !!overview && !setupCompleted && !wizardDismissed;

  // Derive loading state — loading when we should fetch but haven't finished yet
  const shouldLoadStats =
    !!overview && currentTab === "overview" && !statsLoaded;
  const isLoadingStats = shouldLoadStats;

  // Load stats and activity when overview tab is active
  useEffect(() => {
    if (!overview || currentTab !== "overview" || statsLoaded) return;
    let cancelled = false;
    Promise.all([
      getDeliveryStatsAction(overview.server.id),
      getActivityFeedAction(overview.server.id),
    ])
      .then(([statsResult, activityResult]) => {
        if (cancelled) return;
        if (statsResult.success) setStats(statsResult.data);
        if (activityResult.success) setActivities(activityResult.data);
        setStatsLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setStatsLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [overview, currentTab, statsLoaded]);

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

  // Show setup wizard for new installations
  if (showWizard) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 p-6">
        <PageHeader />
        <SetupWizard
          serverId={overview.server.id}
          communityId={community.id}
          communityName={community.name}
          guildChannels={(guildChannels ?? []).map((c) => ({
            id: c.id,
            name: c.name,
            type: c.type,
          }))}
          guildRoles={(guildRoles ?? []).map((r) => ({
            id: r.id,
            name: r.name,
            color: r.color,
          }))}
          onComplete={() => {
            setWizardDismissed(true);
            router.refresh();
          }}
        />
      </div>
    );
  }

  const failureCount = overview.recentFailureCount;
  const embedColor = (settings.embed_color as string) ?? "#0D9488";

  // Derive automation settings from existing channel mappings
  const automationSettings = {
    roundPostedChannel:
      overview.channelMappings.find((m) => m.event_type === "round_posted")
        ?.channel_id ?? null,
    roundPostedMappingId:
      overview.channelMappings.find((m) => m.event_type === "round_posted")
        ?.id ?? null,
    standingsChannel:
      overview.channelMappings.find((m) => m.event_type === "standings_posted")
        ?.channel_id ?? null,
    standingsMappingId:
      overview.channelMappings.find((m) => m.event_type === "standings_posted")
        ?.id ?? null,
    registrationReminderChannel:
      overview.channelMappings.find(
        (m) => m.event_type === "registration_closing_soon"
      )?.channel_id ?? null,
    registrationReminderMinutes:
      (settings.registration_reminder_minutes as number) ?? null,
    checkInReminderEnabled: overview.dmSettings.some(
      (s) => s.event_type === "check_in_reminder"
    ),
  };

  // Derive verified role from role mappings
  const verifiedMapping = overview.roleMappings.find(
    (m) => m.role_type === "verified"
  );

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-6">
      <PageHeader />
      {/* Status header + health */}
      <StatusHeader
        server={overview.server}
        communitySlug={communitySlug}
        communityId={community.id}
      />
      {stats && (
        <BotHealthIndicator
          lastDeliveryAt={
            activities.length > 0 ? activities[0]!.createdAt : null
          }
          recentFailureCount={failureCount}
          totalDeliveries24h={
            stats.channelMessages + stats.dmsDelivered + stats.roleSyncs
          }
        />
      )}
      {/* Failure banner */}
      {failureCount > 0 && (
        <FailureBanner
          count={failureCount}
          onView={() => onTabChange("failures")}
        />
      )}

      <Tabs
        value={currentTab}
        onValueChange={(v) => onTabChange(isTab(v) ? v : "overview")}
      >
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
          <TabsTrigger value="failures" className="gap-2">
            Failures
            {failureCount > 0 && (
              <span className="bg-destructive text-destructive-foreground rounded-full px-2 py-0.5 text-[10px] font-semibold">
                {failureCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="space-y-4">
            {stats && <DeliveryStatsCard stats={stats} />}
            <div className="grid gap-4 md:grid-cols-2">
              <ActivityFeed
                activities={activities}
                isLoading={isLoadingStats}
              />
              <div className="space-y-4">
                <EmbedPreview
                  embedColor={embedColor}
                  eventType="tournament_created"
                  communityName={community.name}
                />
              </div>
            </div>
            <RecommendedDefaultsButton
              serverId={overview.server.id}
              communityId={community.id}
              guildChannels={(guildChannels ?? []).map((c) => ({
                id: c.id,
                name: c.name,
                type: c.type,
              }))}
               onApplied={() => router.refresh()}
            />
          </div>
        </TabsContent>

        {/* Notifications Tab */}
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
            <EmbedColorPicker
              currentColor={embedColor}
              serverId={overview.server.id}
              communityId={community.id}
            />
            <PingRoleConfig
              channelMappings={overview.channelMappings.map((m) => ({
                id: m.id,
                eventType: m.event_type,
                channelId: m.channel_id,
                pingRoleId: m.ping_role_id ?? null,
              }))}
              guildRoles={(guildRoles ?? []).map((r) => ({
                id: r.id,
                name: r.name,
                color: r.color,
              }))}
              communityId={community.id}
            />
          </div>
        </TabsContent>

        {/* Roles Tab */}
        <TabsContent value="roles">
          <div className="space-y-4">
            <RoleMappingTable
              roleMappings={overview.roleMappings}
              guildRoles={guildRoles ?? []}
              serverId={overview.server.id}
              communityId={community.id}
              hasHierarchyViolation={false}
            />
            <VerifiedRoleConfig
              currentRoleId={verifiedMapping?.discord_role_id ?? null}
              guildRoles={(guildRoles ?? []).map((r) => ({
                id: r.id,
                name: r.name,
                color: r.color,
              }))}
              serverId={overview.server.id}
              communityId={community.id}
              enabled={verifiedMapping?.enabled ?? false}
            />
          </div>
        </TabsContent>

        {/* Automation Tab */}
        <TabsContent value="automation">
          <TournamentAutomationSettings
            serverId={overview.server.id}
            communityId={community.id}
            guildChannels={(guildChannels ?? []).map((c) => ({
              id: c.id,
              name: c.name,
              type: c.type,
            }))}
            settings={automationSettings}
          />
        </TabsContent>

        {/* Failures Tab */}
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
