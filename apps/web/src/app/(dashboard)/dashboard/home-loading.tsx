import { Skeleton } from "@/components/ui/skeleton";

export default function HomeLoading() {
  return (
    <div className="flex flex-col gap-0">
      {/* Welcome heading */}
      <Skeleton className="mb-3 h-5 w-52" />

      {/* Stats row */}
      <div className="mb-3.5 grid grid-cols-4 gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-muted/50 rounded-md px-2.5 py-2">
            <Skeleton className="mb-1 h-2.5 w-16" />
            <Skeleton className="h-5 w-12" />
          </div>
        ))}
      </div>

      {/* Recent results section header */}
      <div className="mb-1 flex items-center justify-between">
        <Skeleton className="h-2.5 w-24" />
        <Skeleton className="h-2.5 w-20" />
      </div>

      {/* Recent result rows */}
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="border-border/50 flex items-center gap-2 border-b py-1.5 last:border-0"
        >
          <Skeleton className="h-3 w-32" />
          <div className="ml-auto flex gap-0">
            {[1, 2, 3, 4, 5, 6].map((j) => (
              <Skeleton key={j} className="size-[18px]" />
            ))}
          </div>
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-3 w-10" />
        </div>
      ))}
    </div>
  );
}
