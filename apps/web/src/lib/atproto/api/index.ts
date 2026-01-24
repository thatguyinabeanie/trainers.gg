/**
 * AT Protocol API Layer - Web
 *
 * Centralized exports for all Bluesky API functions.
 * These are web-specific wrappers that inject authenticated agents via OAuth.
 *
 * @example
 * ```typescript
 * import { getTimeline, createPost, likePost, follow } from "@/lib/atproto/api";
 *
 * // Fetch Pokemon feed
 * const { posts } = await getTimeline(did, { pokemonOnly: true });
 *
 * // Create a post
 * await createPost(did, "Hello trainers!");
 *
 * // Like a post
 * await likePost(did, postUri, postCid);
 *
 * // Follow someone
 * await follow(did, targetDid);
 * ```
 */

// Feed API - reading timelines and posts
export {
  getTimeline,
  getAuthorFeed,
  getActorLikes,
  getPost,
  getPosts,
  getPostThread,
  getPokemonFeed,
  searchPosts,
  type FeedCursor,
  type FeedResult,
  type TimelineOptions,
  type AuthorFeedOptions,
} from "./feed";

// Posts API - creating and managing posts
export {
  createPost,
  deletePost,
  uploadImage,
  getGraphemeLength,
  isPostTooLong,
  parseAtUri,
  MAX_POST_LENGTH,
  type CreatePostResult,
  type CreatePostOptions,
} from "./posts";

// Interactions API - likes and reposts
export {
  likePost,
  unlikePost,
  repost,
  unrepost,
  getLikes,
  getRepostedBy,
  type LikeResult,
  type RepostResult,
} from "./interactions";

// Social Graph API - follows, blocks, mutes
export {
  follow,
  unfollow,
  getProfile,
  getProfiles,
  getFollowers,
  getFollows,
  blockUser,
  unblockUser,
  muteUser,
  unmuteUser,
  searchUsers,
  getSuggestedFollows,
  type FollowResult,
  type ProfileView,
} from "./social-graph";
