"use client";

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
import { Building2, Plus, Crown, Users, ArrowRight } from "lucide-react";

interface Organization {
  id: number;
  name: string;
  slug: string;
  logo_url: string | null;
  tier: string | null;
  status: string | null;
  isOwner: boolean;
}

interface OrgSelectorClientProps {
  organizations: Organization[];
}

export function OrgSelectorClient({ organizations }: OrgSelectorClientProps) {
  // Empty state - user has no organizations
  if (organizations.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold sm:text-4xl">
            Tournament Organizer
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Manage your organizations and tournaments
          </p>
        </div>

        <Card className="mx-auto max-w-lg">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="text-muted-foreground mb-4 h-12 w-12" />
            <h3 className="mb-2 text-lg font-semibold">No organizations yet</h3>
            <p className="text-muted-foreground mb-6 text-center">
              Create an organization to start hosting tournaments
            </p>
            <Link href="/organizations/create">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Organization
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Use grid for 2-5 organizations, list for 6+
  const useGrid = organizations.length <= 5;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-4xl">
            Tournament Organizer
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Select an organization to manage
          </p>
        </div>
        <Link href="/organizations/create" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            New Organization
          </Button>
        </Link>
      </div>

      {useGrid ? (
        // Grid layout for 2-5 organizations
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {organizations.map((org) => (
            <Link key={org.id} href={`/to-dashboard/${org.slug}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      {org.logo_url ? (
                        <img
                          src={org.logo_url}
                          alt={org.name}
                          className="h-10 w-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-lg">
                          <Building2 className="text-muted-foreground h-5 w-5" />
                        </div>
                      )}
                      <div>
                        <CardTitle className="line-clamp-1 text-lg">
                          {org.name}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          @{org.slug}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {org.isOwner ? (
                      <Badge variant="default" className="gap-1">
                        <Crown className="h-3 w-3" />
                        Owner
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <Users className="h-3 w-3" />
                        Staff
                      </Badge>
                    )}
                    {(org.tier === "verified" || org.tier === "partner") && (
                      <Badge variant="outline">
                        {org.tier === "partner" ? "Partner" : "Verified"}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        // Compact list for 6+ organizations
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Your Organizations
            </CardTitle>
            <CardDescription>
              {organizations.length} organizations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {organizations.map((org) => (
              <Link
                key={org.id}
                href={`/to-dashboard/${org.slug}`}
                className="hover:bg-muted flex items-center justify-between rounded-lg p-3 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {org.logo_url ? (
                    <img
                      src={org.logo_url}
                      alt={org.name}
                      className="h-8 w-8 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-lg">
                      <Building2 className="text-muted-foreground h-4 w-4" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium">{org.name}</p>
                    <p className="text-muted-foreground text-xs">@{org.slug}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {org.isOwner ? (
                    <Badge variant="default" className="gap-1">
                      <Crown className="h-3 w-3" />
                      Owner
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1">
                      <Users className="h-3 w-3" />
                      Staff
                    </Badge>
                  )}
                  <ArrowRight className="text-muted-foreground h-4 w-4" />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
