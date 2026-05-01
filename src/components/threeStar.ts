import * as THREE from 'three';
import { gsap } from 'gsap';
import { iconSvg } from '../utils/icon';
import { MousePointer2, Sparkles } from 'lucide';

export type ThreeStarMode = 'intro' | 'hero';

export interface ThreeStarOptions {
  mode: ThreeStarMode;
  cameraZ?: { mobile: number; tablet: number; desktop: number };
  armLabels?: string[];                 // 6-tuple — used for tooltips
  onArmClick?: (index: number) => void; // hero — fires on arm raycast hit
  onCoreClick?: () => void;             // both modes; default = explode
  decorativeOnly?: boolean;             // hero: true (no auto-breath)
  pauseWhenHidden?: boolean;            // hero: true (IntersectionObserver gating)
}

export interface ThreeStarHandle {
  pause(): void;
  resume(): void;
  dispose(): void;
  explode(): void;
  reassemble(): void;
}

const prefersReducedMotion = (): boolean =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

const DEFAULT_INTRO_CAMERA = { mobile: 8.5, tablet: 6.5, desktop: 5.5 };
const DEFAULT_HERO_CAMERA  = { mobile: 7.0, tablet: 6.0, desktop: 6.0 };

export function mountThreeStar(canvas: HTMLCanvasElement, opts: ThreeStarOptions): ThreeStarHandle {
  const isHero = opts.mode === 'hero';
  const decorativeOnly = isHero ? (opts.decorativeOnly ?? true) : (opts.decorativeOnly ?? false);
  const cameraConf = opts.cameraZ ?? (isHero ? DEFAULT_HERO_CAMERA : DEFAULT_INTRO_CAMERA);

  const cleanups: Array<() => void> = [];
  let running = true;
  let externallyPaused = false;

  const reduced = prefersReducedMotion();

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.1, 100);
  const cameraZ = () =>
    innerWidth < 640 ? cameraConf.mobile : innerWidth < 1024 ? cameraConf.tablet : cameraConf.desktop;
  camera.position.set(0, 0.5, cameraZ());

  const sizeRenderer = () => {
    if (isHero) {
      const rect = canvas.getBoundingClientRect();
      renderer.setSize(rect.width, rect.height, false); // false = don't write attrs
      camera.aspect = rect.width / Math.max(rect.height, 1);
    } else {
      renderer.setSize(innerWidth, innerHeight);
      camera.aspect = innerWidth / innerHeight;
    }
    camera.position.z = cameraZ();
    camera.updateProjectionMatrix();
  };
  sizeRenderer();

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
  let tapStart: { t: number; x: number; y: number } | null = null;

  if (!reduced && !decorativeOnly) {
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

  const onDown = (e: PointerEvent) => {
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
  };
  canvas.addEventListener('pointerdown', onDown);
  cleanups.push(() => canvas.removeEventListener('pointerdown', onDown));

  const onDragMove = (e: PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - lastX,
      dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    star.rotation.y += dx * 0.006;
    star.rotation.x = Math.max(-1.2, Math.min(1.2, star.rotation.x + dy * 0.006));
    lastInputAt = performance.now();
  };
  canvas.addEventListener('pointermove', onDragMove);
  cleanups.push(() => canvas.removeEventListener('pointermove', onDragMove));

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
  cleanups.push(() => canvas.removeEventListener('pointerup', endDrag));
  canvas.addEventListener('pointercancel', endDrag);
  cleanups.push(() => canvas.removeEventListener('pointercancel', endDrag));

  // Listening on `canvas` (not `window`) so chrome elements (top/bottom
  // strips, CTAs) don't keep updating the hover state when the cursor is
  // over them. Pointer events on those siblings don't bubble through the
  // canvas, so we get clean enter/leave semantics.
  const ray = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  const onHoverMove = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return; // skip hover on touch
    hoverRef.value = { x: e.clientX, y: e.clientY };
    lastInputAt = performance.now();
  };
  canvas.addEventListener('pointermove', onHoverMove);
  cleanups.push(() => canvas.removeEventListener('pointermove', onHoverMove));

  const onPointerLeave = () => {
    hoverRef.value = null;
    setHover(false);
  };
  canvas.addEventListener('pointerleave', onPointerLeave);
  cleanups.push(() => canvas.removeEventListener('pointerleave', onPointerLeave));

  const raycastHit = (clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
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

  // — Tooltip layer (hero only) —
  let tooltipEl: HTMLDivElement | null = null;
  let tooltipArmIdx: number | null = null;

  if (isHero && opts.armLabels && opts.armLabels.length === 6 && canvas.parentElement) {
    tooltipEl = document.createElement('div');
    tooltipEl.className = 'feed-hero-tooltip';
    tooltipEl.setAttribute('role', 'tooltip');
    canvas.parentElement.appendChild(tooltipEl);
    cleanups.push(() => tooltipEl?.remove());
  }

  const updateTooltip = (clientX: number, clientY: number) => {
    if (!tooltipEl || !opts.armLabels) return;
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    ray.setFromCamera(mouse, camera);
    const hits = ray.intersectObject(star, true);
    const idx = hits.length ? arms.indexOf(hits[0].object as THREE.Object3D) : -1;
    if (idx >= 0 && idx < 6) {
      if (tooltipArmIdx !== idx) {
        tooltipArmIdx = idx;
        tooltipEl.textContent = opts.armLabels[idx] ?? '';
      }
      tooltipEl.style.left = `${clientX - rect.left + 12}px`;
      tooltipEl.style.top  = `${clientY - rect.top  + 12}px`;
      tooltipEl.classList.add('is-visible');
    } else {
      tooltipEl.classList.remove('is-visible');
      tooltipArmIdx = null;
    }
  };

  const onTooltipMove = (e: PointerEvent) => {
    if (!isHero || e.pointerType === 'touch') return;
    updateTooltip(e.clientX, e.clientY);
  };
  const onTooltipLeave = () => {
    if (!tooltipEl) return;
    tooltipEl.classList.remove('is-visible');
    tooltipArmIdx = null;
  };

  if (isHero) {
    canvas.addEventListener('pointermove', onTooltipMove);
    canvas.addEventListener('pointerleave', onTooltipLeave);
    cleanups.push(() => canvas.removeEventListener('pointermove', onTooltipMove));
    cleanups.push(() => canvas.removeEventListener('pointerleave', onTooltipLeave));
  }

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

  const onClick = (e: MouseEvent) => {
    if (!hovering) return;
    // canvas-relative coords (works for both fixed and contained canvases)
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    ray.setFromCamera(mouse, camera);
    const hits = ray.intersectObject(star, true);
    if (!hits.length) return;
    const hitIdx = arms.indexOf(hits[0].object as THREE.Object3D);
    // arms[6] is the core sphere; arms[0..5] are the box arms.
    if (isHero && hitIdx >= 0 && hitIdx < 6 && opts.onArmClick) {
      opts.onArmClick(hitIdx);
    } else if (isHero && hitIdx === 6) {
      (opts.onCoreClick ?? toggleExplode)();
    } else {
      // intro mode — any hit explodes
      (opts.onCoreClick ?? toggleExplode)();
    }
    lastInputAt = performance.now();
  };
  canvas.addEventListener('click', onClick);
  cleanups.push(() => canvas.removeEventListener('click', onClick));

  const applyMat = () => mat.color.setHex(getColor());
  document.addEventListener('linka-theme-changed', applyMat);
  cleanups.push(() => document.removeEventListener('linka-theme-changed', applyMat));

  if (!reduced && !decorativeOnly) {
    const breathId = setInterval(() => {
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
    cleanups.push(() => clearInterval(breathId));
  }

  cleanups.push(() => {
    if (autoReassembleTimer !== null) clearTimeout(autoReassembleTimer);
  });

  let rafId: number = 0;
  let last = performance.now();
  const tick = (now = performance.now()) => {
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

    if (running) {
      rafId = requestAnimationFrame(tick);
    }
  };
  // IntersectionObserver pause-when-hidden (hero only)
  let observer: IntersectionObserver | null = null;
  if (isHero && (opts.pauseWhenHidden ?? true)) {
    observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.intersectionRatio >= 0.1) {
          if (externallyPaused) continue; // consumer wins
          if (!running) {
            running = true;
            rafId = requestAnimationFrame(tick);
          }
        } else {
          if (running) {
            running = false;
            cancelAnimationFrame(rafId);
          }
        }
      }
    }, { threshold: [0, 0.1, 1] });
    observer.observe(canvas);
    cleanups.push(() => observer?.disconnect());
  }

  rafId = requestAnimationFrame(tick);

  const onResize = () => {
    sizeRenderer();
  };
  window.addEventListener('resize', onResize);
  cleanups.push(() => window.removeEventListener('resize', onResize));

  return {
    pause() {
      if (externallyPaused) return;
      externallyPaused = true;
      if (!running) return;
      running = false;
      cancelAnimationFrame(rafId);
    },
    resume() {
      if (!externallyPaused) return;
      externallyPaused = false;
      if (running) return;
      running = true;
      rafId = requestAnimationFrame(tick);
    },
    dispose() {
      running = false;
      cancelAnimationFrame(rafId);
      cleanups.forEach((fn) => fn());
      gsap.killTweensOf([...star.children, key, rim]);
      renderer.dispose();
    },
    explode,
    reassemble,
  };
}

export function showDiscoveryHint(): void {
  if (prefersReducedMotion()) return;
  if (sessionStorage.getItem('linka:hint-shown') === '1') return;

  const el = document.createElement('div');
  el.className = 'intro-hint-label';
  const drag = iconSvg(MousePointer2, { size: 11, strokeWidth: 1.8 });
  const spark = iconSvg(Sparkles, { size: 11, strokeWidth: 1.8 });
  el.innerHTML = `${drag}<span>drag</span><span class="intro-hint-sep">·</span>${spark}<span>click to break it</span>`;
  document.body.appendChild(el);

  requestAnimationFrame(() => el.classList.add('is-visible'));
  setTimeout(() => {
    el.classList.remove('is-visible');
    setTimeout(() => el.remove(), 500);
  }, 5000);

  sessionStorage.setItem('linka:hint-shown', '1');
}
