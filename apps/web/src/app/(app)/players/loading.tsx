import { Skeleton } from "@/components/ui/skeleton";
import { PageContainer } from "@/components/layout/page-container";

/**
 * Loading skeleton for the /players directory page.
 *
 * Matches the live layout:
 *   - Header
 *   - Main column (~70%): search + player grid
 *   - Sidebar (~30%): leaderboard, recently active, new members
 */
export default function PlayersLoading() {
  return (
    <PageContainer>
      {/* Header */}
      <div className="mb-8 space-y-2">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-4 w-80" />
      </div>

      {/* Main layout: content + sidebar */}
      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Main column */}
        <div className="min-w-0 flex-1 space-y-4">
          {/* Search + filter bar */}
          <Skeleton className="h-10 w-full rounded-md" />
          {/* Player grid */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <aside className="w-full shrink-0 space-y-4 lg:w-72 xl:w-80">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </aside>
      </div>
    </PageContainer>
  );
}
