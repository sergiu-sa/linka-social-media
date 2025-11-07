/**
 * Enhanced FeedPage with full CRUD, Comments, and Reactions functionality
 * @file Enhanced FeedPage.ts - COMPLETE VERSION
 */

import postCard from '../components/postCard';
import {
  getAllPosts,
  getPublicPosts,
  createPost,
  updatePost,
  deletePost,
  type NoroffPost,
} from '../services/posts/posts';
import {
  createComment,
  toggleReaction,
  deleteComment,
} from '../services/interactions/interactions';
import { getLocalItem } from '../utils/storage';
import { renderRoute } from '../router';
import { fetchApiKey } from '../services/api/client';
import { setLocalItem } from '../utils/storage';

/* ---------- Auth helpers (token from any key) ---------- */
const tokenFromAnyKey = () =>
  localStorage.getItem('accessToken') ||
  localStorage.getItem('token') ||
  (JSON.parse(localStorage.getItem('auth') || 'null')?.accessToken ?? '');

const isLoggedInNow = () => !!tokenFromAnyKey();

async function ensureApiKey(): Promise<void> {
  const token =
    localStorage.getItem('accessToken') ||
    localStorage.getItem('token') ||
    (JSON.parse(localStorage.getItem('auth') || 'null')?.accessToken ?? '');

  const hasKey = !!localStorage.getItem('apiKey');
  if (token && !hasKey) {
    try {
      const key = await fetchApiKey(token);
      if (key) setLocalItem('apiKey', key);
    } catch (e) {
      console.warn('ensureApiKey(): failed to get API key', e);
    }
  }
}

/* ---------- Window typings for global handlers ---------- */
declare global {
  interface Window {
    searchQuery?: string;
    searchResults?: NoroffPost[];
    navigateToProfile?: (username: string) => void;
    navigateToPage?: (page: number) => void;
  }
}

const isUserLoggedIn = isLoggedInNow();


if (isUserLoggedIn) {
  await ensureApiKey();
}

