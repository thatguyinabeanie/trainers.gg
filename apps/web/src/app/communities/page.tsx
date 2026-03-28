import { unstable_cache } from "next/cache";
import { createStaticClient, getUser } from "@/lib/supabase/server";
import { listPublicCommunities } from "@trainers/supabase";
import { type CommunityWithCounts } from "@trainers/supabase";
import { Suspense } from "react";
import { Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CommunitySearch } from "./community-search";
import { CacheTags } from "@/lib/cache";
import { PageContainer } from "@/components/layout/page-container";
import { CommunityCardGrid } from "@/components/communities/community-card-grid";

// On-demand revalidation via cache tags (no time-based revalidation)
export const revalidate = false;

/**
 * Cached data fetcher for communities list
 * Revalidated when CacheTags.COMMUNITIES_LIST is invalidated
 */
const getCachedCommunities = unstable_cache(
  async () => {
    const supabase = createStaticClient();
    return listPublicCommunities(supabase);
  },
  ["communities-list"],
  { tags: [CacheTags.COMMUNITIES_LIST] }
);

// ============================================================================
// Main Page (Server Component)
// ============================================================================

export default async function CommunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q: searchQuery } = await searchParams;
  const [allCommunities, user] = await Promise.all([
    getCachedCommunities(),
    getUser(),
  ]);

  // Filter on the server — name, slug, and description
  const communities: CommunityWithCounts[] = searchQuery
    ? allCommunities.filter(
        (org) =>
          org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          org.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
          org.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allCommunities;

  const isSearching = !!searchQuery;

  return (
    <PageContainer>
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Users className="h-8 w-8" />
            Communities
          </h1>
          <p className="text-muted-foreground mt-1">
            Browse Pokemon communities and find their Discord servers
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Suspense fallback={<div className="h-10 w-64" />}>
            <CommunitySearch />
          </Suspense>
          {user && (
            <Link href="/communities/create">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Request a Community
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Card Grid */}
      <CommunityCardGrid communities={communities} isSearching={isSearching} />
    </PageContainer>
  );
}
