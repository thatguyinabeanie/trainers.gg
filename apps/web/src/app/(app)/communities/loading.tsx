import { Skeleton } from "@/components/ui/skeleton";
import { PageContainer } from "@/components/layout/page-container";

/**
 * Loading skeleton for the /communities list page.
 *
 * Matches the live layout structure:
 *   - Header: title + description
 *   - Featured strip: ~h-32
 *   - Search bar: ~h-10
 *   - Community grid cards
 */
export default function CommunitiesLoading() {
  return (
    <PageContainer>
      {/* Header skeleton */}
      <div className="mb-8 space-y-2">
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Featured strip */}
      <Skeleton className="mb-6 h-32 w-full rounded-xl" />

      {/* Search bar */}
      <div className="my-6 flex justify-end">
        <Skeleton className="h-10 w-60 rounded-md" />
      </div>

      {/* Community grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    </PageContainer>
  );
}
