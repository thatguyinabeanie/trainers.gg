import { cacheTag, cacheLife } from "next/cache";
import { createStaticClient } from "@/lib/supabase/server";
import {
  searchPlayers,
  attachCoachBadges,
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

/**
 * Cached initial player data (first page, default sort).
 * Revalidated when CacheTags.PLAYERS_DIRECTORY is invalidated.
 */
async function getCachedPlayers() {
  "use cache";
  cacheTag(CacheTags.PLAYERS_DIRECTORY);
  cacheLife("max");

  const supabase = createStaticClient();
  return searchPlayers(supabase, { sort: "tournaments" }, 1);
}

/**
 * Cached leaderboard data for sidebar.
 */
async function getCachedLeaderboard() {
  "use cache";
  cacheTag(CacheTags.PLAYERS_LEADERBOARD);
  cacheLife("max");

  const supabase = createStaticClient();
  return getLeaderboard(supabase, 5);
}

/**
 * Cached recently active players for sidebar.
 */
async function getCachedRecentlyActive() {
  "use cache";
  cacheTag(CacheTags.PLAYERS_RECENT);
  cacheLife("max");

  const supabase = createStaticClient();
  return getRecentlyActivePlayers(supabase, 5);
}

/**
 * Cached new members for sidebar.
 */
async function getCachedNewMembers() {
  "use cache";
  cacheTag(CacheTags.PLAYERS_NEW);
  cacheLife("max");

  const supabase = createStaticClient();
  return getNewMembers(supabase, 5);
}

// ============================================================================
// Main Page (Server Component)
// ============================================================================

export default async function PlayersPage() {
  // Fetch all data in parallel
  const [cachedPlayers, leaderboard, recentlyActive, newMembers] =
    await Promise.all([
      getCachedPlayers(),
      getCachedLeaderboard(),
      getCachedRecentlyActive(),
      getCachedNewMembers(),
    ]);

  // Resolve coach badges OUTSIDE the cache: getCoachBadges is gated on the
  // global coaching flag and per-user coach status, neither of which busts
  // CacheTags.PLAYERS_DIRECTORY — caching it would serve stale badges. The
  // lookup is privacy-safe (booleans + public canonical handle only).
  const initialPlayers = {
    ...cachedPlayers,
    players: await attachCoachBadges(
      createStaticClient(),
      cachedPlayers.players
    ),
  };

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
