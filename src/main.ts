import '@fontsource/bebas-neue';
import '@fontsource/open-sans/300.css';
import '@fontsource/open-sans/400.css';
import '@fontsource/open-sans/500.css';
import '@fontsource/open-sans/600.css';
import '@fontsource/open-sans/700.css';
import '@fontsource/open-sans/800.css';
import '@fontsource/open-sans/300-italic.css';
import '@fontsource/open-sans/400-italic.css';
import '@fontsource/open-sans/500-italic.css';
import '@fontsource/open-sans/600-italic.css';
import '@fontsource/open-sans/700-italic.css';
import '@fontsource/open-sans/800-italic.css';
import '@fortawesome/fontawesome-free/css/all.css';
import './style.css';
import { renderRoute } from './router';
import LoadingScreen from './pages/LoadingScreen.js';
import NavbarPage, { initNavbar } from './pages/NavbarPage.js';
import { error as logError } from './utils/log';

// Initialize loading screen
const loadingScreen = new LoadingScreen();

// Check if navbar should be visible for current route
function shouldShowNavbar(path: string): boolean {
  const authRoutes = ['/', '/login', '/register'];
  return !authRoutes.includes(path);
}

// Function to show/hide navbar based on route
function updateNavbarVisibility(path: string) {
  const navbar = document.querySelector('#app-navbar') as HTMLElement;
  if (!navbar) return;

  if (shouldShowNavbar(path)) {
    navbar.style.display = 'block';
  } else {
    navbar.style.display = 'none';
  }
}

// Function to refresh navbar after login/logout
function refreshNavbar() {
  const existingNavbar = document.querySelector('#app-navbar');
  if (existingNavbar) {
    existingNavbar.remove();
  }

  // Add updated navbar
  const navbar = NavbarPage();
  document.body.insertAdjacentHTML('afterbegin', navbar);
  initNavbar();

  // Update visibility based on current path
  // Use a small delay to ensure DOM is ready
  setTimeout(() => {
    updateNavbarVisibility(window.location.pathname);
  }, 10);
}

// Expose router/loading helpers as window globals (typed in src/types/index.ts).
// The router code reads `window.renderRoute` to navigate from contexts that
// don't directly import the router (inline onclick="" attributes, etc.).
window.renderRoute = renderRoute;
window.loadingScreen = loadingScreen;
window.refreshNavbar = refreshNavbar;
window.updateNavbarVisibility = updateNavbarVisibility;

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  try {
    const navbar = NavbarPage();
    document.body.insertAdjacentHTML('afterbegin', navbar);
  } catch (err) {
    logError('Error creating navbar:', err);
  }

  // Initialize navbar functionality with a small delay to ensure DOM is ready
  setTimeout(() => {
    initNavbar();
    updateNavbarVisibility(window.location.pathname);
  }, 100);

  renderRoute(window.location.pathname);

  // Handle browser navigation (back/forward buttons)
  window.addEventListener('popstate', () => {
    renderRoute();
    setTimeout(() => {
      window.updateActiveNav?.();
      updateNavbarVisibility(window.location.pathname);
    }, 100);
  });
});

function navigateToProfile(username: string) {
  if (!username || username === 'Unknown') return;

  const url = `/profile?user=${username}`;
  history.pushState({ path: url }, '', url);
  window.renderRoute?.('/profile');

  setTimeout(() => {
    window.updateActiveNav?.();
  }, 100);
}

window.navigateToProfile = navigateToProfile;
