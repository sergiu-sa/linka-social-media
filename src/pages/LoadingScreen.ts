/**
 * @file LoadingScreen.ts
 * @description Editorial-flat loading overlay. CSS lives in style.css under
 *              `.linka-loader`. The DOM is created once on app boot and
 *              toggled in/out via `.is-visible`.
 */

const STAR_SVG = `
  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <linearGradient id="loaderArm" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ff7a2e"/>
        <stop offset="100%" stop-color="#f36920"/>
      </linearGradient>
      <radialGradient id="loaderCore" cx="30%" cy="30%">
        <stop offset="0%" stop-color="#ff9d5c"/>
        <stop offset="100%" stop-color="#f36920"/>
      </radialGradient>
    </defs>
    ${[0, 60, 120, 180, 240, 300]
      .map(
        (deg) => `
      <g transform="translate(100, 100) rotate(${deg}) translate(-100, -100)">
        <rect x="75" y="10" width="50" height="83" rx="6" fill="url(#loaderArm)" opacity="0.88"/>
      </g>`
      )
      .join('')}
    <circle cx="100" cy="100" r="55" fill="url(#loaderCore)"/>
  </svg>
`;

export default class LoadingScreen {
  constructor() {
    this.createLoadingScreen();
  }

  private createLoadingScreen() {
    const app = document.getElementById('js-app');
    if (!app) return;

    const html = `
      <div id="loadingScreen" class="linka-loader" role="status" aria-live="polite" aria-hidden="true">
        <div class="linka-loader-mark">${STAR_SVG}</div>
        <div class="linka-loader-brand">LINKA</div>
        <div class="linka-loader-message"></div>
      </div>
    `;
    app.insertAdjacentHTML('afterbegin', html);
  }

  showLoadingScreen() {
    const el = document.getElementById('loadingScreen');
    if (!el) return;
    el.classList.add('is-visible');
    el.setAttribute('aria-hidden', 'false');
  }

  hideLoadingScreen() {
    const el = document.getElementById('loadingScreen');
    if (!el) return;
    el.classList.remove('is-visible');
    el.setAttribute('aria-hidden', 'true');
  }

  showWithMessage(message: string) {
    const el = document.getElementById('loadingScreen');
    if (!el) return;
    const msgEl = el.querySelector<HTMLElement>('.linka-loader-message');
    if (msgEl) msgEl.textContent = message;
    this.showLoadingScreen();
  }
}
