import Link from "next/link";

import { type CommunityWithCounts } from "@trainers/supabase";
import { type SocialLinkPlatform } from "@trainers/validators";

import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PlatformIcon } from "@/components/communities/social-link-icons";

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

// ============================================================================
// CommunityCard
// ============================================================================

interface CommunityCardProps {
  community: CommunityWithCounts;
}

export function CommunityCard({ community }: CommunityCardProps) {
  const socialLinks = Array.isArray(community.social_links)
    ? (community.social_links as Array<{
        platform: SocialLinkPlatform;
        url: string;
      }>)
    : [];

  // Build combined social icons: discord_invite_url (if present and not already in social_links) + social_links
  const hasDiscordInSocials = socialLinks.some(
    (link) => link.platform === "discord"
  );
  const allSocialLinks = [
    ...(!hasDiscordInSocials && community.discord_invite_url
      ? [
          {
            platform: "discord" as SocialLinkPlatform,
            url: community.discord_invite_url,
          },
        ]
      : []),
    ...socialLinks,
  ];

  return (
    <Card className="group relative h-full transition-shadow hover:shadow-md">
      <CardContent className="flex items-center gap-5 p-5">
        {/* Logo — 96px rounded square, vertically centered */}
        <Avatar className="h-24 w-24 shrink-0 rounded-[18px]">
          <AvatarImage
            src={community.logo_url ?? undefined}
            alt={community.name}
            className="rounded-[18px]"
          />
          <AvatarFallback className="bg-primary/10 text-primary rounded-[18px] text-2xl font-bold">
            {community.icon ? (
              <span className="text-3xl">{community.icon}</span>
            ) : (
              getCommunityInitials(community.name)
            )}
          </AvatarFallback>
        </Avatar>

        {/* Content — name, description, social icons */}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3 className="truncate text-base font-semibold">
            <Link
              href={`/communities/${community.slug}`}
              className="group-hover:text-primary transition-colors after:absolute after:inset-0"
            >
              {community.name}
            </Link>
          </h3>

          {community.description ? (
            <p className="text-muted-foreground line-clamp-2 text-sm">
              {community.description}
            </p>
          ) : (
            <p className="text-muted-foreground text-sm">@{community.slug}</p>
          )}

          {/* Social link icons */}
          {allSocialLinks.length > 0 && (
            <div className="relative z-10 mt-2 flex flex-wrap items-center gap-2">
              {allSocialLinks.map((link) => (
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
        </div>
      </CardContent>
    </Card>
  );
}
