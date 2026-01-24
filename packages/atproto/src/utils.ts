/**
 * AT Protocol Utilities
 *
 * Platform-agnostic utility functions for working with AT Protocol data.
 * These functions have no server dependencies and can be imported
 * in both client and server components on web and mobile.
 */

/**
 * Maximum post length in graphemes
 */
export const MAX_POST_LENGTH = 300;

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
  return Array.from(segmenter.segment(text)).length;
}

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
