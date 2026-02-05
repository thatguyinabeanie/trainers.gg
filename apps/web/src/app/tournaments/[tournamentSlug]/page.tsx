import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";
import {
  createStaticClient,
  createClientReadOnly,
} from "@/lib/supabase/server";
import {
  getTournamentBySlug,
  getTeamForRegistration,
  hasOrganizationAccess,
} from "@trainers/supabase";
import { CacheTags } from "@/lib/cache";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Trophy,
  Calendar,
  Users,
  Clock,
  Building2,
  Settings,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TournamentTabs } from "./tournament-tabs";
import { PageContainer } from "@/components/layout/page-container";
import { StatusBadge } from "@/components/ui/status-badge";
import { TournamentSidebarCard } from "@/components/tournament";
import {
  getTournamentSchedule,
  formatStartDateTime,
  formatRoundTime,
  type TournamentScheduleData,
} from "@trainers/tournaments";
import { cn } from "@/lib/utils";
// import { TeamSubmissionsList } from "@/components/tournament/team-submissions-list";

// On-demand revalidation only (no time-based)
export const revalidate = false;

interface PageProps {
  params: Promise<{
    tournamentSlug: string;
  }>;
}

const tournamentFormatLabels: Record<string, string> = {
  swiss_only: "Swiss Only",
  swiss_with_cut: "Swiss + Top Cut",
  single_elimination: "Single Elimination",
  double_elimination: "Double Elimination",
};

/**
 * Cached tournament fetcher
 * Uses slug-specific cache tag for granular invalidation
 */
const getCachedTournament = (slug: string) =>
  unstable_cache(
    async () => {
      const supabase = createStaticClient();
      return getTournamentBySlug(supabase, slug);
    },
    [`tournament-detail-${slug}`],
    { tags: [CacheTags.tournament(slug), CacheTags.TOURNAMENTS_LIST] }
  )();

/**
 * Fetch the current user's submitted team (auth-dependent, NOT cached).
 * Returns null if the user is not logged in or has no team submitted.
 */
async function getMyTeam(tournamentId: number) {
  try {
    const supabase = await createClientReadOnly();
    return getTeamForRegistration(supabase, tournamentId);
  } catch {
    return null;
  }
}

/**
 * ISR-cached public team list for open teamsheet tournaments.
 * Only used when tournament has open_team_sheets = true and status
 * is "active" or "completed".
 */
const getCachedTournamentTeams = (tournamentId: number, slug: string) =>
  unstable_cache(
    async () => {
      const supabase = createStaticClient();
      const { data } = await supabase
        .from("tournament_registrations")
        .select(
          `
          alt_id,
          alts:alts!tournament_registrations_alt_id_fkey(username, display_name),
          team:teams(
            id, name,
            team_pokemon(
              team_position,
              pokemon:pokemon(species, nickname, held_item, ability, tera_type)
            )
          )
        `
        )
        .eq("tournament_id", tournamentId)
        .not("team_id", "is", null)
        .order("registered_at");
      return data ?? [];
    },
    [`tournament-teams-${slug}`],
    {
      tags: [CacheTags.tournamentTeams(slug), CacheTags.tournament(slug)],
    }
  )();

/**
 * Get current user ID (not cached - user-specific)
 */
