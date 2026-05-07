/**
 * @file NavbarPage.ts
 * @description Editorial-flat top navigation. Single thin bar, Bebas Neue
 *              wordmark, text-only nav, minimal search. Hidden on auth
 *              routes (`/`, `/login`, `/register`) — see main.ts.
 */

import { renderRoute } from '../router';
import { isLoggedIn, logout } from '../utils/auth';
import { search, type SearchProfile, type SearchResults } from '../services/search/search';
import type { NoroffPost } from '../services/posts/posts';
import { error as logError } from '../utils/log';
import {
  getCurrentTheme,
  toggleTheme as toggleAppTheme,
  applyTheme,
  getInitialTheme,
} from '../utils/theme';
import { confirmDialog } from '../utils/confirm';
import { iconSvg } from '../utils/icon';
import { Sun, Moon } from 'lucide';
import {
  notificationsBellMarkup,
  mountNotificationsBell,
} from '../components/notificationsBell';
import {
  startPolling as startNotificationsPolling,
  stopPolling as stopNotificationsPolling,
} from '../services/notifications/notifications';
import '../types/index';

const STAR_SVG = `
  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <linearGradient id="navStarArm" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ff7a2e"/>
        <stop offset="100%" stop-color="#f36920"/>
      </linearGradient>
      <radialGradient id="navStarCore" cx="30%" cy="30%">
        <stop offset="0%" stop-color="#ff9d5c"/>
        <stop offset="100%" stop-color="#f36920"/>
      </radialGradient>
    </defs>
    ${[0, 60, 120, 180, 240, 300]
      .map(
        (deg) => `
      <g transform="translate(100, 100) rotate(${deg}) translate(-100, -100)">
        <rect x="75" y="10" width="50" height="83" rx="6" fill="url(#navStarArm)" opacity="0.88"/>
      </g>`
      )
      .join('')}
    <circle cx="100" cy="100" r="55" fill="url(#navStarCore)"/>
  </svg>
`;

const SUN_ICON = `<span class="icon-sun" aria-hidden="true">${iconSvg(Sun, { size: 18, strokeWidth: 2 })}</span>`;
const MOON_ICON = `<span class="icon-moon" aria-hidden="true">${iconSvg(Moon, { size: 18, strokeWidth: 2 })}</span>`;

export default function NavbarPage() {
  const userLoggedIn = isLoggedIn();

  return `
    <a href="#js-app" class="sr-only sr-only-focusable">Skip to main content</a>
    <nav id="app-navbar" class="linka-nav" aria-label="Primary">
      <div class="linka-nav-inner">
        <a href="/feed" class="linka-nav-brand" data-nav="feed">
          <span class="linka-nav-mark">${STAR_SVG}</span>
          <span class="linka-nav-wordmark">LINKA</span>
        </a>

        <div class="linka-nav-search" role="search">
          <input
            type="search"
            id="navbar-search"
            class="linka-nav-search-input"
            placeholder="Search posts and people…"
            aria-label="Search"
            aria-autocomplete="list"
            aria-controls="navbar-search-dropdown"
          />
          <kbd class="linka-nav-search-hint" aria-hidden="true">⌘K</kbd>
          <div
            id="navbar-search-dropdown"
            class="linka-search-dropdown"
            role="listbox"
            aria-label="Search suggestions"
            hidden
          ></div>
        </div>

        <div class="linka-nav-links">
          <a href="/feed" class="linka-nav-link" data-nav="feed">Feed</a>
          <a href="/profile" class="linka-nav-link" data-nav="profile">Profile</a>

          <button
            id="theme-toggle"
            class="linka-nav-icon-btn"
            type="button"
            aria-label="Toggle theme"
            aria-pressed="false"
            title="Toggle theme"
          >
            ${SUN_ICON}${MOON_ICON}
          </button>

          ${
            userLoggedIn
              ? `<button id="nav-logout" class="linka-nav-link linka-nav-logout" type="button">Sign out</button>`
              : `<a href="/login" class="linka-nav-cta" data-nav="login">Sign in</a>`
          }
        </div>

        ${userLoggedIn ? notificationsBellMarkup() : ''}

        <button
          id="mobile-menu-toggle"
          class="linka-nav-mobile-toggle"
          type="button"
          aria-label="Toggle menu"
          aria-expanded="false"
        >
          <span class="linka-nav-burger" aria-hidden="true"></span>
        </button>
      </div>

      <div id="linka-mobile-menu" class="linka-mobile-menu" hidden>
        <div class="linka-nav-search linka-nav-search-mobile" role="search">
          <input
            type="search"
            id="mobile-navbar-search"
            class="linka-nav-search-input"
            placeholder="Search posts, users, hashtags…"
            aria-label="Search"
          />
        </div>

        <a href="/feed" class="linka-mobile-link" data-nav="feed">Feed</a>
        <a href="/profile" class="linka-mobile-link" data-nav="profile">Profile</a>
        <button id="mobile-theme-toggle" class="linka-mobile-link" type="button">
          <span class="mobile-theme-text">Toggle theme</span>
        </button>
        ${
          userLoggedIn
            ? `<button id="mobile-nav-logout" class="linka-mobile-link" type="button">Sign out</button>`
            : `<a href="/login" class="linka-mobile-link linka-mobile-link-primary" data-nav="login">Sign in</a>`
        }
      </div>
    </nav>
  `;
}

