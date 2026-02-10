import { Skeleton } from "@/components/ui/skeleton";

export default function OrganizationsLoading() {
  return (
    <div className="space-y-4">
      {/* Header + search area */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-8 w-64" />
      </div>

      {/* Tab filters */}
      <div className="flex gap-2">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-20" />
      </div>

      {/* Table skeleton */}
      <Skeleton className="h-96 w-full" />

      {/* Pagination */}
      <div className="flex justify-end gap-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  );
}
