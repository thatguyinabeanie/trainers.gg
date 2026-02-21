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
import {
  organizationSocialLinksSchema,
  type OrganizationSocialLink,
} from "@trainers/validators";
import { socialSvgPaths, socialPlatformLabels } from "@trainers/utils";
import { OrganizationTabs } from "./organization-tabs";

// ==========================================================================
// Social Link Helpers
// ==========================================================================

/**
 * Parse the raw JSONB social_links field into typed array.
 * Returns empty array if parsing fails (defensive for bad data).
 */
function parseSocialLinks(raw: unknown): OrganizationSocialLink[] {
  const result = organizationSocialLinksSchema.safeParse(raw);
  return result.success ? result.data : [];
}

function SocialLinkIcon({ link }: { link: OrganizationSocialLink }) {
  const svgPath = socialSvgPaths[link.platform];
  const label = link.label || socialPlatformLabels[link.platform] || "Link";

  // Platforms with custom SVG paths
  if (svgPath) {
    return (
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-muted-foreground hover:text-foreground transition-colors"
        aria-label={label}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
          <path fill="currentColor" d={svgPath} />
        </svg>
      </a>
    );
  }

  // Fallback: Globe icon for website/custom/unknown
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-muted-foreground hover:text-foreground transition-colors"
      aria-label={label}
    >
      <Globe className="h-5 w-5" />
    </a>
  );
}

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
          {(() => {
            const socialLinks = parseSocialLinks(organization.social_links);
            if (socialLinks.length === 0) return null;
            return (
              <div className="mt-3 flex items-center gap-3">
                {socialLinks.map((link, i) => (
                  <SocialLinkIcon key={`${link.platform}-${i}`} link={link} />
                ))}
              </div>
            );
          })()}
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
