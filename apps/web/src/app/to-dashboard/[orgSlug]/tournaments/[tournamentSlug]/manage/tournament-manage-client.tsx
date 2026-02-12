"use client";

import { useRouter, useSearchParams } from "next/navigation";
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
import { StatusBadge, type Status } from "@/components/ui/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TournamentOverview,
  TournamentSettings,
  TournamentRegistrations,
  TournamentStandings,
  TournamentAuditLog,
} from "@/components/tournaments";
import { TournamentPairingsJudge } from "@/components/tournaments/manage/tournament-pairings-judge";
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
  ScrollText,
} from "lucide-react";

interface TournamentManageClientProps {
  orgSlug: string;
  tournamentSlug: string;
}

const VALID_TABS = [
  "overview",
  "registrations",
  "pairings",
  "standings",
  "audit",
  "settings",
] as const;

type ValidTab = (typeof VALID_TABS)[number];

function isValidTab(tab: string | null): tab is ValidTab {
  return VALID_TABS.includes(tab as ValidTab);
}

export function TournamentManageClient({
  orgSlug,
  tournamentSlug,
}: TournamentManageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { user: currentUser, isLoading: userLoading } = useCurrentUser();

  // Fetch organization by slug
  const orgQueryFn = (supabase: Parameters<typeof getOrganizationBySlug>[0]) =>
    getOrganizationBySlug(supabase, orgSlug);

  const { data: organization, isLoading: orgLoading } = useSupabaseQuery(
    orgQueryFn,
    [orgSlug]
  );

  // Fetch tournament by slug
  const tournamentQueryFn = (
    supabase: Parameters<typeof getTournamentBySlug>[0]
  ) => getTournamentBySlug(supabase, tournamentSlug);

  const { data: tournament, isLoading: tournamentLoading } = useSupabaseQuery(
    tournamentQueryFn,
    [tournamentSlug]
  );

  // Fetch tournament phases (depends on tournament being loaded)
  const phasesQueryFn = (
    supabase: Parameters<typeof getTournamentPhases>[0]
  ) =>
    tournament
      ? getTournamentPhases(supabase, tournament.id)
      : Promise.resolve([]);

  const { data: phases = [] } = useSupabaseQuery(phasesQueryFn, [
    tournament?.id,
  ]);

  // Get active tab from URL or default to overview
  const tabParam = searchParams.get("tab");
  const activeTab: ValidTab = isValidTab(tabParam) ? tabParam : "overview";

  // Handle tab change - update URL without page reload
  const handleTabChange = (value: string) => {
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set("tab", value);
    router.replace(`?${newParams.toString()}`, { scroll: false });
  };

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
  // Find the active phase ID from fetched phases
  const activePhaseId =
    tournament.current_phase_id ??
    (phases && phases.length > 0 ? phases[0]?.id : null) ??
    null;

  const tournamentForOverview = {
    id: tournament.id,
    name: tournament.name,
    status: tournament.status ?? "draft",
    currentPhaseId: activePhaseId,
    registrations: tournament.registrations ?? [],
    maxParticipants: tournament.max_participants ?? undefined,
    startDate: tournament.start_date
      ? new Date(tournament.start_date).getTime()
      : undefined,
    endDate: tournament.end_date
      ? new Date(tournament.end_date).getTime()
      : undefined,
    tournamentFormat: tournament.tournament_format ?? "swiss_with_cut",
    format: tournament.format ?? "VGC 2025",
    currentRound: tournament.current_round ?? undefined,
    roundTimeMinutes: tournament.round_time_minutes ?? 50,
    swissRounds: tournament.swiss_rounds ?? undefined,
    topCutSize: tournament.top_cut_size ?? undefined,
  };

  // Props for child components
  const tournamentForRegistrations = {
    id: tournament.id,
    status: tournament.status ?? "draft",
    rental_team_photos_enabled: tournament.rental_team_photos_enabled,
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
    round_time_minutes: tournament.round_time_minutes,
    rental_team_photos_enabled: tournament.rental_team_photos_enabled,
    rental_team_photos_required: tournament.rental_team_photos_required,
    // Registration settings
    registration_type: tournament.registration_type,
    check_in_required: tournament.check_in_required,
    allow_late_registration: tournament.allow_late_registration,
    late_check_in_max_round: tournament.late_check_in_max_round,
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
              <StatusBadge status={tournament.status as Status} />
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
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="space-y-6"
      >
        {/* Scrollable tabs container */}
        <div className="relative">
          <div className="scrollbar-hide -mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
            <TabsList className="min-w-max md:min-w-0">
              <TabsTrigger value="overview" className="gap-2">
                <Trophy className="h-4 w-4" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="registrations" className="gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Registrations</span>
              </TabsTrigger>
              <TabsTrigger value="pairings" className="gap-2">
                <LayoutList className="h-4 w-4" />
                <span className="hidden sm:inline">Pairings</span>
              </TabsTrigger>
              <TabsTrigger value="standings" className="gap-2">
                <Medal className="h-4 w-4" />
                <span className="hidden sm:inline">Standings</span>
              </TabsTrigger>
              <TabsTrigger value="audit" className="gap-2">
                <ScrollText className="h-4 w-4" />
                <span className="hidden sm:inline">Audit Log</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Settings</span>
              </TabsTrigger>
            </TabsList>
          </div>
          {/* Fade indicator for more content */}
          <div className="from-background pointer-events-none absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-l to-transparent md:hidden" />
        </div>

        <TabsContent value="overview">
          <TournamentOverview tournament={tournamentForOverview} />
        </TabsContent>

        <TabsContent value="registrations">
          <TournamentRegistrations tournament={tournamentForRegistrations} />
        </TabsContent>

        <TabsContent value="pairings">
          <TournamentPairingsJudge
            tournament={{
              id: tournament.id,
              currentPhaseId: tournament.current_phase_id ?? null,
            }}
          />
        </TabsContent>

        <TabsContent value="standings">
          <TournamentStandings tournament={tournamentForStandings} />
        </TabsContent>

        <TabsContent value="audit">
          <TournamentAuditLog tournament={{ id: tournament.id }} />
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
