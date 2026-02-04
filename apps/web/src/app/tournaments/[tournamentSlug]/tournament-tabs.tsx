"use client";

import { type ReactNode } from "react";
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
  const isPreTournament =
    tournamentStatus === "draft" || tournamentStatus === "upcoming";

  return (
    <Tabs defaultValue="overview" className="w-full">
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
