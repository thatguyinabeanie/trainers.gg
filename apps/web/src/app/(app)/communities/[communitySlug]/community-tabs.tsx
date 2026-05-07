"use client";

import Link from "next/link";
import { Trophy, BookOpen } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { EmptyState } from "@/components/ui/empty-state";
import {
  SectionHeader,
  ActiveTournaments,
  UpcomingTournaments,
  CompletedTournaments,
  TournamentListEmpty,
} from "@/components/tournaments/tournament-list";
import type { TournamentWithOrg } from "@trainers/supabase";

interface CommunityTabsProps {
  about: string | null;
  tournaments: TournamentWithOrg[];
  communitySlug: string;
  canManage: boolean;
}

export function CommunityTabs({
  about,
  tournaments,
  communitySlug,
  canManage,
}: CommunityTabsProps) {
  const grouped = {
    active: tournaments.filter((t) => t.status === "active"),
    upcoming: tournaments.filter((t) => t.status === "upcoming"),
    completed: tournaments.filter((t) => t.status === "completed"),
  };

  const hasTournaments = tournaments.length > 0;

  return (
    <Tabs defaultValue="about">
      <TabsList>
        <TabsTrigger value="about">About</TabsTrigger>
        <TabsTrigger value="tournaments">
          Tournaments{hasTournaments ? ` (${tournaments.length})` : ""}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="about" className="mt-6">
        {about ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6 sm:p-8">
              <MarkdownContent content={about} />
            </CardContent>
          </Card>
        ) : (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <EmptyState
                icon={BookOpen}
                title="No about page yet"
                description={
                  canManage
                    ? undefined
                    : "This community hasn't added an about page yet"
                }
                action={
                  canManage ? (
                    <Button
                      variant="outline"
                      className="mt-2"
                      render={
                        <Link
                          href={`/dashboard/community/${communitySlug}/settings`}
                        />
                      }
                    >
                      Add one in Settings
                    </Button>
                  ) : undefined
                }
              />
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="tournaments" className="mt-6">
        {canManage && hasTournaments && (
          <div className="mb-4 flex justify-end">
            <Link
              href={`/dashboard/community/${communitySlug}/tournaments/create`}
            >
              <Button size="sm">
                <Trophy className="mr-2 h-4 w-4" />
                Create Tournament
              </Button>
            </Link>
          </div>
        )}

        {!hasTournaments ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <TournamentListEmpty
                title="No tournaments yet"
                description="This community hasn't created any tournaments"
              >
                {canManage && (
                  <Link
                    href={`/dashboard/community/${communitySlug}/tournaments/create`}
                  >
                    <Button className="mt-4">
                      <Trophy className="mr-2 h-4 w-4" />
                      Create Tournament
                    </Button>
                  </Link>
                )}
              </TournamentListEmpty>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {grouped.active.length > 0 && (
              <div>
                <SectionHeader
                  title="In Progress"
                  count={grouped.active.length}
                />
                <ActiveTournaments
                  tournaments={grouped.active}
                  showOrganization={false}
                />
              </div>
            )}

            {grouped.upcoming.length > 0 && (
              <div>
                <SectionHeader
                  title="Upcoming"
                  count={grouped.upcoming.length}
                />
                <UpcomingTournaments
                  tournaments={grouped.upcoming}
                  showOrganization={false}
                />
              </div>
            )}

            {grouped.completed.length > 0 && (
              <div>
                <SectionHeader
                  title="Completed"
                  count={grouped.completed.length}
                />
                <CompletedTournaments
                  tournaments={grouped.completed}
                  showOrganization={false}
                />
              </div>
            )}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
