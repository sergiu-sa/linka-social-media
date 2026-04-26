/**
 * @file pages/LoginPage.ts
 * @description Standalone /login page using the editorial split-screen shell.
 */

import { renderRoute } from '../router';
import { isLoggedIn } from '../utils/auth';
import { initTheme } from '../utils/theme';
import { wireAuthForm } from '../services/auth/handler';
import {
  renderAuthShell,
  setupAuthStarfield,
  wireAuthLinks,
} from './auth/authShell';

const FIELDS_HTML = `
  <div class="auth-field">
    <label for="login-email">Email</label>
    <input id="login-email" type="email" name="email" placeholder="your.email@stud.noroff.no" required autocomplete="email" />
  </div>
  <div class="auth-field">
    <label for="login-password">Password</label>
    <input id="login-password" type="password" name="password" placeholder="••••••••" required autocomplete="current-password" />
  </div>
`;

export default async function LoginPage(): Promise<string> {
  setTimeout(() => {
    if (isLoggedIn()) {
      renderRoute('/feed');
      return;
    }
    initTheme('themeToggle', false);
    document.body.style.overflow = 'auto';
    setupAuthStarfield();
    wireAuthLinks();
    const form = document.getElementById('login') as HTMLFormElement | null;
    if (form) wireAuthForm(form, 'login');
  }, 0);

  return renderAuthShell({
    title: 'Sign in',
    subhead: 'Welcome back. Pick up where you left off.',
    quoteHtml: 'Connections come <span class="accent">together</span>.',
    fieldsHtml: FIELDS_HTML,
    submitLabel: 'Sign In',
    formId: 'login',
    crosslinkText: 'New to LINKA?',
    crosslinkLabel: 'Create an account',
    crosslinkHref: '/register',
  });
}