export default async function FeedPage(): Promise<string> {
  try {
    const isUserLoggedIn = isLoggedInNow();

    // Check for search results from navbar
    const searchQuery = window.searchQuery;
    const searchResults = window.searchResults as NoroffPost[];
    const isSearchMode = Boolean(searchQuery && searchResults);

    let posts: NoroffPost[] = [];
    let postsResponse: any;

    if (isSearchMode) {
      posts = searchResults;
      postsResponse = {
        data: posts,
        meta: {
          currentPage: 1,
          pageCount: 1,
          totalCount: posts.length,
          isFirstPage: true,
          isLastPage: true,
        },
      };
    } else {
      const urlParams = new URLSearchParams(window.location.search);
      const currentPage = parseInt(urlParams.get('page') || '1', 10);
      const postsPerPage = 15;

      try {
        postsResponse = isUserLoggedIn
          ? await getAllPosts(postsPerPage, currentPage)
          : await getPublicPosts(postsPerPage, currentPage);
        posts = postsResponse.data;
      } catch (error) {
        console.log('Failed to load posts:', error);
        posts = [];
        postsResponse = {
          data: [],
          meta: {
            currentPage: 1,
            pageCount: 1,
            totalCount: 0,
            isFirstPage: true,
            isLastPage: true,
          },
        };
      }
    }

    // Initialize event listeners after DOM is rendered
    setTimeout(() => {
      initializeFeedInteractions();

      // If auth state changes (login/register on Intro page), re-render feed
      const onAuthChanged = () => renderRoute('/feed?ts=' + Date.now());
      document.addEventListener('auth:changed', onAuthChanged);
      window.addEventListener('storage', onAuthChanged);

      // Store cleanup on the container so the router can remove later if needed
      const container = document.getElementById('posts-container');
      if (container) {
        (container as any)._cleanup = () => {
          document.removeEventListener('auth:changed', onAuthChanged);
          window.removeEventListener('storage', onAuthChanged);
        };
      }
    }, 100);

    return `
      <div class="min-h-screen bg-slate-50 dark:bg-slate-900 pt-4 px-4 sm:px-6 lg:px-8" style="background-image: radial-gradient(circle at 20% 30%, rgba(251, 146, 60, 0.03) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(249, 115, 22, 0.02) 0%, transparent 50%);">
        <main class="max-w-5xl mx-auto">
          <!-- Feed Header -->
          <header class="text-center mb-10 pt-20">
            <h1 class="text-4xl sm:text-5xl md:text-6xl font-bold bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700 dark:from-orange-400 dark:via-orange-500 dark:to-orange-600 bg-clip-text text-transparent mb-3 leading-tight">
              ${isUserLoggedIn ? 'Your Feed' : 'Social Feed'}
            </h1>
            <p class="text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto font-medium">
              ${
                isUserLoggedIn
                  ? `Discover what's happening in your network${
                      !isSearchMode
                        ? ` • Page ${postsResponse.meta.currentPage} of ${postsResponse.meta.pageCount}`
                        : ''
                    }`
                  : `Explore public posts and discover interesting content${
                      !isSearchMode
                        ? ` • Page ${postsResponse.meta.currentPage} of ${postsResponse.meta.pageCount}`
                        : ''
                    }`
              }
            </p>
          </header>

          <!-- Create Post Form (only logged-in users) -->
          ${
            isUserLoggedIn
              ? `
        <section class="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 mb-10 border-2 border-slate-200 dark:border-slate-700 shadow-lg transition-all duration-300 hover:shadow-xl" id="create-post-box">
           <form id="create-post-form" class="create-post-form">
               <!-- Collapsed View -->
               <div class="collapsed-view relative">
                 <i class="fa-solid fa-wand-magic-sparkles absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none"></i>
                 <input
                   type="text"
                   id="collapsed-input"
                   placeholder="Share something amazing..."
                   readonly
                   class="w-full p-4 sm:p-5 pl-12 bg-slate-100 dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white text-base sm:text-lg placeholder-slate-500 dark:placeholder-slate-400 cursor-pointer transition-all duration-300 hover:bg-slate-200 dark:hover:bg-slate-600 hover:border-orange-400 dark:hover:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                 />
               </div>

               <!-- Expanded View (hidden until clicked) -->
               <div class="expanded-fields" style="display: none;">
                 <h2 class="text-2xl font-bold text-orange-600 dark:text-orange-500 mb-6">Create a Post</h2>
                 <div class="mb-6">
                   <label for="post-title" class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Title</label>
                   <input type="text" id="post-title" name="title" placeholder="Enter a captivating title" required
                          class="w-full p-4 bg-slate-50 dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 transition-all duration-300 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20" />
                 </div>
                 <div class="mb-6">
                   <label for="post-body" class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Body</label>
                   <textarea id="post-body" name="body" rows="5" placeholder="Share your thoughts with the world..." required
                             class="w-full p-4 bg-slate-50 dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 transition-all duration-300 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 resize-none"></textarea>
                 </div>
                 <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                   <div>
                     <label for="post-tags" class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Tags</label>
                     <input type="text" id="post-tags" name="tags" placeholder="e.g. nature, coding, life"
                            class="w-full p-4 bg-slate-50 dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 transition-all duration-300 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20" />
                   </div>
                   <div>
                     <label for="post-image-url" class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Image URL</label>
                     <input type="url" id="post-image-url" name="imageUrl" placeholder="https://example.com/image.jpg"
                            class="w-full p-4 bg-slate-50 dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 transition-all duration-300 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20" />
                   </div>
                 </div>
                 <div class="mb-6">
                   <label for="post-image-alt" class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Image Alt Text</label>
                   <input type="text" id="post-image-alt" name="imageAlt" placeholder="Describe the image for accessibility"
                          class="w-full p-4 bg-slate-50 dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 transition-all duration-300 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20" />
                 </div>

                 <div class="flex flex-col sm:flex-row gap-4 justify-end pt-6 border-t-2 border-slate-200 dark:border-slate-700">
                   <button type="button" id="cancel-post-btn" class="px-6 py-3 border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold transition-all duration-300 hover:bg-slate-100 dark:hover:bg-slate-600 hover:border-slate-400 dark:hover:border-slate-500">Cancel</button>
                   <button type="submit" class="px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold transition-all duration-300 hover:shadow-lg hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-orange-500/50">Post</button>
                 </div>
               </div>
             </form>
        </section>
      `
              : ''
          }

          <!-- Posts Container -->
          <div class="space-y-8 mb-12" id="posts-container">
            ${
              posts.length > 0
                ? posts
                    .map((post, index) => postCard(post, index * 0.1))
                    .join('')
                : isSearchMode
                  ? renderEmptyState(
                      '🔍',
                      'No posts found',
                      'Try searching with different keywords'
                    )
                  : renderEmptyState(
                      '🔭',
                      'No posts available',
                      isUserLoggedIn
                        ? 'Start following people to see their posts!'
                        : 'No posts to display at the moment. Try refreshing the page.',
                      !isUserLoggedIn
                        ? `<button class="mt-6 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-medium transition-all duration-300 hover:from-indigo-600 hover:to-purple-600 hover:shadow-lg hover:scale-105" onclick="window.location.href='/'">🔐 Sign In for More Content</button>`
                        : ''
                    )
            }
          </div>

          <!-- Pagination Controls (only show when not in search mode) -->
          ${!isSearchMode ? renderPaginationControls(postsResponse.meta) : ''}
        </main>
      </div>

      <!-- Edit Post Modal -->
      <div class="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-50 flex items-center justify-center p-4 transition-all duration-300" id="editPostModal" style="display: none;">
        <div class="bg-slate-800/90 backdrop-blur-lg border border-slate-600/50 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl shadow-indigo-500/10 transform transition-all duration-300">
          <div class="flex justify-between items-center p-6 border-b border-slate-600/50 bg-slate-700/50 rounded-t-2xl">
            <h3 class="text-xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">✏️ Edit Your Post</h3>
            <button class="w-10 h-10 bg-slate-700/50 border border-slate-600/50 rounded-full flex items-center justify-center text-slate-400 hover:bg-red-500 hover:text-white hover:border-red-400 hover:rotate-90 hover:scale-110 transition-all duration-300" onclick="closeEditModal()">×</button>
          </div>
          <form id="editPostForm" class="p-6">
            <div class="mb-6">
              <label for="editPostTitle" class="block text-sm font-medium text-slate-300 mb-2">Title</label>
              <input type="text" id="editPostTitle" required 
                     class="w-full p-3 bg-slate-700/60 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 transition-all duration-300 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30" />
            </div>
            <div class="mb-6">
              <label for="editPostBody" class="block text-sm font-medium text-slate-300 mb-2">Body</label>
              <textarea id="editPostBody" rows="6" required
                        class="w-full p-3 bg-slate-700/60 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 transition-all duration-300 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 resize-none"></textarea>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label for="editPostTags" class="block text-sm font-medium text-slate-300 mb-2">Tags (comma separated)</label>
                <input type="text" id="editPostTags" 
                       class="w-full p-3 bg-slate-700/60 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 transition-all duration-300 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30" />
              </div>
              <div>
                <label for="editPostImageUrl" class="block text-sm font-medium text-slate-300 mb-2">Image URL</label>
                <input type="url" id="editPostImageUrl" 
                       class="w-full p-3 bg-slate-700/60 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 transition-all duration-300 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30" />
              </div>
            </div>
            <div class="mb-6">
              <label for="editPostImageAlt" class="block text-sm font-medium text-slate-300 mb-2">Image Alt Text</label>
              <input type="text" id="editPostImageAlt" 
                     class="w-full p-3 bg-slate-700/60 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 transition-all duration-300 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30" />
            </div>
            <div class="flex flex-col sm:flex-row gap-4 justify-end pt-4 border-t border-slate-600/50">
              <button type="button" class="px-6 py-3 border border-slate-600/50 bg-slate-700/50 text-slate-300 rounded-xl font-medium transition-all duration-300 hover:bg-slate-600/50 hover:text-white" onclick="closeEditModal()">Cancel</button>
              <button type="submit" class="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-medium transition-all duration-300 hover:from-indigo-600 hover:to-purple-600 hover:shadow-lg hover:scale-105">💾 Update Post</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Full Post View Modal -->
      <div class="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-50 flex items-center justify-center p-4 transition-all duration-300" id="fullPostModal" style="display: none;">
        <div class="bg-slate-800/90 backdrop-blur-lg border border-slate-600/50 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl shadow-indigo-500/10">
          <div class="flex justify-between items-center p-6 border-b border-slate-600/50 bg-slate-700/50 rounded-t-2xl">
            <h3 class="text-xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Full Post</h3>
            <button class="w-10 h-10 bg-slate-700/50 border border-slate-600/50 rounded-full flex items-center justify-center text-slate-400 hover:bg-red-500 hover:text-white hover:border-red-400 hover:rotate-90 hover:scale-110 transition-all duration-300" onclick="closeFullPostModal()">×</button>
          </div>
          <div id="fullPostContent" class="p-6"></div>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Error loading feed:', error);
    return renderErrorState();
  }
}

/* -------------------------------------------------------------------------- */
/*                               Helper Functions                             */
/* -------------------------------------------------------------------------- */

function renderEmptyState(
  icon: string,
  title: string,
  message: string,
  extra: string = ''
): string {
  return `
    <div class="text-center p-8 sm:p-12 bg-slate-800/60 backdrop-blur-lg border border-slate-600/30 rounded-2xl">
      <div class="text-4xl sm:text-6xl mb-6">${icon}</div>
      <h3 class="text-lg sm:text-xl font-semibold text-white mb-4">${title}</h3>
      <p class="text-slate-400 text-sm sm:text-base max-w-md mx-auto mb-6 leading-relaxed">${message}</p>
      ${extra}
    </div>
  `;
}

function renderErrorState(): string {
  return `
    <div class="min-h-screen bg-slate-900 pt-4 px-4 sm:px-6 lg:px-8" style="background-image: radial-gradient(circle at 25% 25%, rgba(99, 102, 241, 0.1) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(236, 72, 153, 0.1) 0%, transparent 50%), radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.05) 0%, transparent 50%);">
      <main class="max-w-2xl mx-auto">
        <div class="text-center p-8 sm:p-12 bg-slate-800/60 backdrop-blur-lg border border-slate-600/30 rounded-2xl mt-20">
          <div class="text-4xl sm:text-6xl mb-6">⚠️</div>
          <h2 class="text-xl sm:text-2xl font-bold text-white mb-4">Something went wrong</h2>
          <p class="text-slate-400 text-sm sm:text-base mb-8 leading-relaxed">We couldn't load the posts right now. Please try again.</p>
          <button class="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-medium transition-all duration-300 hover:from-indigo-600 hover:to-purple-600 hover:shadow-lg hover:scale-105" onclick="window.location.reload()">Try Again</button>
        </div>
      </main>
    </div>
  `;
}

function renderPaginationControls(meta: any): string {
  if (!meta || meta.pageCount <= 1) return '';

  const currentPage = meta.currentPage;
  const totalPages = meta.pageCount;
  const hasPrev = !meta.isFirstPage;
  const hasNext = !meta.isLastPage;

  // Generate smart page numbers (show current, neighbors, first, and last)
  const pageNumbers: (number | string)[] = [];

  // Always show first page
  if (currentPage > 3) {
    pageNumbers.push(1);
    if (currentPage > 4) pageNumbers.push('...');
  }

  // Show pages around current
  for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
    if (!pageNumbers.includes(i)) pageNumbers.push(i);
  }

  // Always show last page
  if (currentPage < totalPages - 2) {
    if (currentPage < totalPages - 3) pageNumbers.push('...');
    pageNumbers.push(totalPages);
  }

  return `
    <div class="mt-12 p-6 sm:p-8 bg-white dark:bg-slate-800 rounded-3xl border-2 border-slate-200 dark:border-slate-700 shadow-lg">
      <!-- Page Info -->
      <div class="text-center mb-6">
        <p class="text-sm text-slate-600 dark:text-slate-400 mb-1">
          Showing page <span class="font-bold text-orange-600 dark:text-orange-500">${currentPage}</span> of <span class="font-bold text-orange-600 dark:text-orange-500">${totalPages}</span>
        </p>
        <p class="text-xs text-slate-500 dark:text-slate-500">
          Total: ${meta.totalCount} posts
        </p>
      </div>

      <!-- Pagination Buttons -->
      <div class="flex items-center justify-center gap-2 flex-wrap">
        <!-- First Page Button -->
        <button
          class="flex items-center justify-center w-10 h-10 rounded-xl font-semibold text-sm transition-all duration-300 ${
            hasPrev
              ? 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-orange-100 dark:hover:bg-orange-900/20 hover:text-orange-600 dark:hover:text-orange-500 hover:scale-110'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-600 cursor-not-allowed'
          }"
          onclick="navigateToPage(1)"
          ${!hasPrev ? 'disabled' : ''}
          title="First page"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"></path>
          </svg>
        </button>

        <!-- Previous Button -->
        <button
          class="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 ${
            hasPrev
              ? 'bg-orange-500 hover:bg-orange-600 text-white hover:scale-105 hover:shadow-lg'
              : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-600 cursor-not-allowed'
          }"
          onclick="navigateToPage(${currentPage - 1})"
          ${!hasPrev ? 'disabled' : ''}
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"></path>
          </svg>
          <span class="hidden sm:inline">Prev</span>
        </button>

        <!-- Page Numbers -->
        ${pageNumbers.map(pageNum => {
          if (pageNum === '...') {
            return `<span class="px-2 text-slate-400 dark:text-slate-600">...</span>`;
          }

          const isActive = pageNum === currentPage;
          return `
            <button
              class="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl font-semibold text-sm transition-all duration-300 ${
                isActive
                  ? 'bg-orange-500 text-white shadow-lg ring-2 ring-orange-300 dark:ring-orange-700 scale-110'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-orange-100 dark:hover:bg-orange-900/20 hover:text-orange-600 dark:hover:text-orange-500 hover:scale-110'
              }"
              onclick="navigateToPage(${pageNum})"
              ${isActive ? 'disabled' : ''}
            >
              ${pageNum}
            </button>
          `;
        }).join('')}

        <!-- Next Button -->
        <button
          class="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 ${
            hasNext
              ? 'bg-orange-500 hover:bg-orange-600 text-white hover:scale-105 hover:shadow-lg'
              : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-600 cursor-not-allowed'
          }"
          onclick="navigateToPage(${currentPage + 1})"
          ${!hasNext ? 'disabled' : ''}
        >
          <span class="hidden sm:inline">Next</span>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"></path>
          </svg>
        </button>

        <!-- Last Page Button -->
        <button
          class="flex items-center justify-center w-10 h-10 rounded-xl font-semibold text-sm transition-all duration-300 ${
            hasNext
              ? 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-orange-100 dark:hover:bg-orange-900/20 hover:text-orange-600 dark:hover:text-orange-500 hover:scale-110'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-600 cursor-not-allowed'
          }"
          onclick="navigateToPage(${totalPages})"
          ${!hasNext ? 'disabled' : ''}
          title="Last page"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path>
          </svg>
        </button>
      </div>

      <!-- Quick Jump (on larger screens) -->
      ${totalPages > 10 ? `
      <div class="hidden sm:flex items-center justify-center gap-3 mt-6 pt-6 border-t-2 border-slate-200 dark:border-slate-700">
        <label class="text-sm font-semibold text-slate-600 dark:text-slate-400">Jump to page:</label>
        <input
          type="number"
          min="1"
          max="${totalPages}"
          value="${currentPage}"
          id="pageJumpInput"
          class="w-20 px-3 py-2 bg-slate-100 dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white text-center font-semibold focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30 transition-all duration-200"
          onkeypress="if(event.key === 'Enter') { const val = parseInt(event.target.value); if(val >= 1 && val <= ${totalPages}) navigateToPage(val); }"
        />
        <button
          class="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold text-sm transition-all duration-300 hover:scale-105"
          onclick="const val = parseInt(document.getElementById('pageJumpInput').value); if(val >= 1 && val <= ${totalPages}) navigateToPage(val);"
        >
          Go
        </button>
      </div>
      ` : ''}
    </div>
  `;
}

/* -------------------------------------------------------------------------- */
/*                            Interactions / Events                           */
/* -------------------------------------------------------------------------- */

function initializeFeedInteractions(): void {
  // Handle create post form
  const createForm = document.getElementById(
    'create-post-form'
  ) as HTMLFormElement | null;
  if (createForm) {
    createForm.addEventListener('submit', handleCreatePost);
  }

  // Collapsible create post box
  const postBox = document.getElementById('create-post-box');
  const collapsedInput = document.getElementById('collapsed-input');
  const expandedFields = postBox?.querySelector(
    '.expanded-fields'
  ) as HTMLElement;
  const cancelBtn = document.getElementById('cancel-post-btn');

  if (postBox && collapsedInput && expandedFields) {
    collapsedInput.addEventListener('click', () => {
      postBox.classList.remove('collapsed');
      postBox.classList.add('expanded');
      expandedFields.style.display = 'block';
      collapsedInput.style.display = 'none';
    });

    cancelBtn?.addEventListener('click', () => {
      postBox.classList.remove('expanded');
      postBox.classList.add('collapsed');
      expandedFields.style.display = 'none';
      createForm?.reset();
    });
  }

  // Handle edit post form
  const editForm = document.getElementById(
    'editPostForm'
  ) as HTMLFormElement | null;
  if (editForm) {
    editForm.addEventListener('submit', handleEditPost);
  }

  // Enhanced: Close dropdowns when clicking outside
  document.addEventListener('click', function (e) {
    const target = e.target as Element;
    if (!target.closest('.dropdown')) {
      document.querySelectorAll('.post-menu.show').forEach((menu) => {
        menu.classList.remove('show');
      });
    }
  });

  // Make ALL functions globally available
  (window as any).togglePostMenu = togglePostMenu;
  (window as any).editPost = editPostFunction;
  (window as any).deletePost = deletePostFunction;
  (window as any).toggleComments = toggleComments;
  (window as any).submitComment = submitComment;
  (window as any).startReply = startReply;
  (window as any).cancelReply = cancelReply;
  (window as any).submitReply = submitReply;
  (window as any).deleteCommentFunction = deleteCommentFunction;
  (window as any).toggleReaction = handleToggleReaction;
  (window as any).selectReaction = selectReaction;
  (window as any).viewFullPost = viewFullPost;
  (window as any).closeEditModal = closeEditModal;
  (window as any).closeFullPostModal = closeFullPostModal;
  (window as any).showReactionsModal = showReactionsModal;
  (window as any).hideReactionsModal = hideReactionsModal;

  // Define missing navigation functions
  if (!window.navigateToProfile) {
    (window as any).navigateToProfile = function (username: string) {
      window.location.href = `/profile?user=${username}`;
    };
  }

  if (!window.navigateToPage) {
    (window as any).navigateToPage = function (page: number) {
      const url = new URL(window.location.href);
      url.searchParams.set('page', page.toString());
      window.location.href = url.toString();
    };
  }
}

/* -------------------------------------------------------------------------- */
/*                                Post Create                                 */
/* -------------------------------------------------------------------------- */

async function handleCreatePost(event: Event): Promise<void> {
  event.preventDefault();

  const form = event.target as HTMLFormElement;
  const title = (
    document.getElementById('post-title') as HTMLInputElement
  )?.value.trim();
  const body = (
    document.getElementById('post-body') as HTMLTextAreaElement
  )?.value.trim();
  const rawTags = (
    document.getElementById('post-tags') as HTMLInputElement
  )?.value.trim();
  const tags = rawTags
    ? rawTags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0)
    : [];
  const imageUrl = (
    document.getElementById('post-image-url') as HTMLInputElement
  )?.value.trim();
  const imageAlt = (
    document.getElementById('post-image-alt') as HTMLInputElement
  )?.value.trim();

  if (!title || !body) {
    alert('Title and Body are required.');
    return;
  }

  try {
    const submitBtn = form.querySelector(
      "button[type='submit']"
    ) as HTMLButtonElement;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Posting...';

    const payload: any = { title, body, tags };
    if (imageUrl) payload.media = { url: imageUrl, alt: imageAlt || 'image' };

    const created = await createPost(payload);
    const safePost: NoroffPost = {
      ...created,
      tags: created.tags || [],
      _count: created._count || { comments: 0, reactions: 0 },
      reactions: created.reactions || [],
    };

    // Insert new post at top
    const postsContainer = document.getElementById('posts-container');
    if (postsContainer) {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = postCard(safePost, 0);
      const el = wrapper.firstElementChild;
      if (el) postsContainer.insertBefore(el, postsContainer.firstChild);
    }

    // Reset and collapse form
    form.reset();
    const postBox = document.getElementById('create-post-box');
    const collapsedInput = document.getElementById('collapsed-input');
    const expandedFields = postBox?.querySelector(
      '.expanded-fields'
    ) as HTMLElement;

    if (postBox && collapsedInput && expandedFields) {
      postBox.classList.remove('expanded');
      postBox.classList.add('collapsed');
      expandedFields.style.display = 'none';
      collapsedInput.style.display = 'block';
    }

    submitBtn.disabled = false;
    submitBtn.textContent = 'Post';

    showNotification('✅ Post created successfully!', 'success');
  } catch (err: any) {
    console.error('Error creating post:', err);
    alert(err?.message || 'Failed to create post. Please try again.');
    const submitBtn = form.querySelector(
      "button[type='submit']"
    ) as HTMLButtonElement;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Post';
    }
  }
}

/* -------------------------------------------------------------------------- */
/*                           Post Edit / Delete                               */
/* -------------------------------------------------------------------------- */

function togglePostMenu(postId: number): void {
  // Close all other menus first
  document.querySelectorAll('.post-menu').forEach((menu) => {
    if (menu.id !== `postMenu${postId}`) {
      menu.classList.remove('show');
    }
  });

  const menu = document.getElementById(`postMenu${postId}`);
  if (menu) {
    menu.classList.toggle('show');
  }
}

function editPostFunction(postId: number): void {
  const postElement = document.getElementById(`post-${postId}`);
  if (!postElement) return;

  const title =
    postElement.querySelector('.post-title-compact')?.textContent || '';
  const body = postElement.querySelector('.post-body')?.textContent || '';
  const tags = Array.from(postElement.querySelectorAll('.tag-compact'))
    .map((tag) => tag.textContent?.replace('#', '') || '')
    .filter((tag) => tag.length > 0);

  // Find media info if exists
  const mediaImg = postElement.querySelector(
    '.post-image-preview'
  ) as HTMLImageElement;
  const imageUrl = mediaImg?.src || '';
  const imageAlt = mediaImg?.alt || '';

  // Populate edit form
  (document.getElementById('editPostTitle') as HTMLInputElement).value = title;
  (document.getElementById('editPostBody') as HTMLTextAreaElement).value = body;
  (document.getElementById('editPostTags') as HTMLInputElement).value =
    tags.join(', ');
  (document.getElementById('editPostImageUrl') as HTMLInputElement).value =
    imageUrl;
  (document.getElementById('editPostImageAlt') as HTMLInputElement).value =
    imageAlt;

  // Store post ID for form submission
  const editModal = document.getElementById('editPostModal');
  if (editModal) {
    editModal.dataset.postId = postId.toString();
    editModal.style.display = 'flex';
  }

  // Close post menu
  togglePostMenu(postId);
}

async function handleEditPost(event: Event): Promise<void> {
  event.preventDefault();

  const modal = document.getElementById('editPostModal');
  const postId = Number(modal?.dataset.postId);
  if (!postId) return;

  const title = (
    document.getElementById('editPostTitle') as HTMLInputElement
  ).value.trim();
  const body = (
    document.getElementById('editPostBody') as HTMLTextAreaElement
  ).value.trim();
  const rawTags = (
    document.getElementById('editPostTags') as HTMLInputElement
  ).value.trim();
  const tags = rawTags
    ? rawTags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0)
    : [];
  const imageUrl = (
    document.getElementById('editPostImageUrl') as HTMLInputElement
  ).value.trim();
  const imageAlt = (
    document.getElementById('editPostImageAlt') as HTMLInputElement
  ).value.trim();

  if (!title || !body) {
    alert('Title and Body are required.');
    return;
  }

  try {
    const submitBtn = modal?.querySelector(
      'button[type="submit"]'
    ) as HTMLButtonElement;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Updating...';

    const payload: any = { title, body, tags };
    if (imageUrl) payload.media = { url: imageUrl, alt: imageAlt || 'image' };

    const updated = await updatePost(postId, payload);

    // Update the post in the UI
    const postElement = document.getElementById(`post-${postId}`);
    if (postElement) {
      const titleEl = postElement.querySelector('.post-title-compact');
      const bodyEl = postElement.querySelector('.post-body');
      if (titleEl) titleEl.textContent = updated.title;
      if (bodyEl) bodyEl.textContent = updated.body;

      const tagsContainer = postElement.querySelector('.post-tags-compact');
      if (tagsContainer && updated.tags) {
        tagsContainer.innerHTML =
          updated.tags
            .slice(0, 2)
            .map((tag) => `<span class="tag-compact">#${tag}</span>`)
            .join('') +
          (updated.tags.length > 2
            ? `<span class="tag-more">+${updated.tags.length - 2}</span>`
            : '');
      }

      if (updated.media?.url) {
        let mediaContainer = postElement.querySelector('.post-media-preview');
        if (!mediaContainer) {
          mediaContainer = document.createElement('div');
          mediaContainer.className = 'post-media-preview';
          postElement.insertBefore(mediaContainer, postElement.firstChild);
        }
        mediaContainer.innerHTML = `<img src="${updated.media.url}" alt="${updated.media.alt || 'Post image'}" loading="lazy" class="post-image-preview">`;
      }
    }

    closeEditModal();
    showNotification('✅ Post updated successfully!', 'success');

    submitBtn.disabled = false;
    submitBtn.textContent = '💾 Update Post';
  } catch (error) {
    console.error('Error updating post:', error);
    alert('Failed to update post. Please try again.');

    const submitBtn = modal?.querySelector(
      'button[type="submit"]'
    ) as HTMLButtonElement;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = '💾 Update Post';
    }
  }
}

