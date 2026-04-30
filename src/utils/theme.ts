/**
 * @file utils/theme.ts
 * @description Single source of truth for light/dark theme.
 *
 * The CSS still uses TWO selector conventions for historical reasons:
 *   - `.dark .x` (Tailwind v4 custom variant declared in style.css)
 *   - `html.light-mode .x` (manual rules)
 * To keep every existing selector working, this module sets BOTH classes
 * in lockstep on `<html>`. When `<html>` has `.dark`, it never has
 * `.light-mode`, and vice versa.
 *
 * Components that need to react to theme changes can listen for the
 * `linka-theme-changed` event on `document`.
 */

export type ThemeKind = 'light' | 'dark';

const STORAGE_KEY = 'theme';
const EVENT_NAME = 'linka-theme-changed';

/** Reads the user's persisted theme, falling back to OS preference. */
export function getInitialTheme(): ThemeKind {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true;
  return prefersDark ? 'dark' : 'light';
}

/** Returns the theme currently applied to `<html>`. */
export function getCurrentTheme(): ThemeKind {
  return document.documentElement.classList.contains('light-mode') ? 'light' : 'dark';
}

/** Apply a theme. Sets both `.dark` and `.light-mode` so all CSS selectors fire. */
export function applyTheme(kind: ThemeKind): void {
  const html = document.documentElement;
  if (kind === 'light') {
    html.classList.add('light-mode');
    html.classList.remove('dark');
  } else {
    html.classList.add('dark');
    html.classList.remove('light-mode');
  }
  document.dispatchEvent(new Event(EVENT_NAME));
}

/** Persist + apply. Used by toggleTheme and initTheme. */
function setTheme(kind: ThemeKind): void {
  localStorage.setItem(STORAGE_KEY, kind);
  applyTheme(kind);
}

/** Toggle between light and dark. */
export function toggleTheme(): ThemeKind {
  const next: ThemeKind = getCurrentTheme() === 'light' ? 'dark' : 'light';
  setTheme(next);
  return next;
}

/**
 * Wire a checkbox `#${toggleId}` to the theme. Used by the auth shell and
 * the intro page (each render their own toggle inside the page HTML).
 *
 * @param toggleId         id of the `<input type="checkbox">` to bind
 * @param lockBodyOverflow when true, hides body overflow (intro page only)
 */
export function initTheme(toggleId = 'themeToggle', lockBodyOverflow = false): void {
  const initial = getInitialTheme();
  applyTheme(initial);
  if (lockBodyOverflow) document.body.style.overflow = 'hidden';

  const toggle = document.getElementById(toggleId) as HTMLInputElement | null;
  if (!toggle) return;
  toggle.checked = initial === 'light';
  toggle.addEventListener('change', () => {
    setTheme(toggle.checked ? 'light' : 'dark');
  });
}
