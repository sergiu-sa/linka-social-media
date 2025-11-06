import * as THREE from 'three';
import { gsap } from 'gsap';
import { loginUser, registerUser, fetchApiKey } from '../services/api/client';
import { setLocalItem } from '../utils/storage';
import { renderRoute } from '../router';
import { isLoggedIn } from '../utils/auth';
import type {
  LoginCredentials,
  ApiResponse,
  LoginResponse,
} from '../types/index';

/* =========================================
   Page (HTML + bootstrapping)
========================================= */
export default async function IntroAuthPage(): Promise<string> {
  // Attach behavior after DOM paint
  setTimeout(() => {
    // Already authenticated? go straight to feed
    if (isLoggedIn()) {
      renderRoute('/feed');
      return;
    }

    initTheme();
    setupUI();
    setupStarfield();
    setupThreeStar();
  }, 0);

  return `
    <canvas id="starfield" class="fixed inset-0 z-10"></canvas>
    <canvas id="canvas3d" class="fixed inset-0 z-20"></canvas>

    <header class="fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-4 sm:px-6 md:px-8 py-4 sm:py-6">
      <a href="/" class="flex items-center gap-2 sm:gap-3 text-white light:text-black font-black text-sm sm:text-base tracking-widest uppercase no-underline group transition-all duration-300">
        <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 sm:w-10 sm:h-10 transition-all duration-700 ease-out group-hover:scale-125 group-hover:rotate-[360deg] group-hover:drop-shadow-[0_0_20px_rgba(249,115,22,0.8)] animate-pulse-slow" aria-label="LINKA Logo">
          <defs>
            <linearGradient id="introArmGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#ff7a2e;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#f36920;stop-opacity:1" />
            </linearGradient>
            <radialGradient id="introCoreGradient" cx="30%" cy="30%">
              <stop offset="0%" style="stop-color:#ff9d5c;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#f36920;stop-opacity:1" />
            </radialGradient>
            <filter id="introShadow">
              <feDropShadow dx="1" dy="2" stdDeviation="3" flood-opacity="0.3"/>
            </filter>
          </defs>

          <!-- Arm 1 (0°, top) -->
          <g transform="translate(100, 100) rotate(0) translate(-100, -100)">
            <rect x="75" y="10" width="50" height="83" rx="6" fill="url(#introArmGradient)" filter="url(#introShadow)" opacity="0.9"/>
          </g>

          <!-- Arm 2 (60°) -->
          <g transform="translate(100, 100) rotate(60) translate(-100, -100)">
            <rect x="75" y="10" width="50" height="83" rx="6" fill="url(#introArmGradient)" filter="url(#introShadow)" opacity="0.85"/>
          </g>

          <!-- Arm 3 (120°) -->
          <g transform="translate(100, 100) rotate(120) translate(-100, -100)">
            <rect x="75" y="10" width="50" height="83" rx="6" fill="url(#introArmGradient)" filter="url(#introShadow)" opacity="0.80"/>
          </g>

          <!-- Arm 4 (180°, bottom) -->
          <g transform="translate(100, 100) rotate(180) translate(-100, -100)">
            <rect x="75" y="10" width="50" height="83" rx="6" fill="url(#introArmGradient)" filter="url(#introShadow)" opacity="0.90"/>
          </g>

          <!-- Arm 5 (240°) -->
          <g transform="translate(100, 100) rotate(240) translate(-100, -100)">
            <rect x="75" y="10" width="50" height="83" rx="6" fill="url(#introArmGradient)" filter="url(#introShadow)" opacity="0.85"/>
          </g>

          <!-- Arm 6 (300°) -->
          <g transform="translate(100, 100) rotate(300) translate(-100, -100)">
            <rect x="75" y="10" width="50" height="83" rx="6" fill="url(#introArmGradient)" filter="url(#introShadow)" opacity="0.80"/>
          </g>

          <!-- Core sphere with enhanced glow -->
          <circle cx="100" cy="100" r="55" fill="url(#introCoreGradient)" filter="url(#introShadow)"/>
          <circle cx="100" cy="100" r="55" fill="none" stroke="#ff7a2e" stroke-width="1" opacity="0.6" class="animate-pulse"/>
        </svg>
        <span class="group-hover:text-orange-500 group-hover:tracking-[0.2em] transition-all duration-500 text-xs sm:text-base">LINKA</span>
      </a>
      <label class="theme-toggle relative inline-flex items-center cursor-pointer z-50">
        <input id="themeToggle" type="checkbox" class="sr-only peer" />
        <div class="relative w-12 h-6 sm:w-14 sm:h-7 bg-gray-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:rounded-full after:h-5 after:w-5 sm:after:h-6 sm:after:w-6 after:border after:border-gray-300 after:transition-all peer-checked:bg-orange-500 hover:shadow-lg hover:shadow-orange-500/50 transition-all duration-300"></div>
      </label>
    </header>

    <div id="storyOverlay" class="fixed inset-0 z-40 flex flex-col items-center justify-center bg-transparent opacity-100 pointer-events-auto transition-all duration-500 px-4">
      <div class="max-w-lg w-full backdrop-blur-xl bg-slate-900/40 border border-white/10 rounded-2xl sm:rounded-3xl px-6 py-8 sm:px-10 sm:py-12 text-center shadow-2xl z-50">
        <h1 class="font-serif text-4xl sm:text-5xl md:text-6xl font-bold mb-4 sm:mb-6 text-white leading-tight animate-fade-in">LINKA</h1>
        <p class="text-base sm:text-lg text-orange-400 mb-3 sm:mb-4 leading-relaxed font-semibold animate-fade-in-delay-1">Connections Come Together</p>
        <p class="text-xs sm:text-sm text-white/70 mb-6 sm:mb-8 leading-relaxed animate-fade-in-delay-2">The infinite potential of human connection. Real relationships, beautifully structured and endlessly possible.</p>
        <p class="text-[10px] sm:text-xs tracking-widest uppercase text-white/50 animate-pulse">PRESS ENTER TO EXPLORE</p>
      </div>
    </div>

    <div id="drawer" class="drawer fixed bottom-0 left-0 right-0 h-auto max-h-[85vh] sm:max-h-[90vh] w-full bg-gradient-to-b from-slate-900/70 to-slate-800/75 light:from-white/75 light:to-slate-50/80 backdrop-blur-3xl z-50 flex flex-col rounded-t-2xl sm:rounded-t-3xl border-t border-slate-700/40 light:border-slate-300/60 shadow-2xl shadow-black/50 light:shadow-black/10">
      <div class="flex justify-center pt-3 pb-2">
        <div class="w-12 h-1 bg-gradient-to-r from-orange-500/30 via-orange-500/70 to-orange-500/30 light:from-orange-500/40 light:via-orange-500/80 light:to-orange-500/40 rounded-full shadow-lg shadow-orange-500/30 cursor-grab active:cursor-grabbing"></div>
      </div>
      <button id="closeDrawer" class="absolute top-4 right-4 sm:top-6 sm:right-6 w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-white/10 light:bg-slate-900/10 backdrop-blur-sm border border-white/20 light:border-slate-300/40 text-white light:text-slate-800 flex items-center justify-center cursor-pointer z-50 text-lg sm:text-xl transition-all duration-300 hover:bg-orange-500/30 hover:border-orange-500/60 light:hover:bg-orange-500/20 light:hover:text-orange-500 hover:rotate-90 hover:scale-110 hover:shadow-xl hover:shadow-orange-500/40">✕</button>
      <div class="flex-1 overflow-y-auto flex flex-col px-4 sm:px-6 md:px-8 pt-12 sm:pt-16 pb-6 sm:pb-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div class="flex gap-2 sm:gap-4 mb-6 sm:mb-8 border-b-2 border-white/10 light:border-slate-300/50">
          <button class="tab-button active py-2 sm:py-3 px-4 sm:px-6 text-xs sm:text-sm font-bold uppercase tracking-wider text-white/50 light:text-slate-600/70 transition-all duration-300 hover:text-white/80 light:hover:text-slate-900 hover:-translate-y-0.5 relative border-b-3 border-transparent data-[active=true]:text-orange-500 data-[active=true]:font-extrabold" data-tab="login">Login</button>
          <button class="tab-button py-2 sm:py-3 px-4 sm:px-6 text-xs sm:text-sm font-bold uppercase tracking-wider text-white/50 light:text-slate-600/70 transition-all duration-300 hover:text-white/80 light:hover:text-slate-900 hover:-translate-y-0.5 relative border-b-3 border-transparent data-[active=true]:text-orange-500 data-[active=true]:font-extrabold" data-tab="register">Register</button>
        </div>

        <form id="login" class="form-panel active space-y-4 sm:space-y-5 max-w-xl mx-auto w-full" novalidate>
          <div class="relative">
            <label class="block text-[10px] sm:text-xs font-bold uppercase tracking-wider text-orange-500 light:text-orange-600 mb-2 sm:mb-2.5 drop-shadow-sm light:drop-shadow-none">Email</label>
            <input type="email" name="email" placeholder="your.email@stud.noroff.no" required class="w-full px-3 sm:px-4 py-3 sm:py-3.5 text-sm sm:text-base rounded-xl bg-slate-800/90 light:bg-white/95 backdrop-blur-md border-2 border-slate-600/50 light:border-slate-300/80 text-white light:text-slate-900 placeholder-white/50 light:placeholder-slate-500/60 shadow-lg shadow-black/10 light:shadow-black/5 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-orange-500/40 focus:border-orange-500/80 focus:bg-slate-800 light:focus:bg-white focus:-translate-y-0.5 focus:shadow-xl focus:shadow-orange-500/20 hover:border-orange-500/50 hover:bg-slate-800/95 light:hover:bg-white hover:shadow-xl light:hover:border-orange-500/60" />
          </div>
          <div class="relative">
            <label class="block text-[10px] sm:text-xs font-bold uppercase tracking-wider text-orange-500 light:text-orange-600 mb-2 sm:mb-2.5 drop-shadow-sm light:drop-shadow-none">Password</label>
            <input type="password" name="password" placeholder="••••••••" required class="w-full px-3 sm:px-4 py-3 sm:py-3.5 text-sm sm:text-base rounded-xl bg-slate-800/90 light:bg-white/95 backdrop-blur-md border-2 border-slate-600/50 light:border-slate-300/80 text-white light:text-slate-900 placeholder-white/50 light:placeholder-slate-500/60 shadow-lg shadow-black/10 light:shadow-black/5 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-orange-500/40 focus:border-orange-500/80 focus:bg-slate-800 light:focus:bg-white focus:-translate-y-0.5 focus:shadow-xl focus:shadow-orange-500/20 hover:border-orange-500/50 hover:bg-slate-800/95 light:hover:bg-white hover:shadow-xl light:hover:border-orange-500/60" />
          </div>
          <button type="submit" class="submit-btn w-full mt-6 sm:mt-8 px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base rounded-xl font-black tracking-widest uppercase bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/40 transition-all duration-300 hover:shadow-xl hover:shadow-orange-500/60 hover:-translate-y-1 hover:scale-[1.02] active:translate-y-0 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:scale-100">Sign In</button>
          <p class="form-msg text-xs sm:text-sm mt-3 sm:mt-4 text-center text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg p-2 sm:p-3 font-medium empty:hidden min-h-0"></p>
        </form>

        <form id="register" class="form-panel space-y-4 sm:space-y-5 max-w-xl mx-auto w-full" novalidate>
          <div class="relative">
            <label class="block text-[10px] sm:text-xs font-bold uppercase tracking-wider text-orange-500 light:text-orange-600 mb-2 sm:mb-2.5 drop-shadow-sm light:drop-shadow-none">Username</label>
            <input type="text" name="name" placeholder="my_username" required class="w-full px-3 sm:px-4 py-3 sm:py-3.5 text-sm sm:text-base rounded-xl bg-slate-800/90 light:bg-white/95 backdrop-blur-md border-2 border-slate-600/50 light:border-slate-300/80 text-white light:text-slate-900 placeholder-white/50 light:placeholder-slate-500/60 shadow-lg shadow-black/10 light:shadow-black/5 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-orange-500/40 focus:border-orange-500/80 focus:bg-slate-800 light:focus:bg-white focus:-translate-y-0.5 focus:shadow-xl focus:shadow-orange-500/20 hover:border-orange-500/50 hover:bg-slate-800/95 light:hover:bg-white hover:shadow-xl light:hover:border-orange-500/60" />
            <p class="text-[10px] sm:text-xs text-slate-300/80 light:text-slate-600/80 mt-1 sm:mt-1.5 italic pl-1">No punctuation except underscore (_)</p>
          </div>
          <div class="relative">
            <label class="block text-[10px] sm:text-xs font-bold uppercase tracking-wider text-orange-500 light:text-orange-600 mb-2 sm:mb-2.5 drop-shadow-sm light:drop-shadow-none">Email</label>
            <input type="email" name="email" placeholder="your.email@stud.noroff.no" required class="w-full px-3 sm:px-4 py-3 sm:py-3.5 text-sm sm:text-base rounded-xl bg-slate-800/90 light:bg-white/95 backdrop-blur-md border-2 border-slate-600/50 light:border-slate-300/80 text-white light:text-slate-900 placeholder-white/50 light:placeholder-slate-500/60 shadow-lg shadow-black/10 light:shadow-black/5 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-orange-500/40 focus:border-orange-500/80 focus:bg-slate-800 light:focus:bg-white focus:-translate-y-0.5 focus:shadow-xl focus:shadow-orange-500/20 hover:border-orange-500/50 hover:bg-slate-800/95 light:hover:bg-white hover:shadow-xl light:hover:border-orange-500/60" />
          </div>
          <div class="relative">
            <label class="block text-[10px] sm:text-xs font-bold uppercase tracking-wider text-orange-500 light:text-orange-600 mb-2 sm:mb-2.5 drop-shadow-sm light:drop-shadow-none">Password</label>
            <input type="password" name="password" placeholder="••••••••" minlength="8" required class="w-full px-3 sm:px-4 py-3 sm:py-3.5 text-sm sm:text-base rounded-xl bg-slate-800/90 light:bg-white/95 backdrop-blur-md border-2 border-slate-600/50 light:border-slate-300/80 text-white light:text-slate-900 placeholder-white/50 light:placeholder-slate-500/60 shadow-lg shadow-black/10 light:shadow-black/5 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-orange-500/40 focus:border-orange-500/80 focus:bg-slate-800 light:focus:bg-white focus:-translate-y-0.5 focus:shadow-xl focus:shadow-orange-500/20 hover:border-orange-500/50 hover:bg-slate-800/95 light:hover:bg-white hover:shadow-xl light:hover:border-orange-500/60" />
            <p class="text-[10px] sm:text-xs text-slate-300/80 light:text-slate-600/80 mt-1 sm:mt-1.5 italic pl-1">Minimum 8 characters</p>
          </div>
          <div class="relative">
            <label class="block text-[10px] sm:text-xs font-bold uppercase tracking-wider text-orange-500/90 light:text-orange-600/90 mb-2 sm:mb-2.5 drop-shadow-sm light:drop-shadow-none">Avatar URL <span class="text-slate-400 light:text-slate-500 normal-case font-normal text-[10px] sm:text-xs">(optional)</span></label>
            <input type="url" name="avatar" placeholder="https://example.com/avatar.jpg" class="w-full px-3 sm:px-4 py-3 sm:py-3.5 text-sm sm:text-base rounded-xl bg-slate-800/90 light:bg-white/95 backdrop-blur-md border-2 border-slate-600/50 light:border-slate-300/80 text-white light:text-slate-900 placeholder-white/50 light:placeholder-slate-500/60 shadow-lg shadow-black/10 light:shadow-black/5 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-orange-500/40 focus:border-orange-500/80 focus:bg-slate-800 light:focus:bg-white focus:-translate-y-0.5 focus:shadow-xl focus:shadow-orange-500/20 hover:border-orange-500/50 hover:bg-slate-800/95 light:hover:bg-white hover:shadow-xl light:hover:border-orange-500/60" />
          </div>
          <div class="relative">
            <label class="block text-[10px] sm:text-xs font-bold uppercase tracking-wider text-orange-500/90 light:text-orange-600/90 mb-2 sm:mb-2.5 drop-shadow-sm light:drop-shadow-none">Bio <span class="text-slate-400 light:text-slate-500 normal-case font-normal text-[10px] sm:text-xs">(optional)</span></label>
            <textarea name="bio" placeholder="Tell us about yourself..." maxlength="160" rows="3" class="w-full px-3 sm:px-4 py-3 sm:py-3.5 text-sm sm:text-base rounded-xl bg-slate-800/90 light:bg-white/95 backdrop-blur-md border-2 border-slate-600/50 light:border-slate-300/80 text-white light:text-slate-900 placeholder-white/50 light:placeholder-slate-500/60 shadow-lg shadow-black/10 light:shadow-black/5 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-orange-500/40 focus:border-orange-500/80 focus:bg-slate-800 light:focus:bg-white focus:-translate-y-0.5 focus:shadow-xl focus:shadow-orange-500/20 hover:border-orange-500/50 hover:bg-slate-800/95 light:hover:bg-white hover:shadow-xl light:hover:border-orange-500/60 resize-none"></textarea>
          </div>
          <button type="submit" class="submit-btn w-full mt-6 sm:mt-8 px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base rounded-xl font-black tracking-widest uppercase bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/40 transition-all duration-300 hover:shadow-xl hover:shadow-orange-500/60 hover:-translate-y-1 hover:scale-[1.02] active:translate-y-0 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:scale-100">Create Account</button>
          <p class="form-msg text-xs sm:text-sm mt-3 sm:mt-4 text-center text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg p-2 sm:p-3 font-medium empty:hidden min-h-0"></p>
        </form>
      </div>
    </div>
  `;
}

