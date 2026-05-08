/**
 * @file services/posts/posts.ts
 * @description Posts service. CRUD against the Noroff Social v2 API plus
 *              the `getPostComments` helper used by the feed thread.
 */

import { get, post, put, del } from "../api/client";
import { error as logError } from "../../utils/log";
import { getLocalItem } from "../../utils/storage";

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
  comments?: NoroffComment[];
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
  // `?_author=true` makes Noroff include the author block in the response.
  // Without it, the new post comes back with no `author.name` and the
  // post-card falls back to "Unknown" until the next full feed reload.
  const response = await post(`${BASE_URL}?_author=true`, {
    ...payload,
    tags: payload.tags && payload.tags.length > 0 ? payload.tags : [],
  });

  const newPost = (response as any).data || response;
  const localUser = (getLocalItem("user") as string) || "";

  // Normalise: the create endpoint occasionally omits collections + the
  // author block; fall back to the locally-stored username so the card
  // never renders as "Unknown" right after the user posted.
  return {
    ...newPost,
    tags: newPost.tags || [],
    _count: newPost._count || { comments: 0, reactions: 0 },
    reactions: newPost.reactions || [],
    author: {
      name: newPost.author?.name || localUser || "Unknown",
      email: newPost.author?.email || "",
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
