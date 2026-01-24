"use client";

import type { ProfileView } from "@/lib/atproto/api";
import { ProfileHeader } from "./profile-header";
import { ProfileMetrics } from "./profile-metrics";
import { ProfileActions } from "./profile-actions";
import { cn } from "@/lib/utils";

interface ProfileCardProps {
  profile: ProfileView;
  /** Whether this is the current user's own profile */
  isOwnProfile?: boolean;
  className?: string;
}

/**
 * Complete profile card combining header, metrics, and actions.
 */
export function ProfileCard({
  profile,
  isOwnProfile = false,
  className,
}: ProfileCardProps) {
  return (
    <div className={cn("bg-card overflow-hidden rounded-lg", className)}>
      <ProfileHeader profile={profile} isOwnProfile={isOwnProfile} />

      {/* Metrics and Actions row */}
      <div className="flex flex-col gap-4 px-4 pb-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <ProfileMetrics profile={profile} />
        <ProfileActions profile={profile} isOwnProfile={isOwnProfile} />
      </div>
    </div>
  );
}
