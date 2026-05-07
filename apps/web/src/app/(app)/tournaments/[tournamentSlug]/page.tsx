import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";
import {
  createStaticClient,
  createClientReadOnly,
} from "@/lib/supabase/server";
import {
  getTournamentBySlug,
  getTeamForRegistration,
  hasCommunityAccess,
} from "@trainers/supabase";
import { CacheTags } from "@/lib/cache";
import Link from "next/link";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Trophy,
  Calendar,
  Users,
  Clock,
  Building2,
  Settings,
  CheckCircle2,
  Gamepad2,
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

const phaseTypeLabels: Record<string, string> = {
  swiss: "Swiss",
  single_elimination: "Single Elimination",
  double_elimination: "Double Elimination",
};

// ============================================================================
// Cached Fetchers
// ============================================================================

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

/**
 * Banner hero reusing the community's banner image.
 * Same visual language as the community detail page — contained, rounded,
 * with the community avatar overlapping the bottom edge.
 */
function TournamentBanner({
  organization,
}: {
  organization: {
    name: string;
    slug: string;
    logo_url: string | null;
    banner_url: string | null;
  };
}) {
  return (
    <div className="relative mb-14 sm:mb-16">
      {/* Banner */}
      <div className="h-36 w-full overflow-hidden rounded-xl sm:h-44 md:h-52">
        {organization.banner_url ? (
          <img
            src={organization.banner_url}
            alt={`${organization.name} banner`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="bg-muted h-full w-full" />
        )}
      </div>

      {/* Community avatar — overlaps bottom of banner */}
      <Link
        href={`/communities/${organization.slug}`}
        className="absolute bottom-0 left-4 translate-y-1/2 transition-opacity hover:opacity-90 sm:left-6"
      >
        <Avatar
          noBorder
          className="ring-background h-20 w-20 shadow-lg ring-4 sm:h-24 sm:w-24"
        >
          <AvatarImage src={organization.logo_url ?? undefined} />
          <AvatarFallback className="bg-muted text-2xl font-bold">
            {organization.name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </Link>
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
    logo_url: string | null;
    banner_url: string | null;
  } | null;

  const registrationCount = tournament.registrations?.length || 0;

  return (
    <div className="mb-6">
      {/* Community name link */}
      {organization && (
        <Link
          href={`/communities/${organization.slug}`}
          className="text-muted-foreground hover:text-foreground mb-1 inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
        >
          <Building2 className="h-3.5 w-3.5" />
          {organization.name}
        </Link>
      )}

      {/* Title row */}
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold sm:text-4xl">{tournament.name}</h1>
          {(tournament.status === "active" ||
            tournament.status === "upcoming" ||
            tournament.status === "draft" ||
            tournament.status === "completed" ||
            tournament.status === "cancelled") && (
            <StatusBadge status={tournament.status} />
          )}
        </div>

        {canManage && organization && (
          <Link
            href={`/dashboard/community/${organization.slug}/tournaments/${tournament.slug}/manage`}
          >
            <Button variant="outline" size="sm">
              <Settings className="mr-2 h-4 w-4" />
              Manage
            </Button>
          </Link>
        )}
      </div>

      {/* Metadata pills */}
      <div className="flex flex-wrap gap-2">
        {tournament.format && (
          <span className="bg-muted/60 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium">
            <Gamepad2 className="h-3.5 w-3.5" />
            {tournament.format}
          </span>
        )}
        {tournament.tournament_format && (
          <span className="bg-muted/60 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium">
            <Trophy className="h-3.5 w-3.5" />
            {tournamentFormatLabels[tournament.tournament_format] ||
              tournament.tournament_format}
          </span>
        )}
        <span className="bg-muted/60 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium">
          <Users className="h-3.5 w-3.5" />
          {registrationCount}
          {tournament.max_participants
            ? ` / ${tournament.max_participants}`
            : ""}{" "}
          players
        </span>
        {tournament.start_date && (
          <span className="bg-muted/60 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium">
            <Calendar className="h-3.5 w-3.5" />
            {formatDate(tournament.start_date)}
          </span>
        )}
        {tournament.round_time_minutes && (
          <span className="bg-muted/60 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium">
            <Clock className="h-3.5 w-3.5" />
            {tournament.round_time_minutes} min rounds
          </span>
        )}
      </div>
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
    return (
      <div className="bg-muted/30 rounded-xl p-5">
        <h3 className="mb-3 flex items-center gap-2 font-semibold">
          <Calendar className="h-5 w-5" />
          Schedule
        </h3>
        <p className="text-muted-foreground text-sm">
          Tournament start time not yet scheduled
        </p>
      </div>
    );
  }

  return (
    <div className="bg-muted/30 rounded-xl p-5">
      <h3 className="mb-4 flex items-center gap-2 font-semibold">
        <Calendar className="h-5 w-5" />
        Schedule
      </h3>
      <div className="space-y-5">
        {/* Start time */}
        <div>
          <p className="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wider">
            Start
          </p>
          <p className="font-medium">
            {formatStartDateTime(schedule.tournamentStartTime)}
          </p>
        </div>

        {/* Phases and rounds */}
        {schedule.phases.map((phase, phaseIndex) => (
          <div key={phaseIndex}>
            <h4 className="mb-2 text-sm font-semibold">{phase.phaseName}</h4>
            <div className="space-y-1">
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
                      "flex items-center justify-between rounded-md px-3 py-1.5",
                      round.isActive && "bg-primary/10",
                      round.isCompleted && "text-muted-foreground"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {round.isCompleted && (
                        <CheckCircle2 className="text-primary h-3.5 w-3.5" />
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
      </div>
    </div>
  );
}

function FormatCard({
  tournament,
}: {
  tournament: NonNullable<Awaited<ReturnType<typeof getTournamentBySlug>>>;
}) {
  return (
    <div className="bg-muted/30 rounded-xl p-5">
      <h3 className="mb-4 flex items-center gap-2 font-semibold">
        <Trophy className="h-5 w-5" />
        Format
      </h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-muted-foreground mb-0.5 text-xs font-medium uppercase tracking-wider">
            Game Format
          </p>
          <p className="font-medium">
            {tournament.format || "Not specified"}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground mb-0.5 text-xs font-medium uppercase tracking-wider">
            Tournament Format
          </p>
          <p className="font-medium">
            {tournament.tournament_format
              ? tournamentFormatLabels[tournament.tournament_format] ||
                tournament.tournament_format
              : "Not specified"}
          </p>
        </div>
        {tournament.round_time_minutes && (
          <div>
            <p className="text-muted-foreground mb-0.5 text-xs font-medium uppercase tracking-wider">
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
            <p className="text-muted-foreground mb-0.5 text-xs font-medium uppercase tracking-wider">
              Swiss Rounds
            </p>
            <p className="font-medium">{tournament.swiss_rounds} rounds</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Phase data extraction for tournament structure visual
// ============================================================================

interface PhaseData {
  id: number;
  name: string;
  phaseType: string;
  phaseTypeLabel: string;
  status: string;
  plannedRounds: number | null;
  bestOf: number | null;
  roundTimeMinutes: number | null;
  checkInTimeMinutes: number | null;
  cutRule: string | null;
}

function extractPhaseData(
  tournament: NonNullable<Awaited<ReturnType<typeof getTournamentBySlug>>>
): PhaseData[] {
  if (!tournament.phases || tournament.phases.length === 0) return [];

  return tournament.phases.map((phase) => ({
    id: phase.id,
    name: phase.name,
    phaseType: phase.phase_type,
    phaseTypeLabel: phaseTypeLabels[phase.phase_type] || phase.phase_type,
    status: phase.status ?? "pending",
    plannedRounds: phase.planned_rounds,
    bestOf: phase.best_of,
    roundTimeMinutes: phase.round_time_minutes,
    checkInTimeMinutes: phase.check_in_time_minutes,
    cutRule: phase.cut_rule,
  }));
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

  // Check if user can manage (community owner or staff)
  let canManage = false;
  if (currentUserId && tournament.community_id) {
    const supabase = await createClientReadOnly();
    canManage = await hasCommunityAccess(
      supabase,
      tournament.community_id,
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

  // Extract phase data for the structure visual
  const phases = extractPhaseData(tournament);

  // Extract organization for banner
  const organization = tournament.organization as {
    id: number;
    name: string;
    slug: string;
    logo_url: string | null;
    banner_url: string | null;
  } | null;

  return (
    <PageContainer>
      <Breadcrumb tournamentName={tournament.name} />

      {/* Community banner — mirrors community detail page */}
      {organization && <TournamentBanner organization={organization} />}

      <TournamentHeader tournament={tournament} canManage={canManage} />

      <TournamentTabs
        description={tournament.description}
        scheduleCard={<ScheduleCard tournament={tournament} />}
        formatCard={<FormatCard tournament={tournament} />}
        phases={phases}
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
