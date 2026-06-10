import { Skeleton } from "@/components/ui/skeleton";
import { PageContainer } from "@/components/layout/page-container";

export default function PlayerProfileLoading() {
  return (
    <PageContainer>
      {/* Banner skeleton */}
      <div className="relative">
        <Skeleton className="h-40 w-full rounded-xl sm:h-48 md:h-56" />
        {/* Avatar overlap */}
        <div className="absolute bottom-0 left-4 translate-y-1/2 sm:left-6">
          <Skeleton className="h-24 w-24 rounded-full ring-4 sm:h-28 sm:w-28" />
        </div>
      </div>

      {/* Profile header skeleton */}
      <div className="mt-14 space-y-4 sm:mt-16">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-80" />
          </div>
          <Skeleton className="h-9 w-28" />
        </div>

        {/* Stats pills */}
        <div className="flex flex-wrap gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-8 w-28 rounded-full" />
          ))}
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className="mt-6 space-y-4">
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-9 w-24 rounded-md" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    </PageContainer>
  );
}
