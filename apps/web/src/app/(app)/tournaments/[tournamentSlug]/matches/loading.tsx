import { Skeleton } from "@/components/ui/skeleton";
import { PageContainer } from "@/components/layout/page-container";

/**
 * Loading skeleton for the /tournaments/[slug]/matches page.
 *
 * Matches the live layout:
 *   - Breadcrumb
 *   - "Matches" heading
 *   - Round cards with match rows
 */
export default function MatchesLoading() {
  return (
    <PageContainer>
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-2" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-2" />
        <Skeleton className="h-4 w-16" />
      </div>

      {/* Heading */}
      <Skeleton className="mb-6 h-9 w-32" />

      {/* Round cards */}
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-xl border p-5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            {Array.from({ length: 4 }).map((_, j) => (
              <Skeleton key={j} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ))}
      </div>
    </PageContainer>
  );
}
