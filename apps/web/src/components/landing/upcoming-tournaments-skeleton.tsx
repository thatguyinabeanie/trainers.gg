import { Skeleton } from "@/components/ui/skeleton";

export function UpcomingTournamentsSkeleton() {
  return (
    <section className="py-16">
      <div className="mx-auto max-w-screen-xl px-4">
        <div className="mb-8 flex items-center justify-between">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-5 w-16" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </section>
  );
}