async function getCurrentUserId(): Promise<string | null> {
  try {
    const supabase = await createClientReadOnly();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "TBD";
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ============================================================================
// Server Components
// ============================================================================

function Breadcrumb({ tournamentName }: { tournamentName: string }) {
  return (
    <div className="text-muted-foreground mb-4 flex items-center gap-2 text-sm">
      <Link href="/tournaments" className="hover:underline">
        Tournaments
      </Link>
      <span>/</span>
      <span className="text-foreground">{tournamentName}</span>
    </div>
  );
}

function TournamentHeader({
  tournament,
  canManage,
}: {
  tournament: NonNullable<Awaited<ReturnType<typeof getTournamentBySlug>>>;
  canManage: boolean;
}) {
  const organization = tournament.organization as {
    id: number;
    name: string;
    slug: string;
  } | null;

  const registrationCount = tournament.registrations?.length || 0;

  return (
    <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <div className="mb-2 flex items-center gap-3">
          <h1 className="text-3xl font-bold">{tournament.name}</h1>
          {(tournament.status === "active" ||
            tournament.status === "upcoming" ||
            tournament.status === "draft" ||
            tournament.status === "completed" ||
            tournament.status === "cancelled") && (
            <StatusBadge status={tournament.status} />
          )}
        </div>

        <div className="text-muted-foreground flex flex-wrap items-center gap-4 text-sm">
          {organization && (
            <Link
              href={`/organizations/${organization.slug}`}
              className="flex items-center gap-1 hover:underline"
            >
              <Building2 className="h-4 w-4" />
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

      {canManage && organization && (
        <div className="flex gap-2">
          <Link
            href={`/to-dashboard/${organization.slug}/tournaments/${tournament.slug}/manage`}
          >
            <Button variant="outline">
              <Settings className="mr-2 h-4 w-4" />
              Manage Tournament
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}

function ScheduleCard({
  tournament,
}: {
  tournament: NonNullable<Awaited<ReturnType<typeof getTournamentBySlug>>>;
}) {
  const registrationCount = tournament.registrations?.length || 0;

  // Build schedule data
  const scheduleData: TournamentScheduleData = {
    startDate: tournament.start_date,
    roundTimeMinutes: tournament.round_time_minutes ?? 50,
    tournamentFormat: tournament.tournament_format ?? "swiss_only",
    swissRounds: tournament.swiss_rounds,
    topCutSize: tournament.top_cut_size,
    registrationCount,
    currentRound: tournament.current_round ?? 0,
    tournamentPhases: tournament.phases?.map((phase) => ({
      id: phase.id,
      name: phase.name,
      phase_type: phase.phase_type,
      status: phase.status ?? "pending",
      current_round: phase.current_round ?? 0,
      planned_rounds: phase.planned_rounds,
      tournament_rounds: phase.tournament_rounds?.map((round) => ({
        id: round.id,
        round_number: round.round_number,
        status: round.status ?? "pending",
        start_time: round.start_time,
        end_time: round.end_time,
      })),
    })),
  };

  const schedule = getTournamentSchedule(scheduleData);

  if (!schedule.tournamentStartTime) {
    // No start date set
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Tournament start time not yet scheduled
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Schedule
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Start time */}
        <div>
          <p className="text-muted-foreground mb-1 text-sm">Start</p>
          <p className="font-medium">
            {formatStartDateTime(schedule.tournamentStartTime)}
          </p>
        </div>

        {/* Phases and rounds */}
        {schedule.phases.map((phase, phaseIndex) => (
          <div key={phaseIndex}>
            <h4 className="mb-3 font-semibold">{phase.phaseName}</h4>
            <div className="space-y-2">
              {phase.rounds.map((round) => {
                const timeToDisplay = round.actualStartTime
                  ? formatRoundTime(round.actualStartTime)
                  : round.estimatedStartTime
                    ? `~${formatRoundTime(round.estimatedStartTime)}`
                    : "TBD";

                return (
                  <div
                    key={round.roundNumber}
                    className={cn(
                      "flex items-center justify-between rounded-md px-3 py-2",
                      round.isActive && "bg-primary/10",
                      round.isCompleted && "text-muted-foreground"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {round.isCompleted && (
                        <CheckCircle2 className="text-primary h-4 w-4" />
                      )}
                      <span className="text-sm">{round.name}</span>
                    </div>
                    <span className="text-sm font-medium">{timeToDisplay}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function FormatCard({
  tournament,
}: {
  tournament: NonNullable<Awaited<ReturnType<typeof getTournamentBySlug>>>;
}) {
  return (
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
            <p className="text-muted-foreground text-sm">Game Format</p>
            <p className="font-medium">
              {tournament.format || "Not specified"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Tournament Format</p>
            <p className="font-medium">
              {tournament.tournament_format
                ? tournamentFormatLabels[tournament.tournament_format] ||
                  tournament.tournament_format
                : "Not specified"}
            </p>
          </div>
          {tournament.round_time_minutes && (
            <div>
              <p className="text-muted-foreground text-sm">Round Time</p>
              <p className="flex items-center gap-1 font-medium">
                <Clock className="h-4 w-4" />
                {tournament.round_time_minutes} minutes
              </p>
            </div>
          )}
          {tournament.swiss_rounds && (
            <div>
              <p className="text-muted-foreground text-sm">Swiss Rounds</p>
              <p className="font-medium">{tournament.swiss_rounds} rounds</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Page (Server Component)
// ============================================================================

export default async function TournamentPage({ params }: PageProps) {
  const { tournamentSlug } = await params;

  // Fetch tournament (cached) and current user ID (not cached) in parallel
  const [tournament, currentUserId] = await Promise.all([
    getCachedTournament(tournamentSlug),
    getCurrentUserId(),
  ]);

  if (!tournament) {
    notFound();
  }

  // Check if user can manage (org owner or staff)
  let canManage = false;
  if (currentUserId && tournament.organization_id) {
    const supabase = await createClientReadOnly();
    canManage = await hasOrganizationAccess(
      supabase,
      tournament.organization_id,
      currentUserId
    );
  }

  // Fetch the user's team data (auth-dependent, not cached)
  const myTeam = tournament.id ? await getMyTeam(tournament.id) : null;

  // Public team list for open teamsheet tournaments (active/completed only)
  // TODO: Re-enable when TeamSubmissionsList is ready
  const _showPublicTeams =
    tournament.open_team_sheets &&
    ["active", "completed"].includes(tournament.status ?? "");
  const _publicTeams =
    _showPublicTeams && tournament.id
      ? await getCachedTournamentTeams(tournament.id, tournamentSlug)
      : null;

  return (
    <PageContainer>
      <Breadcrumb tournamentName={tournament.name} />
      <TournamentHeader tournament={tournament} canManage={canManage} />

      <TournamentTabs
        description={tournament.description}
        scheduleCard={<ScheduleCard tournament={tournament} />}
        formatCard={<FormatCard tournament={tournament} />}
        canManage={canManage}
        sidebarCard={
          <TournamentSidebarCard
            tournamentId={tournament.id}
            tournamentSlug={tournament.slug}
            tournamentName={tournament.name}
            gameFormat={tournament.game_format ?? null}
            initialTeam={
              myTeam
                ? {
                    teamId: myTeam.teamId,
                    submittedAt: myTeam.submittedAt ?? null,
                    locked: myTeam.locked ?? false,
                    pokemon: myTeam.pokemon.map((p) => ({
                      species: p.species ?? "",
                      nickname: p.nickname,
                      held_item: p.held_item,
                      ability: p.ability ?? undefined,
                      tera_type: p.tera_type,
                    })),
                  }
                : null
            }
          />
        }
        tournamentId={tournament.id}
        tournamentSlug={tournament.slug}
        tournamentStatus={tournament.status ?? "draft"}
      />
    </PageContainer>
  );
}
