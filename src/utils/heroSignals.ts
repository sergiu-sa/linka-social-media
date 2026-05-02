/**
 * Pure-data layer for the feed hero. Computes the four pulse rows and
 * six arm labels from a page of NoroffPosts plus localStorage state.
 * No DOM, no network — keeps the hero component dumb and testable.
 */

import type { NoroffPost } from '../services/posts/posts';
import { formatSinceLastVisit } from './lastVisit';

const ONE_DAY_MS = 24 * 3600 * 1000;

export interface PulseRow {
  key: 'voices' | 'tag' | 'you' | 'since';
  label: string;
  value: string;
}

export interface PulseRows {
  voices: PulseRow;
  tag: PulseRow;
  you: PulseRow;
  since: PulseRow;
}

export interface ArmLabel {
  label: string;
  href?: string;
  scrollTarget?: string;
  action?: 'explode';
}

interface SignalContext {
  posts: NoroffPost[];
  me: string | null;
  now: number;
  lastVisit: number | null;
}

interface CommentLike {
  id: number;
  owner: string;
  created: string;
  replyToId?: number | null;
}

type PostWithComments = NoroffPost & { comments?: CommentLike[] };

export function getCurrentUsername(): string | null {
  const raw = localStorage.getItem('user');
  return raw && raw.length > 0 ? raw : null;
}

