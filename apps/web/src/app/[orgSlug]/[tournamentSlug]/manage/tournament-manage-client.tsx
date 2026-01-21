"use client";

import { useCallback } from "react";
import { useSupabaseQuery } from "@/lib/supabase";
import { getTournamentByOrgAndSlug, getCurrentUser } from "@trainers/supabase";
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

  const tournamentQueryFn = useCallback(
    (supabase: Parameters<typeof getTournamentByOrgAndSlug>[0]) =>
      getTournamentByOrgAndSlug(supabase, orgSlug, tournamentSlug),
    [orgSlug, tournamentSlug]
  );

  const userQueryFn = useCallback(
    (supabase: Parameters<typeof getCurrentUser>[0]) => getCurrentUser(supabase),
    []
  );

  const { data: tournament, isLoading: tournamentLoading } = useSupabaseQuery(
    tournamentQueryFn,
    [orgSlug, tournamentSlug]
  );

  const { data: currentUser, isLoading: userLoading } = useSupabaseQuery(userQueryFn);

  // Loading state
  if (tournamentLoading || userLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Not found
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

  // Auth check
  if (!currentUser) {
    router.push("/sign-in");
    return null;
  }

  // Type assertion for organization
  const organization = tournament.organization as {
    id: string;
    name: string;
    slug: string;
    owner_profile_id: string;
  } | null;

  // Permission check
  const isOrganizer = currentUser.profile?.id === organization?.owner_profile_id;

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

  // Build tournament object for components that still expect camelCase format
  // (TournamentOverview, TournamentPairings, TournamentStandings)
  const tournamentDataCamelCase = {
    name: tournament.name,
    slug: tournament.slug,
    description: tournament.description || "",
    status: tournament.status || "draft",
    format: tournament.format || "",
    tournamentFormat: tournament.tournament_format || "swiss_only",
    maxParticipants: tournament.max_participants ?? undefined,
    startDate: tournament.start_date ? new Date(tournament.start_date).getTime() : undefined,
    endDate: tournament.end_date ? new Date(tournament.end_date).getTime() : undefined,
    registrationDeadline: tournament.registration_deadline
      ? new Date(tournament.registration_deadline).getTime()
      : undefined,
    roundTimeMinutes: tournament.round_time_minutes ?? undefined,
    swissRounds: tournament.swiss_rounds ?? undefined,
    topCutSize: tournament.top_cut_size ?? undefined,
    rentalTeamPhotosEnabled: tournament.rental_team_photos_enabled ?? undefined,
    rentalTeamPhotosRequired: tournament.rental_team_photos_required ?? undefined,
    currentRound: tournament.current_round ?? undefined,
    registrations: [],
    _creationTime: tournament.created_at ? new Date(tournament.created_at).getTime() : Date.now(),
  };

  // Tournament data for migrated components that expect snake_case format
  // (TournamentSettings, TournamentRegistrations)
  const tournamentDataSnakeCase = {
    id: tournament.id,
    name: tournament.name,
    slug: tournament.slug,
    description: tournament.description,
    status: tournament.status || "draft",
    format: tournament.format,
    max_participants: tournament.max_participants,
    start_date: tournament.start_date,
    end_date: tournament.end_date,
    registration_deadline: tournament.registration_deadline,
    round_time_minutes: tournament.round_time_minutes,
    rental_team_photos_enabled: tournament.rental_team_photos_enabled,
    rental_team_photos_required: tournament.rental_team_photos_required,
  };

  // Tournament ID for components that need it
  const tournamentId = tournament.id;

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
          <TournamentOverview tournament={tournamentDataCamelCase} />
        </TabsContent>

        <TabsContent value="registrations">
          <TournamentRegistrations tournament={tournamentDataSnakeCase} />
        </TabsContent>

        <TabsContent value="invitations" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <InviteForm
              tournamentId={tournamentId}
              tournamentName={tournament.name}
            />
            <InvitationList
              tournamentId={tournamentId}
              showActions={true}
            />
          </div>
        </TabsContent>

        <TabsContent value="pairings">
          <TournamentPairings tournament={tournamentDataCamelCase} />
        </TabsContent>

        <TabsContent value="standings">
          <TournamentStandings tournament={tournamentDataCamelCase} />
        </TabsContent>

        <TabsContent value="settings">
          <TournamentSettings tournament={tournamentDataSnakeCase} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
