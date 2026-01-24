"use client";

import type { ProfileView } from "@/lib/atproto/api";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface ProfileMetricsProps {
  profile: ProfileView;
  className?: string;
}

/**
 * Format a count for display (e.g., 1234 -> "1.2K")
 */
function formatCount(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return count.toString();
}

/**
 * Profile metrics showing followers, following, and posts count.
 */
export function ProfileMetrics({ profile, className }: ProfileMetricsProps) {
  const followers = profile.followersCount ?? 0;
  const following = profile.followsCount ?? 0;
  const posts = profile.postsCount ?? 0;

  return (
    <div
      className={cn("flex items-center gap-4 text-sm", className)}
      aria-label="Profile statistics"
    >
      <Link
        href={`/profile/${profile.handle}/followers`}
        className="hover:underline"
      >
        <span className="text-foreground font-semibold">
          {formatCount(followers)}
        </span>{" "}
        <span className="text-muted-foreground">
          {followers === 1 ? "follower" : "followers"}
        </span>
      </Link>

      <Link
        href={`/profile/${profile.handle}/following`}
        className="hover:underline"
      >
        <span className="text-foreground font-semibold">
          {formatCount(following)}
        </span>{" "}
        <span className="text-muted-foreground">following</span>
      </Link>

      <span>
        <span className="text-foreground font-semibold">
          {formatCount(posts)}
        </span>{" "}
        <span className="text-muted-foreground">
          {posts === 1 ? "post" : "posts"}
        </span>
      </span>
    </div>
  );
}