async function deletePostFunction(postId: number): Promise<void> {
  if (
    !confirm(
      'Are you sure you want to delete this post? This action cannot be undone.'
    )
  ) {
    togglePostMenu(postId);
    return;
  }

  try {
    await deletePost(postId);
    const postElement = document.getElementById(`post-${postId}`);
    if (postElement) {
      postElement.style.opacity = '0';
      postElement.style.transform = 'translateY(-20px)';
      setTimeout(() => postElement.remove(), 300);
    }

    showNotification('✅ Post deleted successfully!', 'success');
  } catch (error) {
    console.error('Error deleting post:', error);
    alert('Failed to delete post. Please try again.');
  }

  togglePostMenu(postId);
}

function closeEditModal(): void {
  const modal = document.getElementById('editPostModal');
  if (modal) {
    modal.style.display = 'none';
    delete (modal as any).dataset.postId;
  }
}

/* -------------------------------------------------------------------------- */
/*                           Comments Functionality                           */
/* -------------------------------------------------------------------------- */

async function toggleComments(postId: number): Promise<void> {
  const commentsSection = document.getElementById(`comments-${postId}`);
  if (!commentsSection) return;

  const isVisible = commentsSection.style.display !== 'none';

  if (isVisible) {
    commentsSection.style.display = 'none';
  } else {
    commentsSection.style.display = 'block';
    await loadComments(postId);
  }
}

