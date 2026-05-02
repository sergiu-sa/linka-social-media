/**
 * Tracks "last visit" timestamps in localStorage so the feed hero can
 * surface fresh-since-last-visit signals (the SINCE pulse row and arm 5).
 */

export const LAST_VISIT_KEY = 'linka:lastVisit';

export function getLastVisit(): number | null {
  const raw = localStorage.getItem(LAST_VISIT_KEY);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function setLastVisit(ts: number = Date.now()): void {
  localStorage.setItem(LAST_VISIT_KEY, String(ts));
}

export function formatSinceLastVisit(now: number, last: number | null): string {
  if (last === null) return 'since first visit';
  const delta = Math.max(0, now - last);
  const seconds = Math.floor(delta / 1000);
  if (seconds < 60) return 'moments ago';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const remMinutes = minutes - hours * 60;
    return `${hours}h ${remMinutes}m ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
