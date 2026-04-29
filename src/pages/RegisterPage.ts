/**
 * @file pages/RegisterPage.ts
 * @description Standalone /register page using the editorial split-screen shell.
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
    <label for="register-name">Username</label>
    <input
      id="register-name"
      type="text"
      name="name"
      placeholder="my_username"
      required
      autocomplete="username"
      pattern="^[A-Za-z0-9_]+$"
      minlength="3"
      maxlength="20"
      title="Letters, numbers, and underscores only (3–20 characters)"
    />
    <p class="auth-hint">Letters, numbers, and underscores only — no spaces or punctuation.</p>
  </div>
  <div class="auth-field">
    <label for="register-email">Email</label>
    <input id="register-email" type="email" name="email" placeholder="your.email@stud.noroff.no" required autocomplete="email" />
  </div>
  <div class="auth-field">
    <label for="register-password">Password</label>
    <input id="register-password" type="password" name="password" placeholder="••••••••" minlength="8" required autocomplete="new-password" />
    <p class="auth-hint">Minimum 8 characters</p>
  </div>
  <div class="auth-field">
    <label for="register-avatar">Avatar URL <span style="opacity:.6;text-transform:none;font-weight:400;">(optional)</span></label>
    <input id="register-avatar" type="url" name="avatar" placeholder="https://example.com/avatar.jpg" />
  </div>
  <div class="auth-field">
    <label for="register-bio">Bio <span style="opacity:.6;text-transform:none;font-weight:400;">(optional)</span></label>
    <textarea id="register-bio" name="bio" placeholder="Tell us about yourself..." maxlength="160" rows="3"></textarea>
  </div>
`;

export default async function RegisterPage(): Promise<string> {
  setTimeout(() => {
    if (isLoggedIn()) {
      renderRoute('/feed');
      return;
    }
    initTheme('themeToggle', false);
    document.body.style.overflow = 'auto';
    setupAuthStarfield();
    wireAuthLinks();
    const form = document.getElementById('register') as HTMLFormElement | null;
    if (form) wireAuthForm(form, 'register');
  }, 0);

  return renderAuthShell({
    title: 'Create your account',
    subhead: 'Three minutes from here to your first post.',
    quoteHtml: 'Every connection begins with a <span class="accent">spark</span>.',
    fieldsHtml: FIELDS_HTML,
    submitLabel: 'Create Account',
    formId: 'register',
    crosslinkText: 'Already have an account?',
    crosslinkLabel: 'Sign in',
    crosslinkHref: '/login',
  });
}
