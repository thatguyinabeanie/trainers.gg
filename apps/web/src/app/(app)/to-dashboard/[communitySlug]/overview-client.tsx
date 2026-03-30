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
import { cn } from "@/lib/utils";

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
  communitySlug: string;
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
  communitySlug,
}: OverviewClientProps) {
  const basePath = `/dashboard/community/${communitySlug}`;

  return (
    <div className="space-y-6">
      {/* Page Heading */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-muted-foreground text-sm">{organization.name}</p>
      </div>

      {/* Stats Grid - compact */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <div className="bg-card rounded-lg p-3">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 rounded-full p-2">
              <Trophy className="text-primary h-4 w-4" />
            </div>
            <div>
              <p className="text-lg font-bold">
                {organization.totalTournaments}
              </p>
              <p className="text-muted-foreground text-xs">Tournaments</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg p-3">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 rounded-full p-2">
              <Clock className="text-primary h-4 w-4" />
            </div>
            <div>
              <p className="text-lg font-bold">
                {(organization.tournamentCounts.upcoming ?? 0) +
                  (organization.tournamentCounts.active ?? 0)}
              </p>
              <p className="text-muted-foreground text-xs">Active</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg p-3">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 rounded-full p-2">
              <Users className="text-primary h-4 w-4" />
            </div>
            <div>
              <p className="text-lg font-bold">
                {organization.totalParticipants}
              </p>
              <p className="text-muted-foreground text-xs">Registrations</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg p-3">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 rounded-full p-2">
              <Users className="text-primary h-4 w-4" />
            </div>
            <div>
              <p className="text-lg font-bold">{organization.staffCount}</p>
              <p className="text-muted-foreground text-xs">Staff</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Link href={`${basePath}/tournaments/create`}>
            <Button size="sm" className="gap-2">
              <Plus className="h-3.5 w-3.5" />
              Create Tournament
            </Button>
          </Link>
          <Link href={`${basePath}/tournaments`}>
            <Button variant="outline" size="sm" className="gap-2">
              <Trophy className="h-3.5 w-3.5" />
              View Tournaments
            </Button>
          </Link>
          <Link href={`${basePath}/staff`}>
            <Button variant="outline" size="sm" className="gap-2">
              <Users className="h-3.5 w-3.5" />
              Manage Staff
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Tournament Status Breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Tournament Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="scrollbar-hide -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:grid sm:grid-cols-5 sm:gap-2 sm:overflow-visible sm:px-0">
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
                  className="hover:bg-muted flex min-w-[64px] shrink-0 flex-col items-center rounded-lg border p-2.5 text-center transition-colors sm:min-w-0 sm:p-3"
                >
                  <div className={cn("mb-1 rounded-full p-1.5", config.color)}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <p className="text-lg font-bold">{count}</p>
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
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-base">Recent Tournaments</CardTitle>
            <CardDescription className="text-xs">
              Your latest tournaments
            </CardDescription>
          </div>
          <Link href={`${basePath}/tournaments`}>
            <Button variant="ghost" size="sm" className="gap-1">
              View All
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentTournaments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6">
              <Trophy className="text-muted-foreground mb-3 h-10 w-10" />
              <h3 className="mb-1 text-base font-semibold">
                No tournaments yet
              </h3>
              <p className="text-muted-foreground mb-3 text-center text-sm">
                Create your first tournament to get started
              </p>
              <Link href={`${basePath}/tournaments/create`}>
                <Button size="sm">
                  <Plus className="mr-2 h-3.5 w-3.5" />
                  Create Tournament
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {recentTournaments.map((tournament) => {
                const status = tournament.status as TournamentStatus;
                const config = statusConfig[status] ?? statusConfig.draft;

                return (
                  <Link
                    key={tournament.id}
                    href={`${basePath}/tournaments/${tournament.slug}/manage`}
                  >
                    <Card className="h-full transition-shadow hover:shadow-md">
                      <CardHeader className="p-3 pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="line-clamp-1 text-sm">
                            {tournament.name}
                          </CardTitle>
                          <Badge
                            className={cn("shrink-0 text-[10px]", config.color)}
                          >
                            {tournament.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="px-3 pt-0 pb-3">
                        <div className="text-muted-foreground space-y-1 text-xs">
                          {tournament.start_date && (
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3 w-3" />
                              <span>
                                {new Date(
                                  tournament.start_date
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5">
                            <Users className="h-3 w-3" />
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
