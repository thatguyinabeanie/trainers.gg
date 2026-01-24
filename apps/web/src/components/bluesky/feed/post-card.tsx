import Link from "next/link";
import type {
  AppBskyFeedDefs,
  AppBskyFeedPost,
  AppBskyActorDefs,
} from "@atproto/api";
import { cn } from "@/lib/utils";
import { BlueskyAvatar, HandleLink, RelativeTime, PostText } from "../shared";
import { PostActions } from "./post-actions";

interface PostCardProps {
  /** The feed view post (includes post + context like reply/repost) */
  feedViewPost: AppBskyFeedDefs.FeedViewPost;
  /** Optional callback when reply button is clicked */
  onReply?: (post: AppBskyFeedDefs.PostView) => void;
  /** Show the post actions (like, repost, etc) */
  showActions?: boolean;
  /** Additional class name */
  className?: string;
}

/**
 * Renders a single Bluesky post in a card format.
 * Handles post content, author info, embeds, and interactions.
 */
export function PostCard({
  feedViewPost,
  onReply,
  showActions = true,
  className,
}: PostCardProps) {
  const { post, reply, reason } = feedViewPost;
  const author = post.author;
  const record = post.record as AppBskyFeedPost.Record;

  // Determine if this is a repost
  const isRepost = reason?.$type === "app.bsky.feed.defs#reasonRepost";
  const repostedBy = isRepost
    ? (reason as AppBskyFeedDefs.ReasonRepost).by
    : null;

  // Get viewer state for interactions
  const viewerLike = post.viewer?.like;
  const viewerRepost = post.viewer?.repost;

  return (
    <article
      className={cn(
        "bg-background hover:bg-muted/30 border-border cursor-pointer border-b px-4 py-3 transition-colors",
        className
      )}
    >
      {/* Repost indicator */}
      {isRepost && repostedBy && (
        <div className="text-muted-foreground mb-2 flex items-center gap-2 text-sm">
          <svg
            className="size-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span>
            <HandleLink
              handle={repostedBy.handle}
              did={repostedBy.did}
              className="hover:underline"
            />{" "}
            reposted
          </span>
        </div>
      )}

      {/* Reply context */}
      {reply?.parent && (
        <div className="text-muted-foreground mb-2 text-sm">
          Replying to{" "}
          <HandleLink
            handle={(reply.parent as AppBskyFeedDefs.PostView).author.handle}
            did={(reply.parent as AppBskyFeedDefs.PostView).author.did}
          />
        </div>
      )}

      <div className="flex gap-3">
        {/* Author avatar */}
        <Link href={`/profile/${author.did}`} className="shrink-0">
          <BlueskyAvatar
            src={author.avatar}
            displayName={author.displayName}
            handle={author.handle}
            size="md"
          />
        </Link>

        <div className="min-w-0 flex-1">
          {/* Author info and timestamp */}
          <div className="flex items-center gap-1">
            <Link
              href={`/profile/${author.did}`}
              className="truncate font-medium hover:underline"
            >
              {author.displayName || author.handle}
            </Link>
            <HandleLink
              handle={author.handle}
              did={author.did}
              className="text-muted-foreground truncate text-sm"
            />
            <span className="text-muted-foreground">·</span>
            <RelativeTime date={record.createdAt} />
          </div>

          {/* Post content */}
          <div className="mt-1">
            <PostText
              text={record.text}
              facets={record.facets}
              className="text-foreground break-words whitespace-pre-wrap"
            />
          </div>

          {/* Embed (images, links, quotes) */}
          {post.embed && <PostEmbed embed={post.embed} />}

          {/* Actions */}
          {showActions && (
            <PostActions
              uri={post.uri}
              cid={post.cid}
              likeCount={post.likeCount ?? 0}
              repostCount={post.repostCount ?? 0}
              replyCount={post.replyCount ?? 0}
              viewerLike={viewerLike}
              viewerRepost={viewerRepost}
              onReply={onReply ? () => onReply(post) : undefined}
              className="mt-2 -ml-2"
            />
          )}
        </div>
      </div>
    </article>
  );
}

/**
 * Renders post embeds (images, external links, quotes, etc)
 */