/* =========================================
   Theme
========================================= */
function applyTheme(kind: 'light' | 'dark') {
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

function initTheme() {
  const toggle = document.getElementById(
    'themeToggle'
  ) as HTMLInputElement | null;
  const saved = (localStorage.getItem('theme') as 'light' | 'dark') || 'dark';
  applyTheme(saved);
  document.body.style.overflow = 'hidden';

  if (!toggle) return;
  toggle.checked = saved === 'light';
  toggle.addEventListener('change', () => {
    const next = toggle.checked ? 'light' : 'dark';
    localStorage.setItem('theme', next);
    applyTheme(next);
    document.dispatchEvent(new Event('linka-theme-changed'));
  });
}

/* =========================================
   UI + Auth
========================================= */
function setupUI() {
  const overlay = document.getElementById('storyOverlay')!;
  const drawer = document.getElementById('drawer')!;
  const closeBtn = document.getElementById('closeDrawer')!;
  const tabs = Array.from(
    document.querySelectorAll<HTMLButtonElement>('.tab-button')
  );
  const forms = Array.from(document.querySelectorAll<HTMLFormElement>('form'));

  // Function to adjust drawer height based on active form
  const adjustDrawerHeight = () => {
    setTimeout(() => {
      const activeForm = document.querySelector('.form-panel.active') as HTMLElement;
      if (activeForm && drawer) {
        const formHeight = activeForm.offsetHeight;
        const tabsHeight = document.querySelector('.flex.gap-4.mb-8')?.clientHeight || 0;
        const padding = 160; // Account for top padding, handle, close button
        const totalHeight = formHeight + tabsHeight + padding;
        const maxHeight = window.innerHeight * 0.85; // 85vh
        const targetHeight = Math.min(totalHeight, maxHeight);
        drawer.style.maxHeight = `${targetHeight}px`;
      }
    }, 50); // Small delay to ensure DOM is updated
  };

  const showDrawer = () => {
    overlay.classList.add('opacity-0', 'pointer-events-none', 'invisible');
    setTimeout(() => {
      overlay.classList.add('hidden');
      drawer.classList.add('show');
      // Adjust height after drawer is shown
      setTimeout(adjustDrawerHeight, 100);
    }, 350);
  };

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) showDrawer();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !overlay.classList.contains('hidden'))
      showDrawer();
  });
  closeBtn.addEventListener('click', () => {
    drawer.classList.remove('show');
    overlay.classList.remove(
      'hidden',
      'opacity-0',
      'pointer-events-none',
      'invisible'
    );
  });

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const name = tab.dataset.tab!;
      tabs.forEach((t) => t.classList.remove('active'));
      document
        .querySelectorAll('.form-panel')
        .forEach((p) => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(name)?.classList.add('active');

      // Adjust drawer height when switching tabs
      adjustDrawerHeight();
    });
  });

  // Adjust drawer height on window resize
  window.addEventListener('resize', () => {
    if (drawer.classList.contains('show')) {
      adjustDrawerHeight();
    }
  });

  forms.forEach((form) => {
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
        // Login or Register → Login
        let token: string | undefined;
        let loggedInName: string | undefined;

        if (form.id === 'login') {
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

        // Save token and username for later profile resolution
        setLocalItem('accessToken', token);
        if (loggedInName) setLocalItem('user', loggedInName);

        // Fetch & save API key (required for social endpoints)
        try {
          const key = await fetchApiKey(token);
          if (key) setLocalItem('apiKey', key);
        } catch (e) {
          console.warn('Could not fetch API key yet:', e);
        }

        // Notify app and go to feed
        btn.textContent = '✓ Success';
        document.dispatchEvent(new Event('auth:changed'));
        setTimeout(() => {
          document.body.style.overflow = 'auto';
          // Refresh navbar to show logout button instead of login
          if (typeof (window as any).refreshNavbar === 'function') {
            (window as any).refreshNavbar();
          }
          renderRoute('/feed');
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
  });
}

/* =========================================
   Starfield (2D)
========================================= */
function setupStarfield() {
  const canvas = document.getElementById(
    'starfield'
  ) as HTMLCanvasElement | null;
  if (!canvas) return;
  const ctx = canvas.getContext('2d')!;
  const resize = () => {
    canvas.width = innerWidth;
    canvas.height = innerHeight;
  };
  resize();
  addEventListener('resize', resize);

  const stars = Array.from({ length: 220 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: Math.random() * 1.8 + 0.3,
    o: Math.random() * 0.7 + 0.3,
    vx: (Math.random() - 0.5) * 0.1,
    vy: (Math.random() - 0.5) * 0.1,
  }));

  let t = 0;
  (function draw() {
    const light = document.documentElement.classList.contains('light-mode');
    ctx.fillStyle = light ? '#ffffff' : '#0b1220';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!light) {
      stars.forEach((s) => {
        s.x += s.vx;
        s.y += s.vy;
        if (s.x > canvas.width) s.x = 0;
        if (s.x < 0) s.x = canvas.width;
        if (s.y > canvas.height) s.y = 0;
        if (s.y < 0) s.y = canvas.height;

        const tw = 0.5 + 0.5 * Math.sin(t * 0.025 + s.o * Math.PI);
        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 3.5);
        g.addColorStop(0, `rgba(200,220,255,${s.o * 0.2 * tw})`);
        g.addColorStop(0.5, `rgba(150,180,255,${s.o * 0.1 * tw})`);
        g.addColorStop(1, 'rgba(100,150,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(255,255,255,${s.o * 0.9 * tw})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      });
    } else {
      ctx.lineWidth = 1.2;
      for (let i = 0; i < stars.length; i++) {
        for (let j = i + 1; j < stars.length; j++) {
          const dx = stars[i].x - stars[j].x;
          const dy = stars[i].y - stars[j].y;
          const d = Math.hypot(dx, dy);
          if (d < 120) {
            const a = (1 - d / 120) * 0.2;
            ctx.strokeStyle = `rgba(249,115,22,${a})`;
            ctx.beginPath();
            ctx.moveTo(stars[i].x, stars[i].y);
            ctx.lineTo(stars[j].x, stars[j].y);
            ctx.stroke();
          }
        }
      }
      stars.forEach((s) => {
        s.x += s.vx * 0.5;
        s.y += s.vy * 0.5;
        if (s.x > canvas.width) s.x = 0;
        if (s.x < 0) s.x = canvas.width;
        if (s.y > canvas.height) s.y = 0;
        if (s.y < 0) s.y = canvas.height;
      });
    }

    t++;
    requestAnimationFrame(draw);
  })();
}

/* =========================================
   3D star (Three.js)
========================================= */
function setupThreeStar() {
  const canvas = document.getElementById(
    'canvas3d'
  ) as HTMLCanvasElement | null;
  if (!canvas) return;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    35,
    innerWidth / innerHeight,
    0.1,
    100
  );
  camera.position.set(0, 0.5, 5.5);

  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(5, 7, 4);
  key.castShadow = true;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xd4a574, 0.35);
  rim.position.set(-8, 3, -3);
  scene.add(rim);
  scene.add(new THREE.AmbientLight(0xffffff, 0.25));

  const getColor = () =>
    document.documentElement.classList.contains('light-mode')
      ? 0x2a2a2a
      : 0xffffff;

  const mat = new THREE.MeshPhysicalMaterial({
    color: getColor(),
    metalness: 0.18,
    roughness: 0.2,
    clearcoat: 0.95,
    clearcoatRoughness: 0.1,
  });

  const star = new THREE.Group();
  scene.add(star);
  const arms: THREE.Object3D[] = [];
  const originalRotations: { x: number; y: number; z: number }[] = [];

  for (let i = 0; i < 6; i++) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2.4, 0.6), mat);
    arm.rotation.z = (Math.PI * 2 * i) / 6;
    arm.castShadow = true;
    star.add(arm);
    arms.push(arm);
    // Store original rotation for each arm
    originalRotations.push({ x: 0, y: 0, z: arm.rotation.z });
  }
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.75, 32, 24), mat);
  core.castShadow = true;
  star.add(core);
  arms.push(core);
  // Store original rotation for core
  originalRotations.push({ x: 0, y: 0, z: 0 });

  star.rotation.set(-0.3, 0.2, 0);
  star.position.y = 0.2;

  let isDown = false,
    lastX = 0,
    lastY = 0,
    starBroken = false,
    hovering = false;

  addEventListener('mousedown', (e) => {
    isDown = true;
    lastX = e.clientX;
    lastY = e.clientY;
  });
  addEventListener('mouseup', () => {
    isDown = false;
  });
  addEventListener('mousemove', (e) => {
    if (!isDown) {
      lastX = e.clientX;
      lastY = e.clientY;
      return;
    }
    const dx = e.clientX - lastX,
      dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    star.rotation.y += dx * 0.006;
    star.rotation.x = Math.max(
      -1.2,
      Math.min(1.2, star.rotation.x + dy * 0.006)
    );
  });

  const ray = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  addEventListener('mousemove', (e) => {
    mouse.x = (e.clientX / innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / innerHeight) * 2 + 1;
    ray.setFromCamera(mouse, camera);
    const hit = ray.intersectObject(star, true).length > 0;
    if (hit && !hovering) {
      hovering = true;
      gsap.to(star.scale, {
        x: 1.15,
        y: 1.15,
        z: 1.15,
        duration: 0.6,
        ease: 'elastic.out(1.3, 0.7)',
      });
      gsap.to(key, { intensity: 1.6, duration: 0.6 });
      gsap.to(star.position, { y: 0.5, duration: 0.6, ease: 'sine.inOut' });
      gsap.to(rim, { intensity: 0.6, duration: 0.6 });
    } else if (!hit && hovering) {
      hovering = false;
      gsap.to(star.scale, {
        x: 1,
        y: 1,
        z: 1,
        duration: 0.7,
        ease: 'back.out(1.5)',
      });
      gsap.to(key, { intensity: 1.0, duration: 0.7 });
      gsap.to(star.position, { y: 0.2, duration: 0.7, ease: 'sine.inOut' });
      gsap.to(rim, { intensity: 0.35, duration: 0.7 });
    }
  });

  addEventListener('click', () => {
    if (!hovering) return;
    starBroken = !starBroken;
    const parts = [...arms];
    if (starBroken) {
      parts.forEach((mesh) => {
        const dir = new THREE.Vector3(
          (Math.random() - 0.5) * 1.5,
          (Math.random() - 0.5) * 1.5,
          (Math.random() - 0.5) * 1.5
        ).normalize();
        const dist = 3 + Math.random() * 2;
        const target = dir.multiplyScalar(dist);
        gsap.to((mesh as any).position, {
          x: target.x,
          y: target.y,
          z: target.z,
          duration: 0.9,
          ease: 'back.out(1.5)',
        });
        gsap.to((mesh as any).rotation, {
          x: Math.random() * Math.PI * 2,
          y: Math.random() * Math.PI * 2,
          z: Math.random() * Math.PI * 2,
          duration: 0.9,
          ease: 'power2.inOut',
        });
      });
    } else {
      parts.forEach((mesh, index) => {
        gsap.to((mesh as any).position, {
          x: 0,
          y: 0,
          z: 0,
          duration: 0.9,
          ease: 'back.out(1.5)',
        });
        gsap.to((mesh as any).rotation, {
          x: originalRotations[index].x,
          y: originalRotations[index].y,
          z: originalRotations[index].z,
          duration: 0.9,
          ease: 'power2.inOut',
        });
      });
    }
  });

  const applyMat = () => mat.color.setHex(getColor());
  document.addEventListener('linka-theme-changed', applyMat);

  let last = performance.now();
  (function loop(now = performance.now()) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    if (!isDown && !starBroken) {
      const v = (hovering ? 0.04 : 0.06) * dt;
      star.rotation.y += v;
      star.position.z = 0.15 * Math.sin(now * 0.0005);
      star.rotation.z = hovering
        ? Math.sin(now * 0.0008) * 0.1
        : star.rotation.z * 0.95;
    }
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  })();

  addEventListener('resize', () => {
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  });
}
