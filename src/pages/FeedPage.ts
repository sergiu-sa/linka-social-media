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
import { getLocalItem, setLocalItem } from '../utils/storage';
import { renderRoute } from '../router';
import { fetchApiKey } from '../services/api/client';

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

    const meta = postsResponse.meta;
    const userInitial = (getLocalItem('user') || 'Y').charAt(0).toUpperCase();

    return `
      <div class="feed-page">
        <main class="feed-column">
          <header>
            <h1 class="feed-header-title">${isUserLoggedIn ? 'Your Feed' : 'Social Feed'}</h1>
            <p class="feed-header-meta">
              ${
                isSearchMode
                  ? `Searching for "${searchQuery}" <a href="#" class="feed-meta-clear" onclick="event.preventDefault(); window.searchQuery = undefined; window.searchResults = undefined; navigateToPage(1);">clear ×</a>`
                  : `page ${meta.currentPage} of ${meta.pageCount} · ${meta.totalCount} posts`
              }
            </p>
          </header>

          ${
            isUserLoggedIn
              ? `
            <section class="feed-composer" id="create-post-box">
              <form id="create-post-form">
                <div class="feed-composer-row">
                  <div class="feed-composer-avatar">${userInitial}</div>
                  <input
                    type="text"
                    id="collapsed-input"
                    placeholder="What's on your mind?"
                    readonly
                    class="feed-composer-input"
                  >
                  <span class="feed-composer-arrow">↗</span>
                </div>

                <div class="feed-composer-expanded">
                  <div class="feed-composer-form-grid">
                    <div class="feed-composer-avatar">${userInitial}</div>
                    <div class="feed-composer-fields">
                      <input
                        type="text"
                        id="post-title"
                        name="title"
                        placeholder="Title"
                        required
                        class="feed-composer-input-large"
                      >
                      <textarea
                        id="post-body"
                        name="body"
                        placeholder="What do you want to share?"
                        required
                        class="feed-composer-textarea"
                        rows="3"
                      ></textarea>

                      <div class="feed-composer-extras">
                        <button type="button" id="composer-toggle-tags">+ add tag</button>
                        <button type="button" id="composer-toggle-image">+ add image</button>
                      </div>

                      <div class="feed-composer-optional" id="composer-tags-row">
                        <input type="text" id="post-tags" name="tags" placeholder="tags, comma, separated">
                      </div>

                      <div class="feed-composer-optional" id="composer-image-row">
                        <input type="url" id="post-image-url" name="imageUrl" placeholder="image URL">
                      </div>

                      <div class="feed-composer-optional" id="composer-image-alt-row">
                        <input type="text" id="post-image-alt" name="imageAlt" placeholder="image alt text">
                      </div>

                      <div class="feed-composer-actions">
                        <button type="button" id="cancel-post-btn" class="feed-composer-cancel">Cancel</button>
                        <button type="submit" class="feed-cta">Post</button>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </section>
          `
              : ''
          }

          <div class="feed-articles" id="posts-container">
            ${
              posts.length > 0
                ? posts.map((post, index) => postCard(post, index * 0.05)).join('')
                : isSearchMode
                  ? renderEmptyState('🔍', 'No posts found', 'Try a different search.')
                  : renderEmptyState(
                      '🔭',
                      'No posts available',
                      isUserLoggedIn
                        ? 'Start following people to see their posts.'
                        : 'No posts to display right now.',
                      !isUserLoggedIn
                        ? `<button class="feed-cta" onclick="window.location.href='/login'">Sign in for more</button>`
                        : ''
                    )
            }
          </div>

          ${!isSearchMode ? renderPaginationControls(meta) : ''}
        </main>
      </div>

      <!-- Edit Post Modal (restyled flat) -->
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 feed-modal-backdrop" id="editPostModal" style="display: none;">
        <div class="feed-modal-panel max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div class="flex justify-between items-center px-6 py-5 border-b border-slate-200/60 dark:border-slate-700/60">
            <h3 class="feed-modal-title">Edit post</h3>
            <button class="feed-modal-close" onclick="closeEditModal()" aria-label="Close">×</button>
          </div>
          <form id="editPostForm" class="px-6 py-6 space-y-5">
            <div>
              <label for="editPostTitle" class="block text-xs font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-500 mb-2">Title</label>
              <input type="text" id="editPostTitle" required
                     class="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-orange-500" />
            </div>
            <div>
              <label for="editPostBody" class="block text-xs font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-500 mb-2">Body</label>
              <textarea id="editPostBody" rows="6" required
                        class="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 resize-none"></textarea>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label for="editPostTags" class="block text-xs font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-500 mb-2">Tags</label>
                <input type="text" id="editPostTags" placeholder="comma separated"
                       class="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-orange-500" />
              </div>
              <div>
                <label for="editPostImageUrl" class="block text-xs font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-500 mb-2">Image URL</label>
                <input type="url" id="editPostImageUrl"
                       class="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-orange-500" />
              </div>
            </div>
            <div>
              <label for="editPostImageAlt" class="block text-xs font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-500 mb-2">Image alt</label>
              <input type="text" id="editPostImageAlt"
                     class="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-orange-500" />
            </div>
            <div class="flex justify-end gap-3 pt-4 border-t border-slate-200/60 dark:border-slate-700/60">
              <button type="button" class="feed-composer-cancel" onclick="closeEditModal()">Cancel</button>
              <button type="submit" class="feed-cta">Update post</button>
            </div>
          </form>
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
    <div class="feed-empty">
      <div class="feed-empty-icon">${icon}</div>
      <h3 class="feed-empty-title">${title}</h3>
      <p class="feed-empty-body">${message}</p>
      ${extra}
    </div>
  `;
}

