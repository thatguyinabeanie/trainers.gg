import { unstable_cache } from "next/cache";
import { createStaticClient } from "@/lib/supabase/server";
import { listPublicOrganizations } from "@trainers/supabase";
import { type OrganizationWithCounts } from "@trainers/supabase";
import { Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Building2 } from "lucide-react";
import { OrganizationSearch } from "./organization-search";
import { CacheTags } from "@/lib/cache";
import { PageContainer } from "@/components/layout/page-container";
import { OrganizationsDataTable } from "@/components/organizations/organizations-data-table";

// On-demand revalidation via cache tags (no time-based revalidation)
export const revalidate = false;

/**
 * Cached data fetcher for organizations list
 * Revalidated when CacheTags.ORGANIZATIONS_LIST is invalidated
 */
const getCachedOrganizations = unstable_cache(
  async () => {
    const supabase = createStaticClient();
    return listPublicOrganizations(supabase);
  },
  ["organizations-list"],
  { tags: [CacheTags.ORGANIZATIONS_LIST] }
);

// ============================================================================
// Organizations List (Server Component)
// ============================================================================

function OrganizationsList({
  organizations,
}: {
  organizations: OrganizationWithCounts[];
}) {
  return <OrganizationsDataTable data={organizations} />;
}

// ============================================================================
// Empty State (Server Component)
// ============================================================================

function EmptyState({ isSearching }: { isSearching: boolean }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <Building2 className="text-muted-foreground mb-4 h-12 w-12" />
        <h3 className="mb-2 text-lg font-semibold">No organizations found</h3>
        <p className="text-muted-foreground text-center">
          {isSearching
            ? "Try adjusting your search query"
            : "Check back later for community organizations!"}
        </p>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Page (Server Component)
// ============================================================================

export default async function OrganizationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q: searchQuery } = await searchParams;
  const allOrganizations = await getCachedOrganizations();

  // Filter on the server
  const organizations = searchQuery
    ? allOrganizations.filter(
        (org) =>
          org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          org.slug.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allOrganizations;

  const hasNoResults = organizations.length === 0;
  const isSearching = !!searchQuery;

  return (
    <PageContainer>
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Building2 className="h-8 w-8" />
            Organizations
          </h1>
          <p className="text-muted-foreground mt-1">
            Browse Pokemon community organizations
          </p>
        </div>

        <Suspense fallback={<div className="h-10 w-64" />}>
          <OrganizationSearch />
        </Suspense>
      </div>

      {/* Empty State */}
      {hasNoResults && <EmptyState isSearching={isSearching} />}

      {/* Organizations List */}
      {!hasNoResults && <OrganizationsList organizations={organizations} />}
    </PageContainer>
  );
}
