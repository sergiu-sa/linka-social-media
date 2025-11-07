/**
 * Enhanced Instagram-like post card component with full CRUD functionality
 * @param post Post object
 * @param animationDelay Animation delay in seconds (for animate.css) - use the index
 */

import type { NoroffPost } from '../services/posts/posts';
import { getLocalItem } from '../utils/storage';

/**
 * Creates a comprehensive post card HTML with full interaction capabilities
 * @param post The post data from Noroff API
 * @param animationDelay Animation delay in seconds
 * @returns HTML string for the enhanced post card
 */
export default function postCard(
  post: NoroffPost,
  animationDelay: number = 0
): string {
  const {
    id,
    title = '',
    body = '',
    tags = [],
    media,
    created,
    author = { name: 'Unknown', email: 'unknown@mail.com' },
    _count = { comments: 0, reactions: 0 },
    reactions = [],
  } = post;

  // Check if current user owns this post
  const currentUser = getLocalItem('user');
  const isOwner = currentUser && author.name === currentUser;

  // Fallback avatar
  const avatarUrl =
    author?.avatar?.url || 'https://via.placeholder.com/50?text=U';
  const avatarAlt = author?.avatar?.alt || author?.name || 'User';

  // Format the date
  const createdDate = created ? new Date(created) : new Date();
  const timeAgo = getTimeAgo(createdDate);

  // Reaction count
  const reactionCount =
    reactions.reduce((total, reaction) => total + reaction.count, 0) || 0;

  // Truncate text
  const truncatedBody =
    body.length > 120 ? body.substring(0, 120) + '...' : body;
  const truncatedTitle =
    title.length > 50 ? title.substring(0, 50) + '...' : title;

  return `
    <article class="bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-3xl p-6 sm:p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-orange-400 dark:hover:border-orange-600 transform hover:-translate-y-1" data-post-id="${id}" id="post-${id}" style="animation-delay: ${animationDelay}s">
      ${
        media?.url
          ? `
        <div class="mb-6 -mx-6 sm:-mx-8 -mt-6 sm:-mt-8 rounded-t-3xl overflow-hidden">
          <img src="${media.url}" alt="${media.alt || 'Post image'}" loading="lazy" class="w-full h-72 sm:h-80 md:h-96 lg:h-[28rem] object-cover transition-transform duration-500 hover:scale-110">
        </div>
      `
          : ''
      }

      <header class="flex items-start justify-between mb-5">
        <div class="flex items-center gap-4">
          <div class="cursor-pointer shrink-0 group"
                 onclick="navigateToProfile('${author?.name || 'Unknown'}')"
                 style="cursor: pointer;">
                <img src="${avatarUrl}" alt="${avatarAlt}" loading="lazy" class="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-orange-400 dark:border-orange-500 object-cover transition-all duration-300 group-hover:scale-110 group-hover:border-orange-500 dark:group-hover:border-orange-400 group-hover:shadow-md">
            </div>
          <div class="min-w-0 flex-1">
              <h4 class="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-1">
                <a href="/profile?user=${author?.name || 'Unknown'}"
                  class="hover:text-orange-600 dark:hover:text-orange-500 transition-colors duration-200"
                  onclick="event.preventDefault(); navigateToProfile('${author?.name || 'Unknown'}')">
                  ${author?.name || 'Unknown'}
                 </a>
              </h4>
              <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">${timeAgo}</p>
             </div>
        </div>
        
        ${
          isOwner
            ? `
        <div class="relative">
          <button class="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-orange-100 dark:hover:bg-orange-900/20 hover:text-orange-600 dark:hover:text-orange-500 border-2 border-slate-300 dark:border-slate-600 hover:border-orange-400 dark:hover:border-orange-500 transition-all duration-200" onclick="togglePostMenu(${id})" aria-label="Post options">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <circle cx="12" cy="12" r="1"></circle>
              <circle cx="12" cy="5" r="1"></circle>
              <circle cx="12" cy="19" r="1"></circle>
            </svg>
          </button>
          <div class="absolute right-0 top-full mt-3 w-52 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 rounded-2xl shadow-xl z-50 hidden overflow-hidden" id="postMenu${id}">
            <a href="#" class="flex items-center gap-3 px-5 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-600 dark:hover:text-orange-500 transition-all duration-200" onclick="editPost(${id}); return false;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              Edit Post
            </a>
            <a href="#" class="flex items-center gap-3 px-5 py-4 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 dark:hover:text-red-300 transition-all duration-200 border-t-2 border-slate-200 dark:border-slate-700" onclick="deletePost(${id}); return false;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3,6 5,6 21,6"></polyline>
                <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"></path>
              </svg>
              Delete Post
            </a>
          </div>
        </div>
        `
            : ''
        }
      </header>

      <div class="mb-6">
        ${truncatedTitle ? `<h3 class="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-4 leading-tight hover:text-orange-600 dark:hover:text-orange-500 transition-colors duration-200 cursor-pointer" onclick="viewFullPost(${id})">${truncatedTitle}</h3>` : ''}
        <div class="text-slate-700 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
          <p class="line-clamp-3">${truncatedBody}</p>
        </div>
        ${
          tags.length > 0
            ? `<div class="flex flex-wrap gap-2 mt-4">
                ${tags
                  .slice(0, 3)
                  .map(
                    (tag) =>
                      `<span class="inline-flex items-center px-3 py-1.5 bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-500 text-xs font-semibold rounded-full border border-orange-300 dark:border-orange-700 hover:bg-orange-200 dark:hover:bg-orange-900/30 transition-all duration-200 cursor-pointer">#${tag}</span>`
                  )
                  .join('')}
                ${
                  tags.length > 3
                    ? `<span class="inline-flex items-center px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs font-semibold rounded-full border border-slate-300 dark:border-slate-600">+${tags.length - 3}</span>`
                    : ''
                }
              </div>`
            : ''
        }
      </div>

      <footer class="border-t-2 border-slate-200 dark:border-slate-700 pt-5 mt-2">
        <div class="flex items-center justify-between gap-3 flex-wrap">
          <!-- Like Button with Reactions -->
          <div class="relative flex-1 min-w-[100px]">
            <button
              class="flex items-center justify-center gap-2 w-full px-4 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-orange-100 dark:hover:bg-orange-900/20 text-slate-600 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-500 border-2 border-slate-300 dark:border-slate-600 hover:border-orange-400 dark:hover:border-orange-500 rounded-xl transition-all duration-200 text-sm font-semibold group"
              data-post-id="${id}"
              onclick="toggleReaction(${id}, '❤️')"
              onmouseenter="showReactionsModal(${id})"
              onmouseleave="hideReactionsModal(${id})"
            >
              <i class="fa-solid fa-heart text-base group-hover:scale-110 transition-transform duration-200"></i>
              <span class="text-sm">${reactionCount}</span>
            </button>

            <!-- Reactions Modal -->
            <div class="absolute bottom-full left-0 mb-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 rounded-2xl p-3 shadow-xl z-50 hidden" id="reactions-${id}" style="display: none;">
              <div class="flex gap-2">
                ${['👍', '❤️', '😂', '😮', '😢', '😡']
                  .map(
                    (emoji) =>
                      `<button class="p-2.5 hover:bg-orange-100 dark:hover:bg-orange-900/20 rounded-xl transition-all duration-200 text-xl hover:scale-110" onclick="selectReaction(${id}, '${emoji}')">${emoji}</button>`
                  )
                  .join('')}
              </div>
            </div>
          </div>

          <!-- Comment Button -->
          <button class="flex items-center justify-center gap-2 flex-1 min-w-[100px] px-4 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-orange-100 dark:hover:bg-orange-900/20 text-slate-600 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-500 border-2 border-slate-300 dark:border-slate-600 hover:border-orange-400 dark:hover:border-orange-500 rounded-xl transition-all duration-200 text-sm font-semibold group" data-post-id="${id}" onclick="toggleComments(${id})">
            <i class="fa-solid fa-comment text-base group-hover:scale-110 transition-transform duration-200"></i>
            <span class="text-sm">${_count.comments}</span>
          </button>

          <!-- View Full Post Button -->
          <button class="flex items-center justify-center gap-2 flex-1 min-w-[120px] px-5 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition-all duration-200 text-sm font-semibold shadow-md hover:shadow-lg hover:scale-[1.02]" data-post-id="${id}" onclick="viewFullPost(${id})">
            <i class="fa-solid fa-eye text-base"></i>
            <span class="hidden sm:inline">View</span>
          </button>
        </div>
      </footer>

      <!-- Comments Section -->
<div class="mt-6 bg-slate-100 dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border-2 border-slate-200 dark:border-slate-700 hidden shadow-md" id="comments-${id}" style="display: none;">
  <div class="flex items-center justify-between mb-5">
    <h4 class="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
      <i class="fa-solid fa-comment text-orange-600 dark:text-orange-500"></i> Comments
    </h4>
    <button class="p-2 hover:bg-orange-100 dark:hover:bg-orange-900/20 rounded-xl text-slate-500 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-500 border-2 border-transparent hover:border-orange-400 dark:hover:border-orange-500 transition-all duration-200" onclick="toggleComments(${id})">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path>
      </svg>
    </button>
  </div>
  <div class="space-y-4 mb-5" id="comments-list-${id}">
    <!-- Comments will be loaded here -->
  </div>
  <div class="flex gap-3">
    <input
      type="text"
      id="comment-input-${id}"
      class="flex-1 px-4 py-3 bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all duration-200 text-sm"
      placeholder="Write a comment..."
      maxlength="280"
      onkeypress="if(event.key === 'Enter') submitComment(${id})"
    >
    <button class="p-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition-all duration-200 shadow-md hover:shadow-lg hover:scale-[1.02]" onclick="submitComment(${id})">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <line x1="22" y1="2" x2="11" y2="13"></line>
        <polygon points="22,2 15,22 11,13 2,9 22,2"></polygon>
      </svg>
    </button>
  </div>
</div>
    </article>
  `;
}

/**
 * Calculate time ago from a date
 * @param date The date to calculate from
 * @returns Formatted time ago string
 */
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInSeconds = Math.floor(diffInMs / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return date.toLocaleDateString();
}

/**
 * Show reactions modal on hover
 */
function showReactionsModal(postId: number): void {
  const modal = document.getElementById(`reactions-${postId}`);
  if (modal) {
    modal.style.display = 'block';
  }
}

/**
 * Hide reactions modal when not hovering
 */
function hideReactionsModal(postId: number): void {
  // Add a small delay to allow clicking on reactions
  setTimeout(() => {
    const modal = document.getElementById(`reactions-${postId}`);
    if (modal && !modal.matches(':hover')) {
      modal.style.display = 'none';
    }
  }, 200);
}

// Make functions globally available
(window as any).showReactionsModal = showReactionsModal;
(window as any).hideReactionsModal = hideReactionsModal;
