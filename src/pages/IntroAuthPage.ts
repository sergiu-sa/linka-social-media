import { renderRoute } from '../router';
import { isLoggedIn } from '../utils/auth';
import { initTheme } from '../utils/theme';
import { mountThreeStar, showDiscoveryHint } from '../components/threeStar';

const HEADER_LOGO_SVG = `
  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 sm:w-10 sm:h-10 transition-all duration-700 ease-out group-hover:scale-125 group-hover:rotate-[360deg] group-hover:drop-shadow-[0_0_20px_rgba(249,115,22,0.8)]" aria-label="LINKA Logo">
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
    ${[0, 60, 120, 180, 240, 300]
      .map(
        (deg, i) => `
    <g transform="translate(100, 100) rotate(${deg}) translate(-100, -100)">
      <rect x="75" y="10" width="50" height="83" rx="6" fill="url(#introArmGradient)" filter="url(#introShadow)" opacity="${0.9 - (i % 3) * 0.05}"/>
    </g>`
      )
      .join('')}
    <circle cx="100" cy="100" r="55" fill="url(#introCoreGradient)" filter="url(#introShadow)"/>
    <circle cx="100" cy="100" r="55" fill="none" stroke="#ff7a2e" stroke-width="1" opacity="0.6"/>
  </svg>
`;

const prefersReducedMotion = (): boolean =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

export default async function IntroAuthPage(): Promise<string> {
  setTimeout(() => {
    if (isLoggedIn()) {
      renderRoute('/feed');
      return;
    }
    initTheme('themeToggle', true);
    setupChrome();
    setupStarfield();
    const canvas = document.getElementById('canvas3d') as HTMLCanvasElement | null;
    if (canvas) {
      mountThreeStar(canvas, { mode: 'intro' });
      setTimeout(showDiscoveryHint, prefersReducedMotion() ? 500 : 3000);
    }
  }, 0);

  return `
    <canvas id="starfield" class="fixed inset-0 z-10"></canvas>
    <canvas id="canvas3d" class="fixed inset-0 z-20"></canvas>

    <div class="intro-top-strip">
      <a href="/" class="flex items-center gap-2 sm:gap-3 text-white light:text-black font-black text-sm sm:text-base tracking-widest uppercase no-underline group transition-all duration-300">
        ${HEADER_LOGO_SVG}
        <span class="group-hover:text-orange-500 group-hover:tracking-[0.2em] transition-all duration-500 text-xs sm:text-base">LINKA</span>
      </a>
      <label class="theme-toggle relative inline-flex items-center cursor-pointer">
        <input id="themeToggle" type="checkbox" class="sr-only peer" />
        <div class="relative w-12 h-6 sm:w-14 sm:h-7 bg-gray-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:rounded-full after:h-5 after:w-5 sm:after:h-6 sm:after:w-6 after:border after:border-gray-300 after:transition-all peer-checked:bg-orange-500 hover:shadow-lg hover:shadow-orange-500/50 transition-all duration-300"></div>
      </label>
    </div>

    <div class="intro-bottom-strip">
      <span class="intro-enter-hint intro-reveal-up"><kbd>↵ Enter</kbd> for fast sign in</span>
      <div class="intro-cta-row">
        <a href="/login" class="intro-cta intro-cta-secondary intro-reveal-up">Sign In</a>
        <a id="introCtaRegister" href="/register" class="intro-cta intro-cta-primary intro-reveal-up">Create Account</a>
      </div>
    </div>
  `;
}

/* -------------------------------------- Chrome strips -------------------------------------- */

function setupChrome() {
  const reduced = prefersReducedMotion();
  const navigate = (path: '/login' | '/register') => {
    document.body.style.overflow = 'auto';
    history.pushState({ path }, '', path);
    renderRoute(path);
  };

  // Enter → fast sign in
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter') navigate('/login');
  };
  document.addEventListener('keydown', onKey);

  // CTA clicks
  document.querySelectorAll<HTMLAnchorElement>('.intro-cta').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const href = a.getAttribute('href');
      if (href === '/login' || href === '/register') navigate(href);
    });
  });

  // Reveal animation — staggered fade/slide via .is-revealed class
  const top = document.querySelector<HTMLElement>('.intro-top-strip');
  const bottom = document.querySelector<HTMLElement>('.intro-bottom-strip');
  const reveals = Array.from(
    document.querySelectorAll<HTMLElement>('.intro-reveal-up')
  );
  const primary = document.getElementById('introCtaRegister');

  if (reduced) {
    if (top) top.style.opacity = '1';
    if (bottom) bottom.style.opacity = '1';
    reveals.forEach((el) => el.classList.add('is-revealed'));
    return;
  }

  // Initially hidden via CSS (.intro-top/bottom-strip start at opacity:0)
  // Drive reveal via setTimeout so it composes with the star assembly.
  setTimeout(() => {
    if (top) top.style.opacity = '1';
  }, 900);
  setTimeout(() => {
    if (bottom) bottom.style.opacity = '1';
  }, 1100);
  // Stagger child reveals
  reveals.forEach((el, i) => {
    setTimeout(() => el.classList.add('is-revealed'), 950 + i * 80);
  });
  // One-time primary CTA pulse to draw the eye
  setTimeout(() => {
    if (!primary) return;
    primary.classList.add('is-pulsing');
    setTimeout(() => primary.classList.remove('is-pulsing'), 700);
  }, 1700);
}

/* -------------------------------------- Starfield (2D canvas) -------------------------------------- */

function setupStarfield() {
  const canvas = document.getElementById('starfield') as HTMLCanvasElement | null;
  if (!canvas) return;
  const ctx = canvas.getContext('2d')!;
  const resize = () => {
    canvas.width = innerWidth;
    canvas.height = innerHeight;
  };
  resize();
  addEventListener('resize', resize);

  // Dark mode keeps 220 stars; light mode capped to keep O(n²) line check tractable.
  const DARK_COUNT = 220;
  const LIGHT_COUNT = 120;
  const stars = Array.from({ length: DARK_COUNT }, () => ({
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
      const cap = Math.min(LIGHT_COUNT, stars.length);
      for (let i = 0; i < cap; i++) {
        for (let j = i + 1; j < cap; j++) {
          const dx = stars[i].x - stars[j].x;
          const dy = stars[i].y - stars[j].y;
          if (Math.abs(dx) > 120 || Math.abs(dy) > 120) continue;
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
      for (let k = 0; k < cap; k++) {
        const s = stars[k];
        s.x += s.vx * 0.5;
        s.y += s.vy * 0.5;
        if (s.x > canvas.width) s.x = 0;
        if (s.x < 0) s.x = canvas.width;
        if (s.y > canvas.height) s.y = 0;
        if (s.y < 0) s.y = canvas.height;
      }
    }

    t++;
    requestAnimationFrame(draw);
  })();
}

