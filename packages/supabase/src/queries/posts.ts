import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types";

type TypedClient = SupabaseClient<Database>;

/**
 * Post with author information for feed display
 */
export interface FeedPost {
  id: number;
  content: string;
  likesCount: number;
  repliesCount: number;
  repostsCount: number;
  viewsCount: number;
  isPinned: boolean;
  createdAt: string;
  replyToId: number | null;
  repostOfId: number | null;
  quoteContent: string | null;
  author: {
    id: number;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  isLikedByMe: boolean;
}

/**
 * Get feed posts for the "For You" timeline
 * Returns posts from all users, ordered by recency
 */
export async function getFeedPosts(
  supabase: TypedClient,
  options: {
    limit?: number;
    cursor?: number | null;
    currentAltId?: number | null;
  } = {}
): Promise<{
  posts: FeedPost[];
  nextCursor: number | null;
  hasMore: boolean;
}> {
  const { limit = 20, cursor = null, currentAltId = null } = options;
  const offset = cursor ?? 0;

  const { data, error, count } = await supabase
    .from("posts")
    .select(
      `
      id,
      content,
      likes_count,
      replies_count,
      reposts_count,
      views_count,
      is_pinned,
      created_at,
      reply_to_id,
      repost_of_id,
      quote_content,
      alt:alts!posts_alt_id_fkey(
        id,
        username,
        display_name,
        avatar_url
      )
    `,
      { count: "exact" }
    )
    .eq("is_deleted", false)
    .is("reply_to_id", null) // Only top-level posts, not replies
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  // Get likes by current user if logged in
  let likedPostIds = new Set<number>();
  if (currentAltId && data?.length) {
    const postIds = data.map((p) => p.id);
    const { data: likes } = await supabase
      .from("post_likes")
      .select("post_id")
      .eq("alt_id", currentAltId)
      .in("post_id", postIds);

    likedPostIds = new Set(likes?.map((l) => l.post_id) ?? []);
  }

  const posts: FeedPost[] = (data ?? []).map((post) => {
    const alt = post.alt as {
      id: number;
      username: string;
      display_name: string | null;
      avatar_url: string | null;
    } | null;

    return {
      id: post.id,
      content: post.content,
      likesCount: post.likes_count ?? 0,
      repliesCount: post.replies_count ?? 0,
      repostsCount: post.reposts_count ?? 0,
      viewsCount: post.views_count ?? 0,
      isPinned: post.is_pinned ?? false,
      createdAt: post.created_at ?? new Date().toISOString(),
      replyToId: post.reply_to_id,
      repostOfId: post.repost_of_id,
      quoteContent: post.quote_content,
      author: {
        id: alt?.id ?? 0,
        username: alt?.username ?? "unknown",
        displayName: alt?.display_name ?? null,
        avatarUrl: alt?.avatar_url ?? null,
      },
      isLikedByMe: likedPostIds.has(post.id),
    };
  });

  const totalCount = count ?? 0;
  const nextCursor = offset + limit < totalCount ? offset + limit : null;

  return {
    posts,
    nextCursor,
    hasMore: nextCursor !== null,
  };
}

/**
 * Get feed posts from users the current user follows ("Following" tab)
 */
export async function getFollowingFeedPosts(
  supabase: TypedClient,
  currentAltId: number,
  options: {
    limit?: number;
    cursor?: number | null;
  } = {}
): Promise<{
  posts: FeedPost[];
  nextCursor: number | null;
  hasMore: boolean;
}> {
  const { limit = 20, cursor = null } = options;
  const offset = cursor ?? 0;

  // First get the list of alt IDs the user follows
  const { data: follows } = await supabase
    .from("follows")
    .select("following_alt_id")
    .eq("follower_alt_id", currentAltId);

  const followingIds = follows?.map((f) => f.following_alt_id) ?? [];

  // Include the user's own posts in the following feed
  followingIds.push(currentAltId);

  if (followingIds.length === 0) {
    return { posts: [], nextCursor: null, hasMore: false };
  }

  const { data, error, count } = await supabase
    .from("posts")
    .select(
      `
      id,
      content,
      likes_count,
      replies_count,
      reposts_count,
      views_count,
      is_pinned,
      created_at,
      reply_to_id,
      repost_of_id,
      quote_content,
      alt:alts!posts_alt_id_fkey(
        id,
        username,
        display_name,
        avatar_url
      )
    `,
      { count: "exact" }
    )
    .eq("is_deleted", false)
    .is("reply_to_id", null) // Only top-level posts
    .in("alt_id", followingIds)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  // Get likes by current user
  let likedPostIds = new Set<number>();
  if (data?.length) {
    const postIds = data.map((p) => p.id);
    const { data: likes } = await supabase
      .from("post_likes")
      .select("post_id")
      .eq("alt_id", currentAltId)
      .in("post_id", postIds);

    likedPostIds = new Set(likes?.map((l) => l.post_id) ?? []);
  }

  const posts: FeedPost[] = (data ?? []).map((post) => {
    const alt = post.alt as {
      id: number;
      username: string;
      display_name: string | null;
      avatar_url: string | null;
    } | null;

    return {
      id: post.id,
      content: post.content,
      likesCount: post.likes_count ?? 0,
      repliesCount: post.replies_count ?? 0,
      repostsCount: post.reposts_count ?? 0,
      viewsCount: post.views_count ?? 0,
      isPinned: post.is_pinned ?? false,
      createdAt: post.created_at ?? new Date().toISOString(),
      replyToId: post.reply_to_id,
      repostOfId: post.repost_of_id,
      quoteContent: post.quote_content,
      author: {
        id: alt?.id ?? 0,
        username: alt?.username ?? "unknown",
        displayName: alt?.display_name ?? null,
        avatarUrl: alt?.avatar_url ?? null,
      },
      isLikedByMe: likedPostIds.has(post.id),
    };
  });

  const totalCount = count ?? 0;
  const nextCursor = offset + limit < totalCount ? offset + limit : null;

  return {
    posts,
    nextCursor,
    hasMore: nextCursor !== null,
  };
}

/**
 * Get a single post by ID with replies
 */
export async function getPostWithReplies(
  supabase: TypedClient,
  postId: number,
  options: {
    currentAltId?: number | null;
    repliesLimit?: number;
  } = {}
): Promise<{
  post: FeedPost | null;
  replies: FeedPost[];
}> {
  const { currentAltId = null, repliesLimit = 50 } = options;

  // Get the main post
  const { data: postData, error: postError } = await supabase
    .from("posts")
    .select(
      `
      id,
      content,
      likes_count,
      replies_count,
      reposts_count,
      views_count,
      is_pinned,
      created_at,
      reply_to_id,
      repost_of_id,
      quote_content,
      alt:alts!posts_alt_id_fkey(
        id,
        username,
        display_name,
        avatar_url
      )
    `
    )
    .eq("id", postId)
    .eq("is_deleted", false)
    .single();

  if (postError || !postData) {
    return { post: null, replies: [] };
  }

  // Get replies
  const { data: repliesData, error: repliesError } = await supabase
    .from("posts")
    .select(
      `
      id,
      content,
      likes_count,
      replies_count,
      reposts_count,
      views_count,
      is_pinned,
      created_at,
      reply_to_id,
      repost_of_id,
      quote_content,
      alt:alts!posts_alt_id_fkey(
        id,
        username,
        display_name,
        avatar_url
      )
    `
    )
    .eq("reply_to_id", postId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: true })
    .limit(repliesLimit);

