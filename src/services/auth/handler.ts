/**
 * @file services/auth/handler.ts
 * @description Auth form submit handler. Wires a <form> to the login/register API.
 *              Extracted from IntroAuthPage.ts so behavior is identical.
 */

import { loginUser, registerUser, fetchApiKey } from '../api/client';
import { setLocalItem } from '../../utils/storage';
import { renderRoute } from '../../router';
import type {
  LoginCredentials,
  ApiResponse,
  LoginResponse,
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
    const avatar = (fd.get('avatar') as string) || undefined;
    const bio = (fd.get('bio') as string) || undefined;

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
        await registerUser({ name, email, password, avatar, bio } as any);
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
        console.warn('Could not fetch API key yet:', e);
      }

      btn.textContent = '✓ Success';
      document.dispatchEvent(new Event('auth:changed'));
      setTimeout(() => {
        document.body.style.overflow = 'auto';
        if (typeof (window as any).refreshNavbar === 'function') {
          (window as any).refreshNavbar();
        }
        setTimeout(() => {
          renderRoute('/feed');
        }, 50);
      }, 500);
    } catch (err: any) {
      console.error(err);
      msg.textContent =
        err?.message || 'Something went wrong. Please try again.';
      btn.textContent = '✗ Error';
      setTimeout(() => {
        btn.textContent = original;
        btn.disabled = false;
      }, 1000);
    }
  });
}
