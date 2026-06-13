"use client";

import { useState } from "react";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import {
  getTournamentBySlug,
  getTournamentPhases,
  type getCommunityBySlug,
} from "@trainers/supabase";
import { useApiQuery } from "@trainers/supabase/react-query";

import { useCurrentUser } from "@/hooks/use-current-user";
import { createClient } from "@/lib/supabase/client";
import { queryKeys } from "@/lib/query-keys";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge, type Status } from "@/components/ui/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  TournamentOverview,
  TournamentRegistrations,
  TournamentStandings,
  TournamentAuditLog,
} from "@/components/tournaments";
import { TournamentPairingsJudge } from "@/components/tournaments/manage/tournament-pairings-judge";
import { toast } from "sonner";

import { publishTournament } from "@/actions/tournaments";
import {
  ArrowLeft,
  Globe,
  Loader2,
  Trophy,
  Building2,
  ShieldAlert,
  ExternalLink,
  Users,
  Settings,
  Radio,
  ScrollText,
} from "lucide-react";

interface TournamentManageClientProps {
  communitySlug: string;
  tournamentSlug: string;
}

const VALID_TABS = ["overview", "players", "live"] as const;

type ValidTab = (typeof VALID_TABS)[number];

function isValidTab(tab: string | null): tab is ValidTab {
  return VALID_TABS.includes(tab as ValidTab);
}

