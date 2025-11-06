/**
 * @file router/index.ts
 * @description App routing + render. Uses LINKA IntroAuthPage for /, /login, /register.
 */

import IntroAuthPage from '../pages/IntroAuthPage.js';
import FeedPage from '../pages/FeedPage';
import ProfilePage from '../pages/ProfilePage';
import NotFoundPage from '../pages/NotFoundPage';
import { APP_CONTAINER_CLASSNAME } from '../constant';
import { isLoggedIn } from '../utils/auth';

type RouteDef = {
  url: string;
  component: () => string | Promise<string>;
  protected?: boolean;
};

const PATHS = {
  // Unified intro + auth
  root: { url: '/', component: IntroAuthPage },
  login: { url: '/login', component: IntroAuthPage },
  register: { url: '/register', component: IntroAuthPage },

  // App
  feed: { url: '/feed', component: FeedPage, protected: true },
  profile: { url: '/profile', component: ProfilePage, protected: true },
} as const;

/**
 * Core router: resolves a path to HTML from a component.
 */
export default async function router(
  currentPath = '',
  routes: Record<string, RouteDef> = PATHS
): Promise<string> {
  const currentRoute =
    Object.values(routes).find((r) => r.url === currentPath) ?? null;

  // Default 404
  let html = await NotFoundPage();

  if (currentRoute) {
    // If protected route and not logged in -> send to intro
    if (currentRoute.protected && !isLoggedIn()) {
      history.pushState({ path: '/' }, '', '/');
      html = await routes.root.component();
    }
    // If user is logged in and hits any auth route -> go to feed
    else if (
      isLoggedIn() &&
      (currentPath === '/' ||
        currentPath === '/login' ||
        currentPath === '/register')
    ) {
      history.pushState({ path: '/feed' }, '', '/feed');
      html = await routes.feed.component();
    }
    // Normal render
    else {
      html = await currentRoute.component();
    }
  }

  return html;
}

/**
 * Render a given path into the app container and run post-render hooks.
 */
export async function renderRoute(path?: string) {
  const targetPath = path ?? window.location.pathname;
  const contentContainer = document.getElementById(APP_CONTAINER_CLASSNAME);
  if (!targetPath || !contentContainer) return;

  // Optional loading screen 
  const loadingScreen = (window as any).loadingScreen;
  const isAuthRoute =
    targetPath === '/' || targetPath === '/login' || targetPath === '/register';

  if (loadingScreen && isAuthRoute) {
    loadingScreen.showWithMessage(
      targetPath === '/register'
        ? 'Loading Registration...'
        : 'Loading Sign In...'
    );
    await new Promise((r) => setTimeout(r, 600));
  }

  const html = await router(targetPath);
  contentContainer.innerHTML = html;

  // Update navbar visibility based on current route
  try {
    const updateNavbarVisibility = (window as any).updateNavbarVisibility as ((p: string) => void) | undefined;
    if (typeof updateNavbarVisibility === 'function') {
      updateNavbarVisibility(targetPath);
    }
  } catch {}

  if (loadingScreen && isAuthRoute) {
    setTimeout(() => loadingScreen.hideLoadingScreen(), 400);
  }
}
