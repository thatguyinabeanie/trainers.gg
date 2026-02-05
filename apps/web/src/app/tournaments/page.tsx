import { unstable_cache } from "next/cache";
import {
  createStaticClient,
  createClientReadOnly,
} from "@/lib/supabase/server";
import {
  listTournamentsGrouped,
  getCurrentUserRegisteredTournamentIds,
  checkRegistrationOpen,
  type TournamentWithOrg,
  type GroupedTournaments,
} from "@trainers/supabase";
import Link from "next/link";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Users, Calendar, Swords } from "lucide-react";
import { TournamentSearch } from "./tournament-search";
import { DateChip } from "./date-chip";
import { QuickRegisterButton } from "./quick-register-button";
import { CacheTags } from "@/lib/cache";
import { PageContainer } from "@/components/layout/page-container";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { getGameById, getFormatById } from "@/components/tournaments/shared";

// On-demand revalidation via cache tags (no time-based revalidation)
export const revalidate = false;

/**
 * Cached data fetcher for tournaments list
 * Revalidated when CacheTags.TOURNAMENTS_LIST is invalidated
 */
const getCachedTournaments = unstable_cache(
  async () => {
    const supabase = createStaticClient();
    return listTournamentsGrouped(supabase, { completedLimit: 20 });
  },
  ["tournaments-grouped"],
  { tags: [CacheTags.TOURNAMENTS_LIST] }
);

// ============================================================================
// Section Header (Server Component)
// ============================================================================

function SectionHeader({ title, count }: { title: string; count: number }) {
  if (count === 0) return null;

  return (
    <div className="flex items-center gap-2 pt-6 pb-3 first:pt-0">
      <h2 className="text-lg font-semibold">{title}</h2>
      <Badge variant="secondary" className="text-xs">
        {count}
      </Badge>
    </div>
  );
}

// ============================================================================
// Empty State (Server Component)
// ============================================================================

