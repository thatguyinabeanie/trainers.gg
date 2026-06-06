import { Skeleton } from "@/components/ui/skeleton";
import { PageContainer } from "@/components/layout/page-container";

/**
 * Loading skeleton for /data.
 *
 * Heights are fixed so the layout doesn't shift when real content arrives
 * (avoids CLS). The filter bar block matches ~52px, and the chart block is
 * h-96 (384px) to match the chart area.
 */
export default function DataLoading() {
  return (
    <PageContainer>
      {/* Header skeleton */}
      <div className="mb-6 space-y-2">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-4 w-80" />
      </div>

      {/* Filter bar skeleton */}
      <Skeleton className="mb-3 h-14 w-full rounded-xl" />

      {/* Chart area skeleton — stable h-96 prevents CLS */}
      <Skeleton className="h-96 w-full rounded-2xl" />

      {/* Hint text skeleton */}
      <div className="mt-3 space-y-1">
        <Skeleton className="h-3 w-full max-w-xl" />
        <Skeleton className="h-3 w-64" />
      </div>
    </PageContainer>
  );
}
