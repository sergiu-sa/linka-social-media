import { describe, it, expect, beforeEach } from 'vitest';
import { getCurrentUsername, isLoggedIn } from './auth';

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

describe('isLoggedIn', () => {
  beforeEach(() => localStorage.clear());

  it('is false when no accessToken is stored', () => {
    expect(isLoggedIn()).toBe(false);
  });

  it('is true when an accessToken is stored', () => {
    localStorage.setItem('accessToken', 'jwt');
    expect(isLoggedIn()).toBe(true);
  });
});
