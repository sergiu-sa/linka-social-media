/**
 * @file date.ts
 * @description Utility functions for date formatting.
 */

/**
 * Converts a date to a human-readable relative time string.
 * @param date - The date to convert
 * @returns A string like "Just now", "5m ago", "2h ago", "3d ago", "1w ago", or formatted date
 */
export function getTimeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  if (diff < 2592000) return `${Math.floor(diff / 604800)}w ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
