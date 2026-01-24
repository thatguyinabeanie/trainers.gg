/**
 * AT Protocol Posts API
 *
 * Functions for creating, deleting, and managing posts on Bluesky.
 * All write operations require an authenticated Agent.
 */

import type {
  Agent,
  AppBskyFeedPost,
  AppBskyRichtextFacet,
  BlobRef,
} from "@atproto/api";
import { RichText } from "@atproto/api";
import { withErrorHandling } from "../agent";
import type { CreatePostResult, CreatePostOptions } from "../types";

// Re-export utilities for convenience
export {
  MAX_POST_LENGTH,
  getGraphemeLength,
  isPostTooLong,
  parseAtUri,
} from "../utils";

// Re-export types for convenience
export type { CreatePostResult, CreatePostOptions };

/**
 * Create a new post on Bluesky
 *
 * This creates a post on the user's PDS and federates it to the network.
 * Automatically detects and links mentions (@user.bsky.social) and URLs.
 *
 * @param agent - An authenticated Agent instance
 * @param text - The post text (max 300 graphemes)
 * @param options - Additional post options (reply, embed, etc.)
 * @returns The URI and CID of the created post
 */
export async function createPost(
  agent: Agent,
  text: string,
  options: CreatePostOptions = {}
): Promise<CreatePostResult> {
  return withErrorHandling(async () => {
    // Use RichText to detect mentions and links
    const richText = new RichText({ text });
    await richText.detectFacets(agent);

    // Build the post record
    const record: AppBskyFeedPost.Record = {
      $type: "app.bsky.feed.post",
      text: richText.text,
      facets: richText.facets as AppBskyRichtextFacet.Main[] | undefined,
      createdAt: new Date().toISOString(),
    };

    // Add reply context
    if (options.reply) {
      record.reply = {
        parent: options.reply.parent,
        root: options.reply.root,
      };
    }

    // Add embeds
    if (options.quote) {
      record.embed = {
        $type: "app.bsky.embed.record",
        record: options.quote,
      };
    } else if (options.images && options.images.length > 0) {
      record.embed = {
        $type: "app.bsky.embed.images",
        images: options.images.map((img) => ({
          image: img.blob,
          alt: img.alt,
          aspectRatio: img.aspectRatio,
        })),
      };
    } else if (options.external) {
      record.embed = {
        $type: "app.bsky.embed.external",
        external: {
          uri: options.external.uri,
          title: options.external.title,
          description: options.external.description,
          thumb: options.external.thumb,
        },
      };
    }

    // Add language tags
    if (options.langs) {
      record.langs = options.langs;
    }

    // Create the post
    const response = await agent.post(record);

    return {
      uri: response.uri,
      cid: response.cid,
    };
  });
}

/**
 * Delete a post
 *
 * @param agent - An authenticated Agent instance
 * @param postUri - The AT-URI of the post to delete
 */
export async function deletePost(agent: Agent, postUri: string): Promise<void> {
  return withErrorHandling(async () => {
    await agent.deletePost(postUri);
  });
}

/**
 * Upload an image to the user's PDS
 *
 * @param agent - An authenticated Agent instance
 * @param imageData - The image data as Uint8Array
 * @param mimeType - The MIME type (e.g., "image/jpeg", "image/png")
 * @returns The blob reference to use in createPost
 */
export async function uploadImage(
  agent: Agent,
  imageData: Uint8Array,
  mimeType: string
): Promise<BlobRef> {
  return withErrorHandling(async () => {
    const response = await agent.uploadBlob(imageData, {
      encoding: mimeType,
    });

    return response.data.blob;
  });
}