  if (repliesError) throw repliesError;

  // Get likes by current user
  let likedPostIds = new Set<number>();
  if (currentAltId) {
    const allPostIds = [postData.id, ...(repliesData?.map((r) => r.id) ?? [])];
    const { data: likes } = await supabase
      .from("post_likes")
      .select("post_id")
      .eq("alt_id", currentAltId)
      .in("post_id", allPostIds);

    likedPostIds = new Set(likes?.map((l) => l.post_id) ?? []);
  }

  const mapPost = (post: typeof postData): FeedPost => {
    const alt = post.alt as {
      id: number;
      username: string;
      display_name: string | null;
      avatar_url: string | null;
    } | null;

    return {
      id: post.id,
      content: post.content,
      likesCount: post.likes_count ?? 0,
      repliesCount: post.replies_count ?? 0,
      repostsCount: post.reposts_count ?? 0,
      viewsCount: post.views_count ?? 0,
      isPinned: post.is_pinned ?? false,
      createdAt: post.created_at ?? new Date().toISOString(),
      replyToId: post.reply_to_id,
      repostOfId: post.repost_of_id,
      quoteContent: post.quote_content,
      author: {
        id: alt?.id ?? 0,
        username: alt?.username ?? "unknown",
        displayName: alt?.display_name ?? null,
        avatarUrl: alt?.avatar_url ?? null,
      },
      isLikedByMe: likedPostIds.has(post.id),
    };
  };

