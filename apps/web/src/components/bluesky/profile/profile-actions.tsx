"use client";

import { useTransition } from "react";
import type { ProfileView } from "@/lib/atproto/api";
import { Button } from "@/components/ui/button";
import { useFollowMutation } from "@/hooks/bluesky/use-profile";
import { useBlueskyUser } from "@/hooks/bluesky";
import { cn } from "@/lib/utils";
import { Loader2, UserPlus, UserCheck, Settings } from "lucide-react";
import Link from "next/link";

interface ProfileActionsProps {
  profile: ProfileView;
  /** Whether this is the current user's own profile */
  isOwnProfile?: boolean;
  className?: string;
}

/**
 * Profile action buttons - Follow/Unfollow for other users, Edit for own profile.
 */
export function ProfileActions({
  profile,
  isOwnProfile = false,
  className,
}: ProfileActionsProps) {
  const { blueskyDid } = useBlueskyUser();
  const followMutation = useFollowMutation();
  const [isPending, startTransition] = useTransition();

  const isFollowing = !!profile.viewer?.following;
  const isBlocked = !!profile.viewer?.blocking || !!profile.viewer?.blockedBy;

  const handleFollowToggle = () => {
    if (!blueskyDid) return;

    startTransition(() => {
      followMutation.mutate({
        targetDid: profile.did,
        isFollowing,
        followUri: profile.viewer?.following,
      });
    });
  };

  // Own profile - show edit button
  if (isOwnProfile) {
    return (
      <div className={cn("flex gap-2", className)}>
        <Link href="/dashboard/settings/profile">
          <Button variant="outline" size="sm">
            <Settings className="mr-2 size-4" />
            Edit Profile
          </Button>
        </Link>
      </div>
    );
  }

  // Not signed in with Bluesky
  if (!blueskyDid) {
    return (
      <div className={cn("flex gap-2", className)}>
        <Button variant="outline" size="sm" disabled>
          <UserPlus className="mr-2 size-4" />
          Follow
        </Button>
      </div>
    );
  }

  // Blocked relationship
  if (isBlocked) {
    return (
      <div className={cn("flex gap-2", className)}>
        <Button variant="outline" size="sm" disabled>
          Blocked
        </Button>
      </div>
    );
  }

  const isLoading = isPending || followMutation.isPending;

  return (
    <div className={cn("flex gap-2", className)}>
      <Button
        variant={isFollowing ? "outline" : "default"}
        size="sm"
        onClick={handleFollowToggle}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : isFollowing ? (
          <UserCheck className="mr-2 size-4" />
        ) : (
          <UserPlus className="mr-2 size-4" />
        )}
        {isFollowing ? "Following" : "Follow"}
      </Button>
    </div>
  );
}
