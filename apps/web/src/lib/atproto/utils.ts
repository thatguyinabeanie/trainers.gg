/**
 * AT Protocol Utilities
 *
 * Re-exports shared utilities for client components.
 * These functions have no server dependencies and can be imported
 * in both client and server components.
 */

// Re-export everything from the shared package
export {
  MAX_POST_LENGTH,
  getGraphemeLength,
  isPostTooLong,
  parseAtUri,
} from "@trainers/atproto";
