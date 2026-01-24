"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { getGraphemeLength, MAX_POST_LENGTH } from "@/lib/atproto/api/posts";
import {
  createBlueskyPost,
  replyToBlueskyPost,
  quoteBlueskyPost,
} from "@/actions/bluesky";
import { Loader2 } from "lucide-react";

export interface ReplyContext {
  /** Post being replied to */
  parentUri: string;
  parentCid: string;
  /** Thread root (same as parent if replying to original post) */
  rootUri: string;
  rootCid: string;
  /** Author of the post being replied to */
  authorHandle: string;
  authorDisplayName?: string;
}

export interface QuoteContext {
  uri: string;
  cid: string;
  authorHandle: string;
  authorDisplayName?: string;
  text: string;
}

interface ComposeFormProps {
  /** Reply context if replying to a post */
  replyTo?: ReplyContext;
  /** Quote context if quoting a post */
  quotedPost?: QuoteContext;
  /** Callback when post is successfully created */
  onSuccess?: (uri: string, cid: string) => void;
  /** Callback when user cancels */
  onCancel?: () => void;
  /** Placeholder text */
  placeholder?: string;
  /** Auto-focus the textarea */
  autoFocus?: boolean;
  className?: string;
}

/**
 * Form for composing Bluesky posts with character counting.
 * Supports new posts, replies, and quotes.
 */
export function ComposeForm({
  replyTo,
  quotedPost,
  onSuccess,
  onCancel,
  placeholder = "What's happening?",
  autoFocus = true,
  className,
}: ComposeFormProps) {
  const [text, setText] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const graphemeCount = getGraphemeLength(text);
  const isOverLimit = graphemeCount > MAX_POST_LENGTH;
  const isEmpty = text.trim().length === 0;
  const isDisabled = isEmpty || isOverLimit || isPending;

  // Calculate remaining characters
  const remaining = MAX_POST_LENGTH - graphemeCount;

  // Determine placeholder based on context
  const effectivePlaceholder = replyTo
    ? `Reply to @${replyTo.authorHandle}...`
    : quotedPost
      ? "Add a comment..."
      : placeholder;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        let result;

        if (replyTo) {
          // Create a reply
          result = await replyToBlueskyPost(
            text,
            replyTo.parentUri,
            replyTo.parentCid,
            replyTo.rootUri,
            replyTo.rootCid
          );
        } else if (quotedPost) {
          // Create a quote post
          result = await quoteBlueskyPost(text, quotedPost.uri, quotedPost.cid);
        } else {
          // Create a new post
          result = await createBlueskyPost(text);
        }

        if (result.success) {
          setText("");
          onSuccess?.(result.data.uri, result.data.cid);
        } else {
          setError(result.error);
        }
      } catch (err) {
        setError("Failed to create post. Please try again.");
        console.error("Post creation error:", err);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-4", className)}>
      {/* Reply context indicator */}
      {replyTo && (
        <div className="text-muted-foreground text-sm">
          Replying to{" "}
          <span className="text-primary">@{replyTo.authorHandle}</span>
        </div>
      )}

      {/* Quote preview */}
      {quotedPost && (
        <div className="bg-muted/50 border-border rounded-lg border p-3 text-sm">
          <div className="text-muted-foreground mb-1">
            <span className="text-foreground font-medium">
              {quotedPost.authorDisplayName || `@${quotedPost.authorHandle}`}
            </span>{" "}
            <span className="text-muted-foreground">
              @{quotedPost.authorHandle}
            </span>
          </div>
          <p className="text-foreground line-clamp-3">{quotedPost.text}</p>
        </div>
      )}

      {/* Text input */}
      <div className="relative">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={effectivePlaceholder}
          autoFocus={autoFocus}
          disabled={isPending}
          className={cn(
            "min-h-[120px] resize-none border-0 p-0 text-lg focus-visible:ring-0",
            isPending && "opacity-50"
          )}
          aria-label="Post content"
          aria-describedby="char-count"
        />
      </div>

      {/* Error message */}
      {error && (
        <div className="text-destructive text-sm" role="alert">
          {error}
        </div>
      )}

      {/* Footer with character count and submit */}
      <div className="flex items-center justify-between border-t pt-3">
        {/* Character counter */}
        <div
          id="char-count"
          className={cn(
            "text-sm tabular-nums",
            isOverLimit
              ? "text-destructive font-medium"
              : remaining <= 20
                ? "text-amber-500"
                : "text-muted-foreground"
          )}
        >
          {remaining}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              disabled={isPending}
            >
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isDisabled} className="min-w-[80px]">
            {isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Posting...
              </>
            ) : replyTo ? (
              "Reply"
            ) : quotedPost ? (
              "Quote"
            ) : (
              "Post"
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
