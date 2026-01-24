"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  toggleLikeBlueskyPost,
  toggleRepostBlueskyPost,
} from "@/actions/bluesky";
import { Heart, MessageCircle, Repeat2, Share } from "lucide-react";
import { useState, useTransition } from "react";

interface PostActionsProps {
  uri: string;
  cid: string;
  likeCount: number;
  repostCount: number;
  replyCount: number;
  /** Current user's like URI if they've liked this post */
  viewerLike?: string;
  /** Current user's repost URI if they've reposted this post */
  viewerRepost?: string;
  /** Callback when reply button is clicked */
  onReply?: () => void;
  /** Show counts next to icons */
  showCounts?: boolean;
  /** Size variant */
  size?: "sm" | "default";
  className?: string;
}

/**
 * Action buttons for a Bluesky post (like, repost, reply, share).
 * Uses optimistic updates for instant feedback.
 */
export function PostActions({
  uri,
  cid,
  likeCount,
  repostCount,
  replyCount,
  viewerLike,
  viewerRepost,
  onReply,
  showCounts = true,
  size = "default",
  className,
}: PostActionsProps) {
  const [isPending, startTransition] = useTransition();

  // Optimistic state for immediate UI feedback
  const [optimisticLiked, setOptimisticLiked] = useState(!!viewerLike);
  const [optimisticLikeCount, setOptimisticLikeCount] = useState(likeCount);
  const [optimisticReposted, setOptimisticReposted] = useState(!!viewerRepost);
  const [optimisticRepostCount, setOptimisticRepostCount] =
    useState(repostCount);

  const handleLike = () => {
    // Optimistic update
    const wasLiked = optimisticLiked;
    setOptimisticLiked(!wasLiked);
    setOptimisticLikeCount((c) => (wasLiked ? c - 1 : c + 1));

    startTransition(async () => {
      const result = await toggleLikeBlueskyPost(uri, cid, viewerLike);

      // Revert on error
      if (!result.success) {
        setOptimisticLiked(wasLiked);
        setOptimisticLikeCount((c) => (wasLiked ? c + 1 : c - 1));
      }
    });
  };

  const handleRepost = () => {
    // Optimistic update
    const wasReposted = optimisticReposted;
    setOptimisticReposted(!wasReposted);
    setOptimisticRepostCount((c) => (wasReposted ? c - 1 : c + 1));

    startTransition(async () => {
      const result = await toggleRepostBlueskyPost(uri, cid, viewerRepost);

      // Revert on error
      if (!result.success) {
        setOptimisticReposted(wasReposted);
        setOptimisticRepostCount((c) => (wasReposted ? c + 1 : c - 1));
      }
    });
  };

  const handleShare = async () => {
    // Convert AT-URI to web URL for sharing
    // Format: at://did:plc:xxx/app.bsky.feed.post/rkey -> https://bsky.app/profile/did:plc:xxx/post/rkey
    const match = uri.match(/at:\/\/(did:[^/]+)\/app\.bsky\.feed\.post\/(.+)/);
    if (match) {
      const [, did, rkey] = match;
      const webUrl = `https://bsky.app/profile/${did}/post/${rkey}`;

      if (navigator.share) {
        try {
          await navigator.share({ url: webUrl });
        } catch {
          // User cancelled or share failed
        }
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(webUrl);
      }
    }
  };

  const buttonSize = size === "sm" ? "icon-xs" : "icon-sm";
  const iconSize = size === "sm" ? "size-3.5" : "size-4";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {/* Reply */}
      <Button
        variant="ghost"
        size={buttonSize}
        onClick={onReply}
        className="text-muted-foreground hover:text-primary gap-1"
        disabled={!onReply}
      >
        <MessageCircle className={iconSize} />
        {showCounts && replyCount > 0 && (
          <span className={cn(textSize, "tabular-nums")}>{replyCount}</span>
        )}
      </Button>

      {/* Repost */}
      <Button
        variant="ghost"
        size={buttonSize}
        onClick={handleRepost}
        disabled={isPending}
        className={cn(
          "gap-1",
          optimisticReposted
            ? "text-green-500 hover:text-green-600"
            : "text-muted-foreground hover:text-green-500"
        )}
      >
        <Repeat2 className={iconSize} />
        {showCounts && optimisticRepostCount > 0 && (
          <span className={cn(textSize, "tabular-nums")}>
            {optimisticRepostCount}
          </span>
        )}
      </Button>

      {/* Like */}
      <Button
        variant="ghost"
        size={buttonSize}
        onClick={handleLike}
        disabled={isPending}
        className={cn(
          "gap-1",
          optimisticLiked
            ? "text-red-500 hover:text-red-600"
            : "text-muted-foreground hover:text-red-500"
        )}
      >
        <Heart className={cn(iconSize, optimisticLiked && "fill-current")} />
        {showCounts && optimisticLikeCount > 0 && (
          <span className={cn(textSize, "tabular-nums")}>
            {optimisticLikeCount}
          </span>
        )}
      </Button>

      {/* Share */}
      <Button
        variant="ghost"
        size={buttonSize}
        onClick={handleShare}
        className="text-muted-foreground hover:text-primary"
      >
        <Share className={iconSize} />
      </Button>
    </div>
  );
}
