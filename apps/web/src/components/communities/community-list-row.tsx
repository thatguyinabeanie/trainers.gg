import Link from "next/link";

import { type CommunityWithCounts } from "@trainers/supabase";
import { type SocialLinkPlatform } from "@trainers/validators";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PlatformIcon } from "@/components/communities/social-link-icons";

function getCommunityInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface CommunityListRowProps {
  community: CommunityWithCounts;
}

export function CommunityListRow({ community }: CommunityListRowProps) {
  const socialLinks = Array.isArray(community.social_links)
    ? (community.social_links as Array<{
        platform: SocialLinkPlatform;
        url: string;
      }>)
    : [];

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
    <div className="group hover:bg-muted/50 relative flex items-center gap-3.5 border-b px-4 py-3.5 transition-colors last:border-b-0">
      <Avatar className="h-10 w-10 shrink-0 rounded-[10px]">
        <AvatarImage
          src={community.logo_url ?? undefined}
          alt={community.name}
          className="rounded-[10px]"
        />
        <AvatarFallback className="bg-primary/10 text-primary rounded-[10px] text-sm font-semibold">
          {community.icon ? (
            <span className="text-base">{community.icon}</span>
          ) : (
            getCommunityInitials(community.name)
          )}
        </AvatarFallback>
      </Avatar>

      <div className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-center gap-1 truncate text-sm font-semibold">
          <Link
            href={`/communities/${community.slug}`}
            className="group-hover:text-primary truncate transition-colors after:absolute after:inset-0"
          >
            {community.name}
          </Link>
          {community.tier === "partner" && (
            <span
              className="shrink-0 text-[10px] text-teal-600"
              aria-label="Partner"
            >
              ✦
            </span>
          )}
        </span>
        {community.description ? (
          <span className="text-muted-foreground truncate text-xs">
            {community.description}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">
            @{community.slug}
          </span>
        )}
      </div>

      {allSocialLinks.length > 0 && (
        <div className="relative z-10 flex shrink-0 gap-1.5">
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
  );
}