export function TournamentManageClient({
  communitySlug,
  tournamentSlug,
}: TournamentManageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [auditSheetOpen, setAuditSheetOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const {
    user: currentUser,
    isLoading: userLoading,
    error: userError,
  } = useCurrentUser();

  // Auth is enforced server-side by the (dashboard) layout; do not redirect
  // from this client (causes a /sign-in ↔ /dashboard race).

  // Fetch the community that owns this tournament via the auth-gated
  // `/api/v1/communities/[slug]` route (Phase 2 S-bucket migration).
  // The route returns the community object directly (not ActionResult-wrapped).
  type CommunityDetail = NonNullable<Awaited<ReturnType<typeof getCommunityBySlug>>>;

  const {
    data: organization,
    isLoading: orgLoading,
    isError: orgError,
  } = useApiQuery<CommunityDetail | null>(
    ["community", communitySlug],
    async () => {
      const res = await fetch(
        `/api/v1/communities/${encodeURIComponent(communitySlug)}`
      );
      if (!res.ok) {
        return { success: false as const, error: `HTTP ${res.status}` };
      }
      const data = (await res.json()) as CommunityDetail | null;
      return { success: true as const, data };
    },
    { staleTime: 30_000 }
  );

  // Fetch tournament by slug
  const { data: tournament, isLoading: tournamentLoading } = useQuery({
    queryKey: queryKeys.tournament.bySlug(tournamentSlug),
    queryFn: () => getTournamentBySlug(createClient(), tournamentSlug),
    staleTime: 30_000,
  });

  // Fetch tournament phases (depends on tournament being loaded)
  const { data: phases = [] } = useQuery({
    queryKey: queryKeys.tournament.phases(tournament?.id),
    queryFn: () => getTournamentPhases(createClient(), tournament!.id),
    enabled: !!tournament?.id,
    staleTime: 30_000,
  });

  // Get active tab from URL or default to overview
  const tabParam = searchParams.get("tab");
  const activeTab: ValidTab = isValidTab(tabParam) ? tabParam : "overview";

  async function handlePublish() {
    if (!tournament) return;
    setIsPublishing(true);
    try {
      const result = await publishTournament(tournament.id);
      if (result.success) {
        toast.success("Tournament published — it's now visible to players");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Failed to publish tournament. Please try again.");
    } finally {
      setIsPublishing(false);
    }
  }

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

  // Org fetch error
  if (orgError) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <ShieldAlert className="text-muted-foreground mb-4 h-12 w-12" />
          <h3 className="mb-2 text-lg font-semibold">
            Couldn&apos;t load community
          </h3>
          <p className="text-muted-foreground mb-4 text-center">
            Try refreshing the page. If this keeps happening, contact support.
          </p>
          <Button onClick={() => router.refresh()}>Retry</Button>
        </CardContent>
      </Card>
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
          <Link href="/dashboard/community">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Communities
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
          <Link href={`/dashboard/community/${communitySlug}/tournaments`}>
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Tournaments
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (userError) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <ShieldAlert className="text-muted-foreground mb-4 h-12 w-12" />
          <h3 className="mb-2 text-lg font-semibold">
            Couldn&apos;t load your account
          </h3>
          <p className="text-muted-foreground mb-4 text-center">
            Try refreshing the page. If this keeps happening, contact support.
          </p>
          <Button onClick={() => router.refresh()}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  if (!currentUser) {
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
    gameFormat: tournament.game_format ?? null,
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
    maxParticipants: tournament.max_participants ?? undefined,
  };

  const tournamentForStandings = {
    id: tournament.id,
    status: tournament.status ?? "draft",
  };

  // Player count for the Players tab badge
  const registrations = (tournament.registrations ?? []) as Array<{
    status?: string;
  }>;
  const playerCount = registrations.filter(
    (r) =>
      r.status === "registered" ||
      r.status === "confirmed" ||
      r.status === "checked_in"
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{tournament.name}</h1>
            <StatusBadge status={tournament.status as Status} />
          </div>
          <p className="text-muted-foreground text-sm">
            Hosted by {organization.name}
          </p>
        </div>
        <div className="flex gap-2">
          {tournament.status === "draft" && (
            <Button size="sm" onClick={handlePublish} disabled={isPublishing}>
              {isPublishing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Globe className="mr-2 h-4 w-4" />
              )}
              Publish
            </Button>
          )}
          <Link href={`/tournaments/${tournamentSlug}`}>
            <Button variant="outline" size="sm">
              <ExternalLink className="mr-2 h-4 w-4" />
              View Public Page
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAuditSheetOpen(true)}
          >
            <ScrollText className="mr-2 h-4 w-4" />
            Audit Log
          </Button>
          <Link
            href={`/dashboard/community/${communitySlug}/tournaments/${tournamentSlug}/manage/settings`}
          >
            <Button variant="outline" size="sm">
              <Settings className="mr-2 h-4 w-4" />
              Settings
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
              <TabsTrigger value="players" className="gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Players</span>
                {playerCount > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {playerCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="live" className="gap-2">
                <Radio className="h-4 w-4" />
                <span className="hidden sm:inline">Live</span>
              </TabsTrigger>
            </TabsList>
          </div>
          {/* Fade indicator for more content */}
          <div className="from-background pointer-events-none absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-l to-transparent md:hidden" />
        </div>

        <TabsContent value="overview">
          <TournamentOverview tournament={tournamentForOverview} />
        </TabsContent>

        <TabsContent value="players">
          <TournamentRegistrations tournament={tournamentForRegistrations} />
        </TabsContent>

        <TabsContent value="live">
          <div className="space-y-8">
            <TournamentPairingsJudge
              tournament={{
                id: tournament.id,
                slug: tournament.slug,
                currentPhaseId: tournament.current_phase_id ?? null,
              }}
            />
            <TournamentStandings tournament={tournamentForStandings} />
          </div>
        </TabsContent>
      </Tabs>

      {/* Audit Log Sheet */}
      <Sheet open={auditSheetOpen} onOpenChange={setAuditSheetOpen}>
        <SheetContent
          side="right"
          className="w-full max-w-[calc(100vw-1rem)] overflow-y-auto sm:max-w-lg"
        >
          <SheetHeader>
            <SheetTitle>Audit Log</SheetTitle>
            <SheetDescription>
              Chronological record of tournament events
            </SheetDescription>
          </SheetHeader>
          <div className="p-4">
            <TournamentAuditLog tournament={{ id: tournament.id }} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
