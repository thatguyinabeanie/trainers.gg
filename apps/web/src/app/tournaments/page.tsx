import { unstable_cache } from "next/cache";
import {
  createStaticClient,
  createClientReadOnly,
} from "@/lib/supabase/server";
import {
  listTournamentsGrouped,
  getCurrentUserRegisteredTournamentIds,
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
import { Trophy, Users, Calendar } from "lucide-react";
import { TournamentSearch } from "./tournament-search";
import { DateChip } from "./date-chip";
import { QuickRegisterButton } from "./quick-register-button";
import { CacheTags } from "@/lib/cache";

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
// Active Tournaments Table (Server Component)
// ============================================================================

function ActiveTournamentsTable({
  tournaments,
}: {
  tournaments: TournamentWithOrg[];
}) {
  if (tournaments.length === 0) return null;

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Organization</TableHead>
            <TableHead className="text-right">Players</TableHead>
            <TableHead>Progress</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tournaments.map((tournament) => (
            <TableRow key={tournament.id} className="hover:bg-muted/50">
              <TableCell className="text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
                  </span>
                  <Link
                    href={`/tournaments/${tournament.slug}`}
                    className="hover:text-primary hover:underline"
                  >
                    {tournament.name}
                  </Link>
                </div>
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
              <TableCell className="text-muted-foreground text-right">
                {tournament._count.registrations}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {tournament.current_round
                  ? `Round ${tournament.current_round}${tournament.swiss_rounds ? ` of ${tournament.swiss_rounds}` : ""}`
                  : "In Progress"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ============================================================================
// Upcoming Tournaments Table (Server Component)
// ============================================================================

function UpcomingTournamentsTable({
  tournaments,
  registeredTournamentIds,
}: {
  tournaments: TournamentWithOrg[];
  registeredTournamentIds: Set<number>;
}) {
  if (tournaments.length === 0) return null;

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Date & Time
              </div>
            </TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="hidden sm:table-cell">Organization</TableHead>
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
              tournament._count.registrations >= tournament.max_participants;

            const isRegistered = registeredTournamentIds.has(tournament.id);

            return (
              <TableRow key={tournament.id} className="hover:bg-muted/50">
                <TableCell>
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
                <TableCell className="text-muted-foreground hidden sm:table-cell">
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
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

// ============================================================================
// Completed Tournaments Table (Server Component)
// ============================================================================

function CompletedTournamentsTable({
  tournaments,
}: {
  tournaments: TournamentWithOrg[];
}) {
  if (tournaments.length === 0) return null;

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Organization</TableHead>
            <TableHead className="text-right">Players</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tournaments.map((tournament) => (
            <TableRow key={tournament.id} className="hover:bg-muted/50">
              <TableCell>
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
              <TableCell className="text-muted-foreground text-right">
                {tournament._count.registrations}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
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
    <div className="container mx-auto px-4 py-8">
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
              <SectionHeader title="Active Now" count={data.active.length} />
              <ActiveTournamentsTable tournaments={data.active} />
            </>
          )}

          {data.upcoming.length > 0 && (
            <>
              <SectionHeader title="Upcoming" count={data.upcoming.length} />
              <UpcomingTournamentsTable
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
              <CompletedTournamentsTable tournaments={data.completed} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
