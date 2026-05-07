/**
 * @file services/profile/profile.ts
 * @description Update the current user's profile (bio / avatar / banner)
 *              via Noroff Social v2. Username and email are not updatable.
 */

import { put } from '../api/client';
import type { UserProfile } from '../../types/index';

export interface ProfileUpdatePayload {
  bio?: string;
  avatar?: { url: string; alt: string };
  banner?: { url: string; alt: string };
}

export async function updateProfile(
  name: string,
  payload: ProfileUpdatePayload
): Promise<UserProfile> {
  const response = (await put(
    `/social/profiles/${encodeURIComponent(name)}`,
    payload
  )) as { data: UserProfile };
  return response.data;
}
