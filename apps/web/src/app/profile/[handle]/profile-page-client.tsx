"use client";

import { useProfile, useAuthorFeed, flattenFeedPages } from "@/hooks/bluesky";
import { useBlueskyUser } from "@/hooks/bluesky";
import { ProfileCard } from "@/components/bluesky/profile";
import { PostCard } from "@/components/bluesky/feed/post-card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";

interface ProfilePageClientProps {
  handle: string;
}

/**
 * Client component for the profile page.
 * Fetches and displays Bluesky profile data.
 */
export function ProfilePageClient({ handle }: ProfilePageClientProps) {
  const { blueskyDid } = useBlueskyUser();
  const {
    data: profile,
    isLoading: isProfileLoading,
    error: profileError,
  } = useProfile(handle);

  const {
    data: feedData,
    isLoading: isFeedLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useAuthorFeed(handle);

  const posts = flattenFeedPages(feedData?.pages);
  const isOwnProfile = blueskyDid === profile?.did;

  // Loading state
  if (isProfileLoading) {
    return <ProfilePageSkeleton />;
  }

  // Error state
  if (profileError || !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <AlertCircle className="text-muted-foreground mb-4 size-12" />
        <h2 className="text-foreground mb-2 text-xl font-semibold">
          Profile not found
        </h2>
        <p className="text-muted-foreground text-sm">
          The user @{handle} could not be found on Bluesky.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <ProfileCard profile={profile} isOwnProfile={isOwnProfile} />

      {/* Posts Feed */}
      <div className="space-y-4">
        <h2 className="text-foreground px-4 text-lg font-semibold sm:px-0">
          Posts
        </h2>

        {isFeedLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <PostSkeleton key={i} />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-muted-foreground py-8 text-center text-sm">
            No posts yet.
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((item) => (
              <PostCard key={item.post.uri} feedViewPost={item} />
            ))}

            {/* Load more button */}
            {hasNextPage && (
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="text-primary hover:text-primary/80 w-full py-4 text-center text-sm font-medium disabled:opacity-50"
              >
                {isFetchingNextPage ? "Loading..." : "Load more"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Loading skeleton for the profile page
 */
function ProfilePageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Banner skeleton */}
      <div className="bg-card overflow-hidden rounded-lg">
        <Skeleton className="h-32 w-full sm:h-40 md:h-48" />
        <div className="relative px-4 pt-12 pb-4 sm:px-6 sm:pt-14 md:pt-16">
          {/* Avatar skeleton */}
          <div className="absolute top-0 left-4 -translate-y-1/2 sm:left-6">
            <Skeleton className="size-20 rounded-full sm:size-24 md:size-28" />
          </div>
          {/* Name and handle skeleton */}
          <div className="mb-3 space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          {/* Bio skeleton */}
          <Skeleton className="mb-4 h-16 w-full max-w-lg" />
        </div>
        {/* Metrics skeleton */}
        <div className="flex gap-4 px-4 pb-4 sm:px-6">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-16" />
        </div>
      </div>

      {/* Posts skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-16" />
        {[...Array(3)].map((_, i) => (
          <PostSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

/**
 * Loading skeleton for a single post
 */
function PostSkeleton() {
  return (
    <div className="bg-card rounded-lg p-4">
      <div className="flex gap-3">
        <Skeleton className="size-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    </div>
  );
}
