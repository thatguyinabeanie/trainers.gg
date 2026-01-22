"use client";

import { useCallback } from "react";
import { useSupabaseQuery } from "@/lib/supabase";
import { getTournamentByOrgAndSlug } from "@trainers/supabase";
import { useCurrentUser } from "@/hooks/use-current-user";
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
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Trophy,
  Calendar,
  Users,
  MapPin,
  Clock,
  Settings,
  Loader2,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";

interface TournamentDetailClientProps {
  orgSlug: string;
  tournamentSlug: string;
}

type TournamentStatus =
  | "draft"
  | "upcoming"
  | "active"
  | "completed"
  | "cancelled"
  | "paused";

const statusColors: Record<TournamentStatus, string> = {
  draft: "bg-gray-100 text-gray-800",
  upcoming: "bg-blue-100 text-blue-800",
  active: "bg-green-100 text-green-800",
  completed: "bg-purple-100 text-purple-800",
  cancelled: "bg-red-100 text-red-800",
  paused: "bg-yellow-100 text-yellow-800",
};

export function TournamentDetailClient({
  orgSlug,
  tournamentSlug,
}: TournamentDetailClientProps) {
  const tournamentQueryFn = useCallback(
    (supabase: Parameters<typeof getTournamentByOrgAndSlug>[0]) =>
      getTournamentByOrgAndSlug(supabase, orgSlug, tournamentSlug),
    [orgSlug, tournamentSlug]
  );

  const { data: tournament, isLoading: tournamentLoading } = useSupabaseQuery(
    tournamentQueryFn,
    [orgSlug, tournamentSlug]
  );

  const { user: currentUser } = useCurrentUser();

  if (tournamentLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Trophy className="text-muted-foreground mb-4 h-12 w-12" />
            <h3 className="mb-2 text-lg font-semibold">Tournament not found</h3>
            <p className="text-muted-foreground mb-4 text-center">
              This tournament doesn&apos;t exist or has been removed
            </p>
            <Link href="/tournaments">
              <Button>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Tournaments
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Type assertion for organization which may be a nested object
  const organization = tournament.organization as {
    id: number;
    name: string;
    slug: string;
    owner_alt_id: number;
  } | null;

  const isOrganizer = currentUser?.alt?.id === organization?.owner_alt_id;
  const canManage = isOrganizer; // Could extend to check org membership

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "TBD";
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get registration count from the registrations array
  const registrationCount = tournament.registrations?.length || 0;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="text-muted-foreground mb-4 flex items-center gap-2 text-sm">
        <Link href="/tournaments" className="hover:underline">
          Tournaments
        </Link>
        <span>/</span>
        <Link href={`/organizations/${orgSlug}`} className="hover:underline">
          {organization?.name || orgSlug}
        </Link>
        <span>/</span>
        <span className="text-foreground">{tournament.name}</span>
      </div>

      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <h1 className="text-3xl font-bold">{tournament.name}</h1>
            <Badge
              className={statusColors[tournament.status as TournamentStatus]}
            >
              {tournament.status}
            </Badge>
          </div>

          <div className="text-muted-foreground flex flex-wrap items-center gap-4 text-sm">
            {organization && (
              <Link
                href={`/organizations/${orgSlug}`}
                className="flex items-center gap-1 hover:underline"
              >
                <MapPin className="h-4 w-4" />
                {organization.name}
              </Link>
            )}
            {tournament.format && (
              <span className="flex items-center gap-1">
                <Trophy className="h-4 w-4" />
                {tournament.format}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {registrationCount}
              {tournament.max_participants
                ? ` / ${tournament.max_participants}`
                : ""}{" "}
              players
            </span>
          </div>
        </div>

        {canManage && (
          <Link href={`/organizations/${orgSlug}/${tournamentSlug}/manage`}>
            <Button>
              <Settings className="mr-2 h-4 w-4" />
              Manage Tournament
            </Button>
          </Link>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="bracket">Bracket</TabsTrigger>
              <TabsTrigger value="standings">Standings</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Description */}
              {tournament.description && (
                <Card>
                  <CardHeader>
                    <CardTitle>About</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {tournament.description}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Schedule */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Schedule
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-muted-foreground text-sm">
                        Start Date
                      </p>
                      <p className="font-medium">
                        {formatDate(tournament.start_date)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-sm">End Date</p>
                      <p className="font-medium">
                        {formatDate(tournament.end_date)}
                      </p>
                    </div>
                  </div>
                  {tournament.registration_deadline && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-muted-foreground text-sm">
                          Registration Deadline
                        </p>
                        <p className="font-medium">
                          {formatDate(tournament.registration_deadline)}
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Format Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5" />
                    Format
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-muted-foreground text-sm">
                        Game Format
                      </p>
                      <p className="font-medium">
                        {tournament.format || "Not specified"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-sm">
                        Tournament Format
                      </p>
                      <p className="font-medium capitalize">
                        {tournament.tournament_format?.replace(/_/g, " ") ||
                          "Not specified"}
                      </p>
                    </div>
                    {tournament.round_time_minutes && (
                      <div>
                        <p className="text-muted-foreground text-sm">
                          Round Time
                        </p>
                        <p className="flex items-center gap-1 font-medium">
                          <Clock className="h-4 w-4" />
                          {tournament.round_time_minutes} minutes
                        </p>
                      </div>
                    )}
                    {tournament.swiss_rounds && (
                      <div>
                        <p className="text-muted-foreground text-sm">
                          Swiss Rounds
                        </p>
                        <p className="font-medium">
                          {tournament.swiss_rounds} rounds
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="bracket">
              <Card>
                <CardHeader>
                  <CardTitle>Bracket</CardTitle>
                  <CardDescription>
                    Tournament bracket visualization
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground py-8 text-center">
                    Bracket will be available once the tournament begins
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="standings">
              <Card>
                <CardHeader>
                  <CardTitle>Standings</CardTitle>
                  <CardDescription>
                    Current tournament standings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground py-8 text-center">
                    Standings will appear once the tournament begins
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Registration Card - TODO: Migrate to Supabase */}
          {tournament.status === "upcoming" && (
            <Card>
              <CardHeader>
                <CardTitle>Registration</CardTitle>
                <CardDescription>
                  {registrationCount}
                  {tournament.max_participants
                    ? ` / ${tournament.max_participants}`
                    : ""}{" "}
                  registered
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  Registration functionality is being migrated. Check back soon!
                </p>
              </CardContent>
            </Card>
          )}

          {/* Check-in Card - TODO: Migrate to Supabase */}
          {(tournament.status === "upcoming" ||
            tournament.status === "active") && (
            <Card>
              <CardHeader>
                <CardTitle>Check-In</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  Check-in functionality is being migrated. Check back soon!
                </p>
              </CardContent>
            </Card>
          )}

          {/* Quick Links */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href={`/organizations/${orgSlug}`}>
                <Button variant="outline" className="w-full justify-start">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View Organization
                </Button>
              </Link>
              {canManage && (
                <Link
                  href={`/organizations/${orgSlug}/${tournamentSlug}/manage`}
                >
                  <Button variant="outline" className="w-full justify-start">
                    <Settings className="mr-2 h-4 w-4" />
                    Tournament Settings
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
