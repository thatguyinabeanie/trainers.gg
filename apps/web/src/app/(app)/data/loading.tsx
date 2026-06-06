import { Skeleton } from "@/components/ui/skeleton";
import { PageContainer } from "@/components/layout/page-container";

/**
 * Loading skeleton for the two-panel /data Meta Explorer.
 *
 * Heights are fixed to match the live layout so content arrival doesn't shift
 * the page (avoids CLS):
 *   - Controls bar: ~h-14
 *   - Meta Pipeline (Sankey) panel: ~h-72
 *   - Usage Over Time (line chart) panel: ~h-56
 */
export default function DataLoading() {
  return (
    <PageContainer>
      {/* Header skeleton */}
      <div className="mb-6 space-y-2">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Controls bar */}
      <Skeleton className="mb-4 h-14 w-full rounded-xl" />

      {/* Meta Pipeline panel */}
      <Skeleton className="mb-4 h-72 w-full rounded-2xl" />

      {/* Usage Over Time panel */}
      <Skeleton className="h-56 w-full rounded-2xl" />
    </PageContainer>
  );
}
