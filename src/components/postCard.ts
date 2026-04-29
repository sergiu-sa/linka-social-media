/**
 * @file components/postCard.ts
 * @description Editorial-flat post card. All interactivity is wired via
 *              `data-action` attributes — see `wirePostCardActions()` in
 *              `FeedPage.ts` for the single delegated click/keydown handler.
 */

import type { NoroffPost } from '../services/posts/posts';
import { getLocalItem } from '../utils/storage';
import { getTimeAgo } from '../utils/date';
import '../types/index';

function escAttr(s: string): string {
  return String(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function escHtml(s: string): string {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

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

  const currentUser = getLocalItem('user');
  const isOwner = currentUser && author.name === currentUser;

  const avatarUrl = author?.avatar?.url || '';
  const avatarAlt = author?.avatar?.alt || author?.name || 'User';
  const initial = (author?.name || 'U').charAt(0).toUpperCase();

  const createdDate = created ? new Date(created) : new Date();
  const timeAgo = getTimeAgo(createdDate);

  const reactionCount =
    reactions.reduce((total, reaction) => total + reaction.count, 0) || 0;

  const truncatedBody = body.length > 220 ? body.substring(0, 220) + '…' : body;
  const truncatedTitle = title.length > 80 ? title.substring(0, 80) + '…' : title;

  const authorName = author?.name || 'Unknown';

  return `
    <article
      class="feed-article"
      data-post-id="${id}"
      id="post-${id}"
      data-full-title="${escAttr(encodeURIComponent(title))}"
      data-full-body="${escAttr(encodeURIComponent(body))}"
      data-tags="${escAttr(encodeURIComponent(JSON.stringify(tags)))}"
      data-media="${media?.url ? escAttr(encodeURIComponent(JSON.stringify(media))) : ''}"
      data-author="${escAttr(encodeURIComponent(JSON.stringify(author)))}"
      data-created="${created || ''}"
      data-reaction-count="${reactionCount}"
      data-comment-count="${_count.comments}"
      style="animation-delay: ${animationDelay}s"
    >
      <header class="feed-article-header">
        <div class="feed-article-author" data-action="navigate-profile" data-username="${escAttr(authorName)}" role="button" tabindex="0">
          ${
            avatarUrl
              ? `<img src="${escAttr(avatarUrl)}" alt="${escAttr(avatarAlt)}" loading="lazy">`
              : `<div class="feed-avatar-fallback">${initial}</div>`
          }
          <div class="feed-article-author-info">
            <a class="feed-article-author-name"
               href="/profile?user=${escAttr(authorName)}"
               data-action="navigate-profile"
               data-username="${escAttr(authorName)}">${escHtml(authorName)}</a>
            <div class="feed-article-author-meta">${timeAgo}</div>
          </div>
        </div>

        ${
          isOwner
            ? `
        <div class="feed-owner-menu">
          <button type="button" class="feed-owner-trigger" data-action="post-menu-toggle" aria-label="Post options">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
              <circle cx="12" cy="12" r="1"></circle>
              <circle cx="12" cy="5" r="1"></circle>
              <circle cx="12" cy="19" r="1"></circle>
            </svg>
          </button>
          <div class="feed-owner-dropdown post-menu" id="postMenu${id}" role="menu">
            <button type="button" data-action="post-edit" role="menuitem">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              Edit post
            </button>
            <button type="button" data-action="post-delete" role="menuitem">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <polyline points="3,6 5,6 21,6"></polyline>
                <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"></path>
              </svg>
              Delete post
            </button>
          </div>
        </div>
        `
            : ''
        }
      </header>

      ${
        truncatedTitle
          ? `<h3 class="feed-article-title post-title-compact" data-truncated data-action="post-toggle">${escHtml(truncatedTitle)}</h3>
             <h3 class="feed-article-title post-title-compact" data-full data-action="post-toggle">${escHtml(title)}</h3>`
          : ''
      }
      <p class="feed-article-body post-body" data-truncated>${escHtml(truncatedBody)}</p>
      <p class="feed-article-body post-body" data-full>${escHtml(body)}</p>

      ${
        tags.length > 0
          ? `<div class="feed-article-tags post-tags-compact">
              ${tags
                .slice(0, 4)
                .map(
                  (tag) =>
                    `<span class="feed-article-tag tag-compact">#${escHtml(tag)}</span>`
                )
                .join('')}
              ${
                tags.length > 4
                  ? `<span class="feed-article-tag tag-more">+${tags.length - 4}</span>`
                  : ''
              }
            </div>`
          : ''
      }

      ${
        media?.url
          ? `
        <div class="feed-article-media post-media-preview">
          <img src="${escAttr(media.url)}" alt="${escAttr(media.alt || 'Post image')}" loading="lazy" class="post-image-preview">
        </div>
      `
          : ''
      }

      <div class="feed-actions">
        <div class="feed-action-wrap" data-reactions-wrap>
          <button
            type="button"
            class="feed-action like-btn"
            data-post-id="${id}"
            data-action="reaction-toggle"
            data-emoji="❤️"
            aria-haspopup="menu"
          >
            <i class="fa-solid fa-heart" aria-hidden="true"></i>
            <span class="action-count-compact">${reactionCount}</span>
          </button>
          <div class="feed-reaction-picker" id="reactions-${id}" role="menu" aria-label="Pick a reaction" style="display:none;">
            ${['👍', '❤️', '😂', '😮', '😢', '😡']
              .map(
                (emoji) =>
                  `<button type="button" data-action="reaction-pick" data-emoji="${emoji}" role="menuitem" aria-label="React with ${emoji}">${emoji}</button>`
              )
              .join('')}
          </div>
        </div>

        <button type="button" class="feed-action comment-btn" data-post-id="${id}" data-action="comments-toggle">
          <i class="fa-regular fa-comment" aria-hidden="true"></i>
          <span class="action-count-compact">${_count.comments}</span>
        </button>

        <span class="feed-action-spacer"></span>

        <button type="button" class="feed-action-read" data-action="post-toggle">read →</button>
        <button type="button" class="feed-article-close" data-action="post-toggle">× close</button>
      </div>

      <div class="feed-thread" id="comments-${id}">
        <div class="feed-thread-header">
          <span>↳ comments</span>
          <button type="button" class="feed-thread-close" data-action="comments-toggle">× hide</button>
        </div>
        <div id="comments-list-${id}"></div>
        <div class="feed-thread-compose">
          <div class="feed-thread-compose-avatar">${(getLocalItem('user') || 'U').charAt(0).toUpperCase()}</div>
          <input
            type="text"
            id="comment-input-${id}"
            placeholder="write a comment…"
            maxlength="280"
            data-action="comment-input"
            aria-label="Write a comment"
          >
          <button type="button" class="feed-thread-compose-submit" data-action="comment-submit" aria-label="Send comment">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22,2 15,22 11,13 2,9 22,2"></polygon>
            </svg>
          </button>
        </div>
      </div>
    </article>
  `;
}

/* -------------------------------------------------------------------------- */
/*               Delegated event handling for post-card actions               */
/* -------------------------------------------------------------------------- */

let postCardListenersAttached = false;

/**
 * Attach delegated click + keydown listeners on document.body once. Reads
 * `data-action` off the click target and dispatches to the matching window
 * global (populated by FeedPage on its render). Idempotent across mounts —
 * safe to call from FeedPage and ProfilePage.
 */
export function wirePostCardActions(): void {
  if (postCardListenersAttached) return;
  postCardListenersAttached = true;

  document.body.addEventListener('click', handlePostCardClick);
  document.body.addEventListener('keydown', handlePostCardKeydown);
  document.body.addEventListener('focusin', handleReactionFocusIn);
  document.body.addEventListener('focusout', handleReactionFocusOut);
  document.body.addEventListener('mouseover', handleReactionMouseOver);
  document.body.addEventListener('mouseout', handleReactionMouseOut);
}

function postIdFromTarget(el: Element | null): number {
  const article = el?.closest<HTMLElement>('.feed-article');
  return article ? Number(article.dataset.postId) : NaN;
}

function handlePostCardClick(e: Event): void {
  const target = e.target as HTMLElement | null;
  if (!target) return;
  const actionEl = target.closest<HTMLElement>('[data-action]');
  if (!actionEl) return;
  const postId = postIdFromTarget(actionEl);

  switch (actionEl.dataset.action) {
    case 'navigate-profile': {
      e.preventDefault();
      e.stopPropagation();
      const username = actionEl.dataset.username;
      if (username) window.navigateToProfile?.(username);
      return;
    }
    case 'post-menu-toggle': {
      e.stopPropagation();
      window.togglePostMenu?.(postId);
      return;
    }
    case 'post-edit': {
      e.preventDefault();
      window.editPost?.(postId);
      return;
    }
    case 'post-delete': {
      e.preventDefault();
      window.deletePost?.(postId);
      return;
    }
    case 'post-toggle': {
      window.viewFullPost?.(postId);
      return;
    }
    case 'reaction-toggle': {
      const emoji = actionEl.dataset.emoji || '❤️';
      window.toggleReaction?.(postId, emoji);
      return;
    }
    case 'reaction-pick': {
      const emoji = actionEl.dataset.emoji || '❤️';
      window.selectReaction?.(postId, emoji);
      return;
    }
    case 'comments-toggle': {
      window.toggleComments?.(postId);
      return;
    }
    case 'comment-submit': {
      window.submitComment?.(postId);
      return;
    }
    case 'reply-start': {
      const commentId = Number(actionEl.dataset.commentId);
      const author = actionEl.dataset.authorName || '';
      window.startReply?.(commentId, author);
      return;
    }
    case 'reply-cancel': {
      const commentId = Number(actionEl.dataset.commentId);
      window.cancelReply?.(commentId);
      return;
    }
    case 'reply-submit': {
      const commentId = Number(actionEl.dataset.commentId);
      window.submitReply?.(postId, commentId);
      return;
    }
    case 'comment-delete': {
      const commentId = Number(actionEl.dataset.commentId);
      window.deleteCommentFunction?.(postId, commentId);
      return;
    }
  }
}

function handlePostCardKeydown(e: KeyboardEvent): void {
  const target = e.target as HTMLElement | null;
  if (!target) return;

  if (e.key === 'Enter' && target.matches('[data-action="comment-input"]')) {
    e.preventDefault();
    window.submitComment?.(postIdFromTarget(target));
    return;
  }

  if (e.key === 'Enter' && target.matches('[data-action="reply-input"]')) {
    e.preventDefault();
    const commentId = Number((target as HTMLElement).dataset.commentId);
    window.submitReply?.(postIdFromTarget(target), commentId);
    return;
  }

  if (
    (e.key === 'Enter' || e.key === ' ') &&
    target.matches('[data-action="navigate-profile"][role="button"]')
  ) {
    e.preventDefault();
    const username = target.dataset.username;
    if (username) window.navigateToProfile?.(username);
  }
}

function reactionsWrapAndPostId(
  el: Element | null
): { wrap: HTMLElement; postId: number } | null {
  const wrap = el?.closest<HTMLElement>('[data-reactions-wrap]') ?? null;
  if (!wrap) return null;
  const article = wrap.closest<HTMLElement>('.feed-article');
  if (!article) return null;
  return { wrap, postId: Number(article.dataset.postId) };
}

function handleReactionFocusIn(e: FocusEvent): void {
  const found = reactionsWrapAndPostId(e.target as Element | null);
  if (found) window.showReactionsModal?.(found.postId);
}

function handleReactionFocusOut(e: FocusEvent): void {
  const found = reactionsWrapAndPostId(e.target as Element | null);
  if (!found) return;
  requestAnimationFrame(() => {
    if (found.wrap.contains(document.activeElement)) return;
    window.hideReactionsModal?.(found.postId);
  });
}

function handleReactionMouseOver(e: MouseEvent): void {
  const found = reactionsWrapAndPostId(e.target as Element | null);
  if (found) window.showReactionsModal?.(found.postId);
}

function handleReactionMouseOut(e: MouseEvent): void {
  const found = reactionsWrapAndPostId(e.target as Element | null);
  if (!found) return;
  const to = e.relatedTarget as Element | null;
  if (to && found.wrap.contains(to)) return;
  window.hideReactionsModal?.(found.postId);
}
