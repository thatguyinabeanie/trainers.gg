"use client";

import Link from "next/link";
import { ArrowLeft, AlertCircle, Users } from "lucide-react";
import { useProfile, useFollowing, flattenFollowPages } from "@/hooks/bluesky";
import { ProfileListItem } from "@/components/bluesky/profile";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface FollowingPageClientProps {
  handle: string;
}

/**
 * Client component for the following page.
 * Displays a list of users that the specified profile follows.
 */
export function FollowingPageClient({ handle }: FollowingPageClientProps) {
  const { data: profile, isLoading: isProfileLoading } = useProfile(handle);
  const {
    data: followingData,
    isLoading: isFollowingLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    error,
  } = useFollowing(handle);

  const following = flattenFollowPages(followingData?.pages);
  const displayName = profile?.displayName || profile?.handle || handle;

  return (
    <div className="border-border mx-auto min-h-screen max-w-2xl border-x">
      {/* Header */}
      <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 border-border sticky top-0 z-10 border-b backdrop-blur">
        <div className="flex h-14 items-center gap-4 px-4">
          <Link href={`/profile/${handle}`}>
            <Button variant="ghost" size="icon" className="size-8">
              <ArrowLeft className="size-4" />
              <span className="sr-only">Back to profile</span>
            </Button>
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-foreground truncate font-bold">Following</h1>
            {!isProfileLoading && (
              <p className="text-muted-foreground truncate text-sm">
                @{profile?.handle || handle}
              </p>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="divide-border divide-y">
        {isFollowingLoading ? (
          /* Loading skeletons */
          [...Array(5)].map((_, i) => <ProfileListSkeleton key={i} />)
        ) : error ? (
          /* Error state */
          <div className="flex flex-col items-center justify-center px-4 py-16">
            <AlertCircle className="text-muted-foreground mb-4 size-12" />
            <h2 className="text-foreground mb-2 text-lg font-semibold">
              Failed to load following
            </h2>
            <p className="text-muted-foreground text-center text-sm">
              {error instanceof Error
                ? error.message
                : "Something went wrong. Please try again."}
            </p>
          </div>
        ) : following.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center px-4 py-16">
            <Users className="text-muted-foreground mb-4 size-12" />
            <h2 className="text-foreground mb-2 text-lg font-semibold">
              Not following anyone
            </h2>
            <p className="text-muted-foreground text-center text-sm">
              {displayName} isn&apos;t following anyone yet.
            </p>
          </div>
        ) : (
          /* Following list */
          <>
            {following.map((followedUser) => (
              <ProfileListItem key={followedUser.did} profile={followedUser} />
            ))}

            {/* Load more button */}
            {hasNextPage && (
              <div className="p-4">
                <button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="text-primary hover:text-primary/80 w-full py-2 text-center text-sm font-medium disabled:opacity-50"
                >
                  {isFetchingNextPage ? "Loading..." : "Load more"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Loading skeleton for a profile list item
 */
function ProfileListSkeleton() {
  return (
    <div className="flex items-start gap-3 p-4">
      <Skeleton className="size-12 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-full max-w-xs" />
      </div>
      <Skeleton className="h-8 w-20 shrink-0" />
    </div>
  );
}
