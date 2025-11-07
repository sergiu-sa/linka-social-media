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

// Make renderRoute, loadingScreen, refreshNavbar, and updateNavbarVisibility globally available
(window as any).renderRoute = renderRoute;
(window as any).loadingScreen = loadingScreen;
(window as any).refreshNavbar = refreshNavbar;
(window as any).updateNavbarVisibility = updateNavbarVisibility;

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM Content Loaded - Starting app initialization');

  try {
    // Add navbar to the page
    const navbar = NavbarPage();
    console.log('Navbar created, length:', navbar.length);
    document.body.insertAdjacentHTML('afterbegin', navbar);
  } catch (error) {
    console.error('Error creating navbar:', error);
  }

  // Initialize navbar functionality with a small delay to ensure DOM is ready
  setTimeout(() => {
    initNavbar();
    // Set initial navbar visibility based on current route
    updateNavbarVisibility(window.location.pathname);
  }, 100);

  // Handle initial route - ensure we get the current path
  const currentPath = window.location.pathname;
  console.log('About to call renderRoute with path:', currentPath);
  renderRoute(currentPath);
  console.log('renderRoute called');

  // Handle browser navigation (back/forward buttons)
  window.addEventListener('popstate', () => {
    renderRoute();
    // Update active nav state when navigating
    setTimeout(() => {
      if (typeof (window as any).updateActiveNav === 'function') {
        (window as any).updateActiveNav();
      }
      // Update navbar visibility
      updateNavbarVisibility(window.location.pathname);
    }, 100);
  });
});

function navigateToProfile(username: string) {
  if (!username || username === 'Unknown') return;

  const url = `/profile?user=${username}`;
  history.pushState({ path: url }, '', url);
  (window as any).renderRoute('/profile');

  // Update active nav state
  setTimeout(() => {
    if (typeof (window as any).updateActiveNav === 'function') {
      (window as any).updateActiveNav();
    }
  }, 100);
}

// Make it globally available
(window as any).navigateToProfile = navigateToProfile;
