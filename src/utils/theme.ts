/**
 * @file utils/theme.ts
 * @description Shared theme (light/dark) handling for pages with a #themeToggle checkbox.
 */

export type ThemeKind = 'light' | 'dark';

export function applyTheme(kind: ThemeKind): void {
  const html = document.documentElement;
  if (kind === 'light') {
    html.classList.add('light-mode');
    document.body.style.background = '#ffffff';
    document.body.style.color = '#111';
  } else {
    html.classList.remove('light-mode');
    document.body.style.background = '#0b1220';
    document.body.style.color = '#fff';
  }
}

export function initTheme(toggleId = 'themeToggle', lockBodyOverflow = false): void {
  const toggle = document.getElementById(toggleId) as HTMLInputElement | null;
  const saved = (localStorage.getItem('theme') as ThemeKind) || 'dark';
  applyTheme(saved);
  if (lockBodyOverflow) document.body.style.overflow = 'hidden';

  if (!toggle) return;
  toggle.checked = saved === 'light';
  toggle.addEventListener('change', () => {
    const next: ThemeKind = toggle.checked ? 'light' : 'dark';
    localStorage.setItem('theme', next);
    applyTheme(next);
    document.dispatchEvent(new Event('linka-theme-changed'));
  });
}
