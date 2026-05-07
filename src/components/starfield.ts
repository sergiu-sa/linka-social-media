/**
 * @file components/starfield.ts
 * @description 2D canvas atmosphere — twinkling stars in dark mode, orange
 *              node-connection mesh in light mode. Adapted from the intro
 *              page's setupStarfield so the feed hero can share the same
 *              ambient background behind the threeStar canvas.
 */

export interface StarfieldOptions {
  /** Use the canvas's bounding-box size (true, default for hero) instead of
   *  the full viewport (false, used by the intro page). */
  contained?: boolean;
  /** Cap on the number of stars to draw (lower for smaller surfaces). */
  starCount?: number;
  /** In light mode, the maximum distance to draw a connecting line between
   *  two nodes. Higher = denser network look. */
  linkDistance?: number;
  /** Background fill — when undefined, the canvas stays transparent
   *  (hero uses transparent so the panel surface shows through). */
  background?: { dark?: string; light?: string };
}

export interface StarfieldHandle {
  dispose(): void;
}

const DEFAULT_OPTS: Required<StarfieldOptions> = {
  contained: true,
  starCount: 220,
  linkDistance: 120,
  background: {},
};

export function mountStarfield(
  canvas: HTMLCanvasElement,
  options: StarfieldOptions = {}
): StarfieldHandle {
  const opts: Required<StarfieldOptions> = {
    ...DEFAULT_OPTS,
    ...options,
    background: { ...DEFAULT_OPTS.background, ...(options.background ?? {}) },
  };
  const ctx = canvas.getContext('2d');
  if (!ctx) return { dispose: () => {} };

  const cleanups: Array<() => void> = [];
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  const resize = () => {
    const w = opts.contained ? canvas.clientWidth : window.innerWidth;
    const h = opts.contained ? canvas.clientHeight : window.innerHeight;
    canvas.width = Math.max(1, Math.floor(w * dpr));
    canvas.height = Math.max(1, Math.floor(h * dpr));
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();

  const stars = Array.from({ length: opts.starCount }, () => ({
    x: Math.random() * canvas.clientWidth,
    y: Math.random() * canvas.clientHeight,
    r: Math.random() * 1.8 + 0.3,
    o: Math.random() * 0.7 + 0.3,
    vx: (Math.random() - 0.5) * 0.1,
    vy: (Math.random() - 0.5) * 0.1,
  }));

  const reseedPositions = () => {
    for (const s of stars) {
      s.x = Math.random() * canvas.clientWidth;
      s.y = Math.random() * canvas.clientHeight;
    }
  };

  const onResize = () => {
    resize();
    reseedPositions();
  };
  if (opts.contained) {
    const ro = new ResizeObserver(onResize);
    ro.observe(canvas);
    cleanups.push(() => ro.disconnect());
  } else {
    window.addEventListener('resize', onResize);
    cleanups.push(() => window.removeEventListener('resize', onResize));
  }

  let running = true;
  let rafId = 0;
  let t = 0;

  const tick = () => {
    if (!running) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const light = document.documentElement.classList.contains('light-mode');
    const fill = light ? opts.background.light : opts.background.dark;

    if (fill) {
      ctx.fillStyle = fill;
      ctx.fillRect(0, 0, w, h);
    } else {
      ctx.clearRect(0, 0, w, h);
    }

    if (!light) {
      for (const s of stars) {
        s.x += s.vx;
        s.y += s.vy;
        if (s.x > w) s.x = 0;
        if (s.x < 0) s.x = w;
        if (s.y > h) s.y = 0;
        if (s.y < 0) s.y = h;

        const tw = 0.5 + 0.5 * Math.sin(t * 0.025 + s.o * Math.PI);
        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 3.5);
        g.addColorStop(0, `rgba(200,220,255,${s.o * 0.35 * tw})`);
        g.addColorStop(0.5, `rgba(150,180,255,${s.o * 0.18 * tw})`);
        g.addColorStop(1, 'rgba(100,150,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(255,255,255,${Math.min(1, s.o * 1.15) * tw})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      const cap = Math.min(stars.length, 120);
      ctx.lineWidth = 1.2;
      for (let i = 0; i < cap; i++) {
        for (let j = i + 1; j < cap; j++) {
          const dx = stars[i].x - stars[j].x;
          const dy = stars[i].y - stars[j].y;
          if (Math.abs(dx) > opts.linkDistance || Math.abs(dy) > opts.linkDistance) continue;
          const d = Math.hypot(dx, dy);
          if (d < opts.linkDistance) {
            const a = (1 - d / opts.linkDistance) * 0.35;
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
        if (s.x > w) s.x = 0;
        if (s.x < 0) s.x = w;
        if (s.y > h) s.y = 0;
        if (s.y < 0) s.y = h;
        // Visible node dot so the network is readable, not just the lines
        ctx.fillStyle = `rgba(249,115,22,0.55)`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    t++;
    rafId = requestAnimationFrame(tick);
  };

  rafId = requestAnimationFrame(tick);

  return {
    dispose() {
      running = false;
      cancelAnimationFrame(rafId);
      cleanups.forEach((fn) => fn());
    },
  };
}
