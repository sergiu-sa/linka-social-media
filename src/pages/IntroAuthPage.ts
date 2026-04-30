import * as THREE from 'three';
import { gsap } from 'gsap';
import { renderRoute } from '../router';
import { isLoggedIn } from '../utils/auth';
import { initTheme } from '../utils/theme';

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
    setupThreeStar();
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

/* -------------------------------------- Discovery hint -------------------------------------- */

function showDiscoveryHint() {
  if (prefersReducedMotion()) return;
  if (sessionStorage.getItem('linka:hint-shown') === '1') return;

  const el = document.createElement('div');
  el.className = 'intro-hint-label';
  el.textContent = '↺ drag · ✦ click to break it';
  document.body.appendChild(el);

  // Fade in
  requestAnimationFrame(() => el.classList.add('is-visible'));
  // Hold 5s, then fade out + cleanup
  setTimeout(() => {
    el.classList.remove('is-visible');
    setTimeout(() => el.remove(), 500);
  }, 5000);

  sessionStorage.setItem('linka:hint-shown', '1');
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

/* -------------------------------------- 3D star (Three.js) -------------------------------------- */

function setupThreeStar() {
  const canvas = document.getElementById('canvas3d') as HTMLCanvasElement | null;
  if (!canvas) return;

  const reduced = prefersReducedMotion();

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.1, 100);
  const cameraZ = () => (innerWidth < 640 ? 8.5 : innerWidth < 1024 ? 6.5 : 5.5);
  camera.position.set(0, 0.5, cameraZ());

  const key = new THREE.DirectionalLight(0xffffff, reduced ? 1.4 : 0.0);
  key.position.set(5, 7, 4);
  key.castShadow = true;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xd4a574, 0.35);
  rim.position.set(-8, 3, -3);
  scene.add(rim);
  scene.add(new THREE.AmbientLight(0xffffff, 0.25));

  const getColor = () =>
    document.documentElement.classList.contains('light-mode') ? 0x2a2a2a : 0xffffff;

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
    originalRotations.push({ x: 0, y: 0, z: arm.rotation.z });
  }
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.75, 32, 24), mat);
  core.castShadow = true;
  star.add(core);
  arms.push(core);
  originalRotations.push({ x: 0, y: 0, z: 0 });

  star.rotation.set(-0.3, 0.2, 0);
  star.position.y = 0.2;

  let isDragging = false;
  let lastX = 0,
    lastY = 0;
  let starBroken = false;
  let hovering = false;
  let lastInputAt = performance.now();
  let raycastTick = 0; // throttle: every other frame
  type Hover = { x: number; y: number };
  const hoverRef: { value: Hover | null } = { value: null };
  let autoReassembleTimer: number | null = null;

  if (!reduced) {
    arms.forEach((mesh) => {
      const dir = new THREE.Vector3(
        (Math.random() - 0.5) * 1.5,
        (Math.random() - 0.5) * 1.5,
        (Math.random() - 0.5) * 1.5
      ).normalize();
      const dist = 3 + Math.random() * 2;
      const target = dir.multiplyScalar(dist);
      (mesh as any).position.set(target.x, target.y, target.z);
      (mesh as any).rotation.set(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      );
    });
    // Light intensity rises during assembly
    gsap.to(key, { intensity: 1.4, duration: 0.9, delay: 0.3, ease: 'sine.out' });
    arms.forEach((mesh, index) => {
      gsap.to((mesh as any).position, {
        x: 0, y: 0, z: 0,
        duration: 0.9, delay: 0.3, ease: 'back.out(1.5)',
      });
      gsap.to((mesh as any).rotation, {
        x: originalRotations[index].x,
        y: originalRotations[index].y,
        z: originalRotations[index].z,
        duration: 0.9, delay: 0.3, ease: 'power2.inOut',
      });
    });
    // Bloom flash on rim at the assembly moment
    gsap.to(rim, {
      intensity: 1.2, duration: 0.15, delay: 1.0, yoyo: true, repeat: 1, ease: 'power1.out',
    });
  }

  canvas.addEventListener('pointerdown', (e) => {
    isDragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    document.body.classList.add('is-dragging-star');
    canvas.setPointerCapture(e.pointerId);
    lastInputAt = performance.now();
    // Track tap for touch tap-to-explode
    if (e.pointerType === 'touch') {
      tapStart = { t: performance.now(), x: e.clientX, y: e.clientY };
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - lastX,
      dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    star.rotation.y += dx * 0.006;
    star.rotation.x = Math.max(-1.2, Math.min(1.2, star.rotation.x + dy * 0.006));
    lastInputAt = performance.now();
  });
  const endDrag = (e: PointerEvent) => {
    if (!isDragging) return;
    isDragging = false;
    document.body.classList.remove('is-dragging-star');
    try { canvas.releasePointerCapture(e.pointerId); } catch {}
    // Touch tap-to-explode
    if (e.pointerType === 'touch' && tapStart) {
      const dt = performance.now() - tapStart.t;
      const dist = Math.hypot(e.clientX - tapStart.x, e.clientY - tapStart.y);
      if (dt < 200 && dist < 8) {
        const hit = raycastHit(e.clientX, e.clientY);
        if (hit) toggleExplode();
      }
      tapStart = null;
    }
    lastInputAt = performance.now();
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  let tapStart: { t: number; x: number; y: number } | null = null;

  // Listening on `canvas` (not `window`) so chrome elements (top/bottom
  // strips, CTAs) don't keep updating the hover state when the cursor is
  // over them. Pointer events on those siblings don't bubble through the
  // canvas, so we get clean enter/leave semantics.
  const ray = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return; // skip hover on touch
    hoverRef.value = { x: e.clientX, y: e.clientY };
    lastInputAt = performance.now();
  });
  canvas.addEventListener('pointerleave', () => {
    hoverRef.value = null;
    setHover(false);
  });

  const raycastHit = (clientX: number, clientY: number) => {
    mouse.x = (clientX / innerWidth) * 2 - 1;
    mouse.y = -(clientY / innerHeight) * 2 + 1;
    ray.setFromCamera(mouse, camera);
    return ray.intersectObject(star, true).length > 0;
  };

  const setHover = (next: boolean) => {
    if (next === hovering) return;
    hovering = next;
    if (next) {
      gsap.to(star.scale, { x: 1.15, y: 1.15, z: 1.15, duration: 0.6, ease: 'elastic.out(1.3, 0.7)' });
      gsap.to(key, { intensity: 1.6, duration: 0.6 });
      gsap.to(star.position, { y: 0.5, duration: 0.6, ease: 'sine.inOut' });
      gsap.to(rim, { intensity: 0.6, duration: 0.6 });
    } else {
      gsap.to(star.scale, { x: 1, y: 1, z: 1, duration: 0.7, ease: 'back.out(1.5)' });
      gsap.to(key, { intensity: 1.0, duration: 0.7 });
      gsap.to(star.position, { y: 0.2, duration: 0.7, ease: 'sine.inOut' });
      gsap.to(rim, { intensity: 0.35, duration: 0.7 });
    }
  };

  const spawnParticles = () => {
    const count = 18;
    const positions = new Float32Array(count * 3);
    const velocities: THREE.Vector3[] = [];
    for (let i = 0; i < count; i++) {
      positions[i * 3] = star.position.x;
      positions[i * 3 + 1] = star.position.y;
      positions[i * 3 + 2] = star.position.z;
      velocities.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * 6,
          (Math.random() - 0.5) * 6,
          (Math.random() - 0.5) * 6
        )
      );
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const pmat = new THREE.PointsMaterial({
      color: 0xff7a2e,
      size: 0.18,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(geom, pmat);
    scene.add(points);

    const proxy = { life: 0 };
    gsap.to(proxy, {
      life: 1,
      duration: 0.8,
      ease: 'power2.out',
      onUpdate: () => {
        const arr = geom.attributes.position.array as Float32Array;
        for (let i = 0; i < count; i++) {
          arr[i * 3] = star.position.x + velocities[i].x * proxy.life;
          arr[i * 3 + 1] = star.position.y + velocities[i].y * proxy.life;
          arr[i * 3 + 2] = star.position.z + velocities[i].z * proxy.life;
        }
        geom.attributes.position.needsUpdate = true;
        pmat.opacity = 0.95 * (1 - proxy.life);
      },
      onComplete: () => {
        scene.remove(points);
        geom.dispose();
        pmat.dispose();
      },
    });
  };

  const explode = () => {
    starBroken = true;
    spawnParticles();
    arms.forEach((mesh) => {
      const dir = new THREE.Vector3(
        (Math.random() - 0.5) * 1.5,
        (Math.random() - 0.5) * 1.5,
        (Math.random() - 0.5) * 1.5
      ).normalize();
      const dist = 3 + Math.random() * 2;
      const target = dir.multiplyScalar(dist);
      gsap.to((mesh as any).position, {
        x: target.x, y: target.y, z: target.z,
        duration: 0.9, ease: 'back.out(1.5)',
      });
      gsap.to((mesh as any).rotation, {
        x: Math.random() * Math.PI * 2,
        y: Math.random() * Math.PI * 2,
        z: Math.random() * Math.PI * 2,
        duration: 0.9, ease: 'power2.inOut',
      });
    });
    if (autoReassembleTimer !== null) clearTimeout(autoReassembleTimer);
    autoReassembleTimer = window.setTimeout(() => {
      if (starBroken) reassemble();
    }, 6000);
  };

  const reassemble = () => {
    starBroken = false;
    if (autoReassembleTimer !== null) {
      clearTimeout(autoReassembleTimer);
      autoReassembleTimer = null;
    }
    arms.forEach((mesh, index) => {
      gsap.to((mesh as any).position, {
        x: 0, y: 0, z: 0,
        duration: 0.9, ease: 'back.out(1.5)',
      });
      gsap.to((mesh as any).rotation, {
        x: originalRotations[index].x,
        y: originalRotations[index].y,
        z: originalRotations[index].z,
        duration: 0.9, ease: 'power2.inOut',
      });
    });
  };

  const toggleExplode = () => {
    if (!starBroken) explode();
    else reassemble();
  };

  // Mouse click on canvas — explode only if hovering (mouse path)
  canvas.addEventListener('click', () => {
    if (!hovering) return;
    toggleExplode();
    lastInputAt = performance.now();
  });

  const applyMat = () => mat.color.setHex(getColor());
  document.addEventListener('linka-theme-changed', applyMat);

  if (!reduced) {
    setInterval(() => {
      if (starBroken || isDragging || hovering) return;
      if (performance.now() - lastInputAt < 1000) return;
      gsap.to(star.scale, {
        x: 1.02, y: 1.02, z: 1.02,
        duration: 0.6, yoyo: true, repeat: 1, ease: 'sine.inOut',
      });
      gsap.to(key, {
        intensity: 1.7, duration: 0.6, yoyo: true, repeat: 1, ease: 'sine.inOut',
      });
    }, 5000);
  }

  setTimeout(showDiscoveryHint, reduced ? 500 : 3000);

  let last = performance.now();
  (function loop(now = performance.now()) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;

    // Throttled hover raycast
    raycastTick = (raycastTick + 1) % 2;
    const ph = hoverRef.value;
    if (raycastTick === 0 && ph) {
      setHover(raycastHit(ph.x, ph.y));
    }

    if (!isDragging && !starBroken) {
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
    camera.position.z = cameraZ();
    camera.updateProjectionMatrix();
  });
}
