import { Skeleton } from "@/components/ui/skeleton";
import { PageContainer } from "@/components/layout/page-container";

/**
 * Loading skeleton for the /data/pokemon/[species] drill-down page.
 *
 * Acts as the Suspense boundary that satisfies the dynamic params/searchParams
 * reads under cacheComponents. Heights match the live layout to avoid CLS.
 */
export default function DrilldownLoading() {
  return (
    <PageContainer>
      {/* Hero skeleton */}
      <div className="mb-6 flex gap-4">
        {/* Sprite */}
        <Skeleton className="size-20 shrink-0 rounded-lg" />
        <div className="flex flex-1 flex-col gap-2">
          {/* Name + types */}
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-5 w-32" />
          {/* Headline stat */}
          <Skeleton className="h-5 w-64" />
        </div>
      </div>

      {/* Filter bar */}
      <Skeleton className="mb-4 h-12 w-full rounded-xl" />

      {/* Build fingerprint card */}
      <Skeleton className="mb-4 h-56 w-full rounded-xl" />

      {/* Combos + Timeline row */}
      <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Skeleton className="h-72 w-full rounded-xl" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>

      {/* Teammates row */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Skeleton className="h-72 w-full rounded-xl" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    </PageContainer>
  );
}
