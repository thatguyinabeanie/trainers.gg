import { Skeleton } from "@/components/ui/skeleton";

export default function UsersLoading() {
  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-8 w-24" />
      </div>

      {/* Filter bar */}
      <div className="flex gap-3">
        <Skeleton className="h-8 flex-1" />
        <Skeleton className="h-8 w-40" />
      </div>

      {/* Table header */}
      <Skeleton className="h-10 w-full" />

      {/* Table rows */}
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-28" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
    </div>
  );
}
