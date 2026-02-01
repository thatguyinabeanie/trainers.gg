import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";
import {
  createStaticClient,
  createClientReadOnly,
} from "@/lib/supabase/server";
import {
  getTournamentBySlug,
  getTeamForRegistration,
} from "@trainers/supabase";
import { CacheTags } from "@/lib/cache";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Trophy, Calendar, Users, Clock, Building2 } from "lucide-react";
import { TournamentTabs } from "./tournament-tabs";
import { PageContainer } from "@/components/layout/page-container";
import { StatusBadge } from "@/components/ui/status-badge";
import { TournamentSidebarCard } from "@/components/tournament";
import { TeamPreview } from "@/components/tournament/team-preview";

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
}: {
  tournament: NonNullable<Awaited<ReturnType<typeof getTournamentBySlug>>>;
}) {
  const organization = tournament.organization as {
    id: number;
    name: string;
    slug: string;
  } | null;

  const registrationCount = tournament.registrations?.length || 0;

  return (
    <div className="mb-8">
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
  );
}

function ScheduleCard({
  tournament,
}: {
  tournament: NonNullable<Awaited<ReturnType<typeof getTournamentBySlug>>>;
}) {
  return (
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
            <p className="text-muted-foreground text-sm">Start Date</p>
            <p className="font-medium">{formatDate(tournament.start_date)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">End Date</p>
            <p className="font-medium">{formatDate(tournament.end_date)}</p>
          </div>
        </div>
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
  const tournament = await getCachedTournament(tournamentSlug);

  if (!tournament) {
    notFound();
  }

  // Fetch the user's team data (auth-dependent, not cached)
  const myTeam = tournament.id ? await getMyTeam(tournament.id) : null;

  // Public team list for open teamsheet tournaments (active/completed only)
  const showPublicTeams =
    tournament.open_team_sheets &&
    ["active", "completed"].includes(tournament.status ?? "");
  const publicTeams =
    showPublicTeams && tournament.id
      ? await getCachedTournamentTeams(tournament.id, tournamentSlug)
      : null;

  return (
    <PageContainer>
      <Breadcrumb tournamentName={tournament.name} />
      <TournamentHeader tournament={tournament} />

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-8 lg:col-span-2">
          <TournamentTabs
            description={tournament.description}
            scheduleCard={<ScheduleCard tournament={tournament} />}
            formatCard={<FormatCard tournament={tournament} />}
          />

          {/* Public team submissions (open teamsheets) */}
          {publicTeams && publicTeams.length > 0 && (
            <section>
              <h2 className="mb-4 text-lg font-semibold">Team Submissions</h2>
              <div className="space-y-4">
                {publicTeams.map((reg) => {
                  // alts is a single object from the one-to-one join
                  const alt = reg.alts;
                  // team is a single object from the one-to-one join
                  const team = reg.team;
                  // team_pokemon is an array from the one-to-many join
                  const pokemonList = team?.team_pokemon ?? [];

                  return (
                    <Card key={reg.alt_id}>
                      <CardHeader>
                        <CardTitle className="text-base">
                          {alt?.display_name ?? alt?.username ?? "Player"}
                        </CardTitle>
                        {team?.name && (
                          <CardDescription>{team.name}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <TeamPreview
                          pokemon={pokemonList.map((tp) => ({
                            species: tp.pokemon?.species ?? "",
                            nickname: tp.pokemon?.nickname,
                            held_item: tp.pokemon?.held_item,
                            ability: tp.pokemon?.ability ?? undefined,
                            tera_type: tp.pokemon?.tera_type,
                          }))}
                        />
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
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
        </div>
      </div>
    </PageContainer>
  );
}
