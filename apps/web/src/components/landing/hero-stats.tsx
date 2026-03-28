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
    <dl className="flex justify-center gap-10 sm:gap-12">
      {stats.map(({ value, label }) => (
        <div key={label} className="flex flex-col-reverse text-center">
          <dt className="text-muted-foreground/60 mt-0.5 text-[11px] dark:text-white/35">
            {label}
          </dt>
          <dd className="text-primary font-mono text-2xl font-extrabold tracking-tight">
            {formatStat(value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}
