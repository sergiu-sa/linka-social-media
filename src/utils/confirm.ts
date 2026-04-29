/**
 * @file utils/confirm.ts
 * @description Promise-based replacement for the native `confirm()` dialog.
 *              Renders a flat editorial-style modal, traps focus inside,
 *              defaults focus to the cancel button (so Enter doesn't
 *              accidentally trigger destructive actions), restores focus
 *              on close, and resolves with `true`/`false`.
 *
 *              CSS in style.css under `.linka-confirm`.
 */

export interface ConfirmOptions {
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** When true, the confirm button gets the danger styling (red). */
  danger?: boolean;
}

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const root = document.createElement('div');
    root.className = 'linka-confirm';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-labelledby', 'linka-confirm-title');
    if (opts.body) root.setAttribute('aria-describedby', 'linka-confirm-body');

    root.innerHTML = `
      <div class="linka-confirm-backdrop" data-confirm-cancel></div>
      <div class="linka-confirm-panel">
        <h2 id="linka-confirm-title" class="linka-confirm-title">${escape(opts.title)}</h2>
        ${
          opts.body
            ? `<p id="linka-confirm-body" class="linka-confirm-body">${escape(opts.body)}</p>`
            : ''
        }
        <div class="linka-confirm-actions">
          <button type="button" class="linka-confirm-cancel" data-confirm-cancel>
            ${escape(opts.cancelLabel || 'Cancel')}
          </button>
          <button
            type="button"
            class="linka-confirm-confirm ${opts.danger ? 'is-danger' : ''}"
            data-confirm-ok
          >${escape(opts.confirmLabel || 'Confirm')}</button>
        </div>
      </div>
    `;

    document.body.appendChild(root);
    requestAnimationFrame(() => root.classList.add('is-visible'));

    const cancel = () => done(false);
    const ok = () => done(true);

    function done(result: boolean) {
      root.classList.remove('is-visible');
      window.removeEventListener('keydown', onKey, true);
      // Match the CSS exit transition duration.
      setTimeout(() => {
        root.remove();
        previouslyFocused?.focus?.();
        resolve(result);
      }, 180);
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        cancel();
        return;
      }
      if (e.key === 'Tab') {
        const focusable = Array.from(
          root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        );
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
      if (e.key === 'Enter' && document.activeElement?.matches('[data-confirm-ok]')) {
        e.preventDefault();
        ok();
      }
    }

    root.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-confirm-cancel]')) cancel();
      else if (target.closest('[data-confirm-ok]')) ok();
    });

    window.addEventListener('keydown', onKey, true);

    // Default focus to the cancel button so Enter doesn't auto-confirm.
    requestAnimationFrame(() => {
      root.querySelector<HTMLElement>('.linka-confirm-cancel')?.focus();
    });
  });
}

function escape(s: string): string {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}
