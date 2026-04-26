/**
 * @file pages/auth/authShell.ts
 * @description Renders the editorial split-screen used by Login and Register pages.
 *              Pure HTML rendering — no DOM mounting, no event wiring.
 */

export type AuthShellConfig = {
  title: string;
  subhead: string;
  quoteHtml: string;
  fieldsHtml: string;
  submitLabel: string;
  formId: 'login' | 'register';
  crosslinkText: string;
  crosslinkLabel: string;
  crosslinkHref: '/login' | '/register';
};

const STAR_SVG = `
  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <linearGradient id="authStarArm" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ff7a2e"/>
        <stop offset="100%" stop-color="#f36920"/>
      </linearGradient>
      <radialGradient id="authStarCore" cx="30%" cy="30%">
        <stop offset="0%" stop-color="#ff9d5c"/>
        <stop offset="100%" stop-color="#f36920"/>
      </radialGradient>
    </defs>
    ${[0, 60, 120, 180, 240, 300]
      .map(
        (deg) => `
      <g transform="translate(100, 100) rotate(${deg}) translate(-100, -100)">
        <rect x="75" y="10" width="50" height="83" rx="6" fill="url(#authStarArm)" opacity="0.88"/>
      </g>`
      )
      .join('')}
    <circle cx="100" cy="100" r="55" fill="url(#authStarCore)"/>
  </svg>
`;

export function renderAuthShell(cfg: AuthShellConfig): string {
  return `
    <div class="auth-shell">
      <aside class="auth-brand" aria-label="LINKA">
        <canvas class="auth-starfield" id="authStarfield"></canvas>
        <a href="/" class="auth-brand-logo" data-link>
          ${STAR_SVG}
          <span>LINKA</span>
        </a>

        <div>
          <h1 class="auth-brand-quote">${cfg.quoteHtml}</h1>
        </div>

        <div class="auth-brand-footer">
          <span>LINKA · 2026</span>
        </div>
      </aside>

      <section class="auth-form-panel">
        <a href="/" class="auth-back-link" data-link aria-label="Back to intro">
          <span aria-hidden="true">←</span> Back to intro
        </a>
        <label class="theme-toggle auth-theme-toggle relative inline-flex items-center cursor-pointer">
          <input id="themeToggle" type="checkbox" class="sr-only peer" />
          <div class="relative w-12 h-6 bg-gray-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:rounded-full after:h-5 after:w-5 after:border after:border-gray-300 after:transition-all peer-checked:bg-orange-500 transition-all duration-300"></div>
        </label>

        <div class="auth-form-inner">
          <h2 class="auth-title">${cfg.title}</h2>
          <p class="auth-subhead">${cfg.subhead}</p>

          <form id="${cfg.formId}" novalidate>
            ${cfg.fieldsHtml}
            <button type="submit" class="submit-btn auth-submit">${cfg.submitLabel}</button>
            <p class="form-msg auth-msg"></p>
          </form>

          <p class="auth-crosslink">
            ${cfg.crosslinkText}
            <a href="${cfg.crosslinkHref}" data-link>${cfg.crosslinkLabel} →</a>
          </p>
        </div>
      </section>
    </div>
  `;
}

export function setupAuthStarfield(): void {
  const canvas = document.getElementById('authStarfield') as HTMLCanvasElement | null;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const resize = () => {
    const rect = canvas.parentElement?.getBoundingClientRect();
    if (!rect) return;
    canvas.width = rect.width;
    canvas.height = rect.height;
  };
  resize();
  const onResize = () => resize();
  addEventListener('resize', onResize);

  const nodes = Array.from({ length: 70 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: Math.random() * 1.4 + 0.4,
    o: Math.random() * 0.6 + 0.3,
    vx: (Math.random() - 0.5) * 0.05,
    vy: (Math.random() - 0.5) * 0.05,
  }));

  let running = true;
  let t = 0;
  const draw = () => {
    if (!canvas.isConnected) {
      running = false;
      removeEventListener('resize', onResize);
      return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const light = document.documentElement.classList.contains('light-mode');

    nodes.forEach((n) => {
      n.x += n.vx;
      n.y += n.vy;
      if (n.x > canvas.width) n.x = 0;
      if (n.x < 0) n.x = canvas.width;
      if (n.y > canvas.height) n.y = 0;
      if (n.y < 0) n.y = canvas.height;
    });

    if (light) {
      // Light mode: "modules" — orange nodes connected by visible lines
      ctx.lineWidth = 1.4;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const d = Math.hypot(dx, dy);
          if (d < 140) {
            const a = (1 - d / 140) * 0.55;
            ctx.strokeStyle = `rgba(234,88,12,${a})`;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }
      nodes.forEach((n) => {
        ctx.fillStyle = `rgba(234,88,12,${Math.min(1, n.o * 0.95)})`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r + 0.5, 0, Math.PI * 2);
        ctx.fill();
      });
    } else {
      // Dark mode: twinkling starfield
      nodes.forEach((n) => {
        const tw = 0.5 + 0.5 * Math.sin(t * 0.025 + n.o * Math.PI);
        ctx.fillStyle = `rgba(255,255,255,${n.o * 0.85 * tw})`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    t++;
    if (running) requestAnimationFrame(draw);
  };
  draw();
}

export function wireAuthLinks(): void {
  document.querySelectorAll<HTMLAnchorElement>('.auth-shell a[data-link]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href') || '/';
      e.preventDefault();
      history.pushState({ path: href }, '', href);
      const renderRoute = (window as any).renderRoute as ((p: string) => void) | undefined;
      if (typeof renderRoute === 'function') renderRoute(href);
    });
  });
}
