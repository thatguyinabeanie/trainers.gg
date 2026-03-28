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
import { Suspense } from "react";
import { Trophy } from "lucide-react";
import { TournamentSearch } from "./tournament-search";
import { QuickRegisterButton } from "./quick-register-button";
import { CacheTags } from "@/lib/cache";
import { PageContainer } from "@/components/layout/page-container";
import {
  SectionHeader,
  ActiveTournaments,
  UpcomingTournaments,
  CompletedTournaments,
  TournamentListEmpty,
} from "@/components/tournaments/tournament-list";

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
      {hasNoResults && (
        <TournamentListEmpty
          description={
            isSearching
              ? "Try adjusting your search query"
              : "Check back later for upcoming tournaments!"
          }
        />
      )}

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
                actionSlot={(tournament) => {
                  const isFull =
                    tournament.max_participants &&
                    tournament.registrationCount >= tournament.max_participants;
                  const isRegistered = registeredTournamentIds.has(
                    tournament.id
                  );
                  const { isOpen: isRegistrationOpen } =
                    checkRegistrationOpen(tournament);

                  return (
                    <QuickRegisterButton
                      tournamentId={tournament.id}
                      tournamentSlug={tournament.slug}
                      tournamentName={tournament.name}
                      isFull={!!isFull}
                      isRegistered={isRegistered}
                      isRegistrationClosed={!isRegistrationOpen}
                    />
                  );
                }}
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
