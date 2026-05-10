"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OverviewTab } from "./overview-tab";
import { TournamentsTab } from "./tournaments-tab";
import { TeamsTab } from "./teams-tab";

type PlayerTab =
  | "overview"
  | "tournaments"
  | "teams"
  | "articles"
  | "achievements";

/** Mapping of alt ID to username for display labels */
export type AltMap = Record<number, string>;

interface PlayerProfileTabsProps {
  /** All alt IDs (used for stats — always aggregate) */
  allAltIds: number[];
  /** Public alt IDs only (used for tournament list when not owner) */
  publicAltIds: number[];
  /** Whether the viewer is the profile owner */
  isOwner: boolean;
  /** Alt ID → username mapping for labels */
  altMap: AltMap;
  /** The user's handle, used for cache keys */
  handle: string;
}

const TAB_TRIGGER_CLASS =
  "data-[state=active]:border-primary hover:bg-muted/50 flex-1 rounded-none border-b-2 border-transparent px-4 py-3 font-semibold transition-colors data-[state=active]:bg-transparent sm:flex-initial";

/**
 * Tab switcher for the player profile page.
 * Renders 5 tabs: Overview, Tournaments, Teams, Articles, Achievements.
 */
export function PlayerProfileTabs({
  allAltIds,
  publicAltIds,
  isOwner,
  altMap,
  handle,
}: PlayerProfileTabsProps) {
  const [activeTab, setActiveTab] = useState<PlayerTab>("overview");

  // Stats always aggregate all alts; tournament list depends on ownership
  const tournamentAltIds = isOwner ? allAltIds : publicAltIds;

  return (
    <div className="space-y-4">
      {/* Tab switcher */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as PlayerTab)}
      >
        <TabsList
          variant="line"
          className="h-auto w-full justify-start gap-0 rounded-none border-none bg-transparent p-0"
        >
          <TabsTrigger value="overview" className={TAB_TRIGGER_CLASS}>
            Overview
          </TabsTrigger>
          <TabsTrigger value="tournaments" className={TAB_TRIGGER_CLASS}>
            Tournaments
          </TabsTrigger>
          <TabsTrigger value="teams" className={TAB_TRIGGER_CLASS}>
            Teams
          </TabsTrigger>
          <TabsTrigger value="articles" className={TAB_TRIGGER_CLASS}>
            Articles
          </TabsTrigger>
          <TabsTrigger value="achievements" className={TAB_TRIGGER_CLASS}>
            Achievements
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Bottom border */}
      <div className="border-border -mt-4 border-b" />

      {/* Tab content */}
      {activeTab === "overview" && (
        <OverviewTab
          statsAltIds={allAltIds}
          tournamentAltIds={tournamentAltIds}
          altMap={altMap}
          handle={handle}
        />
      )}
      {activeTab === "tournaments" && (
        <TournamentsTab
          altIds={tournamentAltIds}
          allAltIds={allAltIds}
          isOwner={isOwner}
          altMap={altMap}
          handle={handle}
        />
      )}
      {activeTab === "teams" && (
        <TeamsTab altIds={tournamentAltIds} handle={handle} />
      )}
      {activeTab === "articles" && (
        <div className="text-muted-foreground py-12 text-center text-sm">
          Articles coming soon.
        </div>
      )}
      {activeTab === "achievements" && (
        <div className="text-muted-foreground py-12 text-center text-sm">
          Achievements coming soon.
        </div>
      )}
    </div>
  );
}
