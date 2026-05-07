/**
 * @file services/follow/follow.ts
 * @description Shared follow / unfollow service. Used by FeedPage (per-post
 *              chip) and ProfilePage (header CTA) so the API plumbing lives
 *              in one place.
 */

import { get, put } from '../api/client';
import type { FollowResponse, ProfileWithFollowData } from '../../types/index';

// Noroff requires an empty body on follow/unfollow — sending `{}` with
// Content-Type: application/json gets rejected with a generic
// "Something went wrong" error. Pass no body so apiClient skips the
// Content-Type header entirely.
export function followUser(username: string): Promise<FollowResponse> {
  return put(
    `/social/profiles/${encodeURIComponent(username)}/follow`
  ) as Promise<FollowResponse>;
}

export function unfollowUser(username: string): Promise<FollowResponse> {
  return put(
    `/social/profiles/${encodeURIComponent(username)}/unfollow`
  ) as Promise<FollowResponse>;
}

/**
 * Names of every profile `currentUsername` follows. Returns an empty Set on
 * error so callers can render the default "follow" state instead of crashing
 * the page.
 */
export async function fetchFollowingSet(
  currentUsername: string
): Promise<Set<string>> {
  if (!currentUsername) return new Set();
  try {
    const response = await get<{ data: ProfileWithFollowData }>(
      `/social/profiles/${encodeURIComponent(currentUsername)}?_following=true`
    );
    const list = response.data.following ?? [];
    return new Set(list.map((u) => u.name));
  } catch {
    return new Set();
  }
}
