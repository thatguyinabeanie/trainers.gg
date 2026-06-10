import { Skeleton } from "@/components/ui/skeleton";
import { PageContainer } from "@/components/layout/page-container";

/**
 * Loading skeleton for the /communities/[slug] detail page.
 *
 * Matches the live layout:
 *   - Banner hero: ~h-56
 *   - Avatar offset below banner
 *   - Community name + stats pills
 *   - Tabbed content area
 */
export default function CommunityDetailLoading() {
  return (
    <PageContainer>
      {/* Banner + avatar overlap */}
      <div className="relative mb-14">
        <Skeleton className="h-40 w-full rounded-xl sm:h-48 md:h-56" />
        {/* Avatar placeholder */}
        <div className="absolute bottom-0 left-4 translate-y-1/2 sm:left-6">
          <Skeleton className="h-24 w-24 rounded-full ring-4 sm:h-28 sm:w-28" />
        </div>
      </div>

      {/* Community name + description */}
      <div className="mt-10 space-y-3 sm:mt-12">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Stats pills row */}
      <div className="mt-5 flex flex-wrap gap-3">
        <Skeleton className="h-8 w-32 rounded-full" />
        <Skeleton className="h-8 w-28 rounded-full" />
        <Skeleton className="h-8 w-28 rounded-full" />
      </div>

      {/* Tabs */}
      <div className="mt-6 space-y-4">
        <Skeleton className="h-10 w-64 rounded-md" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    </PageContainer>
  );
}
