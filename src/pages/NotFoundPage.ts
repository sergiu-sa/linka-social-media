/**
 * @file NotFoundPage.ts
 * @description Editorial-flat 404 page. CSS in style.css under `.linka-404`.
 */

export default async function NotFoundPage() {
  setTimeout(() => {
    const link = document.querySelector<HTMLAnchorElement>('[data-link-home]');
    if (!link) return;
    link.addEventListener('click', (e) => {
      e.preventDefault();
      history.pushState({ path: '/' }, '', '/');
      window.renderRoute?.('/');
    });
  }, 0);

  return `
    <section class="linka-404">
      <p class="linka-404-eyebrow">Error · 404</p>
      <h1 class="linka-404-title" aria-label="Page not found">404</h1>
      <p class="linka-404-body">
        The page you were looking for doesn't exist, has moved, or never did.
      </p>
      <div class="linka-404-actions">
        <a href="/" class="intro-cta intro-cta-secondary linka-404-cta" data-link-home>
          ← Back to home
        </a>
      </div>
    </section>
  `;
}
