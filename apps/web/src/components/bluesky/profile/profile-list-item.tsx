"use client";

import type { MouseEvent } from "react";
import Link from "next/link";
import type { ProfileView } from "@/lib/atproto/api";
import { BlueskyAvatar } from "@/components/bluesky/shared/bluesky-avatar";
import { Button } from "@/components/ui/button";
import { useFollowMutation, useBlueskyUser } from "@/hooks/bluesky";
import { cn } from "@/lib/utils";

interface ProfileListItemProps {
  profile: ProfileView;
  className?: string;
}

/**
 * A compact profile card for displaying in followers/following lists.
 * Shows avatar, name, handle, bio snippet, and follow button.
 */
export function ProfileListItem({ profile, className }: ProfileListItemProps) {
  const { blueskyDid } = useBlueskyUser();
  const followMutation = useFollowMutation();

  const isOwnProfile = blueskyDid === profile.did;
  const isFollowing = !!profile.viewer?.following;

  const handleFollowClick = (e: MouseEvent) => {
    e.preventDefault(); // Prevent navigation when clicking button inside link
    e.stopPropagation();

    followMutation.mutate({
      targetDid: profile.did,
      isFollowing,
      followUri: profile.viewer?.following,
    });
  };

  const displayName = profile.displayName || profile.handle;
  const truncatedBio = profile.description
    ? profile.description.length > 100
      ? profile.description.slice(0, 100) + "..."
      : profile.description
    : null;

  return (
    <Link
      href={`/profile/${profile.handle}`}
      className={cn(
        "hover:bg-muted/50 flex items-start gap-3 rounded-lg p-4 transition-colors",
        className
      )}
    >
      <BlueskyAvatar
        avatar={profile.avatar}
        handle={profile.handle}
        size="md"
        className="shrink-0"
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-foreground truncate font-semibold">
              {displayName}
            </p>
            <p className="text-muted-foreground truncate text-sm">
              @{profile.handle}
            </p>
          </div>

          {/* Follow button (don't show for own profile) */}
          {!isOwnProfile && blueskyDid && (
            <Button
              variant={isFollowing ? "secondary" : "default"}
              size="sm"
              onClick={handleFollowClick}
              disabled={followMutation.isPending}
              className="shrink-0"
            >
              {isFollowing ? "Following" : "Follow"}
            </Button>
          )}
        </div>

        {/* Bio snippet */}
        {truncatedBio && (
          <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
            {truncatedBio}
          </p>
        )}

        {/* Follows you badge */}
        {!isOwnProfile && profile.viewer?.followedBy && (
          <span className="bg-muted text-muted-foreground mt-2 inline-block rounded-md px-2 py-0.5 text-xs">
            Follows you
          </span>
        )}
      </div>
    </Link>
  );
}