/* -------------------------------------------------------------------------- */
/*                              Initialization                                */
/* -------------------------------------------------------------------------- */

let disposeNotificationsBell: (() => void) | null = null;

export function initNavbar() {
  wireBrandLink();
  wireNavLinks();
  wireLogout();
  wireSearch();
  wireMobileMenu();
  wireThemeToggle();

  applyTheme(getInitialTheme());
  syncNavbarThemeUI();
  updateActiveNav();

  // Tear down any previous bell mount before remounting (e.g. after logout
  // refreshes the navbar) so listeners + subscriptions don't leak.
  disposeNotificationsBell?.();
  disposeNotificationsBell = null;
  if (isLoggedIn()) {
    disposeNotificationsBell = mountNotificationsBell();
    startNotificationsPolling();
  }

  window.updateActiveNav = updateActiveNav;
  window.updateNavbarAfterLogout = updateNavbarAfterLogout;
}

// Pick up auth changes from the login form (handler.ts dispatches this on
// successful sign-in) and rebuild the navbar so the bell appears + polling
// starts without requiring a hard refresh.
document.addEventListener('auth:changed', () => {
  if (isLoggedIn()) updateNavbarAfterLogout();
});

/* -------------------------------------------------------------------------- */
/*                              Internal wiring                               */
/* -------------------------------------------------------------------------- */

function wireBrandLink() {
  const brand = document.querySelector<HTMLAnchorElement>('.linka-nav-brand');
  brand?.addEventListener('click', (e) => {
    e.preventDefault();
    closeMobileMenu();
    history.pushState({ path: '/feed' }, '', '/feed');
    renderRoute('/feed');
    updateActiveNav();
  });
}

function wireNavLinks() {
  document.querySelectorAll<HTMLElement>('[data-nav]').forEach((el) => {
    el.addEventListener('click', (e) => {
      const target = el.getAttribute('data-nav');
      if (!target) return;
      e.preventDefault();
      closeMobileMenu();
      const path =
        target === 'login'
          ? '/'
          : target === 'feed'
            ? '/feed'
            : `/${target}`;
      history.pushState({ path }, '', path);
      renderRoute(path);
      updateActiveNav();
    });
  });
}

function wireLogout() {
  const handler = async (e: Event) => {
    e.preventDefault();
    const ok = await confirmDialog({
      title: 'Sign out?',
      body: 'You will need to sign in again to view your feed.',
      confirmLabel: 'Sign out',
      cancelLabel: 'Stay',
    });
    if (!ok) return;
    closeMobileMenu();
    stopNotificationsPolling({ clear: true });
    disposeNotificationsBell?.();
    disposeNotificationsBell = null;
    logout();
    updateNavbarAfterLogout();
    history.pushState({ path: '/' }, '', '/');
    renderRoute('/');
    showLogoutMessage();
  };
  document.getElementById('nav-logout')?.addEventListener('click', handler);
  document.getElementById('mobile-nav-logout')?.addEventListener('click', handler);
}

const SEARCH_DEBOUNCE_MS = 250;
const DROPDOWN_LIMIT = 4;

