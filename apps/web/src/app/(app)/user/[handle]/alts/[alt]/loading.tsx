import { Skeleton } from "@/components/ui/skeleton";
import { PageContainer } from "@/components/layout/page-container";

export default function UserAltLoading() {
  return (
    <PageContainer>
      {/* Back link skeleton */}
      <Skeleton className="mb-4 h-5 w-40" />

      {/* Compact banner */}
      <div className="relative">
        <Skeleton className="h-28 w-full rounded-xl sm:h-36" />
        {/* Avatar overlap */}
        <div className="absolute bottom-0 left-4 translate-y-1/2 sm:left-6">
          <Skeleton className="h-20 w-20 rounded-full ring-4 sm:h-24 sm:w-24" />
        </div>
      </div>

      {/* Header */}
      <div className="mt-12 space-y-2 sm:mt-14">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Tournament history */}
      <div className="mt-8 space-y-3">
        <Skeleton className="h-6 w-40" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    </PageContainer>
  );
}
