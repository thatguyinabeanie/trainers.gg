/**
 * @trainers/atproto
 *
 * Shared AT Protocol / Bluesky library for trainers.gg
 *
 * This package provides platform-agnostic AT Protocol utilities that can be
 * used by both the web app (Next.js) and mobile app (Expo).
 *
 * ## Usage
 *
 * ```typescript
 * // Import core utilities
 * import {
 *   getPublicAgent,
 *   withErrorHandling,
 *   BlueskyAuthError,
 *   BlueskyApiError,
 * } from "@trainers/atproto";
 *
 * // Import API functions
 * import {
 *   getTimeline,
 *   createPost,
 *   likePost,
 *   follow,
 * } from "@trainers/atproto/api";
 * ```
 *
 * ## Authentication
 *
 * API functions that require authentication accept an `Agent` as the first
 * parameter. Each platform (web/mobile) is responsible for creating and
 * managing authenticated agents:
 *
 * - **Web**: Uses OAuth with `@atproto/oauth-client-node`
 * - **Mobile**: Can use session-based auth with Expo SecureStore
 */

// Configuration
export {
  PDS_URL,
  BSKY_APP_VIEW_URL,
  BSKY_PUBLIC_URL,
  POKEMON_KEYWORDS,
  isPokemonContent,
} from "./config";

// Utilities
export {
  MAX_POST_LENGTH,
  getGraphemeLength,
  isPostTooLong,
  parseAtUri,
} from "./utils";

// Handle utilities
export { extractUsernameFromHandle } from "./handle-utils";

// Errors
export { BlueskyAuthError, BlueskyApiError } from "./errors";

// Agent utilities
export { getPublicAgent, withErrorHandling } from "./agent";

// Types
export type {
  Agent,
  AppBskyFeedDefs,
  AppBskyActorDefs,
  BlobRef,
  FeedCursor,
  FeedResult,
  TimelineOptions,
  AuthorFeedOptions,
  ProfileView,
  CreatePostResult,
  CreatePostOptions,
  LikeResult,
  RepostResult,
  FollowResult,
} from "./types";
export { mapProfile } from "./types";
