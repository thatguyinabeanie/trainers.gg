"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { type DiscordIntegrationOverview } from "@trainers/supabase";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type GuildChannel, type GuildRole } from "@/lib/discord/guild-cache";

import { FailureBanner } from "./_components/failure-banner";
import { InstallCard } from "./_components/install-card";
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

export function DiscordClient({ community, communitySlug, overview }: Props) {
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

      <Tabs value={currentTab} onValueChange={(v) => onTabChange(v as Tab)}>
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
          <div className="text-muted-foreground p-4 text-sm">
            Channel + DM tables render here (T17, T18).
          </div>
        </TabsContent>
        <TabsContent value="roles">
          <div className="text-muted-foreground p-4 text-sm">
            Roles table renders here (T19).
          </div>
        </TabsContent>
        <TabsContent value="failures">
          <div className="text-muted-foreground p-4 text-sm">
            Failures table renders here (T20).
          </div>
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
