import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getTimeAgo } from './date';

const NOW = new Date('2026-04-29T12:00:00Z').getTime();

describe('getTimeAgo', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "Just now" for timestamps under a minute old', () => {
    expect(getTimeAgo(new Date(NOW - 0))).toBe('Just now');
    expect(getTimeAgo(new Date(NOW - 30_000))).toBe('Just now');
    expect(getTimeAgo(new Date(NOW - 59_999))).toBe('Just now');
  });

  it('formats minutes-old timestamps as "Xm ago"', () => {
    expect(getTimeAgo(new Date(NOW - 60_000))).toBe('1m ago');
    expect(getTimeAgo(new Date(NOW - 5 * 60_000))).toBe('5m ago');
    expect(getTimeAgo(new Date(NOW - 59 * 60_000))).toBe('59m ago');
  });

  it('formats hour-old timestamps as "Xh ago"', () => {
    expect(getTimeAgo(new Date(NOW - 60 * 60_000))).toBe('1h ago');
    expect(getTimeAgo(new Date(NOW - 23 * 60 * 60_000))).toBe('23h ago');
  });

  it('formats day-old timestamps as "Xd ago"', () => {
    expect(getTimeAgo(new Date(NOW - 24 * 60 * 60_000))).toBe('1d ago');
    expect(getTimeAgo(new Date(NOW - 6 * 24 * 60 * 60_000))).toBe('6d ago');
  });

  it('formats week-old timestamps as "Xw ago"', () => {
    expect(getTimeAgo(new Date(NOW - 7 * 24 * 60 * 60_000))).toBe('1w ago');
    expect(getTimeAgo(new Date(NOW - 29 * 24 * 60 * 60_000))).toBe('4w ago');
  });

  it('falls back to a localised date for timestamps older than ~30 days', () => {
    const old = new Date(NOW - 60 * 24 * 60 * 60_000); // ~2 months back
    const out = getTimeAgo(old);
    // Don't pin the exact locale string (CI locales differ); just check shape.
    expect(out).toMatch(/\d{1,2}/);
    expect(out).toMatch(/2026|Feb|Mar/);
  });
});
