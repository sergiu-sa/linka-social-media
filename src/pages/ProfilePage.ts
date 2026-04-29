/**
 * @file ProfilePage.ts
 * @description Editorial-flat profile page. Reuses the feed-article component
 *              for the posts tab so profile + feed share visual language.
 *              CSS in style.css under `.linka-profile`.
 */

import postCard, { wirePostCardActions } from '../components/postCard';
import { type NoroffPost } from '../services/posts/posts';
import { getLocalItem } from '../utils/storage';
import { isLoggedIn } from '../utils/auth';
import { get, put } from '../services/api/client';
import { error as logError } from '../utils/log';
import type {
  UserProfile,
  FollowResponse,
  ProfileWithFollowData,
} from '../types/index';

export default async function ProfilePage(): Promise<string> {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const targetUsername = urlParams.get('user')?.trim() || null;
    const storedUsername = getStoredUsername();
    const profileUsername = targetUsername ?? storedUsername;
    const isOwnProfile = !targetUsername;

    if (!profileUsername) return renderErrorState('Please log in to view profiles');

    const username = profileUsername as string;

    const [profileData, userPosts] = await Promise.all([
      fetchUserProfile(username),
      fetchUserPosts(username),
    ]);

    setTimeout(() => initializeProfileInteractions(username, isOwnProfile), 100);

    const counts = {
      posts: profileData._count.posts,
      media: userPosts.filter((p) => p.media?.url).length,
      following: profileData._count.following,
      followers: profileData._count.followers,
    };

    return `
      <main class="linka-profile">
        <div class="feed-column linka-profile-column">
          ${renderProfileHeader(profileData, isOwnProfile)}
          ${renderProfileMeta(profileData)}
          ${renderStatsBar(profileData)}
          ${renderTabs(counts)}
          <div id="profile-tab-content" class="linka-profile-tab-content">
            ${renderPostsTab(userPosts)}
          </div>
        </div>
      </main>
    `;
  } catch (err) {
    logError('Error loading profile:', err);
    return renderErrorState('Failed to load profile');
  }
}

/* --------------------- Data Fetching --------------------- */
async function fetchUserProfile(username: string): Promise<ProfileWithFollowData> {
  try {
    const response = await get<{ data: ProfileWithFollowData }>(
      `/social/profiles/${username}?_followers=true&_following=true`
    );
    return response.data;
  } catch {
    return {
      name: username,
      email: `${username}@stud.noroff.no`,
      bio: '',
      _count: { posts: 0, followers: 0, following: 0 },
      followers: [],
      following: [],
    };
  }
}

async function fetchUserPosts(username: string): Promise<NoroffPost[]> {
  try {
    const response = await get<{ data: NoroffPost[] }>(
      `/social/profiles/${username}/posts?_author=true&_reactions=true`
    );
    return response.data || [];
  } catch {
    return [];
  }
}

/* --------------------- Render Functions --------------------- */
function renderProfileHeader(
  profile: ProfileWithFollowData,
  isOwnProfile: boolean
): string {
  const avatarUrl = profile.avatar?.url;
  const initial = profile.name.charAt(0).toUpperCase();
  const followAction =
    !isOwnProfile && isLoggedIn()
      ? `<button id="follow-btn" class="feed-cta linka-profile-follow" data-username="${escAttr(profile.name)}">Follow</button>`
      : '';

  return `
    <header class="linka-profile-header">
      <div class="linka-profile-identity">
        ${
          avatarUrl
            ? `<img src="${escAttr(avatarUrl)}" alt="${escAttr(profile.name)}'s avatar" class="linka-profile-avatar" />`
            : `<div class="linka-profile-avatar linka-profile-avatar-fallback">${initial}</div>`
        }
        <div class="linka-profile-name-block">
          <p class="linka-profile-eyebrow">Profile</p>
          <h1 class="linka-profile-name">${profile.name}</h1>
          <p class="linka-profile-handle">@${profile.name.toLowerCase()}</p>
        </div>
      </div>
      ${followAction}
    </header>
  `;
}

function renderProfileMeta(profile: ProfileWithFollowData): string {
  if (!profile.bio) return '';
  return `<p class="linka-profile-bio">${escHtml(profile.bio)}</p>`;
}

function renderStatsBar(profile: UserProfile): string {
  return `
    <dl class="linka-profile-stats" aria-label="Profile statistics">
      <div class="linka-profile-stat">
        <dt>Posts</dt>
        <dd>${profile._count.posts}</dd>
      </div>
      <div class="linka-profile-stat">
        <dt>Following</dt>
        <dd id="following-count">${profile._count.following}</dd>
      </div>
      <div class="linka-profile-stat">
        <dt>Followers</dt>
        <dd id="followers-count">${profile._count.followers}</dd>
      </div>
    </dl>
  `;
}

