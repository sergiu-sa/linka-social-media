/**
 * @file NavbarPage.ts
 * @description Navigation bar component with brand name, search functionality, and navigation buttons
 * @author Your Name
 */

import { renderRoute } from '../router';
import { isLoggedIn, logout } from '../utils/auth';
import {
  getAllPosts,
  getPublicPosts,
  type NoroffPost,
} from '../services/posts/posts';

// Add the global window interface to actually USE the NoroffPost type
declare global {
  interface Window {
    searchQuery?: string;
    searchResults?: NoroffPost[]; // This uses the imported type
    userResults?: any[];
    navigateToProfile?: (username: string) => void;
    navigateToPage?: (page: number) => void;
  }
}

// TypeScript interfaces and types for NavbarPage
export interface NavbarElements {
  feedBtn: HTMLElement | null;
  profileBtn: HTMLElement | null;
  loginBtn: HTMLElement | null;
  logoutBtn: HTMLElement | null;
  searchBtn: HTMLElement | null;
  searchInput: HTMLInputElement | null;
  mobileToggle: HTMLElement | null;
}

export interface SearchHandler {
  onSearch: (query: string) => void;
}

export interface NavbarConfig {
  brandName: string;
  searchPlaceholder: string;
  showSearch: boolean;
  showMobileMenu: boolean;
}

export interface NavbarState {
  isLoggedIn: boolean;
  currentPath: string;
}

