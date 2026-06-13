import { cacheTag, cacheLife } from "next/cache";
import { Suspense } from "react";
import { Users } from "lucide-react";

import {
  listPublicCommunities,
  listFeaturedCommunities,
  type CommunityWithCounts,
} from "@trainers/supabase";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { CacheTags } from "@/lib/cache";
import { PageContainer } from "@/components/layout/page-container";
import { FeaturedStrip } from "@/components/communities/featured-strip";
import { CommunityList } from "@/components/communities/community-list";
import { CommunitySearch } from "./community-search";

/**
 * Cached data fetcher for all public communities.
 * Revalidated when CacheTags.COMMUNITIES_LIST is invalidated.
 *
 * Uses createServiceRoleClient() (not createStaticClient()) so this fetch
 * survives the Phase 2 Task 9 revoke of anon SELECT on S-bucket base tables
 * (communities). Service-role is a constant identity — it does not vary per
 * user and is safe inside 'use cache' for public S-bucket data.
 * See docs/decisions/architecture-phase2-task9-revoke-plan.md §0.2.
 */
async function getCachedCommunities() {
  "use cache";
  cacheTag(CacheTags.COMMUNITIES_LIST);
  cacheLife("max");

  const supabase = createServiceRoleClient();
  return listPublicCommunities(supabase);
}

/**
 * Cached data fetcher for featured communities (ordered by featured_order).
 * Revalidated when CacheTags.COMMUNITIES_LIST is invalidated.
 *
 * Uses createServiceRoleClient() for the same reason as getCachedCommunities()
 * above — survives the Phase 2 Task 9 anon SELECT revoke on the communities
 * base table. See docs/decisions/architecture-phase2-task9-revoke-plan.md §0.2.
 */
async function getCachedFeaturedCommunities() {
  "use cache";
  cacheTag(CacheTags.COMMUNITIES_LIST);
  cacheLife("max");

  const supabase = createServiceRoleClient();
  return listFeaturedCommunities(supabase);
}

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
