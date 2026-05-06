import { Skeleton } from "@/components/ui/skeleton";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { PageHeader } from "@/components/dashboard/page-header";

export default function HomeLoading() {
  return (
    <>
      <PageHeader title="Dashboard" />
      <DashboardContent>
        <div className="space-y-6">
          {/* Welcome header skeleton */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Skeleton className="h-8 w-64" />
              <Skeleton className="mt-2 h-4 w-48" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-36 rounded-md" />
              <Skeleton className="h-8 w-28 rounded-md" />
            </div>
          </div>

          {/* Stats row skeleton */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-card p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <Skeleton className="size-7 rounded-lg" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="mt-3 h-7 w-20" />
                <Skeleton className="mt-2 h-3 w-24" />
              </div>
            ))}
          </div>

          {/* Two-column skeleton */}
          <div className="grid gap-6 lg:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-card p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <Skeleton className="size-4 rounded" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <div key={j} className="flex items-center gap-3 rounded-lg p-2.5">
                      <Skeleton className="size-9 rounded-lg" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Alts section skeleton */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-8 w-24 rounded-md" />
            </div>
            <div className="rounded-lg bg-muted/30">
              <div className="px-3 py-2">
                <Skeleton className="h-3 w-full" />
              </div>
              {Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 border-t px-3 py-3"
                >
                  <Skeleton className="size-7 rounded-full" />
                  <Skeleton className="h-4 w-28" />
                  <div className="ml-auto flex gap-6">
                    <Skeleton className="h-3.5 w-10" />
                    <Skeleton className="h-3.5 w-10" />
                    <Skeleton className="h-3.5 w-10" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DashboardContent>
    </>
  );
}
