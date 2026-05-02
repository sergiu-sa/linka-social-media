/**
 * Feed hero — Constellation Console.
 * Renders above the composer on /feed. Pairs:
 *   - LEFT  pulse column (live data: voices, top tag, your unread, since)
 *   - RIGHT graph panel hosting the hero-mode threeStar
 *   - BOTTOM compose rail that triggers the existing composer card below
 *
 * Spec: docs/superpowers/specs/2026-05-01-feed-hero-design.md
 */

import { mountThreeStar, type ThreeStarHandle } from './threeStar';
import { computePulseRows, computeArmLabels, getCurrentUsername, type ArmLabel } from '../utils/heroSignals';
import { getLastVisit, setLastVisit } from '../utils/lastVisit';
import type { NoroffPost } from '../services/posts/posts';
import { getLocalItem } from '../utils/storage';

export interface FeedHeroData {
  posts: NoroffPost[];
  meta: { currentPage: number; pageCount: number; totalCount: number };
  isUserLoggedIn: boolean;
  userInitial: string;
  searchQuery?: string;
}

export interface FeedHeroHandle {
  dispose(): void;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function eyebrowText(data: FeedHeroData, voicesCount: number): string {
  if (data.searchQuery) {
    return `SEARCH · "${escapeHtml(data.searchQuery)}" · ${data.meta.totalCount} RESULTS`;
  }
  if (voicesCount === 0) return 'QUIET TONIGHT · BE THE FIRST';
  return `LIVE · ${voicesCount} LINKS TONIGHT`;
}

function titleText(data: FeedHeroData): string {
  return data.isUserLoggedIn ? 'YOUR<br>FEED<span class="acc">.</span>' : 'LINKA<br>FEED<span class="acc">.</span>';
}

function composeRailContent(data: FeedHeroData): { placeholder: string; ctaLabel: string } {
  if (!data.isUserLoggedIn) return { placeholder: 'sign in to add your voice', ctaLabel: 'SIGN IN →' };
  if (data.meta.totalCount === 0) return { placeholder: 'start the first link…', ctaLabel: 'POST →' };
  return { placeholder: 'say something — links you to others tonight…', ctaLabel: 'POST →' };
}

export function feedHeroMarkup(data: FeedHeroData): string {
  const me = data.isUserLoggedIn ? getCurrentUsername() : null;
  const lastVisit = getLastVisit();
  const now = Date.now();
  const rows = computePulseRows({ posts: data.posts, me, now, lastVisit });
  const arms = computeArmLabels({ posts: data.posts, me, now, lastVisit });

  /* Voices count for the eyebrow — re-derived from the pulse row's value */
  const voicesMatch = rows.voices.value.match(/^(\d+)/);
  const voicesCount = voicesMatch ? Number(voicesMatch[1]) : 0;

  const compose = composeRailContent(data);

  /* a11y summary used by the graph panel's aria-label */
  const a11ySummary = [
    `Live network — ${voicesCount} ${voicesCount === 1 ? 'voice' : 'voices'} linked tonight`,
    `top tag ${rows.tag.value}`,
    `${rows.you.value} for you`,
  ].join(', ');

  return `
    <header class="feed-hero" aria-label="Feed overview">
      <div class="feed-hero-bg" aria-hidden="true"></div>
      <div class="feed-hero-grid">
        <div class="feed-hero-meta">
          <p class="feed-hero-eyebrow">
            <span class="feed-hero-eyebrow-dot" aria-hidden="true"></span>
            ${eyebrowText(data, voicesCount)}
            ${data.searchQuery ? '<a href="#" class="feed-hero-eyebrow-clear" data-action="clear-search">clear</a>' : ''}
          </p>
          <h1 class="feed-hero-title">${titleText(data)}</h1>
          <dl class="feed-hero-pulse">
            ${(['voices', 'tag', 'you', 'since'] as const)
              .map(
                (k) => `
                <div class="feed-hero-pulse-row" data-pulse="${k}">
                  <dt class="feed-hero-pulse-k">${rows[k].label}</dt>
                  <dd class="feed-hero-pulse-v">${escapeHtml(rows[k].value)}</dd>
                </div>`,
              )
              .join('')}
          </dl>
        </div>
        <div class="feed-hero-graph" role="img" aria-label="${escapeHtml(a11ySummary)}">
          <canvas id="feed-hero-canvas" aria-hidden="true"></canvas>
          <p class="feed-hero-graph-label" aria-hidden="true">
            <span class="feed-hero-graph-pulse" aria-hidden="true"></span>NETWORK · 24H
          </p>
          <ul class="feed-hero-arms-sr-only">
            ${arms
              .map(
                (a, i) => `
                <li><a href="${a.href ?? '#'}" data-arm-idx="${i}"${a.scrollTarget ? ` data-scroll="${escapeHtml(a.scrollTarget)}"` : ''}>${escapeHtml(a.label)}</a></li>`,
              )
              .join('')}
          </ul>
        </div>
      </div>
      <div class="feed-hero-compose-rail" role="button" tabindex="0" aria-label="Open composer">
        <div class="feed-hero-compose-avatar" aria-hidden="true">${escapeHtml(data.userInitial)}</div>
        <p class="feed-hero-compose-input">${escapeHtml(compose.placeholder)}</p>
        <button type="button" class="feed-hero-compose-cta">${compose.ctaLabel}</button>
      </div>
    </header>
  `;
}

export function mountFeedHero(data: FeedHeroData): FeedHeroHandle {
  const root = document.querySelector<HTMLElement>('.feed-hero');
  const canvas = document.getElementById('feed-hero-canvas') as HTMLCanvasElement | null;
  if (!root || !canvas) {
    return { dispose: () => {} };
  }

  /* Recompute arm labels (cheap; lets us bind onArmClick without re-rendering markup) */
  const me = data.isUserLoggedIn ? getCurrentUsername() : null;
  const lastVisit = getLastVisit();
  const now = Date.now();
  const arms: ArmLabel[] = computeArmLabels({ posts: data.posts, me, now, lastVisit });
  const armLabels: string[] = arms.map((a) => a.label);

  let starHandle: ThreeStarHandle | null = null;

  const onArmClick = (i: number) => {
    const a = arms[i];
    if (!a) return;
    if (a.action === 'explode') {
      starHandle?.explode();
      setTimeout(() => starHandle?.reassemble(), 1200);
      return;
    }
    if (a.scrollTarget) {
      const target = document.querySelector(a.scrollTarget);
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (a.href) {
      history.pushState({ path: a.href }, '', a.href);
      window.renderRoute?.(a.href);
    }
  };

  starHandle = mountThreeStar(canvas, {
    mode: 'hero',
    armLabels,
    onArmClick,
    decorativeOnly: true,
    pauseWhenHidden: true,
  });

  /* Compose rail → trigger existing composer */
  const rail = root.querySelector<HTMLElement>('.feed-hero-compose-rail');
  const onRailClick = (e: Event) => {
    e.stopPropagation();
    if (!data.isUserLoggedIn) {
      history.pushState({ path: '/login' }, '', '/login');
      window.renderRoute?.('/login');
      return;
    }
    const collapsed = document.getElementById('collapsed-input');
    collapsed?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    setTimeout(() => {
      const titleField = document.getElementById('post-title') as HTMLInputElement | null;
      titleField?.focus();
    }, 50);
  };
  rail?.addEventListener('click', onRailClick);

  const onRailKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onRailClick(e);
    }
  };
  rail?.addEventListener('keydown', onRailKey);

