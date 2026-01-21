"use client";

import { useQuery } from "convex/react";
import { api } from "@/lib/convex/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TournamentOverview,
  TournamentSettings,
  TournamentPairings,
  TournamentRegistrations,
  TournamentStandings,
} from "@/components/tournaments";
import { InvitationList, InviteForm } from "@/components/tournaments";
import {
  Trophy,
  ArrowLeft,
  Loader2,
  LayoutDashboard,
  Users,
  Brackets,
  Settings,
  Mail,
  BarChart3,
  ShieldAlert,
} from "lucide-react";

interface TournamentManageClientProps {
  orgSlug: string;
  tournamentSlug: string;
}

export function TournamentManageClient({
  orgSlug,
  tournamentSlug,
}: TournamentManageClientProps) {
  const router = useRouter();

  const tournament = useQuery(api.tournaments.queries.getByOrgAndSlug, {
    organizationSlug: orgSlug,
    tournamentSlug: tournamentSlug,
  });

  const currentUser = useQuery(api.users.getCurrentUser);

  // Loading state
  if (tournament === undefined || currentUser === undefined) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Not found
  if (tournament === null) {
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

  // Auth check
  if (!currentUser) {
    router.push("/sign-in");
    return null;
  }

  // Permission check
  const isOrganizer =
    currentUser.profile?.id === tournament.organization?.ownerProfileId;

  if (!isOrganizer) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShieldAlert className="text-muted-foreground mb-4 h-12 w-12" />
            <h3 className="mb-2 text-lg font-semibold">Access Denied</h3>
            <p className="text-muted-foreground mb-4 text-center">
              You don&apos;t have permission to manage this tournament
            </p>
            <Link href={`/${orgSlug}/${tournamentSlug}`}>
              <Button>
                <ArrowLeft className="mr-2 h-4 w-4" />
                View Tournament
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Build tournament object for components
  const tournamentData = {
    _id: tournament._id,
    name: tournament.name,
    slug: tournament.slug,
    description: tournament.description || "",
    status: tournament.status,
    format: tournament.format || "",
    tournamentFormat: tournament.tournamentFormat || "swiss_only",
    maxParticipants: tournament.maxParticipants,
    startDate: tournament.startDate,
    endDate: tournament.endDate,
    registrationDeadline: tournament.registrationDeadline,
    roundTimeMinutes: tournament.roundTimeMinutes,
    swissRounds: tournament.swissRounds,
    topCutSize: tournament.topCutSize,
    rentalTeamPhotosEnabled: tournament.rentalTeamPhotosEnabled,
    rentalTeamPhotosRequired: tournament.rentalTeamPhotosRequired,
    currentRound: tournament.currentRound,
    registrations: [],
    _creationTime: tournament._creationTime,
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="text-muted-foreground mb-4 flex items-center gap-2 text-sm">
        <Link href="/tournaments" className="hover:underline">
          Tournaments
        </Link>
        <span>/</span>
        <Link href={`/${orgSlug}/${tournamentSlug}`} className="hover:underline">
          {tournament.name}
        </Link>
        <span>/</span>
        <span className="text-foreground">Manage</span>
      </div>

      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Settings className="h-8 w-8" />
            Manage Tournament
          </h1>
          <p className="text-muted-foreground mt-1">{tournament.name}</p>
        </div>
        <Link href={`/${orgSlug}/${tournamentSlug}`}>
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Tournament
          </Button>
        </Link>
      </div>

      {/* Management Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview" className="gap-2">
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="registrations" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Registrations</span>
          </TabsTrigger>
          <TabsTrigger value="invitations" className="gap-2">
            <Mail className="h-4 w-4" />
            <span className="hidden sm:inline">Invitations</span>
          </TabsTrigger>
          <TabsTrigger value="pairings" className="gap-2">
            <Brackets className="h-4 w-4" />
            <span className="hidden sm:inline">Pairings</span>
          </TabsTrigger>
          <TabsTrigger value="standings" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Standings</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <TournamentOverview tournament={tournamentData} />
        </TabsContent>

        <TabsContent value="registrations">
          <TournamentRegistrations tournament={tournamentData} />
        </TabsContent>

        <TabsContent value="invitations" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <InviteForm
              tournamentId={tournament._id}
              tournamentName={tournament.name}
            />
            <InvitationList
              tournamentId={tournament._id}
              showActions={true}
            />
          </div>
        </TabsContent>

        <TabsContent value="pairings">
          <TournamentPairings tournament={tournamentData} />
        </TabsContent>

        <TabsContent value="standings">
          <TournamentStandings tournament={tournamentData} />
        </TabsContent>

        <TabsContent value="settings">
          <TournamentSettings tournament={tournamentData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
