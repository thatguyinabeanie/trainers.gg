import { unstable_cache } from "next/cache";
import Link from "next/link";
import { createStaticClient } from "@/lib/supabase/server";
import { listTournamentsGrouped } from "@trainers/supabase";
import { CacheTags } from "@/lib/cache";
import { UpcomingTournaments } from "@/components/tournaments/tournament-list";

const getCachedUpcoming = unstable_cache(
  async () => {
    try {
      const supabase = createStaticClient();
      const grouped = await listTournamentsGrouped(supabase, {
        completedLimit: 0,
      });
      return grouped.upcoming.slice(0, 5);
    } catch {
      // Gracefully handle build-time failures (e.g., no Supabase connection in CI)
      return [];
    }
  },
  ["hero-upcoming-tournaments"],
  { tags: [CacheTags.TOURNAMENTS_LIST] }
);

export async function UpcomingTournamentsPreview() {
  const upcoming = await getCachedUpcoming();

  if (upcoming.length === 0) {
    return (
      <section className="py-16">
        <div className="mx-auto max-w-screen-xl px-4">
          <h2 className="mb-8 text-center text-2xl font-semibold">
            Upcoming Tournaments
          </h2>
          <p className="text-muted-foreground text-center">
            No upcoming tournaments right now. Check back soon!
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16">
      <div className="mx-auto max-w-screen-xl px-4">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Upcoming Tournaments</h2>
          <Link
            href="/tournaments"
            className="text-primary hover:text-primary/80 text-sm font-medium"
          >
            View All
          </Link>
        </div>
        <UpcomingTournaments tournaments={upcoming} showOrganization={true} />
      </div>
    </section>
  );
}
