import Link from "next/link";
import { Trophy } from "lucide-react";
import { type CommunityWithCounts } from "@trainers/supabase";
import { socialSvgPaths } from "@trainers/utils";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PlatformIcon } from "@/components/communities/social-link-icons";
import { type SocialLinkPlatform } from "@trainers/validators";

// ============================================================================
// Helpers
// ============================================================================

function getCommunityInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getTierBadge(tier: string | null) {
  if (!tier || tier === "standard") return null;
  const tierLabel = tier === "partner" ? "Partner" : "Verified";
  return (
    <Badge variant="secondary" className="text-xs">
      {tierLabel}
    </Badge>
  );
}

// ============================================================================
// CommunityCard
// ============================================================================

interface CommunityCardProps {
  community: CommunityWithCounts;
}

export function CommunityCard({ community }: CommunityCardProps) {
  const activeCount = community.activeTournamentsCount ?? 0;
  const socialLinks = Array.isArray(community.social_links)
    ? (community.social_links as Array<{
        platform: SocialLinkPlatform;
        url: string;
      }>)
    : [];

  return (
    <Card className="flex flex-col">
      <CardContent className="flex flex-1 flex-col gap-3 pt-4">
        {/* Header: avatar + name + tier */}
        <div className="flex items-start gap-3">
          <Avatar size="lg" className="shrink-0">
            <AvatarImage
              src={community.logo_url ?? undefined}
              alt={community.name}
            />
            <AvatarFallback className="bg-primary/10 text-primary">
              {community.icon ? (
                <span className="text-lg">{community.icon}</span>
              ) : (
                getCommunityInitials(community.name)
              )}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/communities/${community.slug}`}
                className="hover:text-primary truncate leading-tight font-semibold hover:underline"
              >
                {community.name}
              </Link>
              {getTierBadge(community.tier)}
            </div>

            {/* Description */}
            {community.description ? (
              <p
                className={cn(
                  "text-muted-foreground mt-0.5 text-xs",
                  "line-clamp-2"
                )}
              >
                {community.description}
              </p>
            ) : (
              <p className="text-muted-foreground mt-0.5 text-xs">
                @{community.slug}
              </p>
            )}
          </div>
        </div>

        {/* Tournament count */}
        <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <Trophy className="h-3.5 w-3.5" />
          <span>
            {activeCount === 1
              ? "1 active tournament"
              : `${activeCount} active tournaments`}
          </span>
        </div>

        {/* Social links row */}
        {socialLinks.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {socialLinks.map((link) => (
              <a
                key={`${link.platform}-${link.url}`}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label={link.platform}
              >
                <PlatformIcon platform={link.platform} className="h-4 w-4" />
              </a>
            ))}
          </div>
        )}
      </CardContent>

      {/* Discord invite button — primary CTA */}
      {community.discord_invite_url && (
        <CardFooter className="pt-0">
          <a
            href={community.discord_invite_url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium",
              "bg-[#5865F2] text-white transition-colors hover:bg-[#4752C4]",
              "focus-visible:ring-2 focus-visible:ring-[#5865F2]/50 focus-visible:outline-none"
            )}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4 shrink-0"
              aria-hidden="true"
              fill="currentColor"
            >
              <path d={socialSvgPaths["discord"]} />
            </svg>
            Join Discord
          </a>
        </CardFooter>
      )}
    </Card>
  );
}
