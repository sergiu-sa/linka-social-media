/**
 * @file services/notifications/prefs.ts
 * @description User preferences for the notifications poller. Stored in
 *              localStorage so they survive sessions; consumed by the
 *              notifications service on every (re)start of the poll loop.
 */

import { getLocalItem, setLocalItem } from '../../utils/storage';

const KEY_ENABLED = 'notif:pref:enabled';
const KEY_INTERVAL = 'notif:pref:interval';
const KEY_DESKTOP = 'notif:pref:desktop';

export const NOTIF_INTERVAL_OPTIONS = [
  { value: 30_000, label: '30s' },
  { value: 60_000, label: '1m' },
  { value: 120_000, label: '2m' },
  { value: 0, label: 'Manual' },
] as const;

export interface NotificationPrefs {
  enabled: boolean;
  intervalMs: number; // 0 means manual-only (no interval)
  desktop: boolean;
}

const DEFAULTS: NotificationPrefs = {
  enabled: true,
  intervalMs: 120_000,
  desktop: false,
};

export function loadPrefs(): NotificationPrefs {
  const enabled = getLocalItem(KEY_ENABLED);
  const interval = getLocalItem(KEY_INTERVAL);
  const desktop = getLocalItem(KEY_DESKTOP);
  return {
    enabled: typeof enabled === 'boolean' ? enabled : DEFAULTS.enabled,
    intervalMs:
      typeof interval === 'number' && Number.isFinite(interval)
        ? interval
        : DEFAULTS.intervalMs,
    desktop: typeof desktop === 'boolean' ? desktop : DEFAULTS.desktop,
  };
}

export function savePrefs(patch: Partial<NotificationPrefs>): NotificationPrefs {
  const next = { ...loadPrefs(), ...patch };
  setLocalItem(KEY_ENABLED, next.enabled);
  setLocalItem(KEY_INTERVAL, next.intervalMs);
  setLocalItem(KEY_DESKTOP, next.desktop);
  return next;
}
