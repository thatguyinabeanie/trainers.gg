import { Skeleton } from "@/components/ui/skeleton";

export default function ConfigLoading() {
  return (
    <div className="space-y-8">
      {/* Feature Flags section skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
      {/* Announcements section skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}