  return {
    post: mapPost(postData),
    replies: (repliesData ?? []).map(mapPost),
  };
}

/**
 * Get posts by a specific user/alt
 */
export async function getUserPosts(
  supabase: TypedClient,
  altId: number,
  options: {
    limit?: number;
    cursor?: number | null;
    currentAltId?: number | null;
    includeReplies?: boolean;
  } = {}
): Promise<{
  posts: FeedPost[];
  nextCursor: number | null;
  hasMore: boolean;
}> {
  const {
    limit = 20,
    cursor = null,
    currentAltId = null,
    includeReplies = false,
  } = options;
  const offset = cursor ?? 0;

  let query = supabase
    .from("posts")
    .select(
      `
      id,
      content,
      likes_count,
      replies_count,
      reposts_count,
      views_count,
      is_pinned,
      created_at,
      reply_to_id,
      repost_of_id,
      quote_content,
      alt:alts!posts_alt_id_fkey(
        id,
        username,
        display_name,
        avatar_url
      )
    `,
      { count: "exact" }
    )
    .eq("alt_id", altId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (!includeReplies) {
    query = query.is("reply_to_id", null);
  }

  const { data, error, count } = await query;

  if (error) throw error;

  // Get likes by current user
  let likedPostIds = new Set<number>();
  if (currentAltId && data?.length) {
    const postIds = data.map((p) => p.id);
    const { data: likes } = await supabase
      .from("post_likes")
      .select("post_id")
      .eq("alt_id", currentAltId)
      .in("post_id", postIds);

    likedPostIds = new Set(likes?.map((l) => l.post_id) ?? []);
  }

  const posts: FeedPost[] = (data ?? []).map((post) => {
    const alt = post.alt as {
      id: number;
      username: string;
      display_name: string | null;
      avatar_url: string | null;
    } | null;

    return {
      id: post.id,
      content: post.content,
      likesCount: post.likes_count ?? 0,
      repliesCount: post.replies_count ?? 0,
      repostsCount: post.reposts_count ?? 0,
      viewsCount: post.views_count ?? 0,
      isPinned: post.is_pinned ?? false,
      createdAt: post.created_at ?? new Date().toISOString(),
      replyToId: post.reply_to_id,
      repostOfId: post.repost_of_id,
      quoteContent: post.quote_content,
      author: {
        id: alt?.id ?? 0,
        username: alt?.username ?? "unknown",
        displayName: alt?.display_name ?? null,
        avatarUrl: alt?.avatar_url ?? null,
      },
      isLikedByMe: likedPostIds.has(post.id),
    };
  });

  const totalCount = count ?? 0;
  const nextCursor = offset + limit < totalCount ? offset + limit : null;

  return {
    posts,
    nextCursor,
    hasMore: nextCursor !== null,
  };
}