export interface NotificationConfig {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

export type NavbarEventHandler = (event: Event) => void;
export type NavigationRoute = '/' | '/feed' | '/profile' | '/register';
export type NavbarTheme = 'light' | 'dark' | 'auto';

interface SearchResult {
  type: 'post' | 'user';
  data: NoroffPost | any; // Use NoroffPost here too
}

export default function NavbarPage() {
  const userLoggedIn = isLoggedIn();

  return `
    <nav id="app-navbar" class="fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b-2 border-slate-200 dark:border-slate-800 shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <!-- Brand/Logo Section -->
        <div class="shrink-0">
          <a href="/feed" class="flex items-center gap-3 no-underline group transition-all duration-300">
            <!-- Logo SVG with orange gradient matching intro page -->
            <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" class="w-10 h-10 transition-all duration-500 ease-out group-hover:scale-110 group-hover:rotate-12 group-hover:drop-shadow-[0_0_12px_rgba(249,115,22,0.6)]" aria-label="LINKA Logo">
              <defs>
                <linearGradient id="armGradientOrange" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style="stop-color:#ff7a2e;stop-opacity:1" />
                  <stop offset="100%" style="stop-color:#f36920;stop-opacity:1" />
                </linearGradient>
                <radialGradient id="coreGradientOrange" cx="30%" cy="30%">
                  <stop offset="0%" style="stop-color:#ff9d5c;stop-opacity:1" />
                  <stop offset="100%" style="stop-color:#f36920;stop-opacity:1" />
                </radialGradient>
                <filter id="shadowOrange">
                  <feDropShadow dx="1" dy="2" stdDeviation="3" flood-opacity="0.3"/>
                </filter>
              </defs>

              <!-- Arm 1 (0°, top) -->
              <g transform="translate(100, 100) rotate(0) translate(-100, -100)">
                <rect x="75" y="10" width="50" height="83" rx="6" fill="url(#armGradientOrange)" filter="url(#shadowOrange)" opacity="0.9"/>
              </g>

              <!-- Arm 2 (60°) -->
              <g transform="translate(100, 100) rotate(60) translate(-100, -100)">
                <rect x="75" y="10" width="50" height="83" rx="6" fill="url(#armGradientOrange)" filter="url(#shadowOrange)" opacity="0.85"/>
              </g>

              <!-- Arm 3 (120°) -->
              <g transform="translate(100, 100) rotate(120) translate(-100, -100)">
                <rect x="75" y="10" width="50" height="83" rx="6" fill="url(#armGradientOrange)" filter="url(#shadowOrange)" opacity="0.80"/>
              </g>

              <!-- Arm 4 (180°, bottom) -->
              <g transform="translate(100, 100) rotate(180) translate(-100, -100)">
                <rect x="75" y="10" width="50" height="83" rx="6" fill="url(#armGradientOrange)" filter="url(#shadowOrange)" opacity="0.90"/>
              </g>

              <!-- Arm 5 (240°) -->
              <g transform="translate(100, 100) rotate(240) translate(-100, -100)">
                <rect x="75" y="10" width="50" height="83" rx="6" fill="url(#armGradientOrange)" filter="url(#shadowOrange)" opacity="0.85"/>
              </g>

              <!-- Arm 6 (300°) -->
              <g transform="translate(100, 100) rotate(300) translate(-100, -100)">
                <rect x="75" y="10" width="50" height="83" rx="6" fill="url(#armGradientOrange)" filter="url(#shadowOrange)" opacity="0.80"/>
              </g>

              <!-- Core sphere -->
              <circle cx="100" cy="100" r="55" fill="url(#coreGradientOrange)" filter="url(#shadowOrange)"/>
              <circle cx="100" cy="100" r="55" fill="none" stroke="#ff7a2e" stroke-width="0.5" opacity="0.4"/>
            </svg>
            <h1 class="text-xl font-bold text-slate-900 dark:text-white group-hover:text-orange-500 transition-colors duration-300 brand-name">
              LINKA
            </h1>
          </a>
        </div>

        <!-- Search Bar Section - Hidden on mobile -->
        <div class="hidden md:flex flex-1 max-w-md mx-4">
          <div class="relative w-full">
            <input
              type="text"
              class="w-full h-10 px-4 pr-12 bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-300 placeholder-slate-500 dark:placeholder-slate-400 text-sm transition-all duration-300 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
              placeholder="Search posts, users, or hashtags..."
              id="navbar-search"
            />
            <button class="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-500 hover:bg-orange-100 dark:hover:bg-orange-900/20 rounded-full transition-all duration-300" id="search-btn">
              <i class="fas fa-search text-sm"></i>
            </button>
          </div>
        </div>

        <!-- Navigation Links Section - Hidden on mobile -->
        <div class="hidden md:flex items-center space-x-2">
          <button class="flex items-center gap-2 px-4 py-2 rounded-xl text-slate-700 dark:text-slate-300 text-sm font-semibold transition-all duration-300 bg-slate-100 dark:bg-slate-800 hover:bg-orange-100 dark:hover:bg-orange-900/20 hover:text-orange-600 dark:hover:text-orange-500 hover:scale-105 nav-btn nav-feed" id="nav-feed">
            <i class="fas fa-home text-sm"></i>
            Feed
          </button>

          <button class="flex items-center gap-2 px-4 py-2 rounded-xl text-slate-700 dark:text-slate-300 text-sm font-semibold transition-all duration-300 bg-slate-100 dark:bg-slate-800 hover:bg-orange-100 dark:hover:bg-orange-900/20 hover:text-orange-600 dark:hover:text-orange-500 hover:scale-105 nav-btn nav-profile" id="nav-profile">
            <i class="fas fa-user text-sm"></i>
            Profile
          </button>

          <button
            id="theme-toggle"
            class="relative flex items-center gap-2 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-300 text-sm font-semibold transition-all duration-300 bg-slate-100 dark:bg-slate-800 hover:bg-orange-100 dark:hover:bg-orange-900/20 hover:text-orange-600 dark:hover:text-orange-500 hover:scale-105"
            title="Toggle theme"
            aria-pressed="false"
          >
            <span class="sr-only">Toggle theme</span>
            <span class="inline-flex items-center justify-center w-5 h-5">
              <!-- Inline SVGs to avoid FA overlap/fallbacks -->
              <svg class="icon-sun" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style="display:none"><path d="M6.76 4.84l-1.8-1.79-1.41 1.41 1.79 1.8 1.42-1.42zm10.48 14.32l1.79 1.8 1.41-1.41-1.8-1.79-1.4 1.4zM12 4V1h-0v3h0zm0 19v-3h0v3h0zM4 12H1v0h3v0zm19 0h-3v0h3v0zM6.76 19.16l-1.42 1.42-1.79-1.8 1.41-1.41 1.8 1.79zM19.16 6.76l1.4-1.4 1.8 1.79-1.41 1.41-1.79-1.8zM12 6a6 6 0 100 12 6 6 0 000-12z"/></svg>
              <svg class="icon-moon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
            </span>
          </button>

          ${
            userLoggedIn
              ? `
            <button class="flex items-center gap-2 px-4 py-2 rounded-xl text-slate-700 dark:text-slate-300 text-sm font-semibold transition-all duration-300 bg-slate-100 dark:bg-slate-800 hover:bg-orange-100 dark:hover:bg-orange-900/20 hover:text-orange-600 dark:hover:text-orange-500 hover:scale-105 nav-btn nav-logout" id="nav-logout">
              <i class="fas fa-sign-out-alt text-sm"></i>
              Logout
            </button>
          `
              : `
            <button class="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold transition-all duration-300 bg-orange-500 hover:bg-orange-600 hover:scale-105 shadow-md hover:shadow-lg nav-btn nav-login" id="nav-login">
              <i class="fas fa-sign-in-alt text-sm"></i>
              Login
            </button>
          `
          }
        </div>

        <!-- Mobile Menu Toggle -->
        <button class="md:hidden flex items-center justify-center w-10 h-10 text-slate-700 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-500 transition-colors duration-300 mobile-menu-toggle" id="mobile-menu-toggle">
          <i class="fas fa-bars text-lg mobile-toggle-icon"></i>
        </button>
      </div>

      <!-- Mobile Menu - Initially hidden -->
      <div class="md:hidden mobile-menu hidden">
        <!-- Mobile Search Bar -->
        <div class="px-4 py-3 border-b-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800">
          <div class="relative">
            <input
              type="text"
              class="w-full h-10 px-4 pr-12 bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-300 placeholder-slate-500 dark:placeholder-slate-400 text-sm transition-all duration-300 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
              placeholder="Search posts, users, or hashtags..."
              id="mobile-navbar-search"
            />
            <button class="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-500 hover:bg-orange-100 dark:hover:bg-orange-900/20 rounded-full transition-all duration-300" id="mobile-search-btn">
              <i class="fas fa-search text-sm"></i>
            </button>
          </div>
        </div>

        <!-- Mobile Navigation Links -->
        <div class="px-4 py-4 space-y-2 bg-white dark:bg-slate-900">
          <button class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-700 dark:text-slate-300 text-sm font-semibold transition-all duration-300 bg-slate-100 dark:bg-slate-800 hover:bg-orange-100 dark:hover:bg-orange-900/20 hover:text-orange-600 dark:hover:text-orange-500 hover:scale-105 nav-btn nav-feed" id="mobile-nav-feed">
            <i class="fas fa-home text-sm"></i>
            Feed
          </button>

          <button class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-700 dark:text-slate-300 text-sm font-semibold transition-all duration-300 bg-slate-100 dark:bg-slate-800 hover:bg-orange-100 dark:hover:bg-orange-900/20 hover:text-orange-600 dark:hover:text-orange-500 hover:scale-105 nav-btn nav-profile" id="mobile-nav-profile">
            <i class="fas fa-user text-sm"></i>
            Profile
          </button>

          <button
            id="mobile-theme-toggle"
            class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-700 dark:text-slate-300 text-sm font-semibold transition-all duration-300 bg-slate-100 dark:bg-slate-800 hover:bg-orange-100 dark:hover:bg-orange-900/20 hover:text-orange-600 dark:hover:text-orange-500 hover:scale-105"
            title="Toggle Theme"
          >
            <i class="fas fa-moon text-sm mobile-theme-icon"></i>
            <span class="mobile-theme-text">Dark Mode</span>
          </button>

          ${
            userLoggedIn
              ? `
            <button class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-700 dark:text-slate-300 text-sm font-semibold transition-all duration-300 bg-slate-100 dark:bg-slate-800 hover:bg-orange-100 dark:hover:bg-orange-900/20 hover:text-orange-600 dark:hover:text-orange-500 hover:scale-105 nav-btn nav-logout" id="mobile-nav-logout">
              <i class="fas fa-sign-out-alt text-sm"></i>
              Logout
            </button>
          `
              : `
            <button class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white text-sm font-semibold transition-all duration-300 bg-orange-500 hover:bg-orange-600 hover:scale-105 shadow-md hover:shadow-lg nav-btn nav-login" id="mobile-nav-login">
              <i class="fas fa-sign-in-alt text-sm"></i>
              Login
            </button>
          `
          }
        </div>
      </div>
    </nav>
  `;
}

/**
 * Enhanced search function - now properly typed
 */
async function enhancedSearch(query: string): Promise<SearchResult[]> {
  const results: SearchResult[] = [];

  try {
    // Search for posts
    const postsResponse = await getAllPosts(50, 1);
    const matchingPosts: NoroffPost[] = postsResponse.data.filter(
      (post: NoroffPost) =>
        post.title.toLowerCase().includes(query.toLowerCase()) ||
        post.body.toLowerCase().includes(query.toLowerCase()) ||
        post.author.name.toLowerCase().includes(query.toLowerCase())
    );

    // Add unique users from matching posts
    const uniqueUsers = new Map();
    matchingPosts.forEach((post: NoroffPost) => {
      if (post.author.name.toLowerCase().includes(query.toLowerCase())) {
        uniqueUsers.set(post.author.name, post.author);
      }
    });

    // Add user results
    uniqueUsers.forEach((user) => {
      results.push({
        type: 'user',
        data: user,
      });
    });

    // Add post results
    matchingPosts.forEach((post: NoroffPost) => {
      results.push({
        type: 'post',
        data: post,
      });
    });
  } catch (error) {
    console.error('Search error:', error);
  }

  return results;
}

export function initNavbar() {
  // Navigation event listeners for desktop
  const feedBtn = document.getElementById('nav-feed');
  const profileBtn = document.getElementById('nav-profile');
  const loginBtn = document.getElementById('nav-login');
  const logoutBtn = document.getElementById('nav-logout');
  const searchBtn = document.getElementById('search-btn');
  const searchInput = document.getElementById(
    'navbar-search'
  ) as HTMLInputElement;
  const mobileToggle = document.getElementById('mobile-menu-toggle');

  // Mobile navigation event listeners
  const mobileFeedBtn = document.getElementById('mobile-nav-feed');
  const mobileProfileBtn = document.getElementById('mobile-nav-profile');
  const mobileLoginBtn = document.getElementById('mobile-nav-login');
  const mobileLogoutBtn = document.getElementById('mobile-nav-logout');
  const mobileSearchBtn = document.getElementById('mobile-search-btn');
  const mobileSearchInput = document.getElementById(
    'mobile-navbar-search'
  ) as HTMLInputElement;

  // Feed page navigation - Desktop
  if (feedBtn) {
    feedBtn.addEventListener('click', (e) => {
      e.preventDefault();
      closeMobileMenu();
      history.pushState({ path: '/feed' }, '', '/feed');
      renderRoute('/feed');
      updateActiveNav();
    });
  }

  // Feed page navigation - Mobile
  if (mobileFeedBtn) {
    mobileFeedBtn.addEventListener('click', (e) => {
      e.preventDefault();
      closeMobileMenu();
      history.pushState({ path: '/feed' }, '', '/feed');
      renderRoute('/feed');
      updateActiveNav();
    });
  }

  // Profile page navigation - Desktop
  if (profileBtn) {
    profileBtn.addEventListener('click', (e) => {
      e.preventDefault();
      closeMobileMenu();
      history.pushState({ path: '/profile' }, '', '/profile');
      renderRoute('/profile');
      updateActiveNav();
    });
  }

  // Profile page navigation - Mobile
  if (mobileProfileBtn) {
    mobileProfileBtn.addEventListener('click', (e) => {
      e.preventDefault();
      closeMobileMenu();
      history.pushState({ path: '/profile' }, '', '/profile');
      renderRoute('/profile');
      updateActiveNav();
    });
  }

  // Login page navigation - Desktop
  if (loginBtn) {
    loginBtn.addEventListener('click', (e) => {
      e.preventDefault();
      closeMobileMenu();
      history.pushState({ path: '/' }, '', '/');
      renderRoute('/');
    });
  }

  // Login page navigation - Mobile
  if (mobileLoginBtn) {
    mobileLoginBtn.addEventListener('click', (e) => {
      e.preventDefault();
      closeMobileMenu();
      history.pushState({ path: '/' }, '', '/');
      renderRoute('/');
    });
  }

  // Logout functionality - Desktop
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      handleLogout();
    });
  }

  // Logout functionality - Mobile
  if (mobileLogoutBtn) {
    mobileLogoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      handleLogout();
    });
  }

  // Helper function for logout
  function handleLogout() {
    closeMobileMenu();
    // Show confirmation dialog
    if (confirm('Are you sure you want to logout?')) {
      // Clear authentication data
      logout();

      // Update navbar to show login button
      updateNavbarAfterLogout();

      // Navigate to login page
      history.pushState({ path: '/' }, '', '/');
      renderRoute('/');

      // Show success message
      showLogoutMessage();
    }
  }

  // Helper function to close mobile menu
  function closeMobileMenu() {
    const mobileMenu = document.querySelector('.mobile-menu');
    const navbar = document.querySelector('nav');
    const mobileToggle = document.getElementById('mobile-menu-toggle');

    if (mobileMenu) {
      mobileMenu.classList.add('hidden');
    }

    if (navbar) {
      navbar.classList.remove('mobile-menu-open');
    }

    // Reset icon to hamburger state
    if (mobileToggle) {
      const toggleIcon = mobileToggle.querySelector('.mobile-toggle-icon');

      if (toggleIcon) {
        console.log('🔄 Resetting icon to hamburger state');
        toggleIcon.className = 'fas fa-bars text-lg mobile-toggle-icon';
      }
    }
  } // Enhanced Search functionality - Desktop
  if (searchBtn && searchInput) {
    setupSearchFunctionality(searchBtn, searchInput);
  }

  // Enhanced Search functionality - Mobile
  if (mobileSearchBtn && mobileSearchInput) {
    setupSearchFunctionality(mobileSearchBtn, mobileSearchInput);
  }

  // Mobile menu toggle with single FontAwesome icon that changes class
  if (mobileToggle) {
    // Initialize icon state
    const toggleIcon = mobileToggle.querySelector('.mobile-toggle-icon');

    if (toggleIcon) {
      console.log('🔧 Initializing single mobile toggle icon...');
      // Ensure it starts as hamburger
      toggleIcon.className = 'fas fa-bars text-lg mobile-toggle-icon';
      console.log('✅ Icon initialized as hamburger (fa-bars)');
    }

    mobileToggle.addEventListener('click', () => {
      const mobileMenu = document.querySelector('.mobile-menu');
      const navbar = document.querySelector('nav');

      if (mobileMenu && navbar && toggleIcon) {
        const isOpen = !mobileMenu.classList.contains('hidden');

        if (isOpen) {
          // Close menu
          console.log('🍔 Closing mobile menu - changing to hamburger icon');
          mobileMenu.classList.add('hidden');
          navbar.classList.remove('mobile-menu-open');

          // Change to hamburger icon
          toggleIcon.className = 'fas fa-bars text-lg mobile-toggle-icon';
          console.log('📱 Icon changed to: fa-bars (hamburger)');
        } else {
          // Open menu
          console.log('❌ Opening mobile menu - changing to close icon');
          mobileMenu.classList.remove('hidden');
          navbar.classList.add('mobile-menu-open');

          // Change to close icon
          toggleIcon.className = 'fas fa-times text-lg mobile-toggle-icon';
          console.log('📱 Icon changed to: fa-times (close)');
        }
      }
    });
  }

  // Setup search functionality helper
  function setupSearchFunctionality(
    searchBtn: HTMLElement,
    searchInput: HTMLInputElement
  ) {
    // Load posts for search functionality
    const loadPostsForSearch = async () => {
      try {
        if (isLoggedIn()) {
          // Authenticated users get personalized posts
          await getAllPosts(100, 1);
        } else {
          // Unauthenticated users get public posts
          await getPublicPosts(100, 1);
        }
        // We don't need to store posts here since enhancedSearch makes its own API calls
      } catch (error) {
        console.error('Error loading posts for search:', error);
      }
    };

    // Load posts when page loads
    loadPostsForSearch();

    // Enhanced search input handler
    const handleSearchInput = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const searchTerm = target.value.toLowerCase().trim();

      if (searchTerm === '') {
        // Clear search - trigger reload of original feed
        (window as any).searchQuery = null;
        if (window.location.pathname === '/feed') {
          renderRoute('/feed');
        }
        return;
      }

      // Use enhanced search
      const searchResults = await enhancedSearch(searchTerm);

      // Separate users and posts
      const userResults = searchResults.filter((r) => r.type === 'user');
      const postResults = searchResults.filter((r) => r.type === 'post');

      // Store results globally
      (window as any).searchQuery = searchTerm;
      (window as any).searchResults = postResults.map((r) => r.data);
      (window as any).userResults = userResults.map((r) => r.data);

      // Navigate to feed to show results
      if (window.location.pathname !== '/feed') {
        history.pushState({ path: '/feed' }, '', '/feed');
      }
      renderRoute('/feed');
    };

    // Enhanced search button handler
    const handleSearchClick = () => {
      const query = searchInput.value.trim();
      if (query) {
        const syntheticEvent = { target: searchInput } as unknown as Event;
        handleSearchInput(syntheticEvent);
      }
    };

    // Add event listeners
    searchInput.addEventListener('input', handleSearchInput);
    searchBtn.addEventListener('click', handleSearchClick);

    // Enhanced keyboard shortcuts
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleSearchClick();
      }
    });
  }

  // Enhanced Global Event Listeners
  setupGlobalEventListeners(searchInput);

  // Update active navigation based on current path
  updateActiveNav();

  // Make updateActiveNav available globally for route changes
  (window as any).updateActiveNav = updateActiveNav;
  (window as any).updateNavbarAfterLogout = updateNavbarAfterLogout;
}

