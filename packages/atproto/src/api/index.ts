/**
 * AT Protocol API
 *
 * Re-exports all API functions for convenient importing.
 */

// Feed API
export {
  getTimeline,
  getAuthorFeed,
  getActorLikes,
  getPost,
  getPosts,
  getPostThread,
  getPokemonFeed,
  searchPosts,
} from "./feed";
export type {
  FeedResult,
  TimelineOptions,
  AuthorFeedOptions,
  FeedCursor,
} from "./feed";

// Posts API
export {
  createPost,
  deletePost,
  uploadImage,
  MAX_POST_LENGTH,
  getGraphemeLength,
  isPostTooLong,
  parseAtUri,
} from "./posts";
export type { CreatePostResult, CreatePostOptions } from "./posts";

// Interactions API
export {
  likePost,
  unlikePost,
  repost,
  unrepost,
  getLikes,
  getRepostedBy,
} from "./interactions";
export type { LikeResult, RepostResult } from "./interactions";

// Social Graph API
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
} from "./social-graph";
export type { ProfileView, FollowResult } from "./social-graph";
