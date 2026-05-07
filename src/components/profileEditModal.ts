/**
 * @file components/profileEditModal.ts
 * @description Edit-profile modal. Lets the owner update bio, avatar URL+alt,
 *              and banner URL+alt. Username + email are immutable on Noroff
 *              and not exposed here. Mirrors the post-modal aesthetic.
 */

import { iconSvg } from '../utils/icon';
import { X, Check } from 'lucide';
import { updateProfile } from '../services/profile/profile';
import type { UserProfile } from '../types/index';
import { error as logError } from '../utils/log';

const BIO_MAX = 160;
const ALT_MAX = 120;

let activeRoot: HTMLElement | null = null;
let returnFocus: HTMLElement | null = null;
let escHandler: ((e: KeyboardEvent) => void) | null = null;

function escAttr(s: string): string {
  return String(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function escHtml(s: string): string {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

export interface ProfileEditOptions {
  profile: Pick<UserProfile, 'name' | 'bio' | 'avatar' | 'banner'>;
  onSaved: (updated: UserProfile) => void;
}

function renderMarkup(profile: ProfileEditOptions['profile']): string {
  const bio = profile.bio ?? '';
  const avatar = profile.avatar ?? { url: '', alt: '' };
  const banner = profile.banner ?? { url: '', alt: '' };

  return `
    <div class="profile-edit-backdrop" data-profile-edit-root>
      <form class="profile-edit-card" role="dialog" aria-modal="true" aria-labelledby="profile-edit-title" novalidate>
        <header class="profile-edit-header">
          <h2 class="profile-edit-title" id="profile-edit-title">Edit profile</h2>
          <button
            type="button"
            class="profile-edit-close"
            data-profile-edit-action="close"
            aria-label="Close"
          >${iconSvg(X, { size: 18, strokeWidth: 2.2 })}</button>
        </header>

        <div class="profile-edit-scroll">
          <div class="profile-edit-note">
            Username and email can't be changed — Noroff doesn't expose them.
          </div>

          <fieldset class="profile-edit-field">
            <legend>Banner</legend>
            <label>
              <span>Image URL</span>
              <input type="url" name="banner-url" value="${escAttr(banner.url)}" placeholder="https://…" autocomplete="off" />
            </label>
            <label>
              <span>Alt text</span>
              <input type="text" name="banner-alt" value="${escAttr(banner.alt)}" maxlength="${ALT_MAX}" placeholder="Brief description" autocomplete="off" />
            </label>
            <div class="profile-edit-preview" data-preview-for="banner-url" hidden></div>
            <p class="profile-edit-error" data-error-for="banner" hidden></p>
          </fieldset>

          <fieldset class="profile-edit-field">
            <legend>Avatar</legend>
            <label>
              <span>Image URL</span>
              <input type="url" name="avatar-url" value="${escAttr(avatar.url)}" placeholder="https://…" autocomplete="off" />
            </label>
            <label>
              <span>Alt text</span>
              <input type="text" name="avatar-alt" value="${escAttr(avatar.alt)}" maxlength="${ALT_MAX}" placeholder="Brief description" autocomplete="off" />
            </label>
            <div class="profile-edit-preview profile-edit-preview-avatar" data-preview-for="avatar-url" hidden></div>
            <p class="profile-edit-error" data-error-for="avatar" hidden></p>
          </fieldset>

          <fieldset class="profile-edit-field">
            <legend>Bio</legend>
            <label>
              <textarea name="bio" rows="3" maxlength="${BIO_MAX}" placeholder="A short tagline">${escHtml(bio)}</textarea>
              <span class="profile-edit-counter" data-counter-for="bio">${bio.length} / ${BIO_MAX}</span>
            </label>
          </fieldset>

          <p class="profile-edit-error profile-edit-error-summary" data-error-for="form" hidden></p>
        </div>

        <footer class="profile-edit-footer">
          <button
            type="button"
            class="profile-edit-cancel"
            data-profile-edit-action="close"
          >${iconSvg(X, { size: 14, strokeWidth: 2.2 })}<span>Cancel</span></button>
          <button
            type="submit"
            class="profile-edit-save"
          >${iconSvg(Check, { size: 14, strokeWidth: 2.6 })}<span>Save</span></button>
        </footer>
      </form>
    </div>
  `;
}

function setError(root: HTMLElement, key: string, message: string | null): void {
  const el = root.querySelector<HTMLElement>(`[data-error-for="${key}"]`);
  if (!el) return;
  if (!message) {
    el.hidden = true;
    el.textContent = '';
  } else {
    el.hidden = false;
    el.textContent = message;
  }
}

/** Async test that a URL resolves to a renderable image. Resolves to true on
 *  load, false on error. Used to give inline feedback before the API rejects. */
function probeImage(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (!url) {
      resolve(true);
      return;
    }
    const img = new Image();
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      resolve(ok);
    };
    img.onload = () => finish(true);
    img.onerror = () => finish(false);
    img.src = url;
    setTimeout(() => finish(false), 6000);
  });
}

