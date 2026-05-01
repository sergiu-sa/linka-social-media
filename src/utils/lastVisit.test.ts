import { describe, it, expect, beforeEach } from 'vitest';
import {
  getLastVisit,
  setLastVisit,
  formatSinceLastVisit,
  LAST_VISIT_KEY,
} from './lastVisit';

describe('lastVisit', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('getLastVisit', () => {
    it('returns null when no visit has been recorded', () => {
      expect(getLastVisit()).toBeNull();
    });

    it('returns the stored timestamp as a number', () => {
      localStorage.setItem(LAST_VISIT_KEY, '1700000000000');
      expect(getLastVisit()).toBe(1700000000000);
    });

    it('returns null when stored value is not a number', () => {
      localStorage.setItem(LAST_VISIT_KEY, 'not-a-number');
      expect(getLastVisit()).toBeNull();
    });
  });

  describe('setLastVisit', () => {
    it('writes the current timestamp by default', () => {
      const before = Date.now();
      setLastVisit();
      const stored = Number(localStorage.getItem(LAST_VISIT_KEY));
      expect(stored).toBeGreaterThanOrEqual(before);
    });

    it('writes a specific timestamp when provided', () => {
      setLastVisit(1700000000000);
      expect(localStorage.getItem(LAST_VISIT_KEY)).toBe('1700000000000');
    });
  });

  describe('formatSinceLastVisit', () => {
    const NOW = 1700000000000;

    it('returns "since first visit" when last is null', () => {
      expect(formatSinceLastVisit(NOW, null)).toBe('since first visit');
    });

    it('returns "moments ago" for deltas under 1 minute', () => {
      expect(formatSinceLastVisit(NOW, NOW - 30 * 1000)).toBe('moments ago');
    });

    it('returns "Nm ago" for deltas under 1 hour', () => {
      expect(formatSinceLastVisit(NOW, NOW - 14 * 60 * 1000)).toBe('14m ago');
    });

    it('returns "Nh Mm ago" for deltas under 24 hours', () => {
      expect(formatSinceLastVisit(NOW, NOW - (2 * 3600 + 14 * 60) * 1000)).toBe('2h 14m ago');
    });

    it('returns "Nd ago" for deltas of 1+ days', () => {
      expect(formatSinceLastVisit(NOW, NOW - 3 * 86400 * 1000)).toBe('3d ago');
    });

    it('clamps negative deltas to "moments ago" (clock skew safety)', () => {
      expect(formatSinceLastVisit(NOW, NOW + 1000)).toBe('moments ago');
    });
  });
});
