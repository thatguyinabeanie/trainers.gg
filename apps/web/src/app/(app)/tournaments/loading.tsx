import { Skeleton } from "@/components/ui/skeleton";
import { PageContainer } from "@/components/layout/page-container";

/**
 * Loading skeleton for the /tournaments list page.
 *
 * Matches the live layout:
 *   - Header + search bar row
 *   - Section header + tournament card rows (active, upcoming, completed)
 */
export default function TournamentsLoading() {
  return (
    <PageContainer>
      {/* Header + search row */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-44" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-64 rounded-md" />
      </div>

      {/* In Progress section */}
      <div className="space-y-2">
        <Skeleton className="mb-2 h-6 w-32" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>

      {/* Upcoming section */}
      <div className="mt-6 space-y-2">
        <Skeleton className="mb-2 h-6 w-24" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    </PageContainer>
  );
}
