/**
 * AT Protocol Posts API
 *
 * Functions for creating, deleting, and managing posts on Bluesky.
 * All write operations require authentication.
 */

import type {
  AppBskyFeedPost,
  AppBskyRichtextFacet,
  BlobRef,
} from "@atproto/api";
import { RichText } from "@atproto/api";
import { getAuthenticatedAgent, withErrorHandling } from "../agent";

/**
 * Result from creating a post
 */
export interface CreatePostResult {
  /** AT-URI of the created post */
  uri: string;
  /** Content hash of the post */
  cid: string;
}

/**
 * Options for creating a post
 */
export interface CreatePostOptions {
  /** Reply to an existing post */
  reply?: {
    /** Parent post to reply to */
    parent: { uri: string; cid: string };
    /** Root of the thread (same as parent if replying to root) */
    root: { uri: string; cid: string };
  };
  /** Quote another post */
  quote?: {
    uri: string;
    cid: string;
  };
  /** Embed images (blob references from uploadImage) */
  images?: Array<{
    /** Blob reference from uploadImage */
    blob: BlobRef;
    /** Alt text for accessibility */
    alt: string;
    /** Aspect ratio (optional) */
    aspectRatio?: { width: number; height: number };
  }>;
  /** External link embed */
  external?: {
    uri: string;
    title: string;
    description: string;
    thumb?: BlobRef;
  };
  /** Language tags (e.g., ["en", "ja"]) */
  langs?: string[];
  /** Labels/tags for the post */
  labels?: string[];
}

/**
 * Create a new post on Bluesky
 *
 * This creates a post on the user's PDS and federates it to the network.
 * Automatically detects and links mentions (@user.bsky.social) and URLs.
 *
 * @param did - The user's DID
 * @param text - The post text (max 300 graphemes)
 * @param options - Additional post options (reply, embed, etc.)
 * @returns The URI and CID of the created post
 *
 * @example
 * ```typescript
 * // Simple post
 * const { uri, cid } = await createPost("did:plc:xxx", "Hello Bluesky!");
 *
 * // Reply to a post
 * const reply = await createPost("did:plc:xxx", "Great point!", {
 *   reply: {
 *     parent: { uri: parentUri, cid: parentCid },
 *     root: { uri: rootUri, cid: rootCid },
 *   },
 * });
 * ```
 */
export async function createPost(
  did: string,
  text: string,
  options: CreatePostOptions = {}
): Promise<CreatePostResult> {
  return withErrorHandling(async () => {
    const agent = await getAuthenticatedAgent(did);

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
 * @param did - The user's DID
 * @param postUri - The AT-URI of the post to delete
 *
 * @example
 * ```typescript
 * await deletePost("did:plc:xxx", "at://did:plc:xxx/app.bsky.feed.post/xyz");
 * ```
 */
export async function deletePost(did: string, postUri: string): Promise<void> {
  return withErrorHandling(async () => {
    const agent = await getAuthenticatedAgent(did);

    // Extract the record key from the URI
    // Format: at://did:plc:xxx/app.bsky.feed.post/rkey
    const parts = postUri.split("/");
    const rkey = parts[parts.length - 1];

    if (!rkey) {
      throw new Error("Invalid post URI");
    }

    await agent.deletePost(postUri);
  });
}

/**
 * Upload an image to the user's PDS
 *
 * @param did - The user's DID
 * @param imageData - The image data as ArrayBuffer or Uint8Array
 * @param mimeType - The MIME type (e.g., "image/jpeg", "image/png")
 * @returns The blob reference to use in createPost
 *
 * @example
 * ```typescript
 * const file = await fetch(imageUrl).then(r => r.arrayBuffer());
 * const blob = await uploadImage("did:plc:xxx", new Uint8Array(file), "image/jpeg");
 *
 * await createPost("did:plc:xxx", "Check out this image!", {
 *   images: [{ blob, alt: "Description of image" }],
 * });
 * ```
 */
export async function uploadImage(
  did: string,
  imageData: Uint8Array,
  mimeType: string
): Promise<BlobRef> {
  return withErrorHandling(async () => {
    const agent = await getAuthenticatedAgent(did);

    const response = await agent.uploadBlob(imageData, {
      encoding: mimeType,
    });

    return response.data.blob;
  });
}

/**
 * Get the character/grapheme count for text
 *
 * Bluesky uses grapheme count, not character count, for the 300 limit.
 * This handles emoji and other multi-byte characters correctly.
 *
 * @param text - The text to count
 * @returns The grapheme count
 */
export function getGraphemeLength(text: string): number {
  // Use Intl.Segmenter for accurate grapheme counting
  const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
  return [...segmenter.segment(text)].length;
}

/**
 * Maximum post length in graphemes
 */
export const MAX_POST_LENGTH = 300;

/**
 * Check if text exceeds the post length limit
 *
 * @param text - The text to check
 * @returns True if the text is too long
 */
export function isPostTooLong(text: string): boolean {
  return getGraphemeLength(text) > MAX_POST_LENGTH;
}

/**
 * Parse an AT-URI into its components
 *
 * @param uri - The AT-URI (e.g., "at://did:plc:xxx/app.bsky.feed.post/rkey")
 * @returns Parsed components or null if invalid
 */
export function parseAtUri(uri: string): {
  did: string;
  collection: string;
  rkey: string;
} | null {
  const match = uri.match(/^at:\/\/([^/]+)\/([^/]+)\/([^/]+)$/);
  if (!match) return null;

  return {
    did: match[1]!,
    collection: match[2]!,
    rkey: match[3]!,
  };
}
