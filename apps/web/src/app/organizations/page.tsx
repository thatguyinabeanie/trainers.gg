import { unstable_cache } from "next/cache";
import { createStaticClient } from "@/lib/supabase/server";
import { listPublicOrganizations } from "@trainers/supabase";
import { type OrganizationWithCounts } from "@trainers/supabase";
import Link from "next/link";
import { Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Building2, Trophy } from "lucide-react";
import { OrganizationSearch } from "./organization-search";
import { CacheTags } from "@/lib/cache";

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
// Organizations Table (Server Component)
// ============================================================================

function OrganizationsTable({
  organizations,
}: {
  organizations: OrganizationWithCounts[];
}) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="hidden sm:table-cell">Description</TableHead>
            <TableHead className="text-right">
              <div className="flex items-center justify-end gap-1">
                <Trophy className="h-3.5 w-3.5" />
                Active
              </div>
            </TableHead>
            <TableHead className="text-right">
              <div className="flex items-center justify-end gap-1">
                <Trophy className="h-3.5 w-3.5" />
                Total
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {organizations.map((org) => (
            <TableRow key={org.id} className="hover:bg-muted/50">
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/organizations/${org.slug}`}
                    className="hover:text-primary hover:underline"
                  >
                    {org.name}
                  </Link>
                  {(org.tier === "verified" || org.tier === "partner") && (
                    <Badge variant="secondary" className="text-xs">
                      {org.tier === "partner" ? "Partner" : "Verified"}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground hidden max-w-xs truncate sm:table-cell">
                {org.description || `@${org.slug}`}
              </TableCell>
              <TableCell className="text-muted-foreground text-right">
                {org.activeTournamentsCount || 0}
              </TableCell>
              <TableCell className="text-muted-foreground text-right">
                {org.totalTournamentsCount || 0}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
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
    <div className="container mx-auto px-4 py-8">
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

      {/* Organizations Table */}
      {!hasNoResults && <OrganizationsTable organizations={organizations} />}
    </div>
  );
}
