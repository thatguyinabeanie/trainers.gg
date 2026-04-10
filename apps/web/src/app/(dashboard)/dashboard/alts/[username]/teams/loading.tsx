import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/dashboard/page-header";

export default function TeamsLoading() {
  return (
    <>
      <PageHeader title="Teams" />
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        {/* Toolbar skeleton */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-7 w-10 rounded-full" />
            <Skeleton className="h-7 w-24 rounded-full" />
            <Skeleton className="h-7 w-28 rounded-full" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>

        {/* Team card grid skeleton */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="rounded-xl border p-4">
              {/* Sprite row */}
              <div className="mb-3 flex items-center gap-1.5">
                {Array.from({ length: 6 }, (_, j) => (
                  <Skeleton key={j} className="size-10 rounded-md" />
                ))}
              </div>
              {/* Name + badge row */}
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-4 w-32" />
                <div className="flex items-center gap-1.5">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-4 w-14" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