type TabCounts = {
  posts: number;
  media: number;
  following: number;
  followers: number;
};

function renderTabs(counts: TabCounts): string {
  const tabs: Array<[keyof TabCounts, string]> = [
    ['posts', 'Posts'],
    ['media', 'Media'],
    ['following', 'Following'],
    ['followers', 'Followers'],
  ];
  return `
    <nav class="linka-profile-tabs" role="tablist" aria-label="Profile sections">
      ${tabs
        .map(
          ([key, label], i) => `
        <button
          type="button"
          role="tab"
          class="linka-profile-tab ${i === 0 ? 'is-active' : ''}"
          data-tab="${key}"
          aria-selected="${i === 0 ? 'true' : 'false'}"
        >
          <span class="linka-profile-tab-label">${label}</span>
          <span class="linka-profile-tab-count" aria-label="${counts[key]} ${label.toLowerCase()}">${counts[key]}</span>
        </button>
      `
        )
        .join('')}
    </nav>
  `;
}

function renderPostsTab(posts: NoroffPost[]): string {
  if (!posts.length) {
    return renderEmptyState(
      'No posts yet',
      "When this user shares posts, they'll show up here."
    );
  }
  return `
    <div class="feed-articles">
      ${posts.map((post, i) => postCard(post, i * 0.04)).join('')}
    </div>
  `;
}

function renderMediaTab(posts: NoroffPost[]): string {
  const mediaPosts = posts.filter((p) => p.media?.url);
  if (!mediaPosts.length) {
    return renderEmptyState(
      'No media yet',
      "Photos and videos this user shares will appear here."
    );
  }
  return `
    <div class="linka-profile-media-grid">
      ${mediaPosts
        .map(
          (p) => `
        <a href="/profile?user=${escAttr(p.author.name)}#${p.id}" class="linka-profile-media-tile">
          <img src="${escAttr(p.media!.url)}" alt="${escAttr(p.media!.alt || p.title)}" loading="lazy" />
        </a>
      `
        )
        .join('')}
    </div>
  `;
}

function renderUserListTab(
  users: Array<{ name: string; email: string }>,
  emptyTitle: string,
  emptyBody: string
): string {
  if (!users.length) return renderEmptyState(emptyTitle, emptyBody);
  return `
    <ul class="linka-profile-userlist" role="list">
      ${users
        .map(
          (u) => `
        <li>
          <a href="/profile?user=${escAttr(u.name)}" class="linka-profile-userlist-row" data-userlink>
            <span class="linka-profile-userlist-avatar">${u.name.charAt(0).toUpperCase()}</span>
            <span class="linka-profile-userlist-name">${escHtml(u.name)}</span>
            <span class="linka-profile-userlist-email">${escHtml(u.email)}</span>
          </a>
        </li>
      `
        )
        .join('')}
    </ul>
  `;
}

function renderEmptyState(title: string, body: string): string {
  return `
    <div class="linka-profile-empty">
      <h3 class="linka-profile-empty-title">${escHtml(title)}</h3>
      <p class="linka-profile-empty-body">${escHtml(body)}</p>
    </div>
  `;
}

function renderErrorState(message: string): string {
  return `
    <main class="linka-profile">
      <div class="feed-column linka-profile-column">
        <div class="linka-profile-empty linka-profile-error">
          <p class="linka-profile-eyebrow">Error</p>
          <h1 class="linka-profile-empty-title">Unable to load profile</h1>
          <p class="linka-profile-empty-body">${escHtml(message)}</p>
          <button class="intro-cta intro-cta-secondary" onclick="history.back()">← Go back</button>
        </div>
      </div>
    </main>
  `;
}

