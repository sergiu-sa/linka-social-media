/**
 * @file auth.ts
 * @description Authentication and current-user accessors backed by localStorage.
 */

import { getLocalItem } from './storage';

/** True when an access token is present in localStorage. */
export function isLoggedIn(): boolean {
  return !!getLocalItem('accessToken');
}

/** Read the stored username, or null if no user is logged in. */
export function getCurrentUsername(): string | null {
  const raw = localStorage.getItem('user');
  return raw && raw.length > 0 ? raw : null;
}

/** Clear all authentication data. */
export function logout(): void {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('user');
  localStorage.removeItem('apiKey');
}