function tallyTags(posts: NoroffPost[]): Array<[string, number]> {
  const m = new Map<string, number>();
  for (const p of posts) {
    for (const t of p.tags || []) {
      if (!t) continue;
      m.set(t, (m.get(t) || 0) + 1);
    }
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

function activeAuthorsLast24h(posts: NoroffPost[], now: number): Set<string> {
  const cutoff = now - ONE_DAY_MS;
  const set = new Set<string>();
  for (const p of posts) {
    const t = new Date(p.created).getTime();
    if (Number.isFinite(t) && t >= cutoff) set.add(p.author.name);
  }
  return set;
}

function unreadComments(posts: NoroffPost[], me: string, lastVisit: number | null): number {
  if (lastVisit === null) return 0;
  let count = 0;
  for (const p of posts as PostWithComments[]) {
    if (p.author.name !== me) continue;
    for (const c of p.comments || []) {
      if (c.owner === me) continue;
      const t = new Date(c.created).getTime();
      if (Number.isFinite(t) && t > lastVisit) count++;
    }
  }
  return count;
}

function postsCreatedAfter(posts: NoroffPost[], cutoff: number): NoroffPost[] {
  return posts.filter((p) => {
    const t = new Date(p.created).getTime();
    return Number.isFinite(t) && t > cutoff;
  });
}

function userOwnLastPost(posts: NoroffPost[], me: string): NoroffPost | null {
  const own = posts.filter((p) => p.author.name === me);
  if (!own.length) return null;
  return own.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())[0];
}

function latestCommenterOnUserPosts(posts: NoroffPost[], me: string): string | null {
  const own = posts as PostWithComments[];
  let latest: { owner: string; t: number } | null = null;
  for (const p of own) {
    if (p.author.name !== me) continue;
    for (const c of p.comments || []) {
      if (c.owner === me) continue;
      const t = new Date(c.created).getTime();
      if (Number.isFinite(t) && (!latest || t > latest.t)) {
        latest = { owner: c.owner, t };
      }
    }
  }
  return latest?.owner ?? null;
}

function lastUserRepliedTo(posts: NoroffPost[], me: string): string | null {
  const all = posts as PostWithComments[];
  let latest: { who: string; t: number } | null = null;
  for (const p of all) {
    for (const c of p.comments || []) {
      if (c.owner !== me) continue;
      const t = new Date(c.created).getTime();
      if (!Number.isFinite(t)) continue;
      let who: string | null = null;
      if (c.replyToId != null) {
        const parent = (p.comments || []).find((x) => x.id === c.replyToId);
        who = parent?.owner ?? null;
      }
      who = who ?? p.author.name;
      if (who === me) continue;
      if (!latest || t > latest.t) latest = { who, t };
    }
  }
  return latest?.who ?? null;
}

export function computePulseRows(ctx: SignalContext): PulseRows {
  const { posts, me, now, lastVisit } = ctx;
  const tags = tallyTags(posts);
  const authors = activeAuthorsLast24h(posts, now);

  const voicesValue = `${authors.size} active · 24h`;
  const tagValue = tags.length ? `#${tags[0][0]} · ${tags[0][1]}` : '—';

  let youValue: string;
  if (me === null) {
    youValue = 'Public view';
  } else {
    const unread = unreadComments(posts, me, lastVisit);
    youValue = unread > 0 ? `${unread} unread` : 'keep posting';
  }

  const sinceValue = formatSinceLastVisit(now, lastVisit);

  return {
    voices: { key: 'voices', label: 'VOICES', value: voicesValue },
    tag: { key: 'tag', label: 'TAG', value: tagValue },
    you: { key: 'you', label: 'YOU', value: youValue },
    since: { key: 'since', label: 'SINCE', value: sinceValue },
  };
}

export function computeArmLabels(ctx: SignalContext): ArmLabel[] {
  const { posts, me, now, lastVisit } = ctx;
  const arms: ArmLabel[] = new Array(6);
  const tags = tallyTags(posts);

  /* ----- Arm 0: top tag ----- */
  if (tags.length) {
    arms[0] = { label: `#${tags[0][0]} · ${tags[0][1]}`, href: `/feed?tag=${encodeURIComponent(tags[0][0])}` };
  } else {
    arms[0] = { label: 'no tags yet' };
  }

  /* ----- Arm 1: latest commenter on your posts ----- */
  const commenter = me ? latestCommenterOnUserPosts(posts, me) : null;
  arms[1] = commenter
    ? { label: `@${commenter}`, href: `/profile?user=${encodeURIComponent(commenter)}` }
    : { label: 'no replies yet' };

  /* ----- Arm 2: last user you replied to ----- */
  const repliedTo = me ? lastUserRepliedTo(posts, me) : null;
  arms[2] = repliedTo
    ? { label: `@${repliedTo}`, href: `/profile?user=${encodeURIComponent(repliedTo)}` }
    : { label: 'no threads yet' };

  /* ----- Arm 3: your last post ----- */
  if (me) {
    const own = userOwnLastPost(posts, me);
    if (own) {
      const ago = formatSinceLastVisit(now, new Date(own.created).getTime());
      arms[3] = { label: `you · ${ago}`, scrollTarget: `#post-${own.id}` };
    } else {
      arms[3] = { label: 'you · welcome' };
    }
  } else {
    arms[3] = { label: 'you · sign in' };
  }

  /* ----- Arm 4: reactions received (heuristic: total reactions on your posts) ----- */
  if (me && lastVisit !== null) {
    const own = posts.filter((p) => p.author.name === me);
    const total = own.reduce((acc, p) => acc + (p._count?.reactions || 0), 0);
    arms[4] = total > 0
      ? { label: `+${total} hearts`, action: 'explode' }
      : { label: 'no hearts yet', action: 'explode' };
  } else {
    arms[4] = { label: 'hearts await', action: 'explode' };
  }

  /* ----- Arm 5: new posts since last visit ----- */
  if (lastVisit !== null) {
    const fresh = postsCreatedAfter(posts, lastVisit);
    if (fresh.length > 0) {
      const ago = formatSinceLastVisit(now, lastVisit);
      arms[5] = {
        label: `+${fresh.length} since ${ago}`,
        scrollTarget: fresh[0] ? `#post-${fresh[0].id}` : undefined,
      };
    } else {
      arms[5] = { label: 'all caught up' };
    }
  } else {
    arms[5] = { label: 'first visit' };
  }

  return arms;
}
