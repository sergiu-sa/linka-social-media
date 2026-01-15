import { type NoroffPost } from '../services/posts/posts';
import { getLocalItem } from '../utils/storage';
import { getTimeAgo } from '../utils/date';
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
      <div class="profile-page min-h-screen w-full bg-linear-to-br from-slate-50 via-orange-50/30 to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 overflow-x-hidden pt-20">
        <div class="profile-container max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          <!-- Profile Card -->
          <div class="bg-white/80 dark:bg-slate-800/90 backdrop-blur-xl border border-slate-200/60 dark:border-slate-700/60 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-orange-500/10 dark:hover:shadow-orange-500/5">
            
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
    <div class="relative ${hasBanner ? 'h-52 sm:h-72' : 'h-40 bg-linear-to-br from-orange-500/20 via-amber-500/10 to-orange-600/15 dark:from-slate-800 dark:via-orange-950/20 dark:to-slate-900'}">
      ${hasBanner ? `
        <img src="${bannerUrl}" alt="Profile banner" loading="lazy" class="w-full h-full object-cover" />
        <div class="absolute inset-0 bg-gradient-to-b from-black/0 via-black/15 to-black/35"></div>
      ` : ''}

      <!-- Header Controls -->
      <div class="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
        <button
          onclick="history.back()"
          class="back-btn group inline-flex items-center gap-2 px-4 py-2.5 bg-white/95 dark:bg-slate-800/95 border border-slate-200/80 dark:border-slate-600/80 backdrop-blur-md hover:bg-white dark:hover:bg-slate-700 hover:border-orange-400/60 dark:hover:border-orange-500/60 text-slate-600 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400 rounded-2xl shadow-lg shadow-black/5 dark:shadow-black/20 transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-orange-500/10"
          aria-label="Go back"
        >
          <i class="fa-solid fa-arrow-left text-sm transition-transform duration-300 group-hover:-translate-x-0.5"></i>
          <span class="font-medium hidden sm:inline">Back</span>
        </button>

        ${!isOwnProfile && isLoggedIn() ? `
          <button
            id="follow-btn"
            class="follow-btn group inline-flex items-center gap-2.5 px-6 py-2.5 bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-2xl shadow-lg shadow-orange-500/30 transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-orange-500/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:translate-y-0 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:ring-offset-2 focus:ring-offset-transparent"
            data-username="${profile.name}"
            aria-label="Follow user"
          >
            <i class="fa-solid fa-user-plus text-sm transition-transform duration-300 group-hover:scale-110"></i>
            <span class="font-semibold tracking-wide">Follow</span>
          </button>
        ` : ''}
      </div>
    </div>
  `;
}

function renderProfileInfo(profile: UserProfile, isOwnProfile: boolean): string {
  const avatarUrl = profile.avatar?.url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=f97316&color=fff&size=160&bold=true`;

  return `
    <div class="relative px-6 pt-16 pb-8 -mt-14">
      <!-- Avatar -->
      <div class="flex justify-center mb-5">
        <div class="relative group">
          <div class="absolute -inset-1 bg-linear-to-br from-orange-400 via-amber-500 to-orange-600 rounded-full opacity-75 blur-sm group-hover:opacity-100 group-hover:blur-md transition-all duration-500"></div>
          <div class="relative w-28 h-28 sm:w-36 sm:h-36 rounded-full border-4 border-white dark:border-slate-800 shadow-2xl overflow-hidden bg-linear-to-br from-orange-500 to-orange-600 ring-4 ring-white/50 dark:ring-slate-800/50">
            <img
              src="${avatarUrl}"
              alt="${profile.name}'s avatar"
              loading="lazy"
              class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=f97316&color=fff&size=160&bold=true'"
            />
          </div>
          ${isOwnProfile ? `
            <button class="absolute bottom-1 right-1 w-9 h-9 bg-linear-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-full shadow-lg shadow-orange-500/40 transition-all duration-300 hover:scale-110 hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800" aria-label="Edit profile" title="Edit profile">
              <i class="fa-solid fa-pen text-xs"></i>
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Name & Bio -->
      <div class="text-center max-w-2xl mx-auto">
        <h1 class="text-3xl sm:text-4xl font-display font-bold bg-linear-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-white dark:via-slate-100 dark:to-white bg-clip-text text-transparent mb-1.5 tracking-wide animate-fade-in">
          ${profile.name}
        </h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mb-4 font-medium">
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100/80 dark:bg-slate-700/50 border border-slate-200/50 dark:border-slate-600/50">
            <span class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
            @${profile.name.toLowerCase()}
          </span>
        </p>

        ${profile.bio ? `
          <p class="text-base text-slate-600 dark:text-slate-300 leading-relaxed px-4 py-3 rounded-2xl bg-slate-50/50 dark:bg-slate-700/30 border border-slate-200/30 dark:border-slate-600/30">
            ${profile.bio}
          </p>
        ` : `
          <p class="text-sm text-slate-400 dark:text-slate-500 italic px-4 py-3 rounded-2xl bg-slate-50/50 dark:bg-slate-700/20 border border-dashed border-slate-200/50 dark:border-slate-600/30">
            ${isOwnProfile ? 'Add a bio to tell others about yourself' : 'No bio yet'}
          </p>
        `}
      </div>
    </div>
  `;
}

function renderStatsBar(profile: UserProfile): string {
  return `
    <div class="grid grid-cols-3 gap-2 sm:gap-4 px-4 sm:px-6 py-5 border-y border-slate-200/60 dark:border-slate-700/60 bg-linear-to-r from-slate-50/80 via-white/50 to-slate-50/80 dark:from-slate-800/50 dark:via-slate-900/30 dark:to-slate-800/50">
      <div class="stat-item text-center group cursor-pointer p-3 rounded-2xl transition-all duration-300 hover:bg-orange-50/80 dark:hover:bg-orange-950/20 hover:scale-105" role="button" tabindex="0">
        <div class="text-2xl sm:text-3xl font-display font-bold bg-linear-to-br from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent group-hover:from-orange-600 group-hover:to-orange-500 dark:group-hover:from-orange-400 dark:group-hover:to-orange-500 transition-all duration-300">
          ${profile._count.posts}
        </div>
        <div class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold mt-1 group-hover:text-orange-600/80 dark:group-hover:text-orange-400/80 transition-colors duration-300">
          Posts
        </div>
      </div>

      <div class="stat-item text-center group cursor-pointer p-3 rounded-2xl transition-all duration-300 hover:bg-orange-50/80 dark:hover:bg-orange-950/20 hover:scale-105 border-x border-slate-200/40 dark:border-slate-700/40" role="button" tabindex="0">
        <div class="text-2xl sm:text-3xl font-display font-bold bg-linear-to-br from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent group-hover:from-orange-600 group-hover:to-orange-500 dark:group-hover:from-orange-400 dark:group-hover:to-orange-500 transition-all duration-300" id="following-count">
          ${profile._count.following}
        </div>
        <div class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold mt-1 group-hover:text-orange-600/80 dark:group-hover:text-orange-400/80 transition-colors duration-300">
          Following
        </div>
      </div>

      <div class="stat-item text-center group cursor-pointer p-3 rounded-2xl transition-all duration-300 hover:bg-orange-50/80 dark:hover:bg-orange-950/20 hover:scale-105" role="button" tabindex="0">
        <div class="text-2xl sm:text-3xl font-display font-bold bg-linear-to-br from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent group-hover:from-orange-600 group-hover:to-orange-500 dark:group-hover:from-orange-400 dark:group-hover:to-orange-500 transition-all duration-300" id="followers-count">
          ${profile._count.followers}
        </div>
        <div class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold mt-1 group-hover:text-orange-600/80 dark:group-hover:text-orange-400/80 transition-colors duration-300">
          Followers
        </div>
      </div>
    </div>
  `;
}

function renderTabs(): string {
  return `
    <div class="px-4 sm:px-6 pt-6">
      <nav class="flex bg-slate-100/80 dark:bg-slate-900/80 rounded-2xl p-1.5 gap-1.5 overflow-x-auto scrollbar-hide border border-slate-200/60 dark:border-slate-700/60 shadow-inner" role="tablist">
        <button
          class="tab-btn group flex-1 min-w-[80px] text-center py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-300 bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-md shadow-orange-500/10 active focus:outline-none focus:ring-2 focus:ring-orange-500/40 border border-orange-400/60 dark:border-orange-500/60"
          data-tab="posts"
          role="tab"
          aria-selected="true"
        >
          <i class="fa-regular fa-paper-plane mr-1.5 transition-transform duration-300 group-hover:scale-110"></i>
          <span>Posts</span>
        </button>

        <button
          class="tab-btn group flex-1 min-w-[80px] text-center py-3 px-4 rounded-xl font-medium text-sm transition-all duration-300 hover:bg-white/80 dark:hover:bg-slate-800/80 text-slate-500 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 border border-transparent hover:border-orange-300/50 dark:hover:border-orange-500/30 hover:shadow-md hover:shadow-orange-500/5"
          data-tab="media"
          role="tab"
          aria-selected="false"
        >
          <i class="fa-solid fa-image mr-1.5 transition-transform duration-300 group-hover:scale-110"></i>
          <span>Media</span>
        </button>

        <button
          class="tab-btn group flex-1 min-w-[80px] text-center py-3 px-4 rounded-xl font-medium text-sm transition-all duration-300 hover:bg-white/80 dark:hover:bg-slate-800/80 text-slate-500 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 border border-transparent hover:border-orange-300/50 dark:hover:border-orange-500/30 hover:shadow-md hover:shadow-orange-500/5"
          data-tab="following"
          role="tab"
          aria-selected="false"
        >
          <i class="fa-solid fa-user-group mr-1.5 transition-transform duration-300 group-hover:scale-110"></i>
          <span class="hidden sm:inline">Following</span>
          <span class="sm:hidden">Follow</span>
        </button>

        <button
          class="tab-btn group flex-1 min-w-[80px] text-center py-3 px-4 rounded-xl font-medium text-sm transition-all duration-300 hover:bg-white/80 dark:hover:bg-slate-800/80 text-slate-500 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 border border-transparent hover:border-orange-300/50 dark:hover:border-orange-500/30 hover:shadow-md hover:shadow-orange-500/5"
          data-tab="followers"
          role="tab"
          aria-selected="false"
        >
          <i class="fa-solid fa-users mr-1.5 transition-transform duration-300 group-hover:scale-110"></i>
          <span class="hidden sm:inline">Followers</span>
          <span class="sm:hidden">Fans</span>
        </button>
      </nav>
    </div>
  `;
}

function renderPostsTab(posts: NoroffPost[]): string {
  if (!posts.length) {
    return `
      <div class="flex flex-col items-center justify-center py-20 text-center">
        <div class="relative">
          <div class="absolute -inset-4 bg-linear-to-br from-orange-400/20 to-amber-500/20 rounded-full blur-xl"></div>
          <div class="relative w-20 h-20 mb-5 rounded-full bg-linear-to-br from-orange-500/20 to-amber-500/10 flex items-center justify-center border border-orange-200/50 dark:border-orange-800/30 shadow-lg shadow-orange-500/10">
            <i class="fa-solid fa-pen-to-square text-3xl text-orange-500 dark:text-orange-400"></i>
          </div>
        </div>
        <h3 class="text-xl font-display font-bold text-slate-800 dark:text-white mb-2">No posts yet</h3>
        <p class="text-sm text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">When posts are shared, they'll appear here</p>
      </div>
    `;
  }

  return `
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
      ${posts.map((post, i) => renderProfilePost(post, i)).join('')}
    </div>
  `;
}

function renderProfilePost(post: NoroffPost, index: number): string {
  const timeAgo = getTimeAgo(new Date(post.created));
  const hasMedia = post.media?.url;

  return `
    <article
      class="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700/60 rounded-2xl overflow-hidden transition-all duration-500 hover:shadow-xl hover:shadow-orange-500/10 dark:hover:shadow-orange-500/5 hover:-translate-y-1 hover:border-orange-300/60 dark:hover:border-orange-600/40 opacity-0 animate-fade-in cursor-pointer group"
      style="animation-delay: ${index * 0.08}s; animation-fill-mode: forwards;"
    >
      ${hasMedia ? `
        <div class="relative overflow-hidden aspect-video bg-linear-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800">
          <img
            src="${post.media?.url}"
            alt="${post.media?.alt || post.title}"
            class="w-full h-full object-cover transition-all duration-500 group-hover:scale-110"
            loading="lazy"
          />
          <div class="absolute inset-0 bg-linear-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </div>
      ` : ''}

      <div class="p-5">
        <h3 class="font-display text-lg font-bold text-slate-800 dark:text-white mb-2 transition-all duration-300 group-hover:text-orange-600 dark:group-hover:text-orange-400 line-clamp-2">
          ${post.title}
        </h3>

        ${post.body ? `
          <p class="text-sm text-slate-600 dark:text-slate-300 mb-4 line-clamp-3 leading-relaxed">
            ${post.body}
          </p>
        ` : ''}

        ${post.tags?.length ? `
          <div class="flex flex-wrap gap-1.5 mb-4">
            ${post.tags.slice(0, 3).map(tag => `
              <span class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-linear-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/20 text-orange-600 dark:text-orange-400 border border-orange-200/60 dark:border-orange-800/40 transition-all duration-300 hover:border-orange-400 dark:hover:border-orange-600 hover:scale-105">
                #${tag}
              </span>
            `).join('')}
            ${post.tags.length > 3 ? `<span class="text-xs text-slate-400 dark:text-slate-500 self-center">+${post.tags.length - 3}</span>` : ''}
          </div>
        ` : ''}

        <div class="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700/50">
          <span class="inline-flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 font-medium">
            <i class="fa-regular fa-clock text-orange-400/70"></i>${timeAgo}
          </span>

          <div class="flex items-center gap-3 text-xs">
            <span class="inline-flex items-center gap-1.5 text-slate-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 transition-colors duration-300 cursor-pointer group/heart">
              <i class="fa-regular fa-heart group-hover/heart:scale-125 transition-transform duration-300"></i>
              <span class="font-medium">${post._count.reactions}</span>
            </span>
            <span class="inline-flex items-center gap-1.5 text-slate-400 dark:text-slate-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors duration-300 cursor-pointer group/comment">
              <i class="fa-regular fa-comment group-hover/comment:scale-125 transition-transform duration-300"></i>
              <span class="font-medium">${post._count.comments}</span>
            </span>
          </div>
        </div>
      </div>
    </article>
  `;
}

function renderErrorState(message: string): string {
  return `
    <div class="profile-page flex justify-center items-center min-h-screen bg-linear-to-br from-slate-50 via-orange-50/20 to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 px-4">
      <div class="text-center max-w-md">
        <div class="relative inline-block mb-8">
          <div class="absolute -inset-4 bg-linear-to-br from-orange-400/30 to-red-500/20 rounded-full blur-2xl animate-pulse"></div>
          <div class="relative w-24 h-24 mx-auto rounded-full bg-linear-to-br from-orange-500/20 to-red-500/10 flex items-center justify-center border border-orange-200/50 dark:border-orange-800/30 shadow-xl shadow-orange-500/20">
            <i class="fa-solid fa-triangle-exclamation text-4xl text-orange-500 dark:text-orange-400"></i>
          </div>
        </div>
        <h2 class="text-2xl font-display font-bold bg-linear-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent mb-3">Unable to load profile</h2>
        <p class="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">${message}</p>
        <button
          class="group inline-flex items-center gap-2 px-7 py-3.5 bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-2xl shadow-lg shadow-orange-500/30 transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-orange-500/40 font-semibold"
          onclick="history.back()"
        >
          <i class="fa-solid fa-arrow-left transition-transform duration-300 group-hover:-translate-x-1"></i>
          Go Back
        </button>
      </div>
    </div>
  `;
}

/* --------------------- Utility --------------------- */
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
    <div class="flex flex-col justify-center items-center py-20">
      <div class="relative">
        <div class="absolute inset-0 bg-orange-500/20 rounded-full blur-xl animate-pulse"></div>
        <div class="relative animate-spin rounded-full h-14 w-14 border-4 border-orange-200/40 dark:border-orange-800/40 border-t-orange-500 dark:border-t-orange-400 shadow-lg shadow-orange-500/20"></div>
      </div>
      <p class="mt-5 text-sm text-slate-400 dark:text-slate-500 animate-pulse">Loading...</p>
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