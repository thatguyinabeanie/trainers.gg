"use client";

import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Users } from "lucide-react";
import {
  SectionHeader,
  ActiveTournaments,
  UpcomingTournaments,
  CompletedTournaments,
  TournamentListEmpty,
} from "@/components/tournaments/tournament-list";
import type { TournamentWithOrg } from "@trainers/supabase";

interface OrganizationTabsProps {
  tournaments: TournamentWithOrg[];
  orgSlug: string;
  canManage: boolean;
}

export function OrganizationTabs({
  tournaments,
  orgSlug,
  canManage,
}: OrganizationTabsProps) {
  // Group tournaments by status
  const groupedTournaments = {
    active: tournaments.filter((t) => t.status === "active"),
    upcoming: tournaments.filter((t) => t.status === "upcoming"),
    completed: tournaments.filter((t) => t.status === "completed"),
  };

  const hasTournaments = tournaments.length > 0;

  return (
    <Tabs defaultValue="tournaments" className="space-y-6">
      <TabsList>
        <TabsTrigger value="tournaments" className="gap-2">
          <Trophy className="h-4 w-4" />
          Tournaments
        </TabsTrigger>
        <TabsTrigger value="staff" className="gap-2">
          <Users className="h-4 w-4" />
          Staff
        </TabsTrigger>
      </TabsList>

      <TabsContent value="tournaments">
        {!hasTournaments ? (
          <TournamentListEmpty
            title="No tournaments yet"
            description="This organization hasn't created any tournaments"
          >
            {canManage && (
              <Link href={`/to-dashboard/${orgSlug}/tournaments/create`}>
                <Button className="mt-4">
                  <Trophy className="mr-2 h-4 w-4" />
                  Create Tournament
                </Button>
              </Link>
            )}
          </TournamentListEmpty>
        ) : (
          <div className="space-y-2">
            {groupedTournaments.active.length > 0 && (
              <>
                <SectionHeader
                  title="In Progress"
                  count={groupedTournaments.active.length}
                />
                <ActiveTournaments
                  tournaments={groupedTournaments.active}
                  showOrganization={false}
                />
              </>
            )}

            {groupedTournaments.upcoming.length > 0 && (
              <>
                <SectionHeader
                  title="Upcoming"
                  count={groupedTournaments.upcoming.length}
                />
                <UpcomingTournaments
                  tournaments={groupedTournaments.upcoming}
                  showOrganization={false}
                />
              </>
            )}

            {groupedTournaments.completed.length > 0 && (
              <>
                <SectionHeader
                  title="Completed"
                  count={groupedTournaments.completed.length}
                />
                <CompletedTournaments
                  tournaments={groupedTournaments.completed}
                  showOrganization={false}
                />
              </>
            )}
          </div>
        )}
      </TabsContent>

      <TabsContent value="staff">
        <Card>
          <CardHeader>
            <CardTitle>Staff</CardTitle>
            <CardDescription>
              People who are part of this organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground py-8 text-center">
              Staff list coming soon
            </p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