function setupGlobalEventListeners(searchInput: HTMLInputElement | null) {
  // Enhanced Event Listeners
  document.addEventListener('click', function (e) {
    // Close dropdowns when clicking outside
    if (!e.target || !(e.target as Element).closest('.dropdown')) {
      document.querySelectorAll('.dropdown-content').forEach((dropdown) => {
        dropdown.classList.remove('show');
      });
    }

    // Close modals when clicking outside
    if ((e.target as Element).classList?.contains('modal')) {
      if (typeof (window as any).closeModal === 'function') {
        (window as any).closeModal();
      }
      if (typeof (window as any).closeEditModal === 'function') {
        (window as any).closeEditModal();
      }
    }
  });

  // Enhanced Keyboard shortcuts
  document.addEventListener('keydown', function (e) {
    // Ctrl/Cmd + K for search focus
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    }

    // Escape to clear search and close modals
    if (e.key === 'Escape') {
      // Clear search
      if (searchInput && document.activeElement === searchInput) {
        searchInput.value = '';
        searchInput.blur();
        // Clear search results
        (window as any).searchQuery = null;
        if (window.location.pathname === '/feed') {
          renderRoute('/feed');
        }
      }

      // Close modals
      if (typeof (window as any).closeModal === 'function') {
        (window as any).closeModal();
      }
      if (typeof (window as any).closeEditModal === 'function') {
        (window as any).closeEditModal();
      }

      // Close dropdowns
      document.querySelectorAll('.dropdown-content').forEach((dropdown) => {
        dropdown.classList.remove('show');
      });
    }

    // Ctrl/Cmd + Enter to submit post
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      const activeElement = document.activeElement as HTMLElement;
      if (activeElement?.id === 'newPostContent') {
        if (typeof (window as any).createPost === 'function') {
          (window as any).createPost();
        }
      } else if (activeElement?.id === 'editPostContent') {
        const editForm = document.getElementById(
          'editPostForm'
        ) as HTMLFormElement;
        if (editForm) {
          editForm.dispatchEvent(new Event('submit'));
        }
      }
    }
  });

  // Theme toggle functionality
  const themeToggle = document.getElementById('theme-toggle');
  const mobileThemeToggle = document.getElementById('mobile-theme-toggle');
  // Using inline SVGs now; no FA icon required here
  const sunIcon = document.querySelector('.icon-sun') as HTMLElement | null;
  const moonIcon = document.querySelector('.icon-moon') as HTMLElement | null;
  const mobileThemeIcon = document.querySelector('.mobile-theme-icon');
  const mobileThemeText = document.querySelector('.mobile-theme-text');

  // Initialize theme based on localStorage or system preference
  const initTheme = () => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia(
      '(prefers-color-scheme: dark)'
    ).matches;

    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      document.documentElement.classList.add('dark');
      if (sunIcon) sunIcon.style.display = 'inline';
      if (moonIcon) moonIcon.style.display = 'none';
      if (mobileThemeIcon)
        mobileThemeIcon.className = 'fa-solid fa-sun text-sm mobile-theme-icon';
      if (mobileThemeText) mobileThemeText.textContent = 'Light Mode';
    } else {
      document.documentElement.classList.remove('dark');
      if (sunIcon) sunIcon.style.display = 'none';
      if (moonIcon) moonIcon.style.display = 'inline';
      if (mobileThemeIcon)
        mobileThemeIcon.className = 'fa-solid fa-moon text-sm mobile-theme-icon';
      if (mobileThemeText) mobileThemeText.textContent = 'Dark Mode';
    }
  };

  // Toggle theme function
  const toggleTheme = () => {
    const isDark = document.documentElement.classList.contains('dark');

    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      if (sunIcon) sunIcon.style.display = 'none';
      if (moonIcon) moonIcon.style.display = 'inline';
      if (mobileThemeIcon)
        mobileThemeIcon.className = 'fa-solid fa-moon text-sm mobile-theme-icon';
      if (mobileThemeText) mobileThemeText.textContent = 'Dark Mode';
      const btn = document.getElementById('theme-toggle');
      if (btn) btn.setAttribute('aria-pressed', 'false');
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      if (sunIcon) sunIcon.style.display = 'inline';
      if (moonIcon) moonIcon.style.display = 'none';
      if (mobileThemeIcon)
        mobileThemeIcon.className = 'fa-solid fa-sun text-sm mobile-theme-icon';
      if (mobileThemeText) mobileThemeText.textContent = 'Light Mode';
      const btn = document.getElementById('theme-toggle');
      if (btn) btn.setAttribute('aria-pressed', 'true');
    }

    // Notify listeners
    document.dispatchEvent(new Event('linka-theme-changed'));
  };

  // Initialize theme on load
  initTheme();

  // Theme toggle event listeners
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }

  if (mobileThemeToggle) {
    mobileThemeToggle.addEventListener('click', toggleTheme);
  }
}

