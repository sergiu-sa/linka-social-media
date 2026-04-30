/**
 * @file services/posts/posts.ts
 * @description Posts service. CRUD against the Noroff Social v2 API plus
 *              the `getPostComments` helper used by the feed thread.
 */

import { get, post, put, del } from "../api/client";
import { error as logError } from "../../utils/log";

export interface NoroffPost {
  id: number;
  title: string;
  body: string;
  tags: string[];
  media?: {
    url: string;
    alt: string;
  };
  created: string;
  updated: string;
  author: {
    name: string;
    email: string;
    bio?: string;
    avatar?: {
      url: string;
      alt: string;
    };
  };
  _count: {
    comments: number;
    reactions: number;
  };
  reactions?: Array<{
    symbol: string;
    count: number;
  }>;
}

export interface PostsApiResponse {
  data: NoroffPost[];
  meta: {
    isFirstPage: boolean;
    isLastPage: boolean;
    currentPage: number;
    previousPage: number | null;
    nextPage: number | null;
    pageCount: number;
    totalCount: number;
  };
}

const BASE_URL = "/social/posts";

/* -------------------------------------- Read -------------------------------------- */

export async function getAllPosts(
  limit: number = 50,
  page: number = 1
): Promise<PostsApiResponse> {
  try {
    const queryParams = new URLSearchParams({
      limit: limit.toString(),
      page: page.toString(),
      _author: "true",
      _reactions: "true",
      _comments: "true",
    });

    return await get<PostsApiResponse>(`${BASE_URL}?${queryParams.toString()}`);
  } catch (err) {
    logError("Error fetching posts:", err);
    throw err;
  }
}

/** Public-view fallback used when the user is not logged in. */
export async function getPublicPosts(
  limit: number = 50,
  page: number = 1
): Promise<PostsApiResponse> {
  return getSamplePosts(limit, page);
}

export interface NoroffComment {
  id: number;
  body: string;
  replyToId: number | null;
  postId: number;
  owner: string;
  created: string;
  author?: {
    name: string;
    email: string;
    avatar?: { url: string; alt: string } | null;
  };
}

/** Fetch a post with its comments embedded (used by the feed thread). */
export async function getPostComments(
  postId: number
): Promise<NoroffComment[]> {
  try {
    const response = await get<{
      data: NoroffPost & { comments?: NoroffComment[] };
    }>(`${BASE_URL}/${postId}?_comments=true&_author=true`);
    return response.data?.comments ?? [];
  } catch (err) {
    logError("Error fetching comments:", err);
    return [];
  }
}

/* -------------------------------------- Write -------------------------------------- */

export async function createPost(payload: {
  title: string;
  body: string;
  tags?: string[];
  media?: { url: string; alt?: string };
}): Promise<NoroffPost> {
  const response = await post(BASE_URL, {
    ...payload,
    tags: payload.tags && payload.tags.length > 0 ? payload.tags : [],
  });

  const newPost = (response as any).data || response;

  // Normalise: the create endpoint occasionally omits collections that the
  // post-card renderer expects. Without these defaults the new card crashes.
  return {
    ...newPost,
    tags: newPost.tags || [],
    _count: newPost._count || { comments: 0, reactions: 0 },
    reactions: newPost.reactions || [],
    author: {
      ...newPost.author,
      avatar: newPost.author?.avatar || { url: "", alt: "" },
    },
  };
}

export async function updatePost(
  postId: number,
  payload: {
    title?: string;
    body?: string;
    tags?: string[];
    media?: { url: string; alt?: string };
  }
): Promise<NoroffPost> {
  const response = await put(`${BASE_URL}/${postId}`, payload);
  return (response as any).data || response;
}

export async function deletePost(postId: number): Promise<void> {
  return del(`${BASE_URL}/${postId}`);
}

/* -------------------------------------- Sample data (public view) -------------------------------------- */

function getSamplePosts(limit: number, page: number): PostsApiResponse {
  const samplePosts: NoroffPost[] = [
    {
      id: 1,
      title: "Welcome to Social Platform",
      body: "Explore and connect with people around the world. Share your thoughts, experiences, and discover new content every day.",
      tags: ["welcome", "social", "community"],
      media: {
        url: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f",
        alt: "People connecting",
      },
      created: new Date(Date.now() - 86400000).toISOString(),
      updated: new Date(Date.now() - 86400000).toISOString(),
      author: {
        name: "social_admin",
        email: "admin@social.com",
        bio: "Official Social Platform Account",
        avatar: {
          url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e",
          alt: "Admin avatar",
        },
      },
      _count: {
        comments: 12,
        reactions: 45,
      },
      reactions: [
        { symbol: "👍", count: 28 },
        { symbol: "❤️", count: 17 },
      ],
    },
  ];

  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedPosts = samplePosts.slice(startIndex, endIndex);

  return {
    data: paginatedPosts,
    meta: {
      currentPage: page,
      pageCount: Math.ceil(samplePosts.length / limit),
      totalCount: samplePosts.length,
      isFirstPage: page === 1,
      isLastPage: page >= Math.ceil(samplePosts.length / limit),
      previousPage: page > 1 ? page - 1 : null,
      nextPage: page < Math.ceil(samplePosts.length / limit) ? page + 1 : null,
    },
  };
}
