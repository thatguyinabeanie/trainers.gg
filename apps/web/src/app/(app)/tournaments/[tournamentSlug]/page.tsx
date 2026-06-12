import { cacheTag, cacheLife } from "next/cache";
import { notFound } from "next/navigation";
import {
  createStaticClient,
  createServiceRoleClient,
  createClientReadOnly,
  getUserId,
} from "@/lib/supabase/server";
import {
  getTournamentBySlug,
  getTeamForRegistration,
  hasCommunityAccess,
} from "@trainers/supabase";
import { CacheTags } from "@/lib/cache";
import { getLabel, gameFormatLabels } from "@trainers/utils";
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
import { TournamentTabs, type PhaseData } from "./tournament-tabs";
import { PublicPairings } from "./public-pairings";
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
 * Cached tournament fetcher — keyed by slug.
 * Uses slug-specific cache tag for granular invalidation.
 *
 * §0.2 (Phase 2 Task 9 — Part B mechanical swap): `createStaticClient()` uses
 * the anon key; after `REVOKE SELECT ... FROM anon` it would silently return
 * zero rows. `createServiceRoleClient()` bypasses grants and keeps working.
 * The data is public S-bucket (same for all viewers), so service-role inside
 * `'use cache'` is safe — it does not vary per user.
 */
async function getCachedTournament(slug: string) {
  "use cache";
  cacheTag(CacheTags.tournament(slug), CacheTags.TOURNAMENTS_LIST);
  cacheLife("max");

  const supabase = createServiceRoleClient();
  return getTournamentBySlug(supabase, slug);
}

/**
 * Fetch the current user's submitted team (auth-dependent, NOT cached).
 * Returns null when the user is unauthenticated or has no team submitted.
 * createClientReadOnly() is called outside any cache scope — safe for cookies.
 */
async function getMyTeam(tournamentId: number) {
  const supabase = await createClientReadOnly().catch(() => null);
  if (!supabase) return null;
  return getTeamForRegistration(supabase, tournamentId);
}

/**
 * Cached public team list for open teamsheet tournaments.
 * Keyed by tournament ID and slug for granular invalidation.
 *
 * §0.2 (Phase 2 Task 9 — Part B mechanical swap): reads of `alts`, `teams`,
 * `team_pokemon`, and `pokemon` use `createServiceRoleClient()` so they survive
 * `REVOKE SELECT ... FROM anon, authenticated` on S-bucket base tables.
 * The `public_tournament_registrations` VIEW read intentionally stays on the
 * anon/static client — it is excluded from the revoke set (safe-column view,
 * public path, not a base-table grant revoke target).
 * All data is public S-bucket (open team sheets, same for all viewers).
 */
async function getCachedTournamentTeams(tournamentId: number, slug: string) {
  "use cache";
  cacheTag(CacheTags.tournamentTeams(slug), CacheTags.tournament(slug));
  cacheLife("max");

  // Anon/static client: only for the public_tournament_registrations VIEW,
  // which is excluded from the revoke set and intentionally left unchanged.
  const anonSupabase = createStaticClient();

  // Service-role client: for alts, teams, team_pokemon, pokemon base tables
  // that will have anon/authenticated SELECT revoked in Step 4.
  const srSupabase = createServiceRoleClient();

  // Two-step lookup (RLS audit #3): the base tournament_registrations SELECT is
  // locked to own + staff, so the public path reads the safe-column VIEW first,
  // then fetches teams/pokemon separately. We avoid relying on PostgREST view
  // embedding — teams are resolved by team_id in a second query (the teams /
  // team_pokemon tables already carry their own public open-team-sheet RLS).
  const { data: registrations } = await anonSupabase
    .from("public_tournament_registrations")
    .select("alt_id, team_id, registered_at")
    .eq("tournament_id", tournamentId)
    .not("team_id", "is", null)
    .order("registered_at");

  if (!registrations || registrations.length === 0) return [];

  const altIds = registrations
    .map((r) => r.alt_id)
    .filter((id): id is number => id != null);
  const teamIds = registrations
    .map((r) => r.team_id)
    .filter((id): id is number => id != null);

  const [altsResult, teamsResult] = await Promise.all([
    srSupabase
      .from("alts")
      .select("id, username")
      .in("id", altIds),
    srSupabase
      .from("teams")
      .select(
        `
          id, name,
          team_pokemon(
            team_position,
            pokemon:pokemon(species, nickname, held_item, ability, tera_type)
          )
        `
      )
      .in("id", teamIds),
  ]);

  const altsById = new Map(
    (altsResult.data ?? []).map((alt) => [alt.id, alt])
  );
  const teamsById = new Map(
    (teamsResult.data ?? []).map((team) => [team.id, team])
  );

  return registrations.map((r) => ({
    alt_id: r.alt_id,
    alts: r.alt_id != null ? (altsById.get(r.alt_id) ?? null) : null,
    team: r.team_id != null ? (teamsById.get(r.team_id) ?? null) : null,
  }));
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
    icon: string | null;
    logo_url: string | null;
    banner_url: string | null;
  };
}) {
  return (
    <div className="relative">
      {/* Banner */}
      <div className="h-40 w-full overflow-hidden rounded-xl sm:h-48 md:h-56">
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
        aria-label={`View ${organization.name} community`}
        className="absolute bottom-0 left-4 translate-y-1/2 transition-opacity hover:opacity-90 sm:left-6"
      >
        <Avatar
          noBorder
          className="ring-background h-24 w-24 shadow-lg ring-4 sm:h-28 sm:w-28"
        >
          <AvatarImage
            src={organization.logo_url ?? undefined}
            alt={`${organization.name} logo`}
          />
          <AvatarFallback className="bg-muted text-2xl font-bold">
            {organization.icon || organization.name.slice(0, 2).toUpperCase()}
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
    <div className="mt-10 mb-6 sm:mt-12">
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
          {tournament.status && <StatusBadge status={tournament.status} />}
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
            {getLabel(tournament.format, gameFormatLabels)}
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
          <p className="text-muted-foreground mb-1 text-xs font-medium tracking-wider uppercase">
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
          <p className="text-muted-foreground mb-0.5 text-xs font-medium tracking-wider uppercase">
            Game Format
          </p>
          <p className="font-medium">
            {tournament.format
              ? getLabel(tournament.format, gameFormatLabels)
              : "Not specified"}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground mb-0.5 text-xs font-medium tracking-wider uppercase">
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
            <p className="text-muted-foreground mb-0.5 text-xs font-medium tracking-wider uppercase">
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
            <p className="text-muted-foreground mb-0.5 text-xs font-medium tracking-wider uppercase">
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
    getUserId(),
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
    icon: string | null;
    logo_url: string | null;
    banner_url: string | null;
  } | null;

  return (
    <PageContainer>
      {/* Community banner — mirrors community detail page */}
      {organization && <TournamentBanner organization={organization} />}

      <TournamentHeader tournament={tournament} canManage={canManage} />

      <TournamentTabs
        description={tournament.description}
        scheduleCard={<ScheduleCard tournament={tournament} />}
        formatCard={<FormatCard tournament={tournament} />}
        phases={phases}
        pairingsSlot={
          <PublicPairings
            tournamentId={tournament.id}
            tournamentSlug={tournament.slug}
            canManage={canManage}
          />
        }
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
                      move1: p.move1,
                      move2: p.move2,
                      move3: p.move3,
                      move4: p.move4,
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
