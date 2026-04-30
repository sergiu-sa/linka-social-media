import { afterEach, describe, expect, it } from 'vitest';
import { getLocalItem, setLocalItem } from './storage';

describe('storage helpers', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('stores strings as-is and reads them back', () => {
    setLocalItem('greeting', 'hello');
    expect(getLocalItem('greeting')).toBe('hello');
    // Not double-encoded as JSON.
    expect(localStorage.getItem('greeting')).toBe('hello');
  });

  it('round-trips JSON-serialisable objects', () => {
    const payload = { id: 1, tags: ['a', 'b'], nested: { active: true } };
    setLocalItem('post', payload);
    expect(getLocalItem('post')).toEqual(payload);
  });

  it('returns null for missing keys', () => {
    expect(getLocalItem('nope')).toBeNull();
  });

  it('returns the raw string when the stored value is not valid JSON', () => {
    // Simulates a value written by other code paths in the app
    // (e.g. the auth handler storing the access token directly).
    localStorage.setItem('accessToken', 'eyJhbGciOi.NotJsonAfterTheDot');
    expect(getLocalItem('accessToken')).toBe('eyJhbGciOi.NotJsonAfterTheDot');
  });
});