function renderErrorState(): string {
  return `
    <div class="feed-page">
      <main class="feed-column">
        <div class="feed-empty">
          <div class="feed-empty-icon">⚠️</div>
          <h2 class="feed-empty-title">Something went wrong</h2>
          <p class="feed-empty-body">We couldn't load the posts right now. Please try again.</p>
          <button class="feed-cta" onclick="window.location.reload()">Try again</button>
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

  const pageNumbers: (number | string)[] = [];
  if (currentPage > 3) {
    pageNumbers.push(1);
    if (currentPage > 4) pageNumbers.push('...');
  }
  for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
    if (!pageNumbers.includes(i)) pageNumbers.push(i);
  }
  if (currentPage < totalPages - 2) {
    if (currentPage < totalPages - 3) pageNumbers.push('...');
    pageNumbers.push(totalPages);
  }

  return `
    <nav class="feed-pagination" aria-label="Pagination">
      <div class="feed-pagination-row">
        <button class="feed-pag-link" onclick="navigateToPage(${currentPage - 1})" ${!hasPrev ? 'disabled' : ''}>← prev</button>

        ${pageNumbers
          .map((pageNum) => {
            if (pageNum === '...') return `<span class="feed-pag-ellipsis">…</span>`;
            const isActive = pageNum === currentPage;
            return `<button class="feed-pag-num ${isActive ? 'is-active' : ''}" onclick="navigateToPage(${pageNum})" ${isActive ? 'disabled' : ''}>${pageNum}</button>`;
          })
          .join('')}

        <button class="feed-pag-link" onclick="navigateToPage(${currentPage + 1})" ${!hasNext ? 'disabled' : ''}>next →</button>
      </div>

      <p class="feed-pag-meta">page ${currentPage} of ${totalPages} · ${meta.totalCount} posts</p>

      ${
        totalPages > 10
          ? `
        <div class="feed-pag-jump">
          <label for="pageJumpInput">jump to</label>
          <input
            type="number"
            min="1"
            max="${totalPages}"
            value="${currentPage}"
            id="pageJumpInput"
            onkeypress="if(event.key === 'Enter') { const val = parseInt(event.target.value); if(val >= 1 && val <= ${totalPages}) navigateToPage(val); }"
          />
          <button class="feed-pag-link" onclick="const val = parseInt(document.getElementById('pageJumpInput').value); if(val >= 1 && val <= ${totalPages}) navigateToPage(val);">go</button>
        </div>
        `
          : ''
      }
    </nav>
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

  // Composer expand/collapse
  const postBox = document.getElementById('create-post-box');
  const composerRow = postBox?.querySelector('.feed-composer-row') as HTMLElement | null;
  const cancelBtn = document.getElementById('cancel-post-btn');

  if (postBox && composerRow) {
    composerRow.addEventListener('click', () => {
      postBox.classList.add('is-expanded');
      const titleInput = document.getElementById('post-title') as HTMLInputElement | null;
      titleInput?.focus();
    });
    cancelBtn?.addEventListener('click', () => {
      postBox.classList.remove('is-expanded');
      createForm?.reset();
      // Collapse optional rows
      ['composer-tags-row', 'composer-image-row', 'composer-image-alt-row'].forEach((id) => {
        document.getElementById(id)?.classList.remove('is-open');
      });
    });

    // Optional-field toggles (+ add tag, + add image)
    document.getElementById('composer-toggle-tags')?.addEventListener('click', () => {
      document.getElementById('composer-tags-row')?.classList.toggle('is-open');
      (document.getElementById('post-tags') as HTMLInputElement | null)?.focus();
    });
    document.getElementById('composer-toggle-image')?.addEventListener('click', () => {
      const imgRow = document.getElementById('composer-image-row');
      const altRow = document.getElementById('composer-image-alt-row');
      const opening = !imgRow?.classList.contains('is-open');
      imgRow?.classList.toggle('is-open', opening);
      altRow?.classList.toggle('is-open', opening);
      (document.getElementById('post-image-url') as HTMLInputElement | null)?.focus();
    });

    // Esc closes composer when expanded
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && postBox.classList.contains('is-expanded')) {
        postBox.classList.remove('is-expanded');
      }
    });
  }

  // Handle edit post form
  const editForm = document.getElementById(
    'editPostForm'
  ) as HTMLFormElement | null;
  if (editForm) {
    editForm.addEventListener('submit', handleEditPost);
  }

  // Close owner-menu dropdowns when clicking outside
  document.addEventListener('click', function (e) {
    const target = e.target as Element;
    if (!target.closest('.feed-owner-menu')) {
      document.querySelectorAll('.post-menu.show').forEach((menu) => {
        menu.classList.remove('show');
      });
    }
  });

  // Esc collapses any inline-expanded post
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const expanded = document.querySelector('.feed-article.is-expanded');
    if (expanded) closeFullPostModal();
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
    if (postBox) {
      postBox.classList.remove('is-expanded');
      ['composer-tags-row', 'composer-image-row', 'composer-image-alt-row'].forEach((id) => {
        document.getElementById(id)?.classList.remove('is-open');
      });
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

  // Read full data from data-* attributes so edits don't lose content
  // beyond the truncation length.
  const title = decodeURIComponent(postElement.dataset.fullTitle || '');
  const body = decodeURIComponent(postElement.dataset.fullBody || '');
  const tags: string[] = postElement.dataset.tags
    ? JSON.parse(decodeURIComponent(postElement.dataset.tags))
    : [];
  const media = postElement.dataset.media
    ? JSON.parse(decodeURIComponent(postElement.dataset.media))
    : null;
  const imageUrl = media?.url || '';
  const imageAlt = media?.alt || '';

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

    // Update the post in the UI — both truncated and full variants, plus
    // data-* attributes that other handlers (edit, full-view) read.
    const postElement = document.getElementById(`post-${postId}`);
    if (postElement) {
      const updTitle = updated.title || '';
      const updBody = updated.body || '';
      const truncatedTitle = updTitle.length > 80 ? updTitle.substring(0, 80) + '…' : updTitle;
      const truncatedBody = updBody.length > 220 ? updBody.substring(0, 220) + '…' : updBody;

      const titles = postElement.querySelectorAll<HTMLElement>('.post-title-compact');
      titles.forEach((el) => {
        el.textContent = el.dataset.full !== undefined ? updTitle : truncatedTitle;
      });
      const bodies = postElement.querySelectorAll<HTMLElement>('.post-body');
      bodies.forEach((el) => {
        el.textContent = el.dataset.full !== undefined ? updBody : truncatedBody;
      });

      postElement.dataset.fullTitle = encodeURIComponent(updTitle);
      postElement.dataset.fullBody = encodeURIComponent(updBody);

      const tagsContainer = postElement.querySelector('.post-tags-compact');
      if (tagsContainer && updated.tags) {
        tagsContainer.innerHTML =
          updated.tags
            .slice(0, 4)
            .map((tag) => `<span class="feed-article-tag tag-compact">#${tag}</span>`)
            .join('') +
          (updated.tags.length > 4
            ? `<span class="feed-article-tag tag-more">+${updated.tags.length - 4}</span>`
            : '');
        postElement.dataset.tags = encodeURIComponent(JSON.stringify(updated.tags));
      }

      if (updated.media?.url) {
        let mediaContainer = postElement.querySelector('.post-media-preview') as HTMLElement | null;
        if (!mediaContainer) {
          mediaContainer = document.createElement('div');
          mediaContainer.className = 'feed-article-media post-media-preview';
          // Insert after tags (or before action bar)
          const actions = postElement.querySelector('.feed-actions');
          if (actions) postElement.insertBefore(mediaContainer, actions);
          else postElement.appendChild(mediaContainer);
        }
        mediaContainer.innerHTML = `<img src="${updated.media.url}" alt="${updated.media.alt || 'Post image'}" loading="lazy" class="post-image-preview">`;
        postElement.dataset.media = encodeURIComponent(JSON.stringify(updated.media));
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
      submitBtn.textContent = 'Update post';
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

  const likeBtn = document.querySelector(
    `[data-post-id="${postId}"].like-btn`
  ) as HTMLElement | null;

  // Optimistic pulse (visual only — count syncs after API)
  if (likeBtn) {
    likeBtn.classList.add('is-pulsing');
    setTimeout(() => likeBtn.classList.remove('is-pulsing'), 200);
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

/**
 * Toggles inline-expand on a post article. Replaces the previous full-post modal.
 * Closes any other expanded post first so only one is open at a time.
 */
function viewFullPost(postId: number): void {
  const article = document.getElementById(`post-${postId}`);
  if (!article) return;

  const container = document.getElementById('posts-container');

  // Close any other open expansion
  document.querySelectorAll('.feed-article.is-expanded').forEach((el) => {
    if (el !== article) el.classList.remove('is-expanded');
  });

  const willExpand = !article.classList.contains('is-expanded');
  article.classList.toggle('is-expanded', willExpand);

  if (container) {
    container.classList.toggle(
      'has-expanded',
      !!container.querySelector('.feed-article.is-expanded')
    );
  }

  if (willExpand) {
    article.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

/**
 * Backward-compat alias: any leftover inline `onclick="closeFullPostModal()"`
 * (e.g., the body of a post that was edited recently) just collapses the
 * currently-expanded article via the new path.
 */
function closeFullPostModal(): void {
  const expanded = document.querySelector('.feed-article.is-expanded');
  if (expanded) (expanded as HTMLElement).classList.remove('is-expanded');
  const container = document.getElementById('posts-container');
  container?.classList.remove('has-expanded');
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
