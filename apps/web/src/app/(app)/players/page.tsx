import { cacheTag, cacheLife } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
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
 *
 * Uses createServiceRoleClient() (not createStaticClient()) so this fetch
 * survives the Phase 2 Task 9 revoke of anon SELECT on S-bucket base tables
 * (alts, tournament_player_stats, player_ratings). Service-role is a constant
 * identity — it does not vary per user and is safe inside 'use cache' for
 * public S-bucket data. See docs/decisions/architecture-phase2-task9-revoke-plan.md §0.2.
 */
async function getCachedPlayers() {
  "use cache";
  cacheTag(CacheTags.PLAYERS_DIRECTORY);
  cacheLife("max");

  const supabase = createServiceRoleClient();
  return searchPlayers(supabase, { sort: "tournaments" }, 1);
}

/**
 * Cached leaderboard data for sidebar.
 *
 * Uses createServiceRoleClient() for the same reason as getCachedPlayers()
 * — survives the Phase 2 Task 9 anon SELECT revoke on player_ratings / alts.
 * See docs/decisions/architecture-phase2-task9-revoke-plan.md §0.2.
 */
async function getCachedLeaderboard() {
  "use cache";
  cacheTag(CacheTags.PLAYERS_LEADERBOARD);
  cacheLife("max");

  const supabase = createServiceRoleClient();
  return getLeaderboard(supabase, 5);
}

/**
 * Cached recently active players for sidebar.
 *
 * Uses createServiceRoleClient() for the same reason as getCachedPlayers().
 * See docs/decisions/architecture-phase2-task9-revoke-plan.md §0.2.
 */
async function getCachedRecentlyActive() {
  "use cache";
  cacheTag(CacheTags.PLAYERS_RECENT);
  cacheLife("max");

  const supabase = createServiceRoleClient();
  return getRecentlyActivePlayers(supabase, 5);
}

/**
 * Cached new members for sidebar.
 *
 * Uses createServiceRoleClient() for the same reason as getCachedPlayers().
 * See docs/decisions/architecture-phase2-task9-revoke-plan.md §0.2.
 */
async function getCachedNewMembers() {
  "use cache";
  cacheTag(CacheTags.PLAYERS_NEW);
  cacheLife("max");

  const supabase = createServiceRoleClient();
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
  // Uses createServiceRoleClient() (not createStaticClient()) to survive the
  // Phase 2 Task 9 anon SELECT revoke on the coach_profiles / alts tables.
  // This call is outside 'use cache', so it runs per-request; service-role
  // is still safe here because coach badge data is public S-bucket.
  const initialPlayers = {
    ...cachedPlayers,
    players: await attachCoachBadges(
      createServiceRoleClient(),
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