function PostEmbed({ embed }: { embed: AppBskyFeedDefs.PostView["embed"] }) {
  if (!embed) return null;

  // Images
  if (embed.$type === "app.bsky.embed.images#view") {
    const images = embed as {
      images: Array<{ thumb: string; alt?: string; fullsize: string }>;
    };
    return (
      <div
        className={cn(
          "mt-2 grid gap-1 overflow-hidden rounded-lg",
          images.images.length === 1 && "grid-cols-1",
          images.images.length === 2 && "grid-cols-2",
          images.images.length >= 3 && "grid-cols-2"
        )}
      >
        {images.images.slice(0, 4).map((img, i) => (
          <a
            key={i}
            href={img.fullsize}
            target="_blank"
            rel="noopener noreferrer"
            className="block overflow-hidden"
          >
            <img
              src={img.thumb}
              alt={img.alt || "Post image"}
              className="h-auto w-full object-cover"
              loading="lazy"
            />
          </a>
        ))}
      </div>
    );
  }

  // External link
  if (embed.$type === "app.bsky.embed.external#view") {
    const external = embed as {
      external: {
        uri: string;
        title: string;
        description?: string;
        thumb?: string;
      };
    };
    return (
      <a
        href={external.external.uri}
        target="_blank"
        rel="noopener noreferrer"
        className="bg-muted border-border mt-2 block overflow-hidden rounded-lg border"
      >
        {external.external.thumb && (
          <img
            src={external.external.thumb}
            alt=""
            className="h-32 w-full object-cover"
            loading="lazy"
          />
        )}
        <div className="p-3">
          <div className="text-muted-foreground truncate text-xs">
            {new URL(external.external.uri).hostname}
          </div>
          <div className="mt-0.5 line-clamp-2 font-medium">
            {external.external.title}
          </div>
          {external.external.description && (
            <div className="text-muted-foreground mt-0.5 line-clamp-2 text-sm">
              {external.external.description}
            </div>
          )}
        </div>
      </a>
    );
  }

  // Quote post
  if (embed.$type === "app.bsky.embed.record#view") {
    const recordEmbed = embed as {
      record: AppBskyFeedDefs.PostView | { $type: string };
    };

    // Check if it's a valid post view
    if (
      recordEmbed.record &&
      "$type" in recordEmbed.record &&
      recordEmbed.record.$type === "app.bsky.embed.record#viewRecord"
    ) {
      const quotedPost = recordEmbed.record as unknown as {
        author: AppBskyActorDefs.ProfileViewBasic;
        value: AppBskyFeedPost.Record;
        uri: string;
      };

      return (
        <div className="bg-muted border-border mt-2 rounded-lg border p-3">
          <div className="flex items-center gap-2">
            <BlueskyAvatar
              src={quotedPost.author.avatar}
              displayName={quotedPost.author.displayName}
              handle={quotedPost.author.handle}
              size="sm"
            />
            <span className="font-medium">
              {quotedPost.author.displayName || quotedPost.author.handle}
            </span>
            <HandleLink
              handle={quotedPost.author.handle}
              did={quotedPost.author.did}
              className="text-muted-foreground text-sm"
            />
          </div>
          <div className="mt-1 text-sm">
            <PostText
              text={quotedPost.value.text}
              facets={quotedPost.value.facets}
            />
          </div>
        </div>
      );
    }
  }

  return null;
}

/**
 * Skeleton loader for PostCard
 */
export function PostCardSkeleton() {
  return (
    <div className="border-border animate-pulse border-b px-4 py-3">
      <div className="flex gap-3">
        <div className="bg-muted size-10 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <div className="bg-muted h-4 w-24 rounded" />
            <div className="bg-muted h-4 w-20 rounded" />
          </div>
          <div className="space-y-1.5">
            <div className="bg-muted h-4 w-full rounded" />
            <div className="bg-muted h-4 w-3/4 rounded" />
          </div>
          <div className="flex gap-8 pt-2">
            <div className="bg-muted h-4 w-12 rounded" />
            <div className="bg-muted h-4 w-12 rounded" />
            <div className="bg-muted h-4 w-12 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
