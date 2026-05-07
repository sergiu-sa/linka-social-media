/**
 * @file components/postModal.ts
 * @description Reading-mode modal for a single post. Replaces the old
 *              inline-expand UX. Self-contained: builds from the data-*
 *              attributes already on the feed `<article>` element, owns its
 *              own listeners (Esc, backdrop, ×, like, comment), and talks to
 *              the post / comment / reaction services directly.
 */

import { iconSvg } from '../utils/icon';
import { Heart, MessageCircle, X, Send, Trash2 } from 'lucide';
import { getTimeAgo } from '../utils/date';
import { getLocalItem } from '../utils/storage';
import { getPostComments, type NoroffComment } from '../services/posts/posts';
import {
  createComment,
  toggleReaction,
  deleteComment,
} from '../services/interactions/interactions';
import { confirmDialog } from '../utils/confirm';
import { error as logError } from '../utils/log';

const URL_PARAM = 'post';

let activeRoot: HTMLElement | null = null;
let returnFocus: HTMLElement | null = null;
let escHandler: ((e: KeyboardEvent) => void) | null = null;
let popstateHandler: (() => void) | null = null;

function escAttr(s: string): string {
  return String(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function escHtml(s: string): string {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

type PostSummary = {
  id: number;
  title: string;
  body: string;
  tags: string[];
  authorName: string;
  authorAvatarUrl: string;
  authorAvatarAlt: string;
  mediaUrl: string;
  mediaAlt: string;
  createdAt: string;
  reactionCount: number;
  commentCount: number;
  isReacted: boolean;
};

function readPostFromArticle(postId: number): PostSummary | null {
  const article = document.getElementById(`post-${postId}`);
  if (!article) return null;

  const decode = (k: string): string => {
    const v = article.dataset[k];
    if (!v) return '';
    try {
      return decodeURIComponent(v);
    } catch {
      return v;
    }
  };
  const decodeJson = <T>(k: string, fallback: T): T => {
    const v = article.dataset[k];
    if (!v) return fallback;
    try {
      return JSON.parse(decodeURIComponent(v));
    } catch {
      return fallback;
    }
  };

  const author = decodeJson<{
    name: string;
    avatar?: { url: string; alt: string };
  }>('author', { name: 'Unknown' });
  const media = decodeJson<{ url?: string; alt?: string } | null>('media', null);

  const reactionCount = Number(article.dataset.reactionCount || '0') || 0;
  const commentCount = Number(article.dataset.commentCount || '0') || 0;
  const likeBtn = article.querySelector<HTMLElement>('.like-btn');
  const isReacted = !!likeBtn?.classList.contains('reacted');

  return {
    id: postId,
    title: decode('fullTitle') || '',
    body: decode('fullBody') || '',
    tags: decodeJson<string[]>('tags', []),
    authorName: author.name || 'Unknown',
    authorAvatarUrl: author.avatar?.url || '',
    authorAvatarAlt: author.avatar?.alt || author.name || 'User',
    mediaUrl: media?.url || '',
    mediaAlt: media?.alt || '',
    createdAt: article.dataset.created || '',
    reactionCount,
    commentCount,
    isReacted,
  };
}

function renderModalMarkup(post: PostSummary): string {
  const initial = post.authorName.charAt(0).toUpperCase();
  const userInitial = (getLocalItem('user') || 'U').charAt(0).toUpperCase();
  const timeAgo = post.createdAt ? getTimeAgo(new Date(post.createdAt)) : '';

  return `
    <div class="post-modal-backdrop" data-post-modal-root>
      <div
        class="post-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="post-modal-title-${post.id}"
      >
        <header class="post-modal-header">
          <button
            type="button"
            class="post-modal-author"
            data-post-modal-action="navigate-profile"
            data-username="${escAttr(post.authorName)}"
            aria-label="Go to ${escAttr(post.authorName)}'s profile"
          >
            ${
              post.authorAvatarUrl
                ? `<img src="${escAttr(post.authorAvatarUrl)}" alt="${escAttr(post.authorAvatarAlt)}" />`
                : `<span class="post-modal-author-fallback" aria-hidden="true">${initial}</span>`
            }
            <span class="post-modal-author-info">
              <span class="post-modal-author-name">${escHtml(post.authorName)}</span>
              <span class="post-modal-author-time">${escHtml(timeAgo)}</span>
            </span>
          </button>
          <button
            type="button"
            class="post-modal-close"
            data-post-modal-action="close"
            aria-label="Close post"
          >
            ${iconSvg(X, { size: 18, strokeWidth: 2.2 })}
          </button>
        </header>

        <div class="post-modal-scroll">
          ${
            post.title
              ? `<h1 class="post-modal-title" id="post-modal-title-${post.id}">${escHtml(post.title)}</h1>`
              : ''
          }

          ${
            post.mediaUrl
              ? `<figure class="post-modal-media">
                   <img src="${escAttr(post.mediaUrl)}" alt="${escAttr(post.mediaAlt || 'Post image')}" />
                 </figure>`
              : ''
          }

          ${
            post.body
              ? `<div class="post-modal-prose">${escHtml(post.body)}</div>`
              : ''
          }

          ${
            post.tags.length > 0
              ? `<div class="post-modal-tags">
                   ${post.tags
                     .map((t) => `<span class="post-modal-tag">#${escHtml(t)}</span>`)
                     .join('')}
                 </div>`
              : ''
          }

          <section class="post-modal-thread" aria-labelledby="post-modal-thread-heading-${post.id}">
            <h2 class="post-modal-thread-heading" id="post-modal-thread-heading-${post.id}">
              <span aria-hidden="true">↳</span> Comments
            </h2>
            <div class="post-modal-comments" id="post-modal-comments-${post.id}">
              <p class="post-modal-comments-loading">Loading comments…</p>
            </div>
            <div class="post-modal-compose">
              <span class="post-modal-compose-avatar" aria-hidden="true">${userInitial}</span>
              <input
                type="text"
                class="post-modal-compose-input"
                id="post-modal-comment-input-${post.id}"
                placeholder="Write a comment…"
                maxlength="280"
                aria-label="Write a comment"
              />
              <button
                type="button"
                class="post-modal-compose-submit"
                data-post-modal-action="comment-submit"
                aria-label="Send comment"
              >
                ${iconSvg(Send, { size: 16, strokeWidth: 2.2 })}
              </button>
            </div>
          </section>
        </div>

        <footer class="post-modal-footer">
          <button
            type="button"
            class="feed-action like-btn ${post.isReacted ? 'reacted' : ''}"
            data-post-modal-action="reaction-toggle"
            aria-label="${post.reactionCount} ${post.reactionCount === 1 ? 'like' : 'likes'} — toggle like"
          >
            <i class="feed-action-icon" aria-hidden="true">${iconSvg(Heart, { size: 17, strokeWidth: 2.2 })}</i>
            <span class="action-count-compact">${post.reactionCount}</span>
          </button>
          <button
            type="button"
            class="feed-action comment-btn"
            data-post-modal-action="comment-focus"
            aria-label="${post.commentCount} ${post.commentCount === 1 ? 'comment' : 'comments'}"
          >
            <i class="feed-action-icon" aria-hidden="true">${iconSvg(MessageCircle, { size: 17, strokeWidth: 2 })}</i>
            <span class="action-count-compact">${post.commentCount}</span>
          </button>
        </footer>
      </div>
    </div>
  `;
}

function renderCommentRow(comment: NoroffComment, currentUser: string | null): string {
  const authorName = comment.author?.name || comment.owner || 'Unknown';
  const initial = authorName.charAt(0).toUpperCase();
  const timeAgo = comment.created ? getTimeAgo(new Date(comment.created)) : '';
  const isOwner = !!currentUser && (comment.owner === currentUser || comment.author?.name === currentUser);

  return `
    <article class="post-modal-comment" data-comment-id="${comment.id}">
      <span class="post-modal-comment-avatar" aria-hidden="true">${initial}</span>
      <div class="post-modal-comment-body">
        <header class="post-modal-comment-meta">
          <span class="post-modal-comment-author">${escHtml(authorName)}</span>
          <span class="post-modal-comment-time">${escHtml(timeAgo)}</span>
        </header>
        <p class="post-modal-comment-text">${escHtml(comment.body)}</p>
        ${
          isOwner
            ? `<button
                 type="button"
                 class="post-modal-comment-delete"
                 data-post-modal-action="comment-delete"
                 data-comment-id="${comment.id}"
                 aria-label="Delete comment"
               >${iconSvg(Trash2, { size: 12, strokeWidth: 2 })} Delete</button>`
            : ''
        }
      </div>
    </article>
  `;
}

async function loadCommentsInto(post: PostSummary): Promise<void> {
  const list = activeRoot?.querySelector<HTMLElement>(`#post-modal-comments-${post.id}`);
  if (!list) return;
  try {
    const comments = await getPostComments(post.id);
    if (!activeRoot) return; // closed mid-fetch
    const currentUser = (getLocalItem('user') as string | null) || null;
    if (comments.length === 0) {
      list.innerHTML = `<p class="post-modal-comments-empty">No comments yet. Be the first.</p>`;
      return;
    }
    const sorted = comments
      .slice()
      .sort((a, b) => +new Date(a.created) - +new Date(b.created));
    list.innerHTML = sorted.map((c) => renderCommentRow(c, currentUser)).join('');
  } catch (err) {
    logError('post-modal: loadComments failed', err);
    if (!activeRoot) return;
    list.innerHTML = `<p class="post-modal-comments-empty">Couldn't load comments.</p>`;
  }
}

async function handleCommentSubmit(post: PostSummary): Promise<void> {
  const input = activeRoot?.querySelector<HTMLInputElement>(
    `#post-modal-comment-input-${post.id}`
  );
  if (!input) return;
  const text = input.value.trim();
  if (!text) {
    input.focus();
    return;
  }
  if (text.length > 280) return;

  const submitBtn = activeRoot?.querySelector<HTMLButtonElement>(
    '.post-modal-compose-submit'
  );
  if (submitBtn) submitBtn.disabled = true;
  try {
    const response = await createComment(String(post.id), text);
    input.value = '';
    const list = activeRoot?.querySelector<HTMLElement>(
      `#post-modal-comments-${post.id}`
    );
    if (list) {
      list.querySelector('.post-modal-comments-empty')?.remove();
      const optimistic: NoroffComment = {
        id: response.data.id as unknown as number,
        body: text,
        replyToId: null,
        postId: post.id,
        owner: (getLocalItem('user') as string) || '',
        created: new Date().toISOString(),
        author: {
          name: (getLocalItem('user') as string) || 'You',
          email: '',
          avatar: null,
        },
      };
      list.insertAdjacentHTML(
        'beforeend',
        renderCommentRow(optimistic, (getLocalItem('user') as string | null) || null)
      );
    }
    bumpFooterCommentCount(1);
    bumpFeedCommentCount(post.id, 1);
  } catch (err) {
    logError('post-modal: comment submit failed', err);
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

async function handleCommentDelete(post: PostSummary, commentId: number): Promise<void> {
  const ok = await confirmDialog({
    title: 'Delete comment?',
    body: 'This comment will be permanently removed.',
    confirmLabel: 'Delete',
    cancelLabel: 'Keep',
    danger: true,
  });
  if (!ok) return;
  try {
    await deleteComment(String(post.id), String(commentId));
    activeRoot
      ?.querySelector(`.post-modal-comment[data-comment-id="${commentId}"]`)
      ?.remove();
    bumpFooterCommentCount(-1);
    bumpFeedCommentCount(post.id, -1);
  } catch (err) {
    logError('post-modal: comment delete failed', err);
  }
}

async function handleLikeToggle(post: PostSummary): Promise<void> {
  const likeBtn = activeRoot?.querySelector<HTMLButtonElement>(
    '.post-modal-footer .like-btn'
  );
  if (!likeBtn || likeBtn.disabled) return;

  const countEl = likeBtn.querySelector<HTMLElement>('.action-count-compact');
  const wasReacted = likeBtn.classList.contains('reacted');
  const beforeCount = parseInt(countEl?.textContent || '0', 10) || 0;
  const optimisticReacted = !wasReacted;
  const optimisticCount = optimisticReacted
    ? beforeCount + 1
    : Math.max(0, beforeCount - 1);

  likeBtn.classList.toggle('reacted', optimisticReacted);
  if (countEl) countEl.textContent = String(optimisticCount);
  likeBtn.disabled = true;

  try {
    const wasAdded = await toggleReaction(String(post.id), '❤️');
    if (wasAdded !== optimisticReacted) {
      likeBtn.classList.toggle('reacted', wasAdded);
      const reconciled = wasAdded ? beforeCount + 1 : Math.max(0, beforeCount - 1);
      if (countEl) countEl.textContent = String(reconciled);
    }
    syncFeedLikeButton(post.id, likeBtn.classList.contains('reacted'), parseInt(countEl?.textContent || '0', 10) || 0);
  } catch (err) {
    likeBtn.classList.toggle('reacted', wasReacted);
    if (countEl) countEl.textContent = String(beforeCount);
    logError('post-modal: reaction toggle failed', err);
  } finally {
    likeBtn.disabled = false;
  }
}

function bumpFooterCommentCount(delta: number): void {
  const el = activeRoot?.querySelector<HTMLElement>(
    '.post-modal-footer .comment-btn .action-count-compact'
  );
  if (!el) return;
  const next = Math.max(0, (parseInt(el.textContent || '0', 10) || 0) + delta);
  el.textContent = String(next);
}

/** Mirror count + like-state changes back into the feed card so the underlying
 *  feed reflects the modal's mutations once the modal closes. */
function bumpFeedCommentCount(postId: number, delta: number): void {
  const el = document.querySelector<HTMLElement>(
    `[data-post-id="${postId}"].comment-btn .action-count-compact`
  );
  if (!el) return;
  const next = Math.max(0, (parseInt(el.textContent || '0', 10) || 0) + delta);
  el.textContent = String(next);
}

function syncFeedLikeButton(postId: number, reacted: boolean, count: number): void {
  const btn = document.querySelector<HTMLElement>(
    `.feed-article [data-post-id="${postId}"].like-btn`
  );
  if (!btn) return;
  btn.classList.toggle('reacted', reacted);
  const cnt = btn.querySelector<HTMLElement>('.action-count-compact');
  if (cnt) cnt.textContent = String(count);
}

function pushUrlForPost(postId: number): void {
  const url = new URL(window.location.href);
  if (url.searchParams.get(URL_PARAM) === String(postId)) return;
  url.searchParams.set(URL_PARAM, String(postId));
  history.pushState({ postModal: postId }, '', url.toString());
}

function popUrlForPost(): void {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(URL_PARAM)) return;
  url.searchParams.delete(URL_PARAM);
  history.replaceState({}, '', url.toString());
}

export function openPostModal(
  postId: number,
  options: { pushUrl?: boolean } = {}
): void {
  const post = readPostFromArticle(postId);
  if (!post) {
    logError(`post-modal: no article found for post ${postId}`);
    return;
  }

  if (activeRoot) closePostModal({ silent: true });

  returnFocus = (document.activeElement as HTMLElement) || null;

  const wrapper = document.createElement('div');
  wrapper.innerHTML = renderModalMarkup(post);
  const root = wrapper.firstElementChild as HTMLElement;
  document.body.appendChild(root);
  document.body.classList.add('post-modal-open');
  activeRoot = root;

  if (options.pushUrl !== false) pushUrlForPost(postId);

  // Focus the close button so Esc / Tab feel natural.
  setTimeout(() => {
    root.querySelector<HTMLButtonElement>('.post-modal-close')?.focus();
  }, 30);

  root.addEventListener('click', (e) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    // Backdrop click — root is the backdrop, the card is its only child.
    if (target === root) {
      closePostModal();
      return;
    }

    const actionEl = target.closest<HTMLElement>('[data-post-modal-action]');
    if (!actionEl) return;
    const action = actionEl.dataset.postModalAction;

    switch (action) {
      case 'close':
        closePostModal();
        return;
      case 'navigate-profile': {
        const username = actionEl.dataset.username;
        if (username) {
          closePostModal();
          window.navigateToProfile?.(username);
        }
        return;
      }
      case 'reaction-toggle':
        void handleLikeToggle(post);
        return;
      case 'comment-submit':
        void handleCommentSubmit(post);
        return;
      case 'comment-focus': {
        root.querySelector<HTMLInputElement>(
          `#post-modal-comment-input-${post.id}`
        )?.focus();
        return;
      }
      case 'comment-delete': {
        const id = Number(actionEl.dataset.commentId);
        if (Number.isFinite(id)) void handleCommentDelete(post, id);
        return;
      }
    }
  });

  const input = root.querySelector<HTMLInputElement>(
    `#post-modal-comment-input-${post.id}`
  );
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void handleCommentSubmit(post);
    }
  });

  // document-level so Esc closes regardless of where focus currently is
  escHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closePostModal();
    }
  };
  document.addEventListener('keydown', escHandler);

  popstateHandler = () => {
    if (activeRoot) closePostModal({ silent: true });
  };
  window.addEventListener('popstate', popstateHandler);

  void loadCommentsInto(post);
}

export function closePostModal(opts: { silent?: boolean } = {}): void {
  if (!activeRoot) return;
  activeRoot.remove();
  activeRoot = null;
  document.body.classList.remove('post-modal-open');

  if (escHandler) {
    document.removeEventListener('keydown', escHandler);
    escHandler = null;
  }
  if (popstateHandler) {
    window.removeEventListener('popstate', popstateHandler);
    popstateHandler = null;
  }

  if (!opts.silent) popUrlForPost();

  returnFocus?.focus?.();
  returnFocus = null;
}

export const POST_MODAL_PARAM = URL_PARAM;