async function loadComments(postId: number): Promise<void> {
  const commentsList = document.getElementById(`comments-list-${postId}`);
  if (!commentsList) return;

  commentsList.innerHTML =
    '<div class="no-comments">No comments yet. Be the first to comment!</div>';
}

async function submitComment(postId: number): Promise<void> {
  const input = document.getElementById(
    `comment-input-${postId}`
  ) as HTMLInputElement;
  const commentText = input?.value.trim();

  if (!commentText) {
    input?.focus();
    return;
  }

  if (commentText.length > 280) {
    alert('Comment is too long. Maximum 280 characters allowed.');
    return;
  }

  const submitBtn = document.querySelector(
    `[onclick="submitComment(${postId})"]`
  ) as HTMLButtonElement;

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<div class="loading-spinner-small"></div>';
    }

    const response = await createComment(postId.toString(), commentText);

    input.value = '';

    addCommentToUI(postId, {
      id: response.data.id,
      body: commentText,
      author: {
        name: getLocalItem('user') || 'You',
        email: '',
        avatar: null,
      },
      created: new Date().toISOString(),
      postId: postId.toString(),
      replyToId: null,
      owner: getLocalItem('user') || '',
      updated: new Date().toISOString(),
    });

    const commentCountEl = document.querySelector(
      `[data-post-id="${postId}"].comment-btn .action-count-compact`
    );
    if (commentCountEl) {
      const currentCount = parseInt(commentCountEl.textContent || '0');
      (commentCountEl as HTMLElement).textContent = (
        currentCount + 1
      ).toString();
    }

    showNotification('Comment added!', 'success');
  } catch (error: any) {
    console.error('Error creating comment:', error);
    if (error.message?.includes('unauthorized')) {
      alert('Please log in to comment on posts.');
    } else if (error.message?.includes('not found')) {
      alert('Post not found. Please refresh the page.');
    } else {
      alert('Failed to post comment. Please try again.');
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22,2 15,22 11,13 2,9 22,2"></polygon>
        </svg>
      `;
    }
  }
}

function addCommentToUI(postId: number, comment: any): void {
  const commentsList = document.getElementById(`comments-list-${postId}`);
  if (!commentsList) return;

  const noCommentsMsg = commentsList.querySelector('.no-comments');
  if (noCommentsMsg) noCommentsMsg.remove();

  const timeAgo = 'now';
  const currentUserName = getLocalItem('user');
  const isOwner = currentUserName && comment.author.name === currentUserName;

  const commentHTML = `
    <div class="comment-item" data-comment-id="${comment.id}" style="animation-delay: 0s">
      <div class="comment-avatar">
        <div class="comment-avatar-placeholder">${comment.author.name.charAt(0).toUpperCase()}</div>
      </div>
      <div class="comment-content">
        <div class="comment-header">
          <span class="comment-author">${comment.author.name}</span>
          <span class="comment-time">${timeAgo}</span>
        </div>
        <div class="comment-text">${comment.body}</div>
        <div class="comment-actions">
          <button class="comment-action-btn reply-btn" onclick="startReply(${comment.id}, '${comment.author.name}')">Reply</button>
          ${
            isOwner
              ? `<button class="comment-action-btn delete-btn" onclick="deleteCommentFunction(${postId}, ${comment.id})">Delete</button>`
              : ''
          }
        </div>
        <div class="reply-form" id="reply-form-${comment.id}" style="display: none;">
          <div class="reply-input-container">
            <input type="text" id="reply-input-${comment.id}" class="reply-input" placeholder="Write a reply..." maxlength="280" onkeypress="if(event.key === 'Enter') submitReply(${postId}, ${comment.id})">
            <button class="reply-submit-btn" onclick="submitReply(${postId}, ${comment.id})">Send</button>
            <button class="reply-cancel-btn" onclick="cancelReply(${comment.id})">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  `;

  commentsList.insertAdjacentHTML('beforeend', commentHTML);
}

/* -------------------------------------------------------------------------- */
/*                            Reply Functionality                             */
/* -------------------------------------------------------------------------- */

function startReply(commentId: number, authorName: string): void {
  document.querySelectorAll('.reply-form').forEach((form) => {
    (form as HTMLElement).style.display = 'none';
  });

  const replyForm = document.getElementById(`reply-form-${commentId}`);
  const replyInput = document.getElementById(
    `reply-input-${commentId}`
  ) as HTMLInputElement;

  if (replyForm && replyInput) {
    replyForm.style.display = 'block';
    replyInput.value = `@${authorName} `;
    replyInput.focus();
    replyInput.setSelectionRange(
      replyInput.value.length,
      replyInput.value.length
    );
  }
}

function cancelReply(commentId: number): void {
  const replyForm = document.getElementById(`reply-form-${commentId}`);
  const replyInput = document.getElementById(
    `reply-input-${commentId}`
  ) as HTMLInputElement;

  if (replyForm && replyInput) {
    replyForm.style.display = 'none';
    replyInput.value = '';
  }
}

async function submitReply(
  postId: number,
  parentCommentId: number
): Promise<void> {
  const replyInput = document.getElementById(
    `reply-input-${parentCommentId}`
  ) as HTMLInputElement;
  const replyText = replyInput?.value.trim();

  if (!replyText) {
    replyInput?.focus();
    return;
  }
  if (replyText.length > 280) {
    alert('Reply is too long. Maximum 280 characters allowed.');
    return;
  }

  try {
    const response = await createComment(
      postId.toString(),
      replyText,
      parentCommentId.toString()
    );

    replyInput.value = '';
    cancelReply(parentCommentId);

    addCommentToUI(postId, {
      id: response.data.id,
      body: replyText,
      author: { name: getLocalItem('user') || 'You', email: '', avatar: null },
      created: new Date().toISOString(),
      postId: postId.toString(),
      replyToId: parentCommentId.toString(),
      owner: getLocalItem('user') || '',
      updated: new Date().toISOString(),
    });

    const commentCountEl = document.querySelector(
      `[data-post-id="${postId}"].comment-btn .action-count-compact`
    );
    if (commentCountEl) {
      const currentCount = parseInt(commentCountEl.textContent || '0');
      (commentCountEl as HTMLElement).textContent = (
        currentCount + 1
      ).toString();
    }

    showNotification('Reply added!', 'success');
  } catch (error: any) {
    console.error('Error creating reply:', error);
    alert('Failed to post reply. Please try again.');
  }
}

/* -------------------------------------------------------------------------- */
/*                           Delete Comment                                   */
/* -------------------------------------------------------------------------- */

async function deleteCommentFunction(
  postId: number,
  commentId: number
): Promise<void> {
  if (!confirm('Are you sure you want to delete this comment?')) return;

  try {
    await deleteComment(postId.toString(), commentId.toString());

    const commentElement = document.querySelector(
      `[data-comment-id="${commentId}"]`
    ) as HTMLElement;
    if (commentElement) {
      commentElement.style.opacity = '0';
      commentElement.style.transform = 'translateX(-20px)';
      setTimeout(() => commentElement.remove(), 300);
    }

    const commentCountEl = document.querySelector(
      `[data-post-id="${postId}"].comment-btn .action-count-compact`
    );
    if (commentCountEl) {
      const currentCount = parseInt(commentCountEl.textContent || '0');
      (commentCountEl as HTMLElement).textContent = Math.max(
        0,
        currentCount - 1
      ).toString();
    }

    showNotification('Comment deleted!', 'success');
  } catch (error: any) {
    console.error('Error deleting comment:', error);
    alert('Failed to delete comment. Please try again.');
  }
}

/* -------------------------------------------------------------------------- */
/*                          Reactions Functionality                           */
/* -------------------------------------------------------------------------- */

async function handleToggleReaction(
  postId: number,
  emoji: string
): Promise<void> {
  if (!isLoggedInNow()) {
    alert('Please log in to react to posts.');
    return;
  }

  try {
    const wasAdded = await toggleReaction(postId.toString(), emoji);

    const reactionCount = document.querySelector(
      `[data-post-id="${postId}"].like-btn .action-count-compact`
    );
    if (reactionCount) {
      const currentCount = parseInt(reactionCount.textContent || '0');
      (reactionCount as HTMLElement).textContent = wasAdded
        ? (currentCount + 1).toString()
        : Math.max(0, currentCount - 1).toString();
    }

    const likeBtn = document.querySelector(
      `[data-post-id="${postId}"].like-btn`
    );
    if (likeBtn) {
      if (wasAdded) likeBtn.classList.add('reacted');
      else likeBtn.classList.remove('reacted');
    }
  } catch (error) {
    console.error('Error toggling reaction:', error);
    alert('Failed to react to post. Please try again.');
  }
}

function selectReaction(postId: number, emoji: string): void {
  handleToggleReaction(postId, emoji);
  const reactionsModal = document.getElementById(`reactions-${postId}`);
  if (reactionsModal) reactionsModal.style.display = 'none';
}

function showReactionsModal(postId: number): void {
  const modal = document.getElementById(`reactions-${postId}`);
  if (modal) modal.style.display = 'block';
}

function hideReactionsModal(postId: number): void {
  setTimeout(() => {
    const modal = document.getElementById(`reactions-${postId}`);
    if (modal && !modal.matches(':hover')) modal.style.display = 'none';
  }, 200);
}

/* -------------------------------------------------------------------------- */
/*                           Full Post View                                   */
/* -------------------------------------------------------------------------- */

function viewFullPost(postId: number): void {
  const postElement = document.getElementById(`post-${postId}`);
  if (!postElement) return;

  const title =
    postElement.querySelector('.post-title-compact')?.textContent || '';
  const body = postElement.querySelector('.post-body')?.textContent || '';
  const author =
    postElement.querySelector('.author-name-compact')?.textContent || '';
  const time =
    postElement.querySelector('.post-time-compact')?.textContent || '';
  const mediaImg = postElement.querySelector(
    '.post-image-preview'
  ) as HTMLImageElement;
  const tags = Array.from(postElement.querySelectorAll('.tag-compact'))
    .map((tag) => tag.textContent?.replace('#', '') || '')
    .filter((tag) => tag.length > 0);

  const likeCount =
    postElement.querySelector('.like-btn .action-count-compact')?.textContent ||
    '0';
  const commentCount =
    postElement.querySelector('.comment-btn .action-count-compact')
      ?.textContent || '0';

  const avatarImg = postElement.querySelector(
    '.avatar-img-small'
  ) as HTMLImageElement;
  const avatarUrl = avatarImg?.src || '';

  const fullPostContent = document.getElementById('fullPostContent');
  if (!fullPostContent) return;

  fullPostContent.innerHTML = `
    <article class="full-post-card">
      ${mediaImg ? `<div class="full-post-media"><img src="${mediaImg.src}" alt="${mediaImg.alt}" loading="lazy" class="full-post-image"></div>` : ''}

      <header class="full-post-header">
        <div class="author-info">
          <div class="author-avatar">
            ${
              avatarUrl
                ? `<img src="${avatarUrl}" alt="${author}" loading="lazy" class="avatar-img">`
                : `<div class="avatar-placeholder">${author.charAt(0).toUpperCase()}</div>`
            }
          </div>
          <div class="author-details">
            <h4 class="author-name">
              <a href="/profile?user=${author}" class="author-link" onclick="event.preventDefault(); navigateToProfile('${author}')">${author}</a>
            </h4>
            <p class="post-time">${time}</p>
          </div>
        </div>
      </header>

      <div class="full-post-content">
        ${title ? `<h2 class="full-post-title">${title}</h2>` : ''}
        <div class="full-post-text">${body}</div>
        ${
          tags.length
            ? `<div class="full-post-tags">${tags.map((tag) => `<span class="tag">#${tag}</span>`).join('')}</div>`
            : ''
        }
      </div>

      <footer class="full-post-actions">
        <div class="action-buttons">
          <div style="position: relative;">
            <button class="action-btn like-btn" data-post-id="${postId}"
              onclick="toggleReaction(${postId}, '❤️')"
              onmouseenter="showReactionsModal(${postId})"
              onmouseleave="hideReactionsModal(${postId})">
              ❤️ <span class="action-count">${likeCount}</span>
            </button>
            <div class="reactions-modal" id="reactions-${postId}" style="display: none;">
              <div class="reactions-list">
                ${['👍', '❤️', '😂', '😮', '😢', '😡'].map((e) => `<button class="reaction-btn" onclick="selectReaction(${postId}, '${e}')">${e}</button>`).join('')}
              </div>
            </div>
          </div>

          <button class="action-btn comment-btn" data-post-id="${postId}" onclick="toggleComments(${postId}); closeFullPostModal();">
            💬 <span class="action-count">${commentCount}</span>
          </button>

          <button class="action-btn share-btn" onclick="sharePost(${postId})">
            📤 <span class="action-label">Share</span>
          </button>
        </div>
      </footer>
    </article>
  `;

  const modal = document.getElementById('fullPostModal');
  if (modal) modal.style.display = 'flex';
}

function closeFullPostModal(): void {
  const modal = document.getElementById('fullPostModal');
  if (modal) modal.style.display = 'none';
}

/* -------------------------------------------------------------------------- */
/*                          Utility Functions                                */
/* -------------------------------------------------------------------------- */

function showNotification(
  message: string,
  type: 'success' | 'error' | 'info' = 'info'
): void {
  const notification = document.createElement('div');
  notification.className = `notification ${type}-notification`;
  notification.innerHTML = `<div class="notification-content">${message}</div>`;
  notification.style.cssText = `
    position: fixed; top: 90px; right: 20px; z-index: 10000;
    padding: 1rem 1.5rem; border-radius: 8px; color: white; font-weight: 500;
    animation: slideInFromRight 0.3s ease-out;
    ${type === 'success' ? 'background: var(--success-color);' : ''}
    ${type === 'error' ? 'background: var(--danger-color);' : ''}
    ${type === 'info' ? 'background: var(--primary-color);' : ''}
  `;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideOutToRight 0.3s ease-out forwards';
    setTimeout(() => notification.parentNode?.removeChild(notification), 300);
  }, 3000);
}