function updateActiveNav() {
  const currentPath = window.location.pathname;
  const navButtons = document.querySelectorAll('.nav-btn');

  // Remove active class from all buttons
  navButtons.forEach((btn) => btn.classList.remove('active'));

  // Add active class to current page button (both desktop and mobile)
  if (currentPath === '/feed') {
    document.getElementById('nav-feed')?.classList.add('active');
    document.getElementById('mobile-nav-feed')?.classList.add('active');
  } else if (currentPath === '/profile') {
    document.getElementById('nav-profile')?.classList.add('active');
    document.getElementById('mobile-nav-profile')?.classList.add('active');
  } else if (currentPath === '/') {
    document.getElementById('nav-login')?.classList.add('active');
    document.getElementById('mobile-nav-login')?.classList.add('active');
  }
}

function updateNavbarAfterLogout() {
  // Remove existing navbar and recreate it
  const navbar = document.querySelector('#app-navbar');
  if (navbar) {
    navbar.remove();
  }

  // Re-add updated navbar
  const newNavbar = NavbarPage();
  document.body.insertAdjacentHTML('afterbegin', newNavbar);

  // Re-initialize navbar
  initNavbar();
}

function showLogoutMessage() {
  // Create temporary notification
  const notification = document.createElement('div');
  notification.className = 'logout-notification';
  notification.innerHTML = `
    <div class="notification-content">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 12l2 2 4-4"></path>
        <circle cx="12" cy="12" r="9"></circle>
      </svg>
      Successfully logged out!
    </div>
  `;

  document.body.appendChild(notification);

  // Remove notification after 3 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 3000);
}
