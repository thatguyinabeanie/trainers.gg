import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/dashboard/page-header";

export default function AllTeamsLoading() {
  return (
    <>
      <PageHeader title="Team Builder" />
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-7 w-10 rounded-full" />
          <Skeleton className="h-7 w-20 rounded-full" />
          <Skeleton className="h-7 w-20 rounded-full" />
          <div className="border-border mx-1 h-5 border-l" />
          <Skeleton className="h-7 w-28 rounded-full" />
          <Skeleton className="h-7 w-28 rounded-full" />
        </div>
        <div className="flex flex-col gap-0">
          <div className="flex items-center gap-4 border-b px-3 py-2">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="ml-auto h-3 w-16" />
          </div>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex items-center gap-4 border-b px-3 py-3">
              <div className="flex items-center gap-2">
                {Array.from({ length: 6 }, (_, j) => (
                  <Skeleton key={j} className="size-5 rounded" />
                ))}
                <Skeleton className="ml-2 h-4 w-32" />
              </div>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-4 w-14" />
              <Skeleton className="ml-auto h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
