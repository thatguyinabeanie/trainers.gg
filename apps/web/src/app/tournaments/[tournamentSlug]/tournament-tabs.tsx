"use client";

import { type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PublicPairings } from "./public-pairings";
import { TournamentStandings } from "@/components/tournaments/manage/tournament-standings";

interface TournamentTabsProps {
  description: string | null;
  scheduleCard: ReactNode;
  formatCard: ReactNode;
  sidebarCard: ReactNode;
  tournamentId: number;
  tournamentSlug: string;
  tournamentStatus: string;
  canManage?: boolean;
}

const VALID_TABS = ["overview", "pairings", "standings"] as const;

type ValidTab = (typeof VALID_TABS)[number];

function isValidTab(tab: string | null): tab is ValidTab {
  return VALID_TABS.includes(tab as ValidTab);
}

export function TournamentTabs({
  description,
  scheduleCard,
  formatCard,
  sidebarCard,
  tournamentId,
  tournamentSlug,
  tournamentStatus,
  canManage = false,
}: TournamentTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isPreTournament =
    tournamentStatus === "draft" || tournamentStatus === "upcoming";

  // Get active tab from URL or default to overview
  const tabParam = searchParams.get("tab");
  const activeTab: ValidTab = isValidTab(tabParam) ? tabParam : "overview";

  // Handle tab change - update URL without page reload
  const handleTabChange = (value: string) => {
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set("tab", value);
    router.replace(`?${newParams.toString()}`, { scroll: false });
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="overview" id="tournament-tab-overview">
          Overview
        </TabsTrigger>
        <TabsTrigger value="pairings" id="tournament-tab-pairings">
          Pairings
        </TabsTrigger>
        <TabsTrigger value="standings" id="tournament-tab-standings">
          Standings
        </TabsTrigger>
      </TabsList>

      <TabsContent
        value="overview"
        id="tournament-panel-overview"
        className="space-y-6"
      >
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main overview content */}
          <div className="space-y-6 lg:col-span-2">
            {/* Description */}
            {description && (
              <Card>
                <CardHeader>
                  <CardTitle>About</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {description}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Schedule - passed as ReactNode from server */}
            {scheduleCard}

            {/* Format - passed as ReactNode from server */}
            {formatCard}
          </div>

          {/* Registration sidebar */}
          <div className="space-y-6">{sidebarCard}</div>
        </div>
      </TabsContent>

      <TabsContent value="pairings" id="tournament-panel-pairings">
        {isPreTournament ? (
          <Card>
            <CardHeader>
              <CardTitle>Pairings</CardTitle>
              <CardDescription>Tournament pairings and results</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground py-8 text-center">
                Pairings will be available once the tournament begins
              </p>
            </CardContent>
          </Card>
        ) : (
          <PublicPairings
            tournamentId={tournamentId}
            tournamentSlug={tournamentSlug}
            canManage={canManage}
          />
        )}
      </TabsContent>

      <TabsContent value="standings" id="tournament-panel-standings">
        {isPreTournament ? (
          <Card>
            <CardHeader>
              <CardTitle>Standings</CardTitle>
              <CardDescription>Current tournament standings</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground py-8 text-center">
                Standings will appear once the tournament begins
              </p>
            </CardContent>
          </Card>
        ) : (
          <TournamentStandings
            tournament={{ id: tournamentId, status: tournamentStatus }}
          />
        )}
      </TabsContent>
    </Tabs>
  );
}