function EmptyState({ isSearching }: { isSearching: boolean }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <Trophy className="text-muted-foreground mb-4 h-12 w-12" />
        <h3 className="mb-2 text-lg font-semibold">No tournaments found</h3>
        <p className="text-muted-foreground text-center">
          {isSearching
            ? "Try adjusting your search query"
            : "Check back later for upcoming tournaments!"}
        </p>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Active Tournaments Cards (Server Component)
// ============================================================================

const TOURNAMENT_FORMAT_LABELS: Record<string, string> = {
  swiss_only: "Swiss",
  swiss_with_cut: "Swiss + Top Cut",
  single_elimination: "Single Elim",
  double_elimination: "Double Elim",
};

function ActiveTournamentCard({
  tournament,
}: {
  tournament: TournamentWithOrg;
}) {
  const currentRound = tournament.current_round ?? 0;
  const totalRounds = tournament.swiss_rounds ?? 0;
  const progressPercent =
    totalRounds > 0 ? Math.round((currentRound / totalRounds) * 100) : 0;

  const formatLabel = tournament.tournament_format
    ? (TOURNAMENT_FORMAT_LABELS[tournament.tournament_format] ??
      tournament.tournament_format)
    : null;

  const gameLabel = tournament.game
    ? (getGameById(tournament.game)?.name ?? tournament.game.toUpperCase())
    : null;

  const gameFormatLabel = tournament.game_format
    ? (getFormatById(tournament.game ?? "", tournament.game_format)?.name ??
      null)
    : null;

  return (
    <Link
      href={`/tournaments/${tournament.slug}`}
      className="hover:bg-muted/30 group block rounded-lg border p-4 transition-colors"
    >
      {/* Top row: pulse + name */}
      <div className="mb-3 flex items-start gap-2.5">
        <span className="relative mt-1 flex h-2.5 w-2.5 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500"></span>
        </span>
        <div className="min-w-0">
          <p className="group-hover:text-primary truncate text-base font-semibold transition-colors">
            {tournament.name}
          </p>
          {tournament.organization && (
            <p className="text-muted-foreground truncate text-sm">
              {tournament.organization.name}
            </p>
          )}
        </div>
      </div>

      {/* Progress bar (only if we know total rounds) */}
      {totalRounds > 0 && (
        <div className="mb-3">
          <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
            <div
              className="bg-primary h-full rounded-full transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Detail chips */}
      <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span className="flex items-center gap-1">
          <Users className="h-3.5 w-3.5" />
          {tournament._count.registrations} players
        </span>
        {formatLabel && (
          <span className="flex items-center gap-1">
            <Swords className="h-3.5 w-3.5" />
            {formatLabel}
          </span>
        )}
        {gameFormatLabel && (
          <span>
            {gameLabel} {gameFormatLabel}
          </span>
        )}
        {tournament.battle_format && (
          <span className="capitalize">{tournament.battle_format}</span>
        )}
      </div>
    </Link>
  );
}

function ActiveTournaments({
  tournaments,
}: {
  tournaments: TournamentWithOrg[];
}) {
  if (tournaments.length === 0) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {tournaments.map((tournament) => (
        <ActiveTournamentCard key={tournament.id} tournament={tournament} />
      ))}
    </div>
  );
}

// ============================================================================
// Upcoming Tournaments (Server Component)
// Table on desktop, card list on mobile
// ============================================================================

function UpcomingTournaments({
  tournaments,
  registeredTournamentIds,
}: {
  tournaments: TournamentWithOrg[];
  registeredTournamentIds: Set<number>;
}) {
  if (tournaments.length === 0) return null;

  return (
    <>
      {/* Mobile: Card list */}
      <div className="divide-y rounded-lg border md:hidden">
        {tournaments.map((tournament) => {
          const spotsText = tournament.max_participants
            ? `${tournament._count.registrations}/${tournament.max_participants}`
            : `${tournament._count.registrations}`;

          const isFull =
            tournament.max_participants &&
            tournament._count.registrations >= tournament.max_participants;

          const isRegistered = registeredTournamentIds.has(tournament.id);

          const { isOpen: isRegistrationOpen } =
            checkRegistrationOpen(tournament);

          // Format date compactly for mobile
          const date = tournament.start_date
            ? new Date(tournament.start_date)
            : null;
          const dateStr = date
            ? date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
            : "";
          const timeStr = date
            ? date
                .toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })
                .toLowerCase()
            : "";

          return (
            <div key={tournament.id} className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="text-muted-foreground mb-0.5 text-xs">
                  {dateStr} · {timeStr}
                </p>
                <Link
                  href={`/tournaments/${tournament.slug}`}
                  className="hover:text-primary mb-0.5 block truncate font-semibold hover:underline"
                >
                  {tournament.name}
                </Link>
                <p className="text-muted-foreground truncate text-xs">
                  {tournament.organization?.name}
                  {tournament.organization && " · "}
                  <Users className="inline h-3 w-3" /> {spotsText}
                </p>
              </div>
              <QuickRegisterButton
                tournamentId={tournament.id}
                tournamentSlug={tournament.slug}
                tournamentName={tournament.name}
                isFull={!!isFull}
                isRegistered={isRegistered}
                isRegistrationClosed={!isRegistrationOpen}
              />
            </div>
          );
        })}
      </div>

      {/* Desktop: Table */}
      <div className="hidden rounded-lg border md:block">
        <ResponsiveTable>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Date & Time
                  </div>
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Users className="h-3.5 w-3.5" />
                    Spots
                  </div>
                </TableHead>
                <TableHead className="w-25 text-center"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tournaments.map((tournament) => {
                const spotsText = tournament.max_participants
                  ? `${tournament._count.registrations} / ${tournament.max_participants}`
                  : `${tournament._count.registrations}`;

                const isFull =
                  tournament.max_participants &&
                  tournament._count.registrations >=
                    tournament.max_participants;

                const isRegistered = registeredTournamentIds.has(tournament.id);

                const { isOpen: isRegOpen } = checkRegistrationOpen(tournament);

                return (
                  <TableRow key={tournament.id} className="hover:bg-muted/50">
                    <TableCell className="whitespace-nowrap">
                      <DateChip dateString={tournament.start_date} showTime />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <Link
                        href={`/tournaments/${tournament.slug}`}
                        className="hover:text-primary hover:underline"
                      >
                        {tournament.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {tournament.organization ? (
                        <Link
                          href={`/organizations/${tournament.organization.slug}`}
                          className="hover:text-primary hover:underline"
                        >
                          {tournament.organization.name}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-muted-foreground">{spotsText}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <QuickRegisterButton
                        tournamentId={tournament.id}
                        tournamentSlug={tournament.slug}
                        tournamentName={tournament.name}
                        isFull={!!isFull}
                        isRegistered={isRegistered}
                        isRegistrationClosed={!isRegOpen}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ResponsiveTable>
      </div>
    </>
  );
}

// ============================================================================
// Completed Tournaments (Server Component)
// Table on desktop, card list on mobile
// ============================================================================

function CompletedTournaments({
  tournaments,
}: {
  tournaments: TournamentWithOrg[];
}) {
  if (tournaments.length === 0) return null;

  return (
    <>
      {/* Mobile: Card list */}
      <div className="divide-y rounded-lg border md:hidden">
        {tournaments.map((tournament) => {
          const date =
            tournament.end_date || tournament.start_date
              ? new Date(tournament.end_date || tournament.start_date!)
              : null;
          const dateStr = date
            ? date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
            : "";

          return (
            <Link
              key={tournament.id}
              href={`/tournaments/${tournament.slug}`}
              className="hover:bg-muted/50 flex items-center gap-3 p-3 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="text-muted-foreground mb-0.5 text-xs">
                  {dateStr}
                </p>
                <p className="mb-0.5 truncate font-semibold">
                  {tournament.name}
                </p>
                <p className="text-muted-foreground truncate text-xs">
                  {tournament.organization?.name}
                  {tournament.organization && " · "}
                  <Users className="inline h-3 w-3" />{" "}
                  {tournament._count.registrations}
                </p>
                {tournament.winner && (
                  <p className="text-primary mt-1 flex items-center gap-1 text-xs font-medium">
                    <Trophy className="h-3 w-3" />
                    {tournament.winner.display_name ||
                      tournament.winner.username}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Desktop: Table */}
      <div className="hidden rounded-lg border md:block">
        <ResponsiveTable>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Winner</TableHead>
                <TableHead className="text-right">Players</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tournaments.map((tournament) => (
                <TableRow key={tournament.id} className="hover:bg-muted/50">
                  <TableCell className="whitespace-nowrap">
                    <DateChip
                      dateString={tournament.end_date || tournament.start_date}
                      showTime={false}
                      showYear
                    />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <Link
                      href={`/tournaments/${tournament.slug}`}
                      className="hover:text-primary hover:underline"
                    >
                      {tournament.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {tournament.organization ? (
                      <Link
                        href={`/organizations/${tournament.organization.slug}`}
                        className="hover:text-primary hover:underline"
                      >
                        {tournament.organization.name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    {tournament.winner ? (
                      <div className="text-primary flex items-center gap-1.5 font-medium">
                        <Trophy className="h-3.5 w-3.5" />
                        <span>
                          {tournament.winner.display_name ||
                            tournament.winner.username}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-right">
                    {tournament._count.registrations}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ResponsiveTable>
      </div>
    </>
  );
}

// ============================================================================
// Filter Helper
// ============================================================================

function filterTournaments(
  data: GroupedTournaments,
  searchQuery?: string
): GroupedTournaments {
  if (!searchQuery) return data;

  const query = searchQuery.toLowerCase();
  const filterFn = (t: TournamentWithOrg) =>
    t.name.toLowerCase().includes(query) ||
    t.organization?.name?.toLowerCase().includes(query);

  return {
    active: data.active.filter(filterFn),
    upcoming: data.upcoming.filter(filterFn),
    completed: data.completed.filter(filterFn),
  };
}

// ============================================================================
// Main Page (Server Component)
// ============================================================================

export default async function TournamentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q: searchQuery } = await searchParams;

  // Fetch tournaments (cached) and user registrations (not cached, user-specific)
  const [allData, registeredTournamentIds] = await Promise.all([
    getCachedTournaments(),
    (async () => {
      try {
        const supabase = await createClientReadOnly();
        return getCurrentUserRegisteredTournamentIds(supabase);
      } catch {
        // User not logged in or error - return empty set
        return new Set<number>();
      }
    })(),
  ]);

  // Filter on the server
  const data = filterTournaments(allData, searchQuery);

  const totalCount =
    data.active.length + data.upcoming.length + data.completed.length;
  const hasNoResults = totalCount === 0;
  const isSearching = !!searchQuery;

  return (
    <PageContainer>
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Trophy className="h-8 w-8" />
            Tournaments
          </h1>
          <p className="text-muted-foreground mt-1">
            Browse and join Pokemon tournaments
          </p>
        </div>

        <Suspense fallback={<div className="h-10 w-64" />}>
          <TournamentSearch />
        </Suspense>
      </div>

      {/* Empty State */}
      {hasNoResults && <EmptyState isSearching={isSearching} />}

      {/* Tournament Sections */}
      {!hasNoResults && (
        <div className="space-y-2">
          {data.active.length > 0 && (
            <>
              <SectionHeader title="In Progress" count={data.active.length} />
              <ActiveTournaments tournaments={data.active} />
            </>
          )}

          {data.upcoming.length > 0 && (
            <>
              <SectionHeader title="Upcoming" count={data.upcoming.length} />
              <UpcomingTournaments
                tournaments={data.upcoming}
                registeredTournamentIds={registeredTournamentIds}
              />
            </>
          )}

          {data.completed.length > 0 && (
            <>
              <SectionHeader
                title="Recently Completed"
                count={data.completed.length}
              />
              <CompletedTournaments tournaments={data.completed} />
            </>
          )}
        </div>
      )}
    </PageContainer>
  );
}
