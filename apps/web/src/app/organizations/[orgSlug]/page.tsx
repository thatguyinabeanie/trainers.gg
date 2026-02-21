import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";
import {
  createStaticClient,
  createClientReadOnly,
} from "@/lib/supabase/server";
import {
  getOrganizationBySlug,
  hasOrganizationAccess,
} from "@trainers/supabase";
import { CacheTags } from "@/lib/cache";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Users, Calendar, Settings, Globe } from "lucide-react";
import { OrganizationTabs } from "./organization-tabs";

// On-demand revalidation only (no time-based)
export const revalidate = false;

interface OrganizationPageProps {
  params: Promise<{
    orgSlug: string;
  }>;
}

/**
 * Cached organization fetcher
 * Uses slug-specific cache tag for granular invalidation
 */
const getCachedOrganization = (slug: string) =>
  unstable_cache(
    async () => {
      const supabase = createStaticClient();
      return getOrganizationBySlug(supabase, slug);
    },
    [`organization-detail-${slug}`],
    { tags: [CacheTags.organization(slug), CacheTags.ORGANIZATIONS_LIST] }
  )();

/**
 * Get current user ID (not cached - user-specific)
 */
async function getCurrentUserId(): Promise<string | null> {
  try {
    const supabase = await createClientReadOnly();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

// ============================================================================
// Server Components
// ============================================================================

function Breadcrumb({ orgName }: { orgName: string }) {
  return (
    <div className="text-muted-foreground mb-4 flex items-center gap-2 text-sm">
      <Link href="/organizations" className="hover:underline">
        Organizations
      </Link>
      <span>/</span>
      <span className="text-foreground">{orgName}</span>
    </div>
  );
}

function OrganizationHeader({
  organization,
  canManage,
}: {
  organization: NonNullable<Awaited<ReturnType<typeof getOrganizationBySlug>>>;
  canManage: boolean;
}) {
  return (
    <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex items-start gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={organization.logo_url ?? undefined} />
          <AvatarFallback className="text-xl">
            {organization.name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">{organization.name}</h1>
            {(organization.tier === "verified" ||
              organization.tier === "partner") && (
              <Badge variant="secondary">
                {organization.tier === "partner" ? "Partner" : "Verified"}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1">@{organization.slug}</p>
          {organization.description && (
            <p className="text-muted-foreground mt-2 max-w-xl">
              {organization.description}
            </p>
          )}
          {(organization.website_url ||
            organization.discord_url ||
            organization.twitter_url) && (
            <div className="mt-3 flex items-center gap-3">
              {organization.website_url && (
                <a
                  href={organization.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Website"
                >
                  <Globe className="h-5 w-5" />
                </a>
              )}
              {organization.discord_url && (
                <a
                  href={organization.discord_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Discord"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    aria-hidden="true"
                  >
                    <path
                      fill="currentColor"
                      d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"
                    />
                  </svg>
                </a>
              )}
              {organization.twitter_url && (
                <a
                  href={organization.twitter_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="X (Twitter)"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    aria-hidden="true"
                  >
                    <path
                      fill="currentColor"
                      d="M18.244 2.25h3.308l-7.227 8.26l8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
                    />
                  </svg>
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        {canManage && (
          <Link href={`/to-dashboard/${organization.slug}`}>
            <Button variant="outline">
              <Settings className="mr-2 h-4 w-4" />
              Manage Organization
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

function StatsCards({
  organization,
}: {
  organization: NonNullable<Awaited<ReturnType<typeof getOrganizationBySlug>>>;
}) {
  const totalTournaments =
    (organization.tournaments?.active?.length ?? 0) +
    (organization.tournaments?.upcoming?.length ?? 0) +
    (organization.tournaments?.completed?.length ?? 0);

  return (
    <div className="mb-8 grid gap-4 sm:grid-cols-3">
      <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          <div className="bg-primary/10 rounded-full p-3">
            <Trophy className="text-primary h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl font-bold">{totalTournaments}</p>
            <p className="text-muted-foreground text-sm">Tournaments</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          <div className="bg-primary/10 rounded-full p-3">
            <Users className="text-primary h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl font-bold">
              {organization.followerCount || 0}
            </p>
            <p className="text-muted-foreground text-sm">Followers</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          <div className="bg-primary/10 rounded-full p-3">
            <Calendar className="text-primary h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl font-bold">
              {organization.created_at
                ? new Date(organization.created_at).getFullYear()
                : new Date().getFullYear()}
            </p>
            <p className="text-muted-foreground text-sm">Founded</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Main Page (Server Component)
// ============================================================================

export default async function OrganizationPage({
  params,
}: OrganizationPageProps) {
  const { orgSlug } = await params;

  // Fetch organization (cached) and current user ID (not cached) in parallel
  const [organization, currentUserId] = await Promise.all([
    getCachedOrganization(orgSlug),
    getCurrentUserId(),
  ]);

  if (!organization) {
    notFound();
  }

  // Check if user can manage (owner or staff)
  let canManage = false;
  if (currentUserId) {
    if (currentUserId === organization.owner_user_id) {
      canManage = true;
    } else {
      const supabase = await createClientReadOnly();
      canManage = await hasOrganizationAccess(
        supabase,
        organization.id,
        currentUserId
      );
    }
  }

  // Combine all tournament types and transform to match TournamentWithOrg type
  const tournaments = [
    ...(organization.tournaments?.active || []),
    ...(organization.tournaments?.upcoming || []),
    ...(organization.tournaments?.completed || []),
  ].map((tournament) => ({
    ...tournament,
    _count: {
      registrations: tournament.registrationCount ?? 0,
    },
    organization: {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
    },
    winner: null, // Organization page doesn't fetch winner data
  }));

  return (
    <div className="container mx-auto px-4 py-8">
      <Breadcrumb orgName={organization.name} />
      <OrganizationHeader organization={organization} canManage={canManage} />
      <StatsCards organization={organization} />
      <OrganizationTabs
        tournaments={tournaments}
        orgSlug={orgSlug}
        canManage={canManage}
      />
    </div>
  );
}
