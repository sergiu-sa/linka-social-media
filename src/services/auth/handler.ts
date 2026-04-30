/**
 * @file services/auth/handler.ts
 * @description Auth form submit handler. Wires a <form> to the login/register API.
 *              Extracted from IntroAuthPage.ts so behavior is identical.
 */

import { loginUser, registerUser, fetchApiKey } from '../api/client';
import { setLocalItem } from '../../utils/storage';
import { renderRoute } from '../../router';
import { warn, error as logError } from '../../utils/log';
import { iconSvg } from '../../utils/icon';
import { Check, X } from 'lucide';
import type {
  LoginCredentials,
  ApiResponse,
  LoginResponse,
  RegisterData,
} from '../../types/index';

export type AuthMode = 'login' | 'register';

export function wireAuthForm(form: HTMLFormElement, mode: AuthMode): void {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector<HTMLButtonElement>('.submit-btn')!;
    const msg = form.querySelector<HTMLParagraphElement>('.form-msg')!;
    const original = btn.textContent || 'Submit';
    btn.disabled = true;
    btn.textContent = 'Processing…';
    msg.textContent = '';

    const fd = new FormData(form);
    const email = String(fd.get('email') || '');
    const password = String(fd.get('password') || '');
    const name = String(fd.get('name') || '');
    const avatarUrl = (fd.get('avatar') as string)?.trim() || '';
    const bio = (fd.get('bio') as string)?.trim() || undefined;

    try {
      let token: string | undefined;
      let loggedInName: string | undefined;

      if (mode === 'login') {
        const res = (await loginUser({
          email,
          password,
        } as LoginCredentials)) as ApiResponse<LoginResponse>;
        token = res?.data?.accessToken;
        loggedInName = res?.data?.name;
      } else {
        const payload: RegisterData = { name, email, password };
        if (bio) payload.bio = bio;
        if (avatarUrl) payload.avatar = { url: avatarUrl, alt: `${name} avatar` };
        await registerUser(payload);
        const res = (await loginUser({
          email,
          password,
        } as LoginCredentials)) as ApiResponse<LoginResponse>;
        token = res?.data?.accessToken;
        loggedInName = res?.data?.name || name;
      }

      if (!token) throw new Error('No access token returned.');

      setLocalItem('accessToken', token);
      if (loggedInName) setLocalItem('user', loggedInName);

      try {
        const key = await fetchApiKey(token);
        if (key) setLocalItem('apiKey', key);
      } catch (e) {
        warn('Could not fetch API key yet:', e);
      }

      btn.innerHTML = `<span class="auth-btn-state">${iconSvg(Check, { size: 16, strokeWidth: 2.6 })}<span>Success</span></span>`;
      document.dispatchEvent(new Event('auth:changed'));
      setTimeout(() => {
        document.body.style.overflow = 'auto';
        window.refreshNavbar?.();
        setTimeout(() => {
          // Keep the URL bar in sync with the rendered page — otherwise
          // the user lands on /feed content while the URL still says /login.
          history.pushState({ path: '/feed' }, '', '/feed');
          renderRoute('/feed');
        }, 50);
      }, 500);
    } catch (err: any) {
      logError(err);
      msg.textContent =
        err?.message || 'Something went wrong. Please try again.';
      btn.innerHTML = `<span class="auth-btn-state">${iconSvg(X, { size: 16, strokeWidth: 2.6 })}<span>Error</span></span>`;
      setTimeout(() => {
        btn.textContent = original;
        btn.disabled = false;
      }, 1000);
    }
  });
}
