import { Skeleton } from "@/components/ui/skeleton";

export default function HomeLoading() {
  return (
    <div className="space-y-4">
      {/* Stats row skeleton */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-muted/50 rounded-md px-2.5 py-2">
            <Skeleton className="mb-1 h-2.5 w-14" />
            <Skeleton className="mb-1 h-5 w-16" />
            <Skeleton className="h-2 w-20" />
          </div>
        ))}
      </div>

      {/* Alts section header skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-8 w-20 rounded-md" />
      </div>

      {/* Alts table skeleton */}
      <div className="overflow-hidden rounded-lg border">
        {/* Header */}
        <div className="bg-muted/30 border-b px-3 py-2.5">
          <Skeleton className="h-3 w-full" />
        </div>
        {/* Rows */}
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 border-b px-3 py-3 last:border-0"
          >
            <Skeleton className="size-7 rounded-full" />
            <Skeleton className="h-4 w-24" />
            <div className="ml-auto flex gap-6">
              <Skeleton className="h-3.5 w-8" />
              <Skeleton className="h-3.5 w-8" />
              <Skeleton className="h-3.5 w-8" />
              <Skeleton className="h-3.5 w-8" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
