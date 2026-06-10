import { Skeleton } from "@/components/ui/skeleton";
import { PageContainer } from "@/components/layout/page-container";

/**
 * Loading skeleton for the /tournaments/[slug] detail page.
 *
 * Matches the live layout:
 *   - Banner hero with community avatar
 *   - Tournament title + metadata pills
 *   - Tabbed content + sidebar card
 */
export default function TournamentDetailLoading() {
  return (
    <PageContainer>
      {/* Banner + avatar overlap */}
      <div className="relative mb-14">
        <Skeleton className="h-40 w-full rounded-xl sm:h-48 md:h-56" />
        <div className="absolute bottom-0 left-4 translate-y-1/2 sm:left-6">
          <Skeleton className="h-24 w-24 rounded-full ring-4 sm:h-28 sm:w-28" />
        </div>
      </div>

      {/* Community link + tournament name */}
      <div className="mt-10 mb-6 space-y-3 sm:mt-12">
        <Skeleton className="h-4 w-32" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-80" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </div>

      {/* Metadata pills */}
      <div className="mb-6 flex flex-wrap gap-2">
        <Skeleton className="h-8 w-28 rounded-full" />
        <Skeleton className="h-8 w-36 rounded-full" />
        <Skeleton className="h-8 w-24 rounded-full" />
        <Skeleton className="h-8 w-44 rounded-full" />
      </div>

      {/* Tabs + sidebar */}
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="min-w-0 flex-1 space-y-4">
          <Skeleton className="h-10 w-64 rounded-md" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
        <div className="w-full shrink-0 lg:w-80">
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    </PageContainer>
  );
}
