import { unstable_cache } from "next/cache";
import { createStaticClient } from "@/lib/supabase/server";
import {
  searchPlayers,
  getLeaderboard,
  getRecentlyActivePlayers,
  getNewMembers,
} from "@trainers/supabase/queries";
import { Users } from "lucide-react";
import { CacheTags } from "@/lib/cache";
import { PageContainer } from "@/components/layout/page-container";
import { PlayerSearch } from "@/components/players/player-search";
import { SidebarLeaderboard } from "@/components/players/sidebar-leaderboard";
import { SidebarRecent } from "@/components/players/sidebar-recent";
import { SidebarNewMembers } from "@/components/players/sidebar-new-members";

// On-demand revalidation via cache tags (no time-based revalidation)
export const revalidate = false;

/**
 * Cached initial player data (first page, default sort).
 * Revalidated when CacheTags.PLAYERS_DIRECTORY is invalidated.
 */
const getCachedPlayers = unstable_cache(
  async () => {
    try {
      const supabase = createStaticClient();
      return await searchPlayers(supabase, { sort: "tournaments" }, 1);
    } catch {
      return { players: [], totalCount: 0, page: 1 };
    }
  },
  ["players-directory"],
  { tags: [CacheTags.PLAYERS_DIRECTORY] }
);

/**
 * Cached leaderboard data for sidebar.
 */
const getCachedLeaderboard = unstable_cache(
  async () => {
    try {
      const supabase = createStaticClient();
      return await getLeaderboard(supabase, 5);
    } catch {
      return [];
    }
  },
  ["players-leaderboard"],
  { tags: [CacheTags.PLAYERS_LEADERBOARD] }
);

/**
 * Cached recently active players for sidebar.
 */
const getCachedRecentlyActive = unstable_cache(
  async () => {
    try {
      const supabase = createStaticClient();
      return await getRecentlyActivePlayers(supabase, 5);
    } catch {
      return [];
    }
  },
  ["players-recent"],
  { tags: [CacheTags.PLAYERS_RECENT] }
);

/**
 * Cached new members for sidebar.
 */
const getCachedNewMembers = unstable_cache(
  async () => {
    try {
      const supabase = createStaticClient();
      return await getNewMembers(supabase, 5);
    } catch {
      return [];
    }
  },
  ["players-new"],
  { tags: [CacheTags.PLAYERS_NEW] }
);

// ============================================================================
// Main Page (Server Component)
// ============================================================================

export default async function PlayersPage() {
  // Fetch all data in parallel
  const [initialPlayers, leaderboard, recentlyActive, newMembers] =
    await Promise.all([
      getCachedPlayers(),
      getCachedLeaderboard(),
      getCachedRecentlyActive(),
      getCachedNewMembers(),
    ]);

  return (
    <PageContainer>
      {/* Header */}
      <div className="mb-8">
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <Users className="h-8 w-8" />
          Players
        </h1>
        <p className="text-muted-foreground mt-1">
          Discover players in the competitive Pokemon community
        </p>
      </div>

      {/* Main layout: content + sidebar */}
      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Main column (~70%) — search, filters, grid */}
        <div className="min-w-0 flex-1">
          <PlayerSearch initialData={initialPlayers} />
        </div>

        {/* Sidebar (~30%) — leaderboard, recent, new */}
        <aside className="w-full shrink-0 space-y-4 lg:w-72 xl:w-80">
          <SidebarLeaderboard entries={leaderboard} />
          <SidebarRecent players={recentlyActive} />
          <SidebarNewMembers members={newMembers} />
        </aside>
      </div>
    </PageContainer>
  );
}
