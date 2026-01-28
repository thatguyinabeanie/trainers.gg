"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseQuery } from "@/lib/supabase";
import {
  getTournamentBySlug,
  getOrganizationBySlug,
  getTournamentPhases,
} from "@trainers/supabase";
import { useCurrentUser } from "@/hooks/use-current-user";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TournamentOverview,
  TournamentSettings,
  TournamentPairings,
  TournamentRegistrations,
  TournamentStandings,
} from "@/components/tournaments";
import {
  ArrowLeft,
  Loader2,
  Trophy,
  Building2,
  ShieldAlert,
  ExternalLink,
  Users,
  Settings,
  LayoutList,
  Medal,
} from "lucide-react";

interface TournamentManageClientProps {
  orgSlug: string;
  tournamentSlug: string;
}

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

export function TournamentManageClient({
  orgSlug,
  tournamentSlug,
}: TournamentManageClientProps) {
  const router = useRouter();

  const { user: currentUser, isLoading: userLoading } = useCurrentUser();

  // Fetch organization by slug
  const orgQueryFn = useCallback(
    (supabase: Parameters<typeof getOrganizationBySlug>[0]) =>
      getOrganizationBySlug(supabase, orgSlug),
    [orgSlug]
  );

  const { data: organization, isLoading: orgLoading } = useSupabaseQuery(
    orgQueryFn,
    [orgSlug]
  );

  // Fetch tournament by slug
  const tournamentQueryFn = useCallback(
    (supabase: Parameters<typeof getTournamentBySlug>[0]) =>
      getTournamentBySlug(supabase, tournamentSlug),
    [tournamentSlug]
  );

  const { data: tournament, isLoading: tournamentLoading } = useSupabaseQuery(
    tournamentQueryFn,
    [tournamentSlug]
  );

  // Fetch tournament phases (depends on tournament being loaded)
  const phasesQueryFn = useCallback(
    (supabase: Parameters<typeof getTournamentPhases>[0]) =>
      tournament
        ? getTournamentPhases(supabase, tournament.id)
        : Promise.resolve([]),
    [tournament]
  );

  const { data: phases = [] } = useSupabaseQuery(phasesQueryFn, [
    tournament?.id,
  ]);

  // Loading state
  if (userLoading || orgLoading || tournamentLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Org not found
  if (!organization) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Building2 className="text-muted-foreground mb-4 h-12 w-12" />
          <h3 className="mb-2 text-lg font-semibold">Organization not found</h3>
          <p className="text-muted-foreground mb-4 text-center">
            This organization doesn&apos;t exist or has been removed
          </p>
          <Link href="/to-dashboard">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Organizations
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  // Tournament not found
  if (!tournament) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Trophy className="text-muted-foreground mb-4 h-12 w-12" />
          <h3 className="mb-2 text-lg font-semibold">Tournament not found</h3>
          <p className="text-muted-foreground mb-4 text-center">
            This tournament doesn&apos;t exist or has been removed
          </p>
          <Link href={`/to-dashboard/${orgSlug}/tournaments`}>
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Tournaments
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  // Auth check
  if (!currentUser) {
    router.push("/sign-in");
    return null;
  }

  // Permission check - must be org owner
  const isOwner = currentUser.id === organization.owner_user_id;

  if (!isOwner) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <ShieldAlert className="text-muted-foreground mb-4 h-12 w-12" />
          <h3 className="mb-2 text-lg font-semibold">Access Denied</h3>
          <p className="text-muted-foreground mb-4 text-center">
            You don&apos;t have permission to manage this tournament
          </p>
          <Link href={`/tournaments/${tournamentSlug}`}>
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              View Tournament
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  // Transform tournament data for the overview component
  const tournamentForOverview = {
    name: tournament.name,
    status: tournament.status ?? "draft",
    registrations: tournament.registrations ?? [],
    maxParticipants: tournament.max_participants ?? undefined,
    startDate: tournament.start_date
      ? new Date(tournament.start_date).getTime()
      : undefined,
    endDate: tournament.end_date
      ? new Date(tournament.end_date).getTime()
      : undefined,
    registrationDeadline: tournament.registration_deadline
      ? new Date(tournament.registration_deadline).getTime()
      : undefined,
    tournamentFormat: tournament.tournament_format ?? "swiss_with_cut",
    format: tournament.format ?? "VGC 2025",
    currentRound: tournament.current_round ?? undefined,
    roundTimeMinutes: tournament.round_time_minutes ?? 50,
    swissRounds: tournament.swiss_rounds ?? undefined,
    topCutSize: tournament.top_cut_size ?? undefined,
    rentalTeamPhotosEnabled: tournament.rental_team_photos_enabled ?? false,
    _creationTime: tournament.created_at
      ? new Date(tournament.created_at).getTime()
      : undefined,
  };

  // Props for child components
  const tournamentForRegistrations = {
    id: tournament.id,
    status: tournament.status ?? "draft",
    rental_team_photos_enabled: tournament.rental_team_photos_enabled,
  };

  const tournamentForPairings = {
    id: tournament.id,
    status: tournament.status ?? "draft",
    currentPhaseId: tournament.current_phase_id ?? null,
  };

  const tournamentForStandings = {
    id: tournament.id,
    status: tournament.status ?? "draft",
  };

  const tournamentForSettings = {
    id: tournament.id,
    name: tournament.name,
    slug: tournament.slug,
    description: tournament.description,
    status: tournament.status ?? "draft",
    format: tournament.format,
    max_participants: tournament.max_participants,
    start_date: tournament.start_date,
    end_date: tournament.end_date,
    registration_deadline: tournament.registration_deadline,
    round_time_minutes: tournament.round_time_minutes,
    rental_team_photos_enabled: tournament.rental_team_photos_enabled,
    rental_team_photos_required: tournament.rental_team_photos_required,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/to-dashboard/${orgSlug}/tournaments`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{tournament.name}</h1>
              <Badge
                className={statusColors[tournament.status as TournamentStatus]}
              >
                {tournament.status}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm">
              Hosted by {organization.name}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/tournaments/${tournamentSlug}`}>
            <Button variant="outline" size="sm">
              <ExternalLink className="mr-2 h-4 w-4" />
              View Public Page
            </Button>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview" className="gap-2">
            <Trophy className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="registrations" className="gap-2">
            <Users className="h-4 w-4" />
            Registrations
          </TabsTrigger>
          <TabsTrigger value="pairings" className="gap-2">
            <LayoutList className="h-4 w-4" />
            Pairings
          </TabsTrigger>
          <TabsTrigger value="standings" className="gap-2">
            <Medal className="h-4 w-4" />
            Standings
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <TournamentOverview tournament={tournamentForOverview} />
        </TabsContent>

        <TabsContent value="registrations">
          <TournamentRegistrations tournament={tournamentForRegistrations} />
        </TabsContent>

        <TabsContent value="pairings">
          <TournamentPairings tournament={tournamentForPairings} />
        </TabsContent>

        <TabsContent value="standings">
          <TournamentStandings tournament={tournamentForStandings} />
        </TabsContent>

        <TabsContent value="settings">
          <TournamentSettings
            tournament={tournamentForSettings}
            phases={phases}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
