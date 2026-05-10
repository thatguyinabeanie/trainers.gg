import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";
import {
  createStaticClient,
  createClientReadOnly,
} from "@/lib/supabase/server";
import { getCommunityBySlug, hasCommunityAccess } from "@trainers/supabase";
import { CacheTags } from "@/lib/cache";
import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Users, Calendar, Settings, Globe, Trophy } from "lucide-react";
import {
  communitySocialLinksSchema,
  type CommunitySocialLink,
} from "@trainers/validators";
import { socialSvgPaths, socialPlatformLabels } from "@trainers/utils";
import type { TournamentWithOrg } from "@trainers/supabase";
import { CommunityTabs } from "./community-tabs";

// ==========================================================================
// Social Link Helpers
// ==========================================================================

function parseSocialLinks(raw: unknown): CommunitySocialLink[] {
  const result = communitySocialLinksSchema.safeParse(raw);
  return result.success ? result.data : [];
}

function SocialLinkIcon({ link }: { link: CommunitySocialLink }) {
  const svgPath = socialSvgPaths[link.platform];
  const label = link.label || socialPlatformLabels[link.platform] || "Link";

  if (svgPath) {
    return (
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
        aria-label={label}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
          <path fill="currentColor" d={svgPath} />
        </svg>
        <span className="text-sm">{label}</span>
      </a>
    );
  }

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
      aria-label={label}
    >
      <Globe className="h-4 w-4" />
      <span className="text-sm">{label}</span>
    </a>
  );
}

// On-demand revalidation only (no time-based)
export const revalidate = false;

interface OrganizationPageProps {
  params: Promise<{
    communitySlug: string;
  }>;
}

const getCachedOrganization = (slug: string) =>
  unstable_cache(
    async () => {
      const supabase = createStaticClient();
      return getCommunityBySlug(supabase, slug);
    },
    [`organization-detail-${slug}`],
    { tags: [CacheTags.community(slug), CacheTags.COMMUNITIES_LIST] }
  )();

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

/**
 * Banner image with avatar overlaid at the bottom edge.
 * Sits inside the page container — centered with content, not edge-to-edge.
 */
function BannerHero({
  bannerUrl,
  organization,
}: {
  bannerUrl: string | null;
  organization: NonNullable<Awaited<ReturnType<typeof getCommunityBySlug>>>;
}) {
  return (
    <div className="relative">
      {/* Banner */}
      <div className="h-40 w-full overflow-hidden rounded-xl sm:h-48 md:h-56">
        {bannerUrl ? (
          <img
            src={bannerUrl}
            alt={`${organization.name} banner`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="bg-muted h-full w-full" />
        )}
      </div>

      {/* Avatar — overlaps the bottom of the banner */}
      <div className="absolute bottom-0 left-4 translate-y-1/2 sm:left-6">
        <Avatar
          noBorder
          className="ring-background h-24 w-24 shadow-lg ring-4 sm:h-28 sm:w-28"
        >
          <AvatarImage
            src={organization.logo_url ?? undefined}
            alt={`${organization.name} logo`}
          />
          <AvatarFallback className="bg-muted text-3xl font-bold">
            {organization.icon || organization.name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </div>
    </div>
  );
}

function CommunityHeader({
  organization,
  canManage,
}: {
  organization: NonNullable<Awaited<ReturnType<typeof getCommunityBySlug>>>;
  canManage: boolean;
}) {
  const totalTournaments =
    (organization.tournaments?.active?.length ?? 0) +
    (organization.tournaments?.upcoming?.length ?? 0) +
    (organization.tournaments?.completed?.length ?? 0);

  const foundedYear = organization.created_at
    ? new Date(organization.created_at).getFullYear()
    : new Date().getFullYear();

  const socialLinks = parseSocialLinks(organization.social_links);

  return (
    <div className="mt-4">
      {/* Name row with manage button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-bold tracking-tight">
              {organization.name}
            </h1>
            {organization.tier === "partner" && (
              <Badge variant="secondary" className="text-xs">
                Partner
              </Badge>
            )}
          </div>

          {organization.description && (
            <p className="text-muted-foreground max-w-2xl text-lg">
              {organization.description}
            </p>
          )}
        </div>

        {canManage && (
          <div className="shrink-0">
            <Link href={`/dashboard/community/${organization.slug}`}>
              <Button variant="outline" size="sm">
                <Settings className="mr-2 h-4 w-4" />
                Manage Community
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Stats pills */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="bg-muted/60 flex items-center gap-2 rounded-full px-4 py-1.5">
          <Trophy className="text-primary h-4 w-4" />
          <span className="text-sm font-medium">
            {totalTournaments}{" "}
            {totalTournaments === 1 ? "Tournament" : "Tournaments"}
          </span>
        </div>
        <div className="bg-muted/60 flex items-center gap-2 rounded-full px-4 py-1.5">
          <Users className="text-primary h-4 w-4" />
          <span className="text-sm font-medium">
            {organization.followerCount || 0} Followers
          </span>
        </div>
        <div className="bg-muted/60 flex items-center gap-2 rounded-full px-4 py-1.5">
          <Calendar className="text-primary h-4 w-4" />
          <span className="text-sm font-medium">Founded {foundedYear}</span>
        </div>
      </div>

      {/* Social links */}
      {socialLinks.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-4">
          {socialLinks.map((link, i) => (
            <SocialLinkIcon key={`${link.platform}-${i}`} link={link} />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Page (Server Component)
// ============================================================================

export default async function OrganizationPage({
  params,
}: OrganizationPageProps) {
  const { communitySlug } = await params;

  const [organization, currentUserId] = await Promise.all([
    getCachedOrganization(communitySlug),
    getCurrentUserId(),
  ]);

  if (!organization) {
    notFound();
  }

  let canManage = false;
  if (currentUserId) {
    if (currentUserId === organization.owner_user_id) {
      canManage = true;
    } else {
      const supabase = await createClientReadOnly();
      canManage = await hasCommunityAccess(
        supabase,
        organization.id,
        currentUserId
      );
    }
  }

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
    winner: null,
  }));

  return (
    <PageContainer>
      {/* Banner with avatar overlay */}
      <BannerHero
        bannerUrl={organization.banner_url ?? null}
        organization={organization}
      />

      {/* Community identity — offset below avatar */}
      <div className="mt-10 sm:mt-12">
        <CommunityHeader organization={organization} canManage={canManage} />
      </div>

      {/* Tabbed content */}
      <div className="mt-6">
        <CommunityTabs
          about={organization.about ?? null}
          tournaments={tournaments as TournamentWithOrg[]}
          communitySlug={communitySlug}
          canManage={canManage}
        />
      </div>
    </PageContainer>
  );
}
