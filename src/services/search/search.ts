/**
 * @file services/search/search.ts
 * @description Wraps Noroff's two server-side search endpoints. The previous
 *              in-memory filter only saw page 1, which is why the navbar
 *              search rarely returned anything. This hits the real endpoints
 *              in parallel and returns posts + profiles separately.
 */

import { get } from '../api/client';
import type { NoroffPost } from '../posts/posts';
import { error as logError } from '../../utils/log';

export interface SearchProfile {
  name: string;
  email: string;
  bio?: string;
  avatar?: { url: string; alt: string } | null;
  banner?: { url: string; alt: string } | null;
  _count?: { posts: number; followers: number; following: number };
}

export interface SearchResults {
  posts: NoroffPost[];
  profiles: SearchProfile[];
}

const POSTS_INCLUDES = '_author=true&_reactions=true&_comments=true';

export async function search(query: string): Promise<SearchResults> {
  const trimmed = query.trim();
  if (!trimmed) return { posts: [], profiles: [] };
  const q = encodeURIComponent(trimmed);

  const [postsResult, profilesResult] = await Promise.allSettled([
    get<{ data: NoroffPost[] }>(`/social/posts/search?q=${q}&${POSTS_INCLUDES}`),
    get<{ data: SearchProfile[] }>(`/social/profiles/search?q=${q}`),
  ]);

  let posts: NoroffPost[] = [];
  let profiles: SearchProfile[] = [];

  if (postsResult.status === 'fulfilled') {
    posts = postsResult.value.data ?? [];
  } else {
    logError('search: posts endpoint failed', postsResult.reason);
  }
  if (profilesResult.status === 'fulfilled') {
    profiles = profilesResult.value.data ?? [];
  } else {
    logError('search: profiles endpoint failed', profilesResult.reason);
  }

  return { posts, profiles };
}
