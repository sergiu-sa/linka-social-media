/**
 * @file components/notificationsBell.ts
 * @description Navbar bell + dropdown panel. Subscribes to the notifications
 *              service and re-renders on every publish. Click an item to
 *              navigate to the post and open its thread.
 */

import { iconSvg } from '../utils/icon';
import { Bell, Heart, MessageCircle } from 'lucide';
import {
  subscribe,
  markAllRead,
  markRead,
  type NotificationItem,
} from '../services/notifications/notifications';

function escapeHtml(s: string): string {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

export function notificationsBellMarkup(): string {
  return `
    <div class="linka-notif" data-notif-root>
      <button
        type="button"
        id="notif-toggle"
        class="linka-notif-toggle linka-nav-icon-btn"
        aria-haspopup="true"
        aria-expanded="false"
        aria-label="Notifications"
      >
        ${iconSvg(Bell, { size: 18, strokeWidth: 2 })}
        <span class="linka-notif-dot" aria-hidden="true" hidden></span>
        <span class="sr-only" aria-live="polite" id="notif-sr-count">0 unread notifications</span>
      </button>
      <div class="linka-notif-panel" id="notif-panel" role="dialog" aria-label="Notifications" hidden>
        <header class="linka-notif-panel-header">
          <span class="linka-notif-panel-title">Activity</span>
          <button type="button" class="linka-notif-mark-all" id="notif-mark-all">Mark all read</button>
        </header>
        <ul class="linka-notif-list" id="notif-list" role="list"></ul>
        <p class="linka-notif-empty" id="notif-empty" hidden>You're all caught up.</p>
      </div>
    </div>
  `;
}

export function mountNotificationsBell(): () => void {
  const root = document.querySelector<HTMLElement>('[data-notif-root]');
  if (!root) return () => {};

  const toggleBtn = root.querySelector<HTMLButtonElement>('#notif-toggle');
  const panel = root.querySelector<HTMLElement>('#notif-panel');
  const list = root.querySelector<HTMLUListElement>('#notif-list');
  const empty = root.querySelector<HTMLElement>('#notif-empty');
  const dot = root.querySelector<HTMLElement>('.linka-notif-dot');
  const srCount = root.querySelector<HTMLElement>('#notif-sr-count');
  const markAllBtn = root.querySelector<HTMLButtonElement>('#notif-mark-all');

  let isOpen = false;

  const setOpen = (open: boolean) => {
    isOpen = open;
    if (open) panel?.removeAttribute('hidden');
    else panel?.setAttribute('hidden', '');
    toggleBtn?.setAttribute('aria-expanded', open ? 'true' : 'false');
  };

  const renderItem = (item: NotificationItem): string => {
    const parts: string[] = [];
    if (item.reactionDelta > 0) {
      parts.push(
        `<span class="linka-notif-item-meta-chip">
           <i class="linka-notif-item-meta-icon" aria-hidden="true">${iconSvg(Heart, { size: 12, strokeWidth: 2.4 })}</i>
           +${item.reactionDelta}
         </span>`
      );
    }
    if (item.commentDelta > 0) {
      parts.push(
        `<span class="linka-notif-item-meta-chip">
           <i class="linka-notif-item-meta-icon" aria-hidden="true">${iconSvg(MessageCircle, { size: 12, strokeWidth: 2 })}</i>
           +${item.commentDelta}
         </span>`
      );
    }
    return `
      <li>
        <button type="button" class="linka-notif-item" data-post-id="${item.postId}">
          <span class="linka-notif-item-text">${escapeHtml(item.postTitle)}</span>
          <span class="linka-notif-item-meta">${parts.join('')}</span>
        </button>
      </li>`;
  };

  const render = (items: NotificationItem[]) => {
    if (!list || !empty || !dot || !srCount) return;
    const total = items.length;

    if (total === 0) {
      dot.setAttribute('hidden', '');
    } else {
      dot.removeAttribute('hidden');
    }
    srCount.textContent = `${total} unread ${total === 1 ? 'notification' : 'notifications'}`;

    if (total === 0) {
      list.hidden = true;
      empty.hidden = false;
      list.innerHTML = '';
    } else {
      list.hidden = false;
      empty.hidden = true;
      list.innerHTML = items.map(renderItem).join('');
    }

    // Mirror the unread state on every Profile link (desktop + mobile).
    document
      .querySelectorAll<HTMLElement>('[data-nav="profile"]')
      .forEach((p) => p.classList.toggle('has-unread', total > 0));
  };

  const unsub = subscribe(render);

  const onToggleClick = (e: MouseEvent) => {
    e.stopPropagation();
    setOpen(!isOpen);
  };
  toggleBtn?.addEventListener('click', onToggleClick);

  const onDocClick = (e: MouseEvent) => {
    if (!isOpen) return;
    const target = e.target as Element | null;
    if (target && !root.contains(target)) setOpen(false);
  };
  document.addEventListener('click', onDocClick);

  const onKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && isOpen) {
      setOpen(false);
      toggleBtn?.focus();
    }
  };
  document.addEventListener('keydown', onKeydown);

  const onMarkAll = () => {
    markAllRead();
  };
  markAllBtn?.addEventListener('click', onMarkAll);

  const onListClick = (e: Event) => {
    const target = e.target as HTMLElement | null;
    const btn = target?.closest<HTMLButtonElement>('.linka-notif-item');
    if (!btn) return;
    const id = Number(btn.dataset.postId);
    if (!Number.isFinite(id)) return;
    markRead(id);
    setOpen(false);
    const url = `/feed?post=${id}`;
    history.pushState({ path: url }, '', url);
    window.renderRoute?.(url);
  };
  list?.addEventListener('click', onListClick);

  return () => {
    unsub();
    toggleBtn?.removeEventListener('click', onToggleClick);
    document.removeEventListener('click', onDocClick);
    document.removeEventListener('keydown', onKeydown);
    markAllBtn?.removeEventListener('click', onMarkAll);
    list?.removeEventListener('click', onListClick);
  };
}
