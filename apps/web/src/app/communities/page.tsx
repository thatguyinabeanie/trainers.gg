import { unstable_cache } from "next/cache";
import { createStaticClient, getUser } from "@/lib/supabase/server";
import { listPublicOrganizations } from "@trainers/supabase";
import { type OrganizationWithCounts } from "@trainers/supabase";
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
 * Cached data fetcher for organizations list
 * Revalidated when CacheTags.COMMUNITIES_LIST is invalidated
 */
const getCachedOrganizations = unstable_cache(
  async () => {
    const supabase = createStaticClient();
    return listPublicOrganizations(supabase);
  },
  ["organizations-list"],
  { tags: [CacheTags.COMMUNITIES_LIST] }
);

// ============================================================================
// Main Page (Server Component)
// ============================================================================

export default async function OrganizationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q: searchQuery } = await searchParams;
  const [allOrganizations, user] = await Promise.all([
    getCachedOrganizations(),
    getUser(),
  ]);

  // Filter on the server — name, slug, and description
  const organizations: OrganizationWithCounts[] = searchQuery
    ? allOrganizations.filter(
        (org) =>
          org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          org.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
          org.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allOrganizations;

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
      <CommunityCardGrid
        communities={organizations}
        isSearching={isSearching}
      />
    </PageContainer>
  );
}
