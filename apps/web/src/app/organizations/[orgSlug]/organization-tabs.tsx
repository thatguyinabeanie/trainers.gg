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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Users, Calendar } from "lucide-react";

type TournamentStatus =
  | "draft"
  | "upcoming"
  | "active"
  | "completed"
  | "cancelled";

const statusColors: Record<TournamentStatus, string> = {
  draft: "bg-gray-100 text-gray-800",
  upcoming: "bg-blue-100 text-blue-800",
  active: "bg-green-100 text-green-800",
  completed: "bg-purple-100 text-purple-800",
  cancelled: "bg-red-100 text-red-800",
};

interface Tournament {
  id: number;
  name: string;
  slug: string;
  status: string | null;
  start_date: string | null;
  max_participants: number | null;
  registrationCount?: number;
}

interface OrganizationTabsProps {
  tournaments: Tournament[];
  orgSlug: string;
  isOwner: boolean;
}

export function OrganizationTabs({
  tournaments,
  orgSlug,
  isOwner,
}: OrganizationTabsProps) {
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
        {tournaments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Trophy className="text-muted-foreground mb-4 h-12 w-12" />
              <h3 className="mb-2 text-lg font-semibold">No tournaments yet</h3>
              <p className="text-muted-foreground mb-4 text-center">
                This organization hasn&apos;t created any tournaments
              </p>
              {isOwner && (
                <Link href={`/to-dashboard/${orgSlug}/tournaments/create`}>
                  <Button>
                    <Trophy className="mr-2 h-4 w-4" />
                    Create Tournament
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tournaments.map((tournament) => (
              <Link
                key={tournament.id}
                href={`/tournaments/${tournament.slug}`}
              >
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="line-clamp-1 text-lg">
                        {tournament.name}
                      </CardTitle>
                      <Badge
                        className={
                          statusColors[
                            (tournament.status ?? "draft") as TournamentStatus
                          ]
                        }
                      >
                        {tournament.status ?? "draft"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-muted-foreground space-y-2 text-sm">
                      {tournament.start_date && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {new Date(
                              tournament.start_date
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>
                          {tournament.registrationCount || 0}
                          {tournament.max_participants
                            ? ` / ${tournament.max_participants}`
                            : ""}{" "}
                          players
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
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
