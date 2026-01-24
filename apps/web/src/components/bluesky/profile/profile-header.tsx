"use client";

import type { ProfileView } from "@/lib/atproto/api";
import { BlueskyAvatar } from "@/components/bluesky/shared/bluesky-avatar";
import { cn } from "@/lib/utils";

interface ProfileHeaderProps {
  profile: ProfileView;
  /** Whether this is the current user's own profile */
  isOwnProfile?: boolean;
  className?: string;
}

/**
 * Profile header with banner, avatar, display name, handle, and bio.
 * Inspired by Bluesky's profile header design.
 */
export function ProfileHeader({
  profile,
  isOwnProfile = false,
  className,
}: ProfileHeaderProps) {
  const displayName = profile.displayName || profile.handle;

  return (
    <div className={cn("relative", className)}>
      {/* Banner */}
      <div className="bg-muted h-32 w-full overflow-hidden sm:h-40 md:h-48">
        {profile.banner ? (
          <img
            src={profile.banner}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          /* Fallback gradient banner when no banner is set */
          <div className="from-primary/20 to-primary/5 h-full w-full bg-gradient-to-br" />
        )}
      </div>

      {/* Avatar - positioned to overlap banner */}
      <div className="absolute left-4 -translate-y-1/2 sm:left-6">
        <div className="bg-background rounded-full p-1">
          <BlueskyAvatar
            avatar={profile.avatar}
            handle={profile.handle}
            size="xl"
            className="ring-background size-20 ring-4 sm:size-24 md:size-28"
          />
        </div>
      </div>

      {/* Content below banner */}
      <div className="px-4 pt-12 pb-4 sm:px-6 sm:pt-14 md:pt-16">
        {/* Name and handle */}
        <div className="mb-3">
          <h1 className="text-foreground text-xl font-bold sm:text-2xl">
            {displayName}
          </h1>
          <p className="text-muted-foreground text-sm">@{profile.handle}</p>
        </div>

        {/* Bio/Description */}
        {profile.description && (
          <p className="text-foreground mb-4 max-w-2xl text-sm leading-relaxed whitespace-pre-wrap">
            {profile.description}
          </p>
        )}

        {/* Viewer relationship badges */}
        {!isOwnProfile && profile.viewer?.followedBy && (
          <span className="bg-muted text-muted-foreground mb-3 inline-block rounded-md px-2 py-0.5 text-xs">
            Follows you
          </span>
        )}
      </div>
    </div>
  );
}