function escAttr(s: string): string {
  return String(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function escHtml(s: string): string {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function wireSearch() {
  const desktopInput = document.getElementById('navbar-search') as HTMLInputElement | null;
  const desktopDropdown = document.getElementById('navbar-search-dropdown');
  const mobileInput = document.getElementById('mobile-navbar-search') as HTMLInputElement | null;

  if (desktopInput) attachSearchInput(desktopInput, desktopDropdown);
  if (mobileInput) attachSearchInput(mobileInput, null);
}

function commitSearch(input: HTMLInputElement, query: string, results: SearchResults): void {
  window.searchQuery = query;
  window.searchResults = results.posts;
  window.userResults = results.profiles;
  if (window.location.pathname !== '/feed') {
    history.pushState({ path: '/feed' }, '', '/feed');
  }
  renderRoute('/feed');
  input.blur();
}

function clearSearchState(input: HTMLInputElement): void {
  window.searchQuery = null;
  window.searchResults = undefined;
  window.userResults = undefined;
  if (window.location.pathname === '/feed') renderRoute('/feed');
  input.blur();
}

function renderProfileItem(p: SearchProfile): string {
  const initial = (p.name || '?').charAt(0).toUpperCase();
  const tagline = p.bio ? p.bio : `@${p.name.toLowerCase()}`;
  return `
    <li
      class="linka-search-dropdown-item"
      role="option"
      data-search-item="profile"
      data-username="${escAttr(p.name)}"
      tabindex="0"
    >
      ${
        p.avatar?.url
          ? `<img class="linka-search-dropdown-avatar" src="${escAttr(p.avatar.url)}" alt="" loading="lazy" />`
          : `<span class="linka-search-dropdown-avatar linka-search-dropdown-avatar-fallback">${escHtml(initial)}</span>`
      }
      <span class="linka-search-dropdown-text">
        <span class="linka-search-dropdown-title">${escHtml(p.name)}</span>
        <span class="linka-search-dropdown-meta">${escHtml(tagline)}</span>
      </span>
    </li>
  `;
}

function renderPostItem(post: NoroffPost): string {
  const author = post.author?.name || 'Unknown';
  const title = post.title || '(untitled post)';
  const truncatedTitle = title.length > 60 ? title.substring(0, 60) + '…' : title;
  return `
    <li
      class="linka-search-dropdown-item"
      role="option"
      data-search-item="post"
      data-post-id="${post.id}"
      tabindex="0"
    >
      <span class="linka-search-dropdown-avatar linka-search-dropdown-avatar-post" aria-hidden="true">¶</span>
      <span class="linka-search-dropdown-text">
        <span class="linka-search-dropdown-title">${escHtml(truncatedTitle)}</span>
        <span class="linka-search-dropdown-meta">by ${escHtml(author)}</span>
      </span>
    </li>
  `;
}

function attachSearchInput(input: HTMLInputElement, dropdown: HTMLElement | null) {
  let debounceTimer: number | null = null;
  let latestResults: SearchResults | null = null;
  let latestTerm = '';

  const closeDropdown = () => {
    dropdown?.setAttribute('hidden', '');
    if (dropdown) dropdown.innerHTML = '';
  };

  const renderDropdown = (results: SearchResults, query: string) => {
    if (!dropdown) return;
    if (results.posts.length === 0 && results.profiles.length === 0) {
      dropdown.innerHTML = `<p class="linka-search-dropdown-empty">No posts or people match “${escHtml(query)}”.</p>`;
      dropdown.removeAttribute('hidden');
      return;
    }
    const profileItems = results.profiles
      .slice(0, DROPDOWN_LIMIT)
      .map(renderProfileItem)
      .join('');
    const postItems = results.posts
      .slice(0, DROPDOWN_LIMIT)
      .map(renderPostItem)
      .join('');

    dropdown.innerHTML = `
      ${
        profileItems
          ? `<section class="linka-search-dropdown-section">
              <header class="linka-search-dropdown-heading">People</header>
              <ul role="presentation">${profileItems}</ul>
            </section>`
          : ''
      }
      ${
        postItems
          ? `<section class="linka-search-dropdown-section">
              <header class="linka-search-dropdown-heading">Posts</header>
              <ul role="presentation">${postItems}</ul>
            </section>`
          : ''
      }
      <button type="button" class="linka-search-dropdown-all" data-search-item="all">
        See all results for “${escHtml(query)}” →
      </button>
    `;
    dropdown.removeAttribute('hidden');
  };

  const runSearch = async (term: string): Promise<SearchResults | null> => {
    try {
      const results = await search(term);
      // Only the most recently typed term should win, otherwise an early
      // request can clobber a later one's UI when network latency varies.
      if (input.value.trim() !== term) return null;
      latestResults = results;
      latestTerm = term;
      return results;
    } catch (err) {
      logError('search failed', err);
      return null;
    }
  };

  const onType = () => {
    if (debounceTimer !== null) window.clearTimeout(debounceTimer);
    const term = input.value.trim();
    if (term === '') {
      latestResults = null;
      latestTerm = '';
      closeDropdown();
      return;
    }
    debounceTimer = window.setTimeout(async () => {
      const results = await runSearch(term);
      if (results) renderDropdown(results, term);
    }, SEARCH_DEBOUNCE_MS);
  };

  const onKeydown = async (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeDropdown();
      input.blur();
      return;
    }
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const term = input.value.trim();
    if (!term) {
      clearSearchState(input);
      closeDropdown();
      return;
    }
    if (debounceTimer !== null) window.clearTimeout(debounceTimer);
    let results = latestResults && latestTerm === term ? latestResults : null;
    if (!results) results = await runSearch(term);
    if (!results) return;
    closeDropdown();
    commitSearch(input, term, results);
  };

  input.addEventListener('input', onType);
  input.addEventListener('keydown', onKeydown);

  input.addEventListener('focus', () => {
    if (latestResults && latestTerm === input.value.trim()) {
      renderDropdown(latestResults, latestTerm);
    }
  });

  // Click handlers on the dropdown itself
  dropdown?.addEventListener('click', (e) => {
    const target = e.target as HTMLElement | null;
    const item = target?.closest<HTMLElement>('[data-search-item]');
    if (!item) return;
    e.preventDefault();
    const kind = item.dataset.searchItem;
    const navigateAndReset = (url: string) => {
      input.value = '';
      latestResults = null;
      latestTerm = '';
      window.searchQuery = null;
      window.searchResults = undefined;
      window.userResults = undefined;
      closeDropdown();
      history.pushState({ path: url }, '', url);
      renderRoute(url);
    };
    if (kind === 'profile') {
      const username = item.dataset.username;
      if (!username) return;
      navigateAndReset(`/profile?user=${encodeURIComponent(username)}`);
    } else if (kind === 'post') {
      const postId = item.dataset.postId;
      if (!postId) return;
      navigateAndReset(`/feed?post=${encodeURIComponent(postId)}`);
    } else if (kind === 'all') {
      const term = input.value.trim();
      if (!term || !latestResults) return;
      closeDropdown();
      commitSearch(input, term, latestResults);
    }
  });

  // Close on click outside the search container
  document.addEventListener('click', (e) => {
    if (!dropdown) return;
    const container = input.closest('.linka-nav-search');
    const target = e.target as Node | null;
    if (target && container && !container.contains(target)) {
      closeDropdown();
    }
  });
}

function wireMobileMenu() {
  const toggle = document.getElementById('mobile-menu-toggle');
  const menu = document.getElementById('linka-mobile-menu');
  toggle?.addEventListener('click', () => {
    if (!menu) return;
    const open = !menu.hasAttribute('hidden');
    if (open) closeMobileMenu();
    else openMobileMenu();
  });
}

function openMobileMenu() {
  const menu = document.getElementById('linka-mobile-menu');
  const toggle = document.getElementById('mobile-menu-toggle');
  menu?.removeAttribute('hidden');
  toggle?.setAttribute('aria-expanded', 'true');
  toggle?.classList.add('is-open');
}

function closeMobileMenu() {
  const menu = document.getElementById('linka-mobile-menu');
  const toggle = document.getElementById('mobile-menu-toggle');
  menu?.setAttribute('hidden', '');
  toggle?.setAttribute('aria-expanded', 'false');
  toggle?.classList.remove('is-open');
}

function wireThemeToggle() {
  const onToggle = () => {
    toggleAppTheme();
    syncNavbarThemeUI();
  };
  document.getElementById('theme-toggle')?.addEventListener('click', onToggle);
  document.getElementById('mobile-theme-toggle')?.addEventListener('click', onToggle);
}

function syncNavbarThemeUI(): void {
  const isDark = getCurrentTheme() === 'dark';
  const sunIcon = document.querySelector<HTMLElement>('.icon-sun');
  const moonIcon = document.querySelector<HTMLElement>('.icon-moon');
  const mobileLabel = document.querySelector<HTMLElement>('.mobile-theme-text');
  const btn = document.getElementById('theme-toggle');

  if (sunIcon) sunIcon.style.display = isDark ? 'inline-block' : 'none';
  if (moonIcon) moonIcon.style.display = isDark ? 'none' : 'inline-block';
  if (mobileLabel) mobileLabel.textContent = isDark ? 'Switch to light' : 'Switch to dark';
  if (btn) btn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
}

document.addEventListener('linka-theme-changed', syncNavbarThemeUI);

function updateActiveNav() {
  const path = window.location.pathname;
  document.querySelectorAll<HTMLElement>('.linka-nav-link, .linka-mobile-link').forEach((el) => {
    el.classList.remove('is-active');
  });
  const target =
    path === '/feed' ? 'feed' : path === '/profile' ? 'profile' : null;
  if (!target) return;
  document.querySelectorAll<HTMLElement>(`[data-nav="${target}"]`).forEach((el) => {
    el.classList.add('is-active');
  });
}

function updateNavbarAfterLogout() {
  const old = document.getElementById('app-navbar');
  old?.remove();
  document.body.insertAdjacentHTML('afterbegin', NavbarPage());
  initNavbar();
}

function showLogoutMessage() {
  const el = document.createElement('div');
  el.className = 'notification-toast notification-success';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.setAttribute('aria-atomic', 'true');
  el.textContent = 'Signed out';
  document.body.appendChild(el);
  setTimeout(() => {
    el.classList.add('is-leaving');
    setTimeout(() => el.parentNode?.removeChild(el), 300);
  }, 2200);
}
