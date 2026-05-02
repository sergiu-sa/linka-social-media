import { describe, it, expect, beforeEach } from 'vitest';
import type { NoroffPost } from '../services/posts/posts';
import {
  computePulseRows,
  computeArmLabels,
  getCurrentUsername,
} from './heroSignals';

const HOUR = 3600 * 1000;
const NOW = 1700000000000;

function mkPost(overrides: Partial<NoroffPost>): NoroffPost {
  return {
    id: 1,
    title: 't',
    body: 'b',
    tags: [],
    created: new Date(NOW - HOUR).toISOString(),
    updated: new Date(NOW - HOUR).toISOString(),
    author: { name: 'someone', email: 's@e.com' },
    _count: { comments: 0, reactions: 0 },
    reactions: [],
    ...overrides,
  } as NoroffPost;
}

describe('getCurrentUsername', () => {
  beforeEach(() => localStorage.clear());

  it('returns null when no user stored', () => {
    expect(getCurrentUsername()).toBeNull();
  });

  it('returns the stored user when present', () => {
    localStorage.setItem('user', 'sergiu');
    expect(getCurrentUsername()).toBe('sergiu');
  });
});

describe('computePulseRows', () => {
  it('counts unique authors active in last 24h for VOICES', () => {
    const posts = [
      mkPost({ id: 1, author: { name: 'a', email: 'a@e' }, created: new Date(NOW - 1 * HOUR).toISOString() }),
      mkPost({ id: 2, author: { name: 'b', email: 'b@e' }, created: new Date(NOW - 2 * HOUR).toISOString() }),
      mkPost({ id: 3, author: { name: 'a', email: 'a@e' }, created: new Date(NOW - 3 * HOUR).toISOString() }),
      mkPost({ id: 4, author: { name: 'old', email: 'o@e' }, created: new Date(NOW - 48 * HOUR).toISOString() }),
    ];
    const rows = computePulseRows({ posts, me: 'sergiu', now: NOW, lastVisit: NOW - 5 * HOUR });
    expect(rows.voices.value).toBe('2 active · 24h');
  });

  it('returns top tag with count for TAG row', () => {
    const posts = [
      mkPost({ id: 1, tags: ['design', 'type'] }),
      mkPost({ id: 2, tags: ['design', 'news'] }),
      mkPost({ id: 3, tags: ['design'] }),
      mkPost({ id: 4, tags: ['type'] }),
    ];
    const rows = computePulseRows({ posts, me: null, now: NOW, lastVisit: null });
    expect(rows.tag.value).toBe('#design · 3');
  });

  it('returns "—" for TAG when no posts have tags', () => {
    const posts = [mkPost({ id: 1, tags: [] })];
    const rows = computePulseRows({ posts, me: null, now: NOW, lastVisit: null });
    expect(rows.tag.value).toBe('—');
  });

  it('returns Public view for YOU when me is null', () => {
    const rows = computePulseRows({ posts: [], me: null, now: NOW, lastVisit: null });
    expect(rows.you.value).toBe('Public view');
  });

  it('counts unread comments on the user own posts since lastVisit', () => {
    const posts = [
      mkPost({
        id: 1,
        author: { name: 'sergiu', email: 's@e' },
        // @ts-expect-error - extending NoroffPost with comments at runtime
        comments: [
          { id: 10, body: 'c', owner: 'a', created: new Date(NOW - 1 * HOUR).toISOString(), postId: 1, replyToId: null },
          { id: 11, body: 'c', owner: 'b', created: new Date(NOW - 8 * HOUR).toISOString(), postId: 1, replyToId: null },
          { id: 12, body: 'c', owner: 'sergiu', created: new Date(NOW - 30 * 60 * 1000).toISOString(), postId: 1, replyToId: null }, // self — excluded
        ],
      }),
    ];
    const rows = computePulseRows({ posts, me: 'sergiu', now: NOW, lastVisit: NOW - 5 * HOUR });
    expect(rows.you.value).toBe('1 unread');
  });

  it('returns "keep posting" for YOU when user has posts but no comments since lastVisit', () => {
    const posts = [mkPost({ author: { name: 'sergiu', email: 's@e' } })];
    const rows = computePulseRows({ posts, me: 'sergiu', now: NOW, lastVisit: NOW - 1 * HOUR });
    expect(rows.you.value).toBe('keep posting');
  });

  it('formats SINCE row from lastVisit', () => {
    const rows = computePulseRows({ posts: [], me: 'sergiu', now: NOW, lastVisit: NOW - (2 * 3600 + 14 * 60) * 1000 });
    expect(rows.since.value).toBe('2h 14m ago');
  });

  it('formats SINCE row as "since first visit" when lastVisit is null', () => {
    const rows = computePulseRows({ posts: [], me: 'sergiu', now: NOW, lastVisit: null });
    expect(rows.since.value).toBe('since first visit');
  });
});

describe('computeArmLabels', () => {
  it('returns 6 labels in fixed order', () => {
    const arms = computeArmLabels({ posts: [], me: 'sergiu', now: NOW, lastVisit: null });
    expect(arms).toHaveLength(6);
  });

  it('arm 0 is the top tag with count', () => {
    const posts = [mkPost({ tags: ['design'] }), mkPost({ tags: ['design', 'type'] })];
    const arms = computeArmLabels({ posts, me: 'sergiu', now: NOW, lastVisit: null });
    expect(arms[0].label).toBe('#design · 2');
    expect(arms[0].href).toBe('/feed?tag=design');
  });

  it('arm 0 falls back to "no tags yet" when posts have no tags', () => {
    const arms = computeArmLabels({ posts: [mkPost({ tags: [] })], me: 'sergiu', now: NOW, lastVisit: null });
    expect(arms[0].label).toBe('no tags yet');
    expect(arms[0].href).toBeUndefined();
  });

  it('arm 3 is the user own latest post timestamp', () => {
    const posts = [
      mkPost({ id: 1, author: { name: 'sergiu', email: 's@e' }, created: new Date(NOW - 14 * 60 * 1000).toISOString() }),
      mkPost({ id: 2, author: { name: 'other', email: 'o@e' } }),
    ];
    const arms = computeArmLabels({ posts, me: 'sergiu', now: NOW, lastVisit: null });
    expect(arms[3].label).toBe('you · 14m ago');
    expect(arms[3].scrollTarget).toBe('#post-1');
  });

  it('arm 3 falls back when user has no posts', () => {
    const arms = computeArmLabels({ posts: [mkPost({ author: { name: 'other', email: 'o@e' } })], me: 'sergiu', now: NOW, lastVisit: null });
    expect(arms[3].label).toBe('you · welcome');
  });

  it('arm 5 reports +N since lastVisit when there are new posts', () => {
    const posts = [
      mkPost({ id: 1, created: new Date(NOW - 30 * 60 * 1000).toISOString() }),
      mkPost({ id: 2, created: new Date(NOW - 90 * 60 * 1000).toISOString() }),
      mkPost({ id: 3, created: new Date(NOW - 5 * HOUR).toISOString() }),
    ];
    const arms = computeArmLabels({ posts, me: 'sergiu', now: NOW, lastVisit: NOW - 2 * HOUR });
    expect(arms[5].label).toBe('+2 since 2h 0m ago');
  });

  it('no arm is ever blank — every label is a non-empty string', () => {
    const arms = computeArmLabels({ posts: [], me: null, now: NOW, lastVisit: null });
    for (const arm of arms) {
      expect(arm.label).toBeTruthy();
      expect(arm.label.length).toBeGreaterThan(0);
    }
  });
});
