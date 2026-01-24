/**
 * Bluesky Server Actions
 *
 * Centralized exports for all Bluesky Server Actions.
 * Import from this file for clean access to all actions.
 *
 * @example
 * ```tsx
 * "use client";
 *
 * import {
 *   createBlueskyPost,
 *   likeBlueskyPost,
 *   followBlueskyUser,
 * } from "@/actions/bluesky";
 *
 * // Create a post
 * const result = await createBlueskyPost("Hello trainers!");
 *
 * // Like a post
 * await likeBlueskyPost(postUri, postCid);
 *
 * // Follow a user
 * await followBlueskyUser(targetDid);
 * ```
 */

// Post actions
export {
  createBlueskyPost,
  replyToBlueskyPost,
  quoteBlueskyPost,
  deleteBlueskyPost,
  type ActionResult,
} from "./post-actions";

// Interaction actions
export {
  likeBlueskyPost,
  unlikeBlueskyPost,
  repostBlueskyPost,
  unrepostBlueskyPost,
  toggleLikeBlueskyPost,
  toggleRepostBlueskyPost,
} from "./interaction-actions";

// Social actions
export {
  followBlueskyUser,
  unfollowBlueskyUser,
  toggleFollowBlueskyUser,
  blockBlueskyUser,
  unblockBlueskyUser,
  muteBlueskyUser,
  unmuteBlueskyUser,
  toggleMuteBlueskyUser,
} from "./social-actions";

// Feed actions
export {
  getTimelineAction,
  getPokemonFeedAction,
  getAuthorFeedAction,
} from "./feed-actions";

// Profile actions
export { getProfileAction, getProfilesAction } from "./profile-actions";
