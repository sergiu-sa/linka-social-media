/**
 * @file NavbarPage.ts
 * @description Editorial-flat top navigation. Single thin bar, Bebas Neue
 *              wordmark, text-only nav, minimal search. Hidden on auth
 *              routes (`/`, `/login`, `/register`) — see main.ts.
 */

import { renderRoute } from '../router';
import { isLoggedIn, logout } from '../utils/auth';
import {
  getAllPosts,
  getPublicPosts,
  type NoroffPost,
} from '../services/posts/posts';
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
import '../types/index';

type SearchResult =
  | { type: 'post'; data: NoroffPost }
  | { type: 'user'; data: NoroffPost['author'] };

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
            placeholder="Search posts, users, hashtags…"
            aria-label="Search"
          />
          <kbd class="linka-nav-search-hint" aria-hidden="true">⌘K</kbd>
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

  window.updateActiveNav = updateActiveNav;
  window.updateNavbarAfterLogout = updateNavbarAfterLogout;
}

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
    logout();
    updateNavbarAfterLogout();
    history.pushState({ path: '/' }, '', '/');
    renderRoute('/');
    showLogoutMessage();
  };
  document.getElementById('nav-logout')?.addEventListener('click', handler);
  document.getElementById('mobile-nav-logout')?.addEventListener('click', handler);
}

function wireSearch() {
  const desktopBtn = document.getElementById('navbar-search') as HTMLInputElement | null;
  const mobileBtn = document.getElementById('mobile-navbar-search') as HTMLInputElement | null;
  if (desktopBtn) attachSearchInput(desktopBtn);
  if (mobileBtn) attachSearchInput(mobileBtn);
}

function attachSearchInput(input: HTMLInputElement) {
  const handle = async () => {
    const term = input.value.trim();
    if (term === '') {
      window.searchQuery = null;
      if (window.location.pathname === '/feed') renderRoute('/feed');
      return;
    }
    const results = await enhancedSearch(term);
    window.searchQuery = term;
    window.searchResults = results
      .filter((r) => r.type === 'post')
      .map((r) => r.data) as NoroffPost[];
    window.userResults = results
      .filter((r) => r.type === 'user')
      .map((r) => r.data);
    if (window.location.pathname !== '/feed') {
      history.pushState({ path: '/feed' }, '', '/feed');
    }
    renderRoute('/feed');
  };
  input.addEventListener('input', handle);
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handle();
  });
}

async function enhancedSearch(query: string): Promise<SearchResult[]> {
  const out: SearchResult[] = [];
  try {
    const response = isLoggedIn()
      ? await getAllPosts(50, 1)
      : await getPublicPosts(50, 1);
    const q = query.toLowerCase();
    const matchingPosts = response.data.filter(
      (post: NoroffPost) =>
        post.title.toLowerCase().includes(q) ||
        post.body.toLowerCase().includes(q) ||
        post.author.name.toLowerCase().includes(q)
    );
    const uniqueUsers = new Map<string, NoroffPost['author']>();
    matchingPosts.forEach((post) => {
      if (post.author.name.toLowerCase().includes(q)) {
        uniqueUsers.set(post.author.name, post.author);
      }
    });
    uniqueUsers.forEach((u) => out.push({ type: 'user', data: u }));
    matchingPosts.forEach((p) => out.push({ type: 'post', data: p }));
  } catch (err) {
    logError('Search error:', err);
  }
  return out;
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
  el.textContent = 'Signed out';
  document.body.appendChild(el);
  setTimeout(() => {
    el.classList.add('is-leaving');
    setTimeout(() => el.parentNode?.removeChild(el), 300);
  }, 2200);
}
