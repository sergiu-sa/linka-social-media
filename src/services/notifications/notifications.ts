/**
 * @file services/notifications/notifications.ts
 * @description Polling-based notifications. Noroff API has no push channel,
 *              so we periodically fetch the current user's posts and diff
 *              reaction + comment counts against a localStorage baseline.
 *
 *              Single shared poller; subscribers receive the current set of
 *              NotificationItems via `subscribe()`. Pauses while the tab is
 *              hidden and resumes (with an immediate check) on focus.
 */

import { get } from '../api/client';
import type { NoroffPost } from '../posts/posts';
import {
  loadSnapshot,
  saveSnapshot,
  isBootstrapped,
  setBootstrapped,
  clearSnapshot,
  type Snapshot,
} from './snapshot';
import { getLocalItem } from '../../utils/storage';
import { error as logError } from '../../utils/log';

export type NotificationItem = {
  postId: number;
  postTitle: string;
  reactionDelta: number;
  commentDelta: number;
  reactionsFresh: number;
  commentsFresh: number;
  latestAt: string;
};

const POLL_INTERVAL_MS = 120_000;
const TITLE_TRUNC = 50;

type Listener = (items: NotificationItem[]) => void;
const listeners = new Set<Listener>();

let intervalId: number | null = null;
let visibilityHandler: (() => void) | null = null;
let lastItems: NotificationItem[] = [];

function getCurrentUsername(): string | null {
  const u = getLocalItem('user');
  return typeof u === 'string' && u.trim() ? u.trim() : null;
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.substring(0, n) + '…' : s;
}

function totalReactions(post: NoroffPost): number {
  return (post.reactions ?? []).reduce((sum, r) => sum + r.count, 0);
}

async function fetchMyPosts(username: string): Promise<NoroffPost[]> {
  try {
    const response = await get<{ data: NoroffPost[] }>(
      `/social/profiles/${encodeURIComponent(username)}/posts?_reactions=true&_comments=true&limit=100`
    );
    return response.data ?? [];
  } catch (err) {
    logError('notifications: fetchMyPosts failed', err);
    return [];
  }
}

function snapshotFromPosts(posts: NoroffPost[]): Snapshot {
  const out: Snapshot = {};
  for (const post of posts) {
    out[post.id] = {
      reactions: totalReactions(post),
      comments: post._count.comments,
    };
  }
  return out;
}

function diff(prev: Snapshot, posts: NoroffPost[]): NotificationItem[] {
  const items: NotificationItem[] = [];
  for (const post of posts) {
    const reactionsFresh = totalReactions(post);
    const commentsFresh = post._count.comments;
    const baseline = prev[post.id];
    if (!baseline) continue; // freshly seen post — captured into snapshot, no notification
    const rDelta = reactionsFresh - baseline.reactions;
    const cDelta = commentsFresh - baseline.comments;
    if (rDelta <= 0 && cDelta <= 0) continue;

    const newest = (post.comments ?? [])
      .slice()
      .sort((a, b) => +new Date(b.created) - +new Date(a.created))[0];
    const latestAt =
      newest?.created ?? post.updated ?? post.created ?? new Date().toISOString();

    items.push({
      postId: post.id,
      postTitle: truncate(post.title || '(untitled post)', TITLE_TRUNC),
      reactionDelta: Math.max(0, rDelta),
      commentDelta: Math.max(0, cDelta),
      reactionsFresh,
      commentsFresh,
      latestAt,
    });
  }
  items.sort((a, b) => +new Date(b.latestAt) - +new Date(a.latestAt));
  return items;
}

function publish(): void {
  for (const l of listeners) {
    try {
      l(lastItems);
    } catch (err) {
      logError('notifications: listener threw', err);
    }
  }
}

export async function checkForNotifications(): Promise<NotificationItem[]> {
  const username = getCurrentUsername();
  if (!username) {
    lastItems = [];
    publish();
    return [];
  }

  const posts = await fetchMyPosts(username);

  // First-ever run after login: silently capture the current counts as the
  // baseline. Otherwise the user would log in and immediately see "+47 likes".
  if (!isBootstrapped()) {
    saveSnapshot(snapshotFromPosts(posts));
    setBootstrapped();
    lastItems = [];
    publish();
    return [];
  }

  const prev = loadSnapshot();
  const items = diff(prev, posts);

  // Make sure brand-new posts (created since the last check) are merged into
  // the snapshot at their current counts so they don't suddenly appear as
  // "+N likes" later when something changes.
  const merged: Snapshot = { ...prev };
  for (const post of posts) {
    if (!merged[post.id]) {
      merged[post.id] = {
        reactions: totalReactions(post),
        comments: post._count.comments,
      };
    }
  }
  saveSnapshot(merged);

  lastItems = items;
  publish();
  return items;
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  try {
    listener(lastItems);
  } catch {
    /* swallow — first-publish failure shouldn't unsub the caller */
  }
  return () => {
    listeners.delete(listener);
  };
}

export function getCurrentItems(): NotificationItem[] {
  return lastItems;
}

export function markRead(postId: number): void {
  const item = lastItems.find((i) => i.postId === postId);
  if (item) {
    const snap = loadSnapshot();
    snap[postId] = {
      reactions: item.reactionsFresh,
      comments: item.commentsFresh,
    };
    saveSnapshot(snap);
  }
  lastItems = lastItems.filter((i) => i.postId !== postId);
  publish();
}

export function markAllRead(): void {
  const snap = loadSnapshot();
  for (const item of lastItems) {
    snap[item.postId] = {
      reactions: item.reactionsFresh,
      comments: item.commentsFresh,
    };
  }
  saveSnapshot(snap);
  lastItems = [];
  publish();
}

export function startPolling(): void {
  if (intervalId !== null) return;
  void checkForNotifications();

  intervalId = window.setInterval(() => {
    if (document.visibilityState === 'visible') {
      void checkForNotifications();
    }
  }, POLL_INTERVAL_MS);

  visibilityHandler = () => {
    if (document.visibilityState === 'visible') {
      void checkForNotifications();
    }
  };
  document.addEventListener('visibilitychange', visibilityHandler);
}

export function stopPolling(opts: { clear?: boolean } = {}): void {
  if (intervalId !== null) {
    window.clearInterval(intervalId);
    intervalId = null;
  }
  if (visibilityHandler) {
    document.removeEventListener('visibilitychange', visibilityHandler);
    visibilityHandler = null;
  }
  lastItems = [];
  if (opts.clear) clearSnapshot();
  publish();
}