  /* Hidden a11y arm-list — keyboard users get the same actions as cursor users */
  const armLinks = root.querySelectorAll<HTMLAnchorElement>('.feed-hero-arms-sr-only a');
  const onArmLinkClick = (e: MouseEvent) => {
    e.preventDefault();
    const a = e.currentTarget as HTMLAnchorElement;
    const idx = Number(a.dataset.armIdx);
    if (Number.isFinite(idx)) onArmClick(idx);
  };
  armLinks.forEach((a) => a.addEventListener('click', onArmLinkClick));

  /* Search-clear (when in search mode) */
  const clearLink = root.querySelector<HTMLAnchorElement>('[data-action="clear-search"]');
  const onClearSearch = (e: MouseEvent) => {
    e.preventDefault();
    window.searchQuery = undefined;
    window.searchResults = undefined;
    window.navigateToPage?.(1);
  };
  clearLink?.addEventListener('click', onClearSearch);

  /* Stamp the visit AFTER computing rows/arms so the next render sees this visit */
  setLastVisit(now);

  return {
    dispose() {
      starHandle?.dispose();
      rail?.removeEventListener('click', onRailClick);
      rail?.removeEventListener('keydown', onRailKey);
      armLinks.forEach((a) => a.removeEventListener('click', onArmLinkClick));
      clearLink?.removeEventListener('click', onClearSearch);
    },
  };
}

/* Helper for FeedPage — returns the user initial used by the avatar circle. */
export function userInitialForHero(): string {
  const u = (getLocalItem('user') as string | null) || 'Y';
  return (u || 'Y').charAt(0).toUpperCase();
}
