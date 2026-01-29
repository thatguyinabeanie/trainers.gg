"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Trophy,
  Users,
  Calendar,
  Plus,
  FileEdit,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
} from "lucide-react";

interface OrganizationWithStats {
  id: number;
  name: string;
  slug: string;
  tournamentCounts: Record<string, number>;
  totalTournaments: number;
  totalParticipants: number;
  staffCount: number;
}

interface Tournament {
  id: number;
  name: string;
  slug: string;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  max_participants: number | null;
  registrationCount: number;
}

interface OverviewClientProps {
  organization: OrganizationWithStats;
  recentTournaments: Tournament[];
  orgSlug: string;
}

type TournamentStatus =
  | "draft"
  | "upcoming"
  | "active"
  | "completed"
  | "cancelled";

const statusConfig: Record<
  TournamentStatus,
  { color: string; icon: typeof Trophy }
> = {
  draft: { color: "bg-gray-100 text-gray-800", icon: FileEdit },
  upcoming: { color: "bg-blue-100 text-blue-800", icon: Clock },
  active: { color: "bg-green-100 text-green-800", icon: Trophy },
  completed: { color: "bg-purple-100 text-purple-800", icon: CheckCircle },
  cancelled: { color: "bg-red-100 text-red-800", icon: XCircle },
};

export function OverviewClient({
  organization,
  recentTournaments,
  orgSlug,
}: OverviewClientProps) {
  const basePath = `/to-dashboard/${orgSlug}`;

  return (
    <div className="space-y-6">
      {/* Stats Grid - compact 2x2 on mobile */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <div className="bg-card rounded-lg p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-primary/10 rounded-full p-2 sm:p-3">
              <Trophy className="text-primary h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <p className="text-lg font-bold sm:text-2xl">
                {organization.totalTournaments}
              </p>
              <p className="text-muted-foreground text-xs sm:text-sm">
                Tournaments
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-primary/10 rounded-full p-2 sm:p-3">
              <Clock className="text-primary h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <p className="text-lg font-bold sm:text-2xl">
                {(organization.tournamentCounts.upcoming ?? 0) +
                  (organization.tournamentCounts.active ?? 0)}
              </p>
              <p className="text-muted-foreground text-xs sm:text-sm">Active</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-primary/10 rounded-full p-2 sm:p-3">
              <Users className="text-primary h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <p className="text-lg font-bold sm:text-2xl">
                {organization.totalParticipants}
              </p>
              <p className="text-muted-foreground text-xs sm:text-sm">
                Registrations
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-primary/10 rounded-full p-2 sm:p-3">
              <Users className="text-primary h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <p className="text-lg font-bold sm:text-2xl">
                {organization.staffCount}
              </p>
              <p className="text-muted-foreground text-xs sm:text-sm">Staff</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
          <Link
            href={`${basePath}/tournaments/create`}
            className="w-full sm:w-auto"
          >
            <Button className="w-full gap-2 sm:w-auto">
              <Plus className="h-4 w-4" />
              Create Tournament
            </Button>
          </Link>
          <Link href={`${basePath}/tournaments`} className="w-full sm:w-auto">
            <Button variant="outline" className="w-full gap-2 sm:w-auto">
              <Trophy className="h-4 w-4" />
              View Tournaments
            </Button>
          </Link>
          <Link href={`${basePath}/staff`} className="w-full sm:w-auto">
            <Button variant="outline" className="w-full gap-2 sm:w-auto">
              <Users className="h-4 w-4" />
              Manage Staff
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Tournament Status Breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg">
            Tournament Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="scrollbar-hide -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:grid sm:grid-cols-5 sm:gap-3 sm:overflow-visible sm:px-0">
            {(
              ["draft", "upcoming", "active", "completed", "cancelled"] as const
            ).map((status) => {
              const config = statusConfig[status];
              const count = organization.tournamentCounts[status] ?? 0;
              const Icon = config.icon;

              return (
                <Link
                  key={status}
                  href={`${basePath}/tournaments?status=${status}`}
                  className="hover:bg-muted flex min-w-[72px] shrink-0 flex-col items-center rounded-lg border p-3 text-center transition-colors sm:min-w-0 sm:p-4"
                >
                  <div
                    className={`mb-1.5 rounded-full p-1.5 sm:mb-2 sm:p-2 ${config.color}`}
                  >
                    <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </div>
                  <p className="text-lg font-bold sm:text-2xl">{count}</p>
                  <p className="text-muted-foreground text-[10px] capitalize sm:text-xs">
                    {status}
                  </p>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Tournaments */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Tournaments</CardTitle>
            <CardDescription>Your latest tournaments</CardDescription>
          </div>
          <Link href={`${basePath}/tournaments`}>
            <Button variant="ghost" size="sm" className="gap-1">
              View All
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentTournaments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Trophy className="text-muted-foreground mb-4 h-12 w-12" />
              <h3 className="mb-2 text-lg font-semibold">No tournaments yet</h3>
              <p className="text-muted-foreground mb-4 text-center">
                Create your first tournament to get started
              </p>
              <Link href={`${basePath}/tournaments/create`}>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Tournament
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recentTournaments.map((tournament) => {
                const status = tournament.status as TournamentStatus;
                const config = statusConfig[status] ?? statusConfig.draft;

                return (
                  <Link
                    key={tournament.id}
                    href={`${basePath}/tournaments/${tournament.slug}/manage`}
                  >
                    <Card className="h-full transition-shadow hover:shadow-md">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <CardTitle className="line-clamp-1 text-base">
                            {tournament.name}
                          </CardTitle>
                          <Badge className={config.color}>
                            {tournament.status}
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
                              {tournament.registrationCount}
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
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
