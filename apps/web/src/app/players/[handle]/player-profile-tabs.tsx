"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OverviewTab } from "./overview-tab";

type PlayerTab = "overview" | "tournaments";

interface PlayerProfileTabsProps {
  /** All alt IDs for this user (stats aggregate across all alts) */
  altIds: number[];
  /** The user's handle, used for cache keys */
  handle: string;
}

/**
 * Tab switcher for the player profile page.
 * Renders "Overview" and "Tournaments" tabs using the line variant.
 */
export function PlayerProfileTabs({ altIds, handle }: PlayerProfileTabsProps) {
  const [activeTab, setActiveTab] = useState<PlayerTab>("overview");

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
          <TabsTrigger
            value="overview"
            className="data-[state=active]:border-primary hover:bg-muted/50 flex-1 rounded-none border-b-2 border-transparent px-4 py-3 font-semibold transition-colors data-[state=active]:bg-transparent sm:flex-initial"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="tournaments"
            className="data-[state=active]:border-primary hover:bg-muted/50 flex-1 rounded-none border-b-2 border-transparent px-4 py-3 font-semibold transition-colors data-[state=active]:bg-transparent sm:flex-initial"
          >
            Tournaments
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Bottom border */}
      <div className="border-border -mt-4 border-b" />

      {/* Tab content */}
      {activeTab === "overview" ? (
        <OverviewTab altIds={altIds} handle={handle} />
      ) : (
        <div className="text-muted-foreground py-12 text-center text-sm">
          Full tournament history coming soon.
        </div>
      )}
    </div>
  );
}
