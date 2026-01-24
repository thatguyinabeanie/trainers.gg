"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ComposeForm,
  type ReplyContext,
  type QuoteContext,
} from "./compose-form";
import type { AppBskyFeedDefs, AppBskyFeedPost } from "@atproto/api";

interface ComposeDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog should close */
  onOpenChange: (open: boolean) => void;
  /** Reply context if replying to a post */
  replyTo?: ReplyContext;
  /** Quote context if quoting a post */
  quotedPost?: QuoteContext;
  /** Callback when post is successfully created */
  onSuccess?: (uri: string, cid: string) => void;
}

/**
 * Dialog wrapper for the compose form.
 * Handles opening/closing and context (reply/quote).
 */
export function ComposeDialog({
  open,
  onOpenChange,
  replyTo,
  quotedPost,
  onSuccess,
}: ComposeDialogProps) {
  const handleSuccess = (uri: string, cid: string) => {
    onSuccess?.(uri, cid);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  // Determine dialog title based on context
  const title = replyTo ? "Reply" : quotedPost ? "Quote Post" : "New Post";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <ComposeForm
          replyTo={replyTo}
          quotedPost={quotedPost}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
          autoFocus={open}
        />
      </DialogContent>
    </Dialog>
  );
}

/**
 * Helper to create reply context from a PostView
 */
export function createReplyContext(
  post: AppBskyFeedDefs.PostView,
  threadRoot?: { uri: string; cid: string }
): ReplyContext {
  const record = post.record as AppBskyFeedPost.Record;

  // If the post is already a reply, use its root as our root
  // Otherwise, this post becomes the root
  const root = record.reply?.root ??
    threadRoot ?? { uri: post.uri, cid: post.cid };

  return {
    parentUri: post.uri,
    parentCid: post.cid,
    rootUri: root.uri,
    rootCid: root.cid,
    authorHandle: post.author.handle,
    authorDisplayName: post.author.displayName,
  };
}

/**
 * Helper to create quote context from a PostView
 */
export function createQuoteContext(
  post: AppBskyFeedDefs.PostView
): QuoteContext {
  const record = post.record as AppBskyFeedPost.Record;

  return {
    uri: post.uri,
    cid: post.cid,
    authorHandle: post.author.handle,
    authorDisplayName: post.author.displayName,
    text: record.text,
  };
}

export { type ReplyContext, type QuoteContext };
