// apps/web/src/components/landing/hero-stats.tsx
import { unstable_cache } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getPlatformOverview } from "@trainers/supabase/queries";
import { CacheTags } from "@/lib/cache";

// ---------------------------------------------------------------------------
// Data fetching — ISR, revalidate every hour
// ---------------------------------------------------------------------------

const getCachedPlatformOverview = unstable_cache(
  async () => {
    try {
      const supabase = createServiceRoleClient();
      return await getPlatformOverview(supabase);
    } catch {
      return null;
    }
  },
  ["platform-overview"],
  { revalidate: 3600, tags: [CacheTags.PLATFORM_OVERVIEW] }
);

function formatStat(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export async function HeroStats() {
  const overview = await getCachedPlatformOverview();

  if (!overview) return null;

  const stats = [
    { value: overview.totalUsers, label: "Players" },
    { value: overview.totalTournaments, label: "Tournaments" },
    { value: overview.totalMatches, label: "Matches played" },
  ];

  return (
    <section className="border-b py-8">
      <div className="mx-auto max-w-screen-xl px-4">
        <dl className="grid grid-cols-3 gap-4 text-center">
          {stats.map(({ value, label }) => (
            <div key={label}>
              <dt className="text-muted-foreground text-sm">{label}</dt>
              <dd className="text-primary text-3xl font-bold tracking-tight sm:text-4xl">
                {formatStat(value)}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
