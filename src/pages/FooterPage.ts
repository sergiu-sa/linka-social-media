/**
 * @file pages/FooterPage.ts
 * @description Editorial-flat footer rendered once at app boot. Visibility
 *              is CSS-driven via `body:has(.feed-page)` / `:has(.linka-profile)`,
 *              matching the body-padding pattern. Wires a back-to-top button
 *              and a one-time fade-in via IntersectionObserver.
 */

import { renderRoute } from '../router';
import { isLoggedIn, logout } from '../utils/auth';
import { confirmDialog } from '../utils/confirm';

const YEAR = new Date().getFullYear();

const FOOTER_HTML = `
  <footer id="app-footer" class="linka-footer" role="contentinfo">
    <div class="linka-footer-inner">

      <div class="linka-footer-mast">
        <span class="linka-footer-mast-bar" aria-hidden="true"></span>
        <span class="linka-footer-wordmark" data-footer-reveal>LINKA</span>
        <span class="linka-footer-mast-rule" aria-hidden="true"></span>
        <p class="linka-footer-tagline">Editorial social feed</p>
      </div>

      <div class="linka-footer-grid">
        <section class="linka-footer-col" aria-labelledby="footer-explore">
          <h3 id="footer-explore" class="linka-footer-eyebrow">Explore</h3>
          <ul class="linka-footer-list" role="list">
            <li><a href="/feed" data-footer-nav="/feed">Feed</a></li>
            <li><a href="/profile" data-footer-nav="/profile">Profile</a></li>
            <li>
              <button type="button" class="linka-footer-link-btn" data-footer-action="logout">
                Sign out
              </button>
            </li>
          </ul>
        </section>

        <section class="linka-footer-col" aria-labelledby="footer-built">
          <h3 id="footer-built" class="linka-footer-eyebrow">Built with</h3>
          <ul class="linka-footer-list" role="list">
            <li><span>TypeScript</span></li>
            <li><span>Vite</span></li>
            <li><span>Tailwind CSS v4</span></li>
            <li><span>Three.js · GSAP</span></li>
          </ul>
        </section>

        <section class="linka-footer-col" aria-labelledby="footer-course">
          <h3 id="footer-course" class="linka-footer-eyebrow">The course</h3>
          <ul class="linka-footer-list" role="list">
            <li>
              <a href="https://www.noroff.no" target="_blank" rel="noopener noreferrer">
                Noroff FED2-24
              </a>
            </li>
            <li>
              <a href="https://linka-social.netlify.app/" target="_blank" rel="noopener noreferrer">
                Live deploy
              </a>
            </li>
            <li>
              <a href="https://docs.noroff.dev/docs/v2" target="_blank" rel="noopener noreferrer">
                API docs
              </a>
            </li>
          </ul>
        </section>
      </div>

      <div class="linka-footer-base">
        <p class="linka-footer-copy">
          <span class="linka-footer-copy-symbol" aria-hidden="true">©</span>
          ${YEAR} LINKA · Coursework, not a real product
        </p>

        <div class="linka-footer-tags" aria-label="Topic tags">
          <span class="linka-footer-tag">#editorial</span>
          <span class="linka-footer-tag">#social</span>
          <span class="linka-footer-tag">#typescript</span>
        </div>

        <button
          type="button"
          class="linka-footer-top"
          data-footer-action="top"
          aria-label="Back to top"
        >
          <span class="linka-footer-top-label">Back to top</span>
          <span class="linka-footer-top-arrow" aria-hidden="true">↑</span>
        </button>
      </div>

    </div>
  </footer>
`;

let footerMounted = false;

export function mountFooter(): void {
  if (footerMounted) return;
  footerMounted = true;
  document.body.insertAdjacentHTML('beforeend', FOOTER_HTML);
  wireFooter();
  observeReveal();
}

function wireFooter(): void {
  const footer = document.getElementById('app-footer');
  if (!footer) return;

  footer.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    const navLink = target.closest<HTMLAnchorElement>('[data-footer-nav]');
    if (navLink) {
      e.preventDefault();
      const path = navLink.getAttribute('data-footer-nav') || '/feed';
      history.pushState({ path }, '', path);
      renderRoute(path);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const action = target.closest<HTMLElement>('[data-footer-action]');
    if (!action) return;

    if (action.dataset.footerAction === 'top') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (action.dataset.footerAction === 'logout') {
      e.preventDefault();
      if (!isLoggedIn()) return;
      const ok = await confirmDialog({
        title: 'Sign out?',
        body: 'You will need to sign in again to view your feed.',
        confirmLabel: 'Sign out',
        cancelLabel: 'Stay',
      });
      if (!ok) return;
      logout();
      window.updateNavbarAfterLogout?.();
      history.pushState({ path: '/' }, '', '/');
      renderRoute('/');
    }
  });
}

function observeReveal(): void {
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const target = document.querySelector<HTMLElement>('[data-footer-reveal]');
  if (!target) return;

  if (reduced || !('IntersectionObserver' in window)) {
    target.classList.add('is-revealed');
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          target.classList.add('is-revealed');
          observer.disconnect();
          break;
        }
      }
    },
    { threshold: 0.4 }
  );
  observer.observe(target);
}
