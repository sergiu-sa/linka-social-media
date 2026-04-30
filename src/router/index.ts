/**
 * @file router/index.ts
 * @description Custom client-side router. Resolves a path to a page
 *              component, performs auth-gated redirects, and mounts the
 *              resulting HTML into `#js-app`.
 */

import IntroAuthPage from '../pages/IntroAuthPage.js';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
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
  root: { url: '/', component: IntroAuthPage },
  login: { url: '/login', component: LoginPage },
  register: { url: '/register', component: RegisterPage },

  feed: { url: '/feed', component: FeedPage, protected: true },
  profile: { url: '/profile', component: ProfilePage, protected: true },
} as const;

/**
 * Core router: resolves a path to HTML from a component.
 *
 * Returns `{ html, path }` because the router may internally redirect
 * (logged-in user on `/` → `/feed`, protected route hit while logged-out
 * → `/`). Callers need the *final* path so post-render hooks (navbar
 * visibility, active-tab styling) match the URL the user actually ends up at.
 */
export default async function router(
  currentPath = '',
  routes: Record<string, RouteDef> = PATHS
): Promise<{ html: string; path: string }> {
  const currentRoute =
    Object.values(routes).find((r) => r.url === currentPath) ?? null;

  // Default 404
  if (!currentRoute) {
    return { html: await NotFoundPage(), path: currentPath };
  }

  // If protected route and not logged in -> send to intro
  if (currentRoute.protected && !isLoggedIn()) {
    history.pushState({ path: '/' }, '', '/');
    return { html: await routes.root.component(), path: '/' };
  }

  // If user is logged in and hits any auth route -> go to feed
  if (
    isLoggedIn() &&
    (currentPath === '/' ||
      currentPath === '/login' ||
      currentPath === '/register')
  ) {
    history.pushState({ path: '/feed' }, '', '/feed');
    return { html: await routes.feed.component(), path: '/feed' };
  }

  // Normal render
  return { html: await currentRoute.component(), path: currentPath };
}

/** Render a given path into the app container and run post-render hooks. */
export async function renderRoute(path?: string) {
  const targetPath = path ?? window.location.pathname;
  const contentContainer = document.getElementById(APP_CONTAINER_CLASSNAME);
  if (!targetPath || !contentContainer) return;

  // Optional loading screen
  const loadingScreen = window.loadingScreen;
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

  const { html, path: resolvedPath } = await router(targetPath);
  contentContainer.innerHTML = html;

  // Update navbar visibility based on the *resolved* path (post-redirect),
  // not the original requested path. Otherwise a logged-in user landing
  // on `/` gets feed HTML but the navbar stays hidden because we'd be
  // checking visibility for `/`.
  window.updateNavbarVisibility?.(resolvedPath);

  if (loadingScreen && isAuthRoute) {
    setTimeout(() => loadingScreen.hideLoadingScreen(), 400);
  }
}