/* --------------------- Utility --------------------- */
function escAttr(s: string): string {
  return String(s).replace(/"/g, '&quot;');
}
function escHtml(s: string): string {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function getStoredUsername(): string | null {
  let user = getLocalItem('user');
  if (!user) {
    try {
      const token = getLocalItem('accessToken');
      if (typeof token === 'string' && token.split('.').length === 3) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const nameFromToken = payload?.name || payload?.username || payload?.sub;
        if (typeof nameFromToken === 'string' && nameFromToken.trim()) {
          user = nameFromToken.trim();
          try {
            localStorage.setItem('user', JSON.stringify(user));
          } catch {}
        }
      }
    } catch {}
  }
  if (!user) return null;
  if (typeof user === 'string') return user.trim() || null;
  if (typeof user === 'object') {
    const name = (user as any).name || (user as any).profile?.name;
    if (typeof name === 'string' && name.trim()) return name.trim();
    const email = (user as any).email;
    if (typeof email === 'string' && email.includes('@')) {
      return email.split('@')[0];
    }
  }
  return null;
}

/* --------------------- Interactions --------------------- */
function initializeProfileInteractions(username: string, isOwnProfile: boolean): void {
  wirePostCardActions();
  initializeTabs(username);
  if (!isOwnProfile && isLoggedIn()) initializeFollowButton(username);
}

async function initializeFollowButton(username: string) {
  const btn = document.getElementById('follow-btn') as HTMLButtonElement | null;
  if (!btn) return;

  btn.disabled = true;
  const isFollowing = await checkIfFollowing(username);
  updateFollowButton(btn, isFollowing);
  btn.disabled = false;

  btn.addEventListener('click', async () => {
    const currentlyFollowing = btn.classList.contains('is-following');
    try {
      btn.disabled = true;
      if (currentlyFollowing) {
        await unfollowUser(username);
        updateFollowButton(btn, false);
        updateFollowerCount(-1);
      } else {
        await followUser(username);
        updateFollowButton(btn, true);
        updateFollowerCount(1);
      }
    } catch (err) {
      logError('Follow action failed:', err);
      updateFollowButton(btn, currentlyFollowing);
    } finally {
      btn.disabled = false;
    }
  });
}

function updateFollowButton(btn: HTMLButtonElement, isFollowing: boolean) {
  btn.classList.toggle('is-following', isFollowing);
  btn.textContent = isFollowing ? 'Following' : 'Follow';
}

function updateFollowerCount(change: number) {
  const el = document.getElementById('followers-count');
  if (!el) return;
  const count = Math.max(0, parseInt(el.textContent || '0') + change);
  el.textContent = count.toString();
}

function initializeTabs(username: string) {
  const tabs = document.querySelectorAll<HTMLButtonElement>('.linka-profile-tab');
  const container = document.getElementById('profile-tab-content');
  if (!container) return;

  tabs.forEach((btn) => {
    btn.addEventListener('click', async () => {
      tabs.forEach((b) => {
        b.classList.remove('is-active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('is-active');
      btn.setAttribute('aria-selected', 'true');
      const tab = btn.getAttribute('data-tab');
      await switchTab(tab, username, container);
    });
  });
}

async function switchTab(
  tab: string | null,
  username: string,
  container: HTMLElement
) {
  container.innerHTML =
    '<div class="linka-profile-empty"><p class="linka-profile-empty-body">Loading…</p></div>';

  try {
    if (tab === 'posts') {
      const posts = await fetchUserPosts(username);
      container.innerHTML = renderPostsTab(posts);
    } else if (tab === 'media') {
      const posts = await fetchUserPosts(username);
      container.innerHTML = renderMediaTab(posts);
    } else if (tab === 'following' || tab === 'followers') {
      const profile = await fetchUserProfile(username);
      const users =
        tab === 'following'
          ? profile.following ?? []
          : profile.followers ?? [];
      container.innerHTML = renderUserListTab(
        users,
        tab === 'following' ? 'Not following anyone yet' : 'No followers yet',
        tab === 'following'
          ? 'Accounts this user follows will show up here.'
          : 'When others follow this user, they will show up here.'
      );
      // Wire user-list links to the SPA router
      container.querySelectorAll<HTMLAnchorElement>('[data-userlink]').forEach((a) => {
        a.addEventListener('click', (e) => {
          e.preventDefault();
          const href = a.getAttribute('href') || '/profile';
          history.pushState({ path: href }, '', href);
          window.renderRoute?.(href);
        });
      });
    }
  } catch (err) {
    logError('Tab load error:', err);
    container.innerHTML = renderEmptyState(
      'Failed to load',
      'Please try again later.'
    );
  }
}

async function checkIfFollowing(username: string): Promise<boolean> {
  const currentUsername = getStoredUsername();
  if (!currentUsername) return false;
  try {
    const response = await get<{ data: ProfileWithFollowData }>(
      `/social/profiles/${currentUsername}?_following=true`
    );
    return response.data.following?.some((u) => u.name === username) || false;
  } catch {
    return false;
  }
}

async function followUser(username: string): Promise<FollowResponse> {
  return put(`/social/profiles/${username}/follow`, {}) as Promise<FollowResponse>;
}

async function unfollowUser(username: string): Promise<FollowResponse> {
  return put(`/social/profiles/${username}/unfollow`, {}) as Promise<FollowResponse>;
}