function wirePreviews(root: HTMLElement): void {
  const update = async (inputName: string, key: 'banner' | 'avatar') => {
    const input = root.querySelector<HTMLInputElement>(`input[name="${inputName}"]`);
    const preview = root.querySelector<HTMLElement>(`[data-preview-for="${inputName}"]`);
    if (!input || !preview) return;
    const url = input.value.trim();
    if (!url) {
      preview.hidden = true;
      preview.innerHTML = '';
      setError(root, key, null);
      return;
    }
    preview.hidden = false;
    preview.innerHTML = `<img src="${escAttr(url)}" alt="" loading="lazy" />`;
    const ok = await probeImage(url);
    if (!ok) {
      preview.hidden = true;
      preview.innerHTML = '';
      setError(root, key, "URL didn't load as an image. Use a public, direct image link.");
    } else {
      setError(root, key, null);
    }
  };

  root.querySelector<HTMLInputElement>('input[name="banner-url"]')?.addEventListener('blur', () => {
    void update('banner-url', 'banner');
  });
  root.querySelector<HTMLInputElement>('input[name="avatar-url"]')?.addEventListener('blur', () => {
    void update('avatar-url', 'avatar');
  });

  // Initial preview pass for pre-populated values
  void update('banner-url', 'banner');
  void update('avatar-url', 'avatar');
}

function wireBioCounter(root: HTMLElement): void {
  const textarea = root.querySelector<HTMLTextAreaElement>('textarea[name="bio"]');
  const counter = root.querySelector<HTMLElement>('[data-counter-for="bio"]');
  if (!textarea || !counter) return;
  const update = () => {
    counter.textContent = `${textarea.value.length} / ${BIO_MAX}`;
  };
  textarea.addEventListener('input', update);
}

async function handleSubmit(
  root: HTMLElement,
  username: string,
  onSaved: (u: UserProfile) => void
): Promise<void> {
  setError(root, 'form', null);

  const form = root.querySelector<HTMLFormElement>('form.profile-edit-card');
  if (!form) return;

  const data = new FormData(form);
  const bannerUrl = String(data.get('banner-url') || '').trim();
  const bannerAlt = String(data.get('banner-alt') || '').trim();
  const avatarUrl = String(data.get('avatar-url') || '').trim();
  const avatarAlt = String(data.get('avatar-alt') || '').trim();
  const bio = String(data.get('bio') || '').trim();

  // Build a payload with only changed-or-set fields. Noroff requires at
  // least one to be present.
  const payload: {
    bio?: string;
    avatar?: { url: string; alt: string };
    banner?: { url: string; alt: string };
  } = {};
  payload.bio = bio;
  if (avatarUrl) payload.avatar = { url: avatarUrl, alt: avatarAlt };
  if (bannerUrl) payload.banner = { url: bannerUrl, alt: bannerAlt };

  const saveBtn = form.querySelector<HTMLButtonElement>('.profile-edit-save');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.setAttribute('aria-busy', 'true');
  }

  try {
    const updated = await updateProfile(username, payload);
    onSaved(updated);
    closeProfileEditModal();
  } catch (err: unknown) {
    const msg =
      err instanceof Error
        ? err.message
        : 'Couldn\'t save changes. Please try again.';
    setError(root, 'form', msg);
    logError('profile edit submit failed', err);
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.removeAttribute('aria-busy');
    }
  }
}

export function openProfileEditModal(options: ProfileEditOptions): void {
  if (activeRoot) closeProfileEditModal();

  returnFocus = (document.activeElement as HTMLElement) || null;

  const wrapper = document.createElement('div');
  wrapper.innerHTML = renderMarkup(options.profile);
  const root = wrapper.firstElementChild as HTMLElement;
  document.body.appendChild(root);
  document.body.classList.add('profile-edit-open');
  activeRoot = root;

  setTimeout(() => {
    root.querySelector<HTMLInputElement>('input[name="banner-url"]')?.focus();
  }, 30);

  root.addEventListener('click', (e) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    if (target === root) {
      closeProfileEditModal();
      return;
    }
    const actionEl = target.closest<HTMLElement>('[data-profile-edit-action]');
    if (actionEl?.dataset.profileEditAction === 'close') {
      closeProfileEditModal();
    }
  });

  const form = root.querySelector<HTMLFormElement>('form.profile-edit-card');
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    void handleSubmit(root, options.profile.name, options.onSaved);
  });

  wirePreviews(root);
  wireBioCounter(root);

  escHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeProfileEditModal();
    }
  };
  document.addEventListener('keydown', escHandler);
}

export function closeProfileEditModal(): void {
  if (!activeRoot) return;
  activeRoot.remove();
  activeRoot = null;
  document.body.classList.remove('profile-edit-open');

  if (escHandler) {
    document.removeEventListener('keydown', escHandler);
    escHandler = null;
  }

  returnFocus?.focus?.();
  returnFocus = null;
}
