/**
 * @file components/postCard.ts
 * @description Editorial-modern flat post surface. Preserves the data-* and
 *              class hooks (`.post-title-compact`, `.post-body`, `.tag-compact`,
 *              `.post-image-preview`, `.like-btn`, `.comment-btn`,
 *              `.action-count-compact`) that FeedPage handlers read.
 */

import type { NoroffPost } from '../services/posts/posts';
import { getLocalItem } from '../utils/storage';
import { getTimeAgo } from '../utils/date';

function escAttr(s: string): string {
  return String(s).replace(/"/g, '&quot;');
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
        <div class="feed-article-author" onclick="navigateToProfile('${escAttr(authorName)}')">
          ${
            avatarUrl
              ? `<img src="${escAttr(avatarUrl)}" alt="${escAttr(avatarAlt)}" loading="lazy">`
              : `<div class="feed-avatar-fallback">${initial}</div>`
          }
          <div class="feed-article-author-info">
            <a class="feed-article-author-name" href="/profile?user=${escAttr(authorName)}"
               onclick="event.preventDefault(); event.stopPropagation(); navigateToProfile('${escAttr(authorName)}')">${escHtml(authorName)}</a>
            <div class="feed-article-author-meta">${timeAgo}</div>
          </div>
        </div>

        ${
          isOwner
            ? `
        <div class="feed-owner-menu">
          <button class="feed-owner-trigger" onclick="event.stopPropagation(); togglePostMenu(${id})" aria-label="Post options">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <circle cx="12" cy="12" r="1"></circle>
              <circle cx="12" cy="5" r="1"></circle>
              <circle cx="12" cy="19" r="1"></circle>
            </svg>
          </button>
          <div class="feed-owner-dropdown post-menu" id="postMenu${id}">
            <a href="#" onclick="editPost(${id}); return false;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              Edit post
            </a>
            <a href="#" onclick="deletePost(${id}); return false;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3,6 5,6 21,6"></polyline>
                <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"></path>
              </svg>
              Delete post
            </a>
          </div>
        </div>
        `
            : ''
        }
      </header>

      ${
        truncatedTitle
          ? `<h3 class="feed-article-title post-title-compact" data-truncated onclick="viewFullPost(${id})">${escHtml(truncatedTitle)}</h3>
             <h3 class="feed-article-title post-title-compact" data-full onclick="viewFullPost(${id})">${escHtml(title)}</h3>`
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
        <div
          class="feed-action-wrap"
          onmouseenter="showReactionsModal(${id})"
          onmouseleave="hideReactionsModal(${id})"
        >
          <button
            class="feed-action like-btn"
            data-post-id="${id}"
            onclick="toggleReaction(${id}, '❤️')"
          >
            <i class="fa-solid fa-heart"></i>
            <span class="action-count-compact">${reactionCount}</span>
          </button>
          <div class="feed-reaction-picker" id="reactions-${id}" style="display:none;">
            ${['👍', '❤️', '😂', '😮', '😢', '😡']
              .map(
                (emoji) =>
                  `<button type="button" onclick="selectReaction(${id}, '${emoji}')">${emoji}</button>`
              )
              .join('')}
          </div>
        </div>

        <button class="feed-action comment-btn" data-post-id="${id}" onclick="toggleComments(${id})">
          <i class="fa-regular fa-comment"></i>
          <span class="action-count-compact">${_count.comments}</span>
        </button>

        <span class="feed-action-spacer"></span>

        <button class="feed-action-read" onclick="viewFullPost(${id})">read →</button>
        <button class="feed-article-close" onclick="viewFullPost(${id})">× close</button>
      </div>

      <div class="feed-thread" id="comments-${id}">
        <div class="feed-thread-header">
          <span>↳ comments</span>
          <button class="feed-thread-close" onclick="toggleComments(${id})">× hide</button>
        </div>
        <div id="comments-list-${id}"></div>
        <div class="feed-thread-compose">
          <div class="feed-thread-compose-avatar">${(getLocalItem('user') || 'U').charAt(0).toUpperCase()}</div>
          <input
            type="text"
            id="comment-input-${id}"
            placeholder="write a comment…"
            maxlength="280"
            onkeypress="if(event.key === 'Enter') submitComment(${id})"
          >
          <button class="feed-thread-compose-submit" onclick="submitComment(${id})" aria-label="Send comment">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22,2 15,22 11,13 2,9 22,2"></polygon>
            </svg>
          </button>
        </div>
      </div>
    </article>
  `;
}
