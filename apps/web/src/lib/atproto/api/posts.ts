/**
 * AT Protocol Posts API - Web Wrapper
 *
 * Thin wrapper around @trainers/atproto/api/posts that injects
 * web-specific authenticated agents via OAuth.
 */

import type { BlobRef } from "@atproto/api";
import {
  createPost as createPostShared,
  deletePost as deletePostShared,
  uploadImage as uploadImageShared,
} from "@trainers/atproto/api";
import type {
  CreatePostResult,
  CreatePostOptions,
} from "@trainers/atproto/api";
import { getAuthenticatedAgent } from "../agent";

// Re-export types and utilities from shared package
export type { CreatePostResult, CreatePostOptions };
export {
  MAX_POST_LENGTH,
  getGraphemeLength,
  isPostTooLong,
  parseAtUri,
} from "@trainers/atproto/api";

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
 */
export async function createPost(
  did: string,
  text: string,
  options: CreatePostOptions = {}
): Promise<CreatePostResult> {
  const agent = await getAuthenticatedAgent(did);
  return createPostShared(agent, text, options);
}

/**
 * Delete a post
 *
 * @param did - The user's DID
 * @param postUri - The AT-URI of the post to delete
 */
export async function deletePost(did: string, postUri: string): Promise<void> {
  const agent = await getAuthenticatedAgent(did);
  return deletePostShared(agent, postUri);
}

/**
 * Upload an image to the user's PDS
 *
 * @param did - The user's DID
 * @param imageData - The image data as Uint8Array
 * @param mimeType - The MIME type (e.g., "image/jpeg", "image/png")
 * @returns The blob reference to use in createPost
 */
export async function uploadImage(
  did: string,
  imageData: Uint8Array,
  mimeType: string
): Promise<BlobRef> {
  const agent = await getAuthenticatedAgent(did);
  return uploadImageShared(agent, imageData, mimeType);
}
