"use client";

import { useQuery } from "convex/react";
import { api } from "@/lib/convex/api";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Building2, Plus, Search, Loader2, Trophy } from "lucide-react";
import { useState } from "react";

export default function OrganizationsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  // listPublicOrganizations returns an array directly, not paginated
  const organizations = useQuery(
    api.organizations.queries.listPublicOrganizations,
    {}
  );

  const isLoading = organizations === undefined;

  // Client-side search filter
  const filteredOrganizations = (organizations ?? []).filter(
    (org) =>
      org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Building2 className="h-8 w-8" />
            Organizations
          </h1>
          <p className="text-muted-foreground mt-1">
            Browse Pokemon community organizations
          </p>
        </div>
        <Link href="/organizations/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Organization
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          placeholder="Search organizations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredOrganizations.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="text-muted-foreground mb-4 h-12 w-12" />
            <h3 className="mb-2 text-lg font-semibold">
              No organizations found
            </h3>
            <p className="text-muted-foreground mb-4 text-center">
              {searchQuery
                ? "Try a different search term"
                : "Be the first to create an organization!"}
            </p>
            <Link href="/organizations/create">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Organization
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Organizations Grid */}
      {!isLoading && filteredOrganizations.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredOrganizations.map((org) => (
            <Link key={org._id} href={`/${org.slug}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="line-clamp-1 text-lg">
                      {org.name}
                    </CardTitle>
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
          ))}
        </div>
      )}
    </div>
  );
}
