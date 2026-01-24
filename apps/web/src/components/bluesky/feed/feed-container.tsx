"use client";

import { useEffect, useRef, useCallback } from "react";
import type { AppBskyFeedDefs } from "@atproto/api";
import { cn } from "@/lib/utils";
import { PostCard, PostCardSkeleton } from "./post-card";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";

interface FeedContainerProps {
  /** Array of feed posts to display */
  posts: AppBskyFeedDefs.FeedViewPost[];
  /** Loading state for initial fetch */
  isLoading?: boolean;
  /** Loading state for fetching more posts */
  isFetchingNextPage?: boolean;
  /** Error state */
  error?: Error | null;
  /** Whether there are more posts to load */
  hasNextPage?: boolean;
  /** Function to fetch next page */
  fetchNextPage?: () => void;
  /** Callback when reply button is clicked on a post */
  onReply?: (post: AppBskyFeedDefs.PostView) => void;
  /** Empty state message */
  emptyMessage?: string;
  /** Additional class name */
  className?: string;
}

/**
 * Container component for displaying a feed of posts with infinite scroll.
 *
 * Uses Intersection Observer to detect when the user scrolls near the bottom
 * and automatically loads more posts.
 */
export function FeedContainer({
  posts,
  isLoading = false,
  isFetchingNextPage = false,
  error,
  hasNextPage = false,
  fetchNextPage,
  onReply,
  emptyMessage = "No posts to show",
  className,
}: FeedContainerProps) {
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for infinite scroll
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (
        entry?.isIntersecting &&
        hasNextPage &&
        !isFetchingNextPage &&
        fetchNextPage
      ) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  );

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: "200px", // Start loading before reaching the end
      threshold: 0,
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, [handleObserver]);

  // Initial loading state
  if (isLoading) {
    return (
      <div className={cn("divide-border divide-y", className)}>
        {Array.from({ length: 5 }).map((_, i) => (
          <PostCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
        <p className="text-destructive mb-4">Failed to load feed</p>
        <p className="text-muted-foreground mb-4 text-sm">{error.message}</p>
        {fetchNextPage && (
          <Button variant="outline" onClick={() => fetchNextPage()}>
            Try again
          </Button>
        )}
      </div>
    );
  }

  // Empty state
  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn("divide-border divide-y", className)}>
      {posts.map((feedViewPost, index) => (
        <PostCard
          key={`${feedViewPost.post.uri}-${index}`}
          feedViewPost={feedViewPost}
          onReply={onReply}
        />
      ))}

      {/* Load more trigger */}
      <div ref={loadMoreRef} className="py-4 text-center">
        {isFetchingNextPage ? (
          <div className="flex items-center justify-center gap-2">
            <Spinner className="size-4" />
            <span className="text-muted-foreground text-sm">
              Loading more...
            </span>
          </div>
        ) : hasNextPage ? (
          <Button
            variant="ghost"
            onClick={fetchNextPage}
            className="text-muted-foreground"
          >
            Load more
          </Button>
        ) : posts.length > 0 ? (
          <p className="text-muted-foreground text-sm">
            You&apos;ve reached the end
          </p>
        ) : null}
      </div>
    </div>
  );
}
