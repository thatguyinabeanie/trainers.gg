"use client";

import { useState } from "react";
import {
  useAuthorFeed,
  useActorLikes,
  flattenFeedPages,
  type AuthorFeedFilter,
} from "@/hooks/bluesky";
import { PostCard } from "@/components/bluesky/feed/post-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * Profile tab types
 */
type ProfileTab = "posts" | "replies" | "media" | "likes";

interface ProfileTabsProps {
  /** The handle or DID of the profile owner */
  actor: string;
  /** Whether this is the current user's own profile (show likes tab) */
  isOwnProfile?: boolean;
}

/**
 * Map tab to Bluesky API filter
 */
function getFilterForTab(tab: ProfileTab): AuthorFeedFilter | undefined {
  switch (tab) {
    case "posts":
      return "posts_no_replies";
    case "replies":
      return "posts_with_replies";
    case "media":
      return "posts_with_media";
    default:
      return undefined;
  }
}

/**
 * Profile tabs component for switching between different feed views.
 * Displays Posts, Replies, Media, and optionally Likes tabs.
 */
export function ProfileTabs({ actor, isOwnProfile = false }: ProfileTabsProps) {
  const [activeTab, setActiveTab] = useState<ProfileTab>("posts");

  return (
    <div className="space-y-4">
      {/* Tab switcher */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as ProfileTab)}
      >
        <TabsList className="h-auto w-full justify-start gap-0 rounded-none border-none bg-transparent p-0">
          <TabsTrigger
            value="posts"
            className="data-[state=active]:border-primary hover:bg-muted/50 flex-1 rounded-none border-b-2 border-transparent px-4 py-3 font-semibold transition-colors data-[state=active]:bg-transparent"
          >
            Posts
          </TabsTrigger>
          <TabsTrigger
            value="replies"
            className="data-[state=active]:border-primary hover:bg-muted/50 flex-1 rounded-none border-b-2 border-transparent px-4 py-3 font-semibold transition-colors data-[state=active]:bg-transparent"
          >
            Replies
          </TabsTrigger>
          <TabsTrigger
            value="media"
            className="data-[state=active]:border-primary hover:bg-muted/50 flex-1 rounded-none border-b-2 border-transparent px-4 py-3 font-semibold transition-colors data-[state=active]:bg-transparent"
          >
            Media
          </TabsTrigger>
          {isOwnProfile && (
            <TabsTrigger
              value="likes"
              className="data-[state=active]:border-primary hover:bg-muted/50 flex-1 rounded-none border-b-2 border-transparent px-4 py-3 font-semibold transition-colors data-[state=active]:bg-transparent"
            >
              Likes
            </TabsTrigger>
          )}
        </TabsList>
      </Tabs>

      {/* Bottom border */}
      <div className="border-border -mt-4 border-b" />

      {/* Tab content */}
      {activeTab === "likes" ? (
        <LikesTabContent actor={actor} />
      ) : (
        <FeedTabContent actor={actor} tab={activeTab} />
      )}
    </div>
  );
}

/**
 * Feed content for posts/replies/media tabs
 */
function FeedTabContent({
  actor,
  tab,
}: {
  actor: string;
  tab: "posts" | "replies" | "media";
}) {
  const filter = getFilterForTab(tab);
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useAuthorFeed(actor, filter);

  const posts = flattenFeedPages(data?.pages);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <PostSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-muted-foreground py-12 text-center text-sm">
        {tab === "posts" && "No posts yet."}
        {tab === "replies" && "No replies yet."}
        {tab === "media" && "No media posts yet."}
      </div>
    );
  }

  return (
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
  );
}

/**
 * Likes tab content (uses different API endpoint)
 */
function LikesTabContent({ actor }: { actor: string }) {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useActorLikes(actor);

  const posts = flattenFeedPages(data?.pages);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <PostSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-muted-foreground py-12 text-center text-sm">
        No liked posts yet.
      </div>
    );
  }

  return (
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
