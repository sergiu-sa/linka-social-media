import { type NoroffPost } from '../services/posts/posts';
import { getLocalItem } from '../utils/storage';
import { isLoggedIn } from '../utils/auth';
import { get, put } from '../services/api/client';
import type { UserProfile, FollowResponse, ProfileWithFollowData } from '../types/index';

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
      fetchUserPosts(username)
    ]);

    setTimeout(() => initializeProfileInteractions(username, isOwnProfile), 100);

    return `
      <div class="profile-page min-h-screen w-full bg-slate-50 dark:bg-slate-900 overflow-x-hidden pt-20">
        <div class="profile-container max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          <!-- Profile Card -->
          <div class="bg-white dark:bg-slate-800 backdrop-blur-lg border-2 border-slate-200 dark:border-slate-700 rounded-3xl shadow-lg overflow-hidden transition-all duration-300">
            
            <!-- Banner with Back Button -->
            ${renderProfileHeader(profileData, isOwnProfile)}

            <!-- Avatar & Profile Info -->
            ${renderProfileInfo(profileData, isOwnProfile)}

            <!-- Stats Bar -->
            ${renderStatsBar(profileData)}

            <!-- Navigation Tabs -->
            ${renderTabs()}

            <!-- Tab Content -->
            <div id="profile-tab-content" class="p-6 min-h-[400px]">
              ${renderPostsTab(userPosts)}
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Error loading profile:', error);
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
      bio: 'No bio available',
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
function renderProfileHeader(profile: ProfileWithFollowData, isOwnProfile: boolean): string {
  const bannerUrl = profile.banner?.url || '';
  const hasBanner = !!bannerUrl;
  
  return `
    <div class="relative ${hasBanner ? 'h-52 sm:h-72' : 'h-36 bg-gradient-to-br from-orange-500/10 via-orange-600/5 to-orange-500/5 dark:from-slate-800 dark:via-slate-800/70 dark:to-slate-900'}">
      ${hasBanner ? `
        <img src="${bannerUrl}" alt="Profile banner" loading="lazy" class="w-full h-full object-cover" />
        <div class="absolute inset-0 bg-gradient-to-b from-black/0 via-black/15 to-black/35"></div>
      ` : ''}

      <!-- Header Controls -->
      <div class="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
        <button
          onclick="history.back()"
          class="back-btn inline-flex items-center gap-2 px-4 py-2 bg-white/90 dark:bg-slate-800/90 border-2 border-slate-300 dark:border-slate-600 backdrop-blur-sm hover:bg-orange-100 dark:hover:bg-orange-900/20 hover:border-orange-400 dark:hover:border-orange-500 text-slate-700 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-500 rounded-xl shadow-md transition-all duration-200 hover:scale-105"
          aria-label="Go back"
        >
          <i class="fa-solid fa-arrow-left text-sm"></i>
          <span class="font-medium hidden sm:inline">Back</span>
        </button>

        ${!isOwnProfile && isLoggedIn() ? `
          <button
            id="follow-btn"
            class="follow-btn inline-flex items-center gap-2 px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-md transition-all duration-200 hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-orange-500/30"
            data-username="${profile.name}"
            aria-label="Follow user"
          >
            <i class="fa-solid fa-user-plus text-sm"></i>
            <span class="font-medium">Follow</span>
          </button>
        ` : ''}
      </div>
    </div>
  `;
}

function renderProfileInfo(profile: UserProfile, isOwnProfile: boolean): string {
  const avatarUrl = profile.avatar?.url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=f97316&color=fff&size=160&bold=true`;

  return `
    <div class="relative px-6 pt-16 pb-8 -mt-12">
      <!-- Avatar -->
      <div class="flex justify-center mb-4">
        <div class="relative">
          <div class="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white dark:border-slate-800 shadow-lg overflow-hidden bg-gradient-to-br from-orange-500 to-orange-600 ring-2 ring-orange-400/30 dark:ring-orange-500/30">
            <img
              src="${avatarUrl}"
              alt="${profile.name}'s avatar"
              loading="lazy"
              class="w-full h-full object-cover"
              onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=f97316&color=fff&size=160&bold=true'"
            />
          </div>
          ${isOwnProfile ? `
            <button class="absolute bottom-0 right-0 w-8 h-8 bg-orange-500 hover:bg-orange-600 text-white rounded-full shadow-md transition-all duration-200 hover:scale-110 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30" aria-label="Edit profile" title="Edit profile">
              <i class="fa-solid fa-pen text-xs"></i>
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Name & Bio -->
      <div class="text-center max-w-2xl mx-auto">
        <h1 class="text-3xl sm:text-4xl font-display font-bold text-slate-900 dark:text-white mb-1 tracking-wide">
          ${profile.name}
        </h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mb-3">
          @${profile.name.toLowerCase()}
        </p>

        ${profile.bio ? `
          <p class="text-base text-slate-700 dark:text-slate-300 leading-relaxed px-4">
            ${profile.bio}
          </p>
        ` : `
          <p class="text-sm text-slate-500 dark:text-slate-400 italic">
            ${isOwnProfile ? 'Add a bio to tell others about yourself' : 'No bio yet'}
          </p>
        `}
      </div>
    </div>
  `;
}

function renderStatsBar(profile: UserProfile): string {
  return `
    <div class="grid grid-cols-3 gap-4 px-6 py-4 border-y-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
      <div class="text-center group cursor-pointer" role="button" tabindex="0">
        <div class="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-500 transition-colors">
          ${profile._count.posts}
        </div>
        <div class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 uppercase tracking-wide font-medium">
          Posts
        </div>
      </div>

      <div class="text-center group cursor-pointer" role="button" tabindex="0">
        <div class="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-500 transition-colors" id="following-count">
          ${profile._count.following}
        </div>
        <div class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 uppercase tracking-wide font-medium">
          Following
        </div>
      </div>

      <div class="text-center group cursor-pointer" role="button" tabindex="0">
        <div class="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-500 transition-colors" id="followers-count">
          ${profile._count.followers}
        </div>
        <div class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 uppercase tracking-wide font-medium">
          Followers
        </div>
      </div>
    </div>
  `;
}

function renderTabs(): string {
  return `
    <div class="px-6 pt-6">
      <nav class="flex bg-slate-100 dark:bg-slate-900 rounded-xl p-1 gap-1 overflow-x-auto scrollbar-hide border-2 border-slate-200 dark:border-slate-700" role="tablist">
        <button
          class="tab-btn flex-1 min-w-80px text-center py-2.5 px-4 rounded-lg font-medium text-sm transition-all duration-200 bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm active focus:outline-none focus:ring-2 focus:ring-orange-500/30 border-2 border-orange-400 dark:border-orange-500"
          data-tab="posts"
          role="tab"
          aria-selected="true"
        >
          <i class="fa-regular fa-paper-plane"></i>
          <span class="hidden sm:inline">Posts</span>
          <span class="sm:hidden">Posts</span>
        </button>

        <button
          class="tab-btn flex-1 min-w-80px text-center py-2.5 px-4 rounded-lg font-medium text-sm transition-all duration-200 hover:bg-orange-100 dark:hover:bg-orange-900/20 text-slate-600 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 border-2 border-transparent hover:border-orange-400 dark:hover:border-orange-500"
          data-tab="media"
          role="tab"
          aria-selected="false"
        >
          <i class="fa-solid fa-image mr-2"></i>
          <span class="hidden sm:inline">Media</span>
          <span class="sm:hidden">Media</span>
        </button>

        <button
          class="tab-btn flex-1 min-w-80px text-center py-2.5 px-4 rounded-lg font-medium text-sm transition-all duration-200 hover:bg-orange-100 dark:hover:bg-orange-900/20 text-slate-600 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 border-2 border-transparent hover:border-orange-400 dark:hover:border-orange-500"
          data-tab="following"
          role="tab"
          aria-selected="false"
        >
          <i class="fa-solid fa-user-group mr-2"></i>
          <span class="hidden sm:inline">Following</span>
          <span class="sm:hidden">Following</span>
        </button>

        <button
          class="tab-btn flex-1 min-w-80px text-center py-2.5 px-4 rounded-lg font-medium text-sm transition-all duration-200 hover:bg-orange-100 dark:hover:bg-orange-900/20 text-slate-600 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 border-2 border-transparent hover:border-orange-400 dark:hover:border-orange-500"
          data-tab="followers"
          role="tab"
          aria-selected="false"
        >
          <i class="fa-solid fa-users mr-2"></i>
          <span class="hidden sm:inline">Followers</span>
          <span class="sm:hidden">Followers</span>
        </button>
      </nav>
    </div>
  `;
}

function renderPostsTab(posts: NoroffPost[]): string {
  if (!posts.length) {
    return `
      <div class="flex flex-col items-center justify-center py-16 text-center">
        <div class="w-16 h-16 mb-4 rounded-full bg-orange-500/10 flex items-center justify-center">
          <i class="fa-solid fa-pen-to-square text-2xl text-orange-600 dark:text-orange-500"></i>
        </div>
        <h3 class="text-lg font-display font-bold text-slate-900 dark:text-white mb-2">No posts yet</h3>
        <p class="text-sm text-slate-500 dark:text-slate-400 max-w-xs">When posts are shared, they'll appear here</p>
      </div>
    `;
  }

  return `
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
      ${posts.map((post, i) => renderProfilePost(post, i)).join('')}
    </div>
  `;
}

function renderProfilePost(post: NoroffPost, index: number): string {
  const timeAgo = getTimeAgo(new Date(post.created));
  const hasMedia = post.media?.url;

  return `
    <article
      class="bg-white dark:bg-slate-800 backdrop-blur-lg border-2 border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-[2px] hover:border-orange-400 dark:hover:border-orange-600 opacity-0 animate-fade-in cursor-pointer group"
      style="animation-delay: ${index * 0.05}s; animation-fill-mode: forwards;"
    >
      ${hasMedia ? `
        <div class="relative overflow-hidden aspect-video bg-slate-200 dark:bg-slate-700">
          <img
            src="${post.media?.url}"
            alt="${post.media?.alt || post.title}"
            class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        </div>
      ` : ''}

      <div class="p-5">
        <h3 class="font-display text-xl font-bold text-slate-900 dark:text-white mb-2 transition-colors group-hover:text-orange-600 dark:group-hover:text-orange-500 line-clamp-2">
          ${post.title}
        </h3>

        ${post.body ? `
          <p class="text-sm text-slate-700 dark:text-slate-300 mb-3 line-clamp-3 leading-relaxed">
            ${post.body}
          </p>
        ` : ''}

        ${post.tags?.length ? `
          <div class="flex flex-wrap gap-2 mb-4">
            ${post.tags.slice(0, 4).map(tag => `
              <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-500 border border-orange-300 dark:border-orange-700">
                #${tag}
              </span>
            `).join('')}
            ${post.tags.length > 4 ? `<span class="text-xs text-slate-500 dark:text-slate-400">+${post.tags.length - 4} more</span>` : ''}
          </div>
        ` : ''}

        <div class="flex items-center justify-between pt-3 border-t-2 border-slate-200 dark:border-slate-700">
          <span class="text-xs text-slate-500 dark:text-slate-400 font-medium">
            <i class="fa-regular fa-clock mr-1"></i>${timeAgo}
          </span>

          <div class="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
            <span class="inline-flex items-center gap-1 hover:text-orange-600 dark:hover:text-orange-500 transition-colors">
              <i class="fa-regular fa-heart"></i>
              <span>${post._count.reactions}</span>
            </span>
            <span class="inline-flex items-center gap-1 hover:text-orange-600 dark:hover:text-orange-500 transition-colors">
              <i class="fa-regular fa-comment"></i>
              <span>${post._count.comments}</span>
            </span>
          </div>
        </div>
      </div>
    </article>
  `;
}

function renderErrorState(message: string): string {
  return `
    <div class="profile-page flex justify-center items-center min-h-screen bg-slate-50 dark:bg-slate-900 px-4">
      <div class="text-center max-w-md">
        <div class="w-20 h-20 mx-auto mb-6 rounded-full bg-orange-500/10 flex items-center justify-center">
          <i class="fa-solid fa-triangle-exclamation text-4xl text-orange-600 dark:text-orange-500"></i>
        </div>
        <h2 class="text-2xl font-display font-bold text-slate-900 dark:text-white mb-3">Unable to load profile</h2>
        <p class="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">${message}</p>
        <button
          class="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-md transition-all duration-200 hover:scale-105 hover:shadow-lg font-medium"
          onclick="history.back()"
        >
          <i class="fa-solid fa-arrow-left mr-2"></i>Go Back
        </button>
      </div>
    </div>
  `;
}

/* --------------------- Utility --------------------- */
function getTimeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  if (diff < 2592000) return `${Math.floor(diff / 604800)}w ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getStoredUsername(): string | null {
  let user = getLocalItem('user');
  if (!user) {
    // Fallback: try to derive from access token if it includes a name claim
    try {
      const token = getLocalItem('accessToken');
      if (typeof token === 'string' && token.split('.').length === 3) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const nameFromToken = payload?.name || payload?.username || payload?.sub;
        if (typeof nameFromToken === 'string' && nameFromToken.trim()) {
          user = nameFromToken.trim();
          // Cache for later
          try { localStorage.setItem('user', JSON.stringify(user)); } catch {}
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
  initializeTabs(username);
  if (!isOwnProfile && isLoggedIn()) initializeFollowButton(username);
  initializeAnimations();
}

function initializeAnimations(): void {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fade-in {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in {
      animation: fade-in 0.4s ease-out;
    }
    .scrollbar-hide::-webkit-scrollbar { display: none; }
    .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
  `;
  document.head.appendChild(style);
}

async function initializeFollowButton(username: string) {
  const btn = document.getElementById('follow-btn') as HTMLButtonElement;
  if (!btn) return;
  
  btn.disabled = true;
  const isFollowing = await checkIfFollowing(username);
  updateFollowButton(btn, isFollowing);
  btn.disabled = false;

  btn.addEventListener('click', async () => {
    const currentlyFollowing = btn.classList.contains('following');
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
    } catch (error) {
      console.error('Follow action failed:', error);
      // Revert on error
      updateFollowButton(btn, currentlyFollowing);
    } finally {
      btn.disabled = false;
    }
  });
}

function updateFollowButton(btn: HTMLButtonElement, isFollowing: boolean) {
  btn.classList.toggle('following', isFollowing);
  const icon = btn.querySelector('i');
  const span = btn.querySelector('span');

  if (isFollowing) {
    if (icon) icon.className = 'fa-solid fa-user-check text-sm';
    if (span) span.textContent = 'Following';
    btn.classList.remove('bg-orange-500', 'hover:bg-orange-600');
    btn.classList.add('bg-slate-500', 'hover:bg-slate-600');
  } else {
    if (icon) icon.className = 'fa-solid fa-user-plus text-sm';
    if (span) span.textContent = 'Follow';
    btn.classList.remove('bg-slate-500', 'hover:bg-slate-600');
    btn.classList.add('bg-orange-500', 'hover:bg-orange-600');
  }
}

function updateFollowerCount(change: number) {
  const el = document.getElementById('followers-count');
  if (!el) return;
  const count = Math.max(0, parseInt(el.textContent || '0') + change);
  el.textContent = count.toString();
}

function initializeTabs(username: string) {
  const buttons = document.querySelectorAll('.tab-btn');
  const container = document.getElementById('profile-tab-content');
  if (!container) return;

  buttons.forEach(btn => {
    btn.addEventListener('click', async () => {
      // Update active state
      buttons.forEach(b => {
        b.classList.remove('active', 'bg-white', 'dark:bg-slate-800', 'text-slate-900', 'dark:text-white', 'shadow-sm', 'border-orange-400', 'dark:border-orange-500');
        b.classList.add('text-slate-600', 'dark:text-slate-400', 'hover:bg-orange-100', 'dark:hover:bg-orange-900/20', 'hover:text-orange-600', 'dark:hover:text-orange-500', 'border-transparent');
        b.setAttribute('aria-selected', 'false');
      });

      btn.classList.add('active', 'bg-white', 'dark:bg-slate-800', 'text-slate-900', 'dark:text-white', 'shadow-sm', 'border-orange-400', 'dark:border-orange-500');
      btn.classList.remove('hover:bg-orange-100', 'dark:hover:bg-orange-900/20', 'hover:text-orange-600', 'dark:hover:text-orange-500', 'border-transparent');
      btn.setAttribute('aria-selected', 'true');

      const tab = btn.getAttribute('data-tab');
      await switchTab(tab, username, container);
    });
  });
}

async function switchTab(tab: string | null, username: string, container: HTMLElement) {
  container.innerHTML = `
    <div class="flex justify-center items-center py-16">
      <div class="animate-spin rounded-full h-12 w-12 border-4 border-orange-500/20 border-t-orange-500"></div>
    </div>
  `;
  
  try {
    if (tab === 'posts') {
      const posts = await fetchUserPosts(username);
      container.innerHTML = renderPostsTab(posts);
    } else if (tab === 'media') {
      const posts = await fetchUserPosts(username);
      const mediaOnly = posts.filter(p => p.media?.url);
      
      if (mediaOnly.length) {
        container.innerHTML = `
          <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
            ${mediaOnly.map(p => `
              <div class="relative aspect-square rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-700 group cursor-pointer">
                <img 
                  src="${p.media?.url || ''}" 
                  alt="${p.media?.alt || p.title}"
                  class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  loading="lazy"
                />
                <div class="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center">
                  <i class="fa-solid fa-expand text-white text-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></i>
                </div>
              </div>
            `).join('')}
          </div>
        `;
      } else {
        container.innerHTML = `
          <div class="flex flex-col items-center justify-center py-16 text-center">
            <div class="w-16 h-16 mb-4 rounded-full bg-orange-500/10 flex items-center justify-center">
              <i class="fa-solid fa-image text-2xl text-orange-600 dark:text-orange-500"></i>
            </div>
            <h3 class="text-lg font-display font-bold text-slate-900 dark:text-white mb-2">No media yet</h3>
            <p class="text-sm text-slate-500 dark:text-slate-400 max-w-xs">Photos and videos will appear here</p>
          </div>
        `;
      }
    } else {
      container.innerHTML = `
        <div class="flex flex-col items-center justify-center py-16 text-center">
          <div class="w-16 h-16 mb-4 rounded-full bg-orange-500/10 flex items-center justify-center">
            <i class="fa-solid fa-wrench text-2xl text-orange-600 dark:text-orange-500"></i>
          </div>
          <h3 class="text-lg font-display font-bold text-slate-900 dark:text-white mb-2">Coming Soon</h3>
          <p class="text-sm text-slate-500 dark:text-slate-400 max-w-xs">This feature is under development</p>
        </div>
      `;
    }
  } catch (error) {
    console.error('Tab load error:', error);
    container.innerHTML = `
      <div class="flex flex-col items-center justify-center py-16 text-center">
        <div class="w-16 h-16 mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
          <i class="fa-solid fa-circle-exclamation text-2xl text-red-600 dark:text-red-500"></i>
        </div>
        <h3 class="text-lg font-display font-bold text-slate-900 dark:text-white mb-2">Failed to load</h3>
        <p class="text-sm text-slate-500 dark:text-slate-400 max-w-xs">Please try again later</p>
      </div>
    `;
  }
}

async function checkIfFollowing(username: string): Promise<boolean> {
  const currentUsername = getStoredUsername();
  if (!currentUsername) return false;
  
  try {
    const response = await get<{ data: ProfileWithFollowData }>(
      `/social/profiles/${currentUsername}?_following=true`
    );
    return response.data.following?.some(u => u.name === username) || false;
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