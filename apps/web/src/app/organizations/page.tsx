import { createStaticClient } from "@/lib/supabase/server";
import { listPublicOrganizations } from "@trainers/supabase";
import { type OrganizationWithCounts } from "@trainers/supabase";
import Link from "next/link";
import { Suspense } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Trophy } from "lucide-react";
import { OrganizationSearch } from "./organization-search";

// Revalidate every 60 seconds
export const revalidate = 60;

// ============================================================================
// Organization Card (Server Component)
// ============================================================================

function OrganizationCard({ org }: { org: OrganizationWithCounts }) {
  return (
    <Link href={`/organizations/${org.slug}`}>
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <CardTitle className="line-clamp-1 text-lg">{org.name}</CardTitle>
            {org.tier === "verified" || org.tier === "partner" ? (
              <Badge variant="secondary" className="shrink-0">
                {org.tier === "partner" ? "Partner" : "Verified"}
              </Badge>
            ) : null}
          </div>
          <CardDescription className="line-clamp-2">
            {org.description || `@${org.slug}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1">
              <Trophy className="h-4 w-4" />
              {org.activeTournamentsCount || 0} active
            </span>
            <span className="flex items-center gap-1">
              <Trophy className="h-4 w-4" />
              {org.totalTournamentsCount || 0} total
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
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
  const supabase = createStaticClient();
  const allOrganizations = await listPublicOrganizations(supabase);

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

      {/* Organizations Grid */}
      {!hasNoResults && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {organizations.map((org) => (
            <OrganizationCard key={org.id} org={org} />
          ))}
        </div>
      )}
    </div>
  );
}
