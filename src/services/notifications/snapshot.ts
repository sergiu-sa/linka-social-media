/**
 * @file services/notifications/snapshot.ts
 * @description Persistent baseline of "last seen" reaction + comment counts
 *              per post. The notifications service diffs the live API counts
 *              against this snapshot to figure out what's new.
 */

import { getLocalItem, setLocalItem } from '../../utils/storage';

const SNAPSHOT_KEY = 'notif:snapshot';
const BOOTSTRAP_KEY = 'notif:bootstrapped';

export type Snapshot = Record<number, { reactions: number; comments: number }>;

export function loadSnapshot(): Snapshot {
  const raw = getLocalItem(SNAPSHOT_KEY);
  if (!raw || typeof raw !== 'object') return {};
  return raw as Snapshot;
}

export function saveSnapshot(snapshot: Snapshot): void {
  setLocalItem(SNAPSHOT_KEY, snapshot);
}

export function isBootstrapped(): boolean {
  const v = getLocalItem(BOOTSTRAP_KEY);
  return v === true || v === 'true';
}

export function setBootstrapped(): void {
  setLocalItem(BOOTSTRAP_KEY, true);
}

/** Wipes the local notification baseline. Called on logout. */
export function clearSnapshot(): void {
  localStorage.removeItem(SNAPSHOT_KEY);
  localStorage.removeItem(BOOTSTRAP_KEY);
}
