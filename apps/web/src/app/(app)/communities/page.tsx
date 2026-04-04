import { unstable_cache } from "next/cache";
import { Suspense } from "react";
import { Users } from "lucide-react";

import {
  listPublicCommunities,
  listFeaturedCommunities,
  type CommunityWithCounts,
} from "@trainers/supabase";

import { createStaticClient } from "@/lib/supabase/server";
import { CacheTags } from "@/lib/cache";
import { PageContainer } from "@/components/layout/page-container";
import { FeaturedStrip } from "@/components/communities/featured-strip";
import { CommunityList } from "@/components/communities/community-card-grid";
import { CommunitySearch } from "./community-search";

// On-demand revalidation via cache tags (no time-based revalidation)
export const revalidate = false;

/**
 * Cached data fetcher for all public communities
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

/**
 * Cached data fetcher for featured communities (ordered by featured_order)
 * Revalidated when CacheTags.COMMUNITIES_LIST is invalidated
 */
const getCachedFeaturedCommunities = unstable_cache(
  async () => {
    const supabase = createStaticClient();
    return listFeaturedCommunities(supabase);
  },
  ["featured-communities"],
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
  const [allCommunities, featuredCommunities] = await Promise.all([
    getCachedCommunities(),
    getCachedFeaturedCommunities(),
  ]);

  // Search filters the list only — not the featured strip
  const communities: CommunityWithCounts[] = searchQuery
    ? allCommunities.filter(
        (community) =>
          community.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          community.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
          community.description
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase())
      )
    : allCommunities;

  const isSearching = !!searchQuery;

  return (
    <PageContainer>
      {/* Header */}
      <div className="mb-8">
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <Users className="h-8 w-8" />
          Communities
        </h1>
        <p className="text-muted-foreground mt-1">
          Browse Pokemon communities and find your crew
        </p>
      </div>

      {/* Featured strip */}
      <FeaturedStrip communities={featuredCommunities} />

      {/* Search — right-aligned, between featured and list */}
      <div className="my-6 flex justify-end">
        <Suspense fallback={<div className="h-10 w-60" />}>
          <CommunitySearch />
        </Suspense>
      </div>

      {/* Community list */}
      <CommunityList communities={communities} isSearching={isSearching} />
    </PageContainer>
  );
}
