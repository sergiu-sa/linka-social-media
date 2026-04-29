/**
 * @file types/index.ts
 * @description TypeScript types and interfaces for user profiles, authentication, and API responses.
 */

export interface UserProfile {
  name: string;
  email: string;
  bio?: string;
  avatar?: {
    url: string;
    alt: string;
  };
  banner?: {
    url: string;
    alt: string;
  };
  _count: {
    posts: number;
    followers: number;
    following: number;
  };
}

export interface FollowResponse {
  data: {
    name: string;
    followers: Array<{ name: string; email: string }>;
    following: Array<{ name: string; email: string }>;
  };
}

export interface ProfileWithFollowData extends UserProfile {
  followers?: Array<{ name: string; email: string }>;
  following?: Array<{ name: string; email: string }>;
}

// ## Authentication interfaces for login/register

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  bio?: string;
  avatar?: { url: string; alt: string };
}

// ## API Response interfaces

export interface ApiResponse<T> {
  data?: T;
  errors?: Array<{
    message: string;
    code?: string;
  }>;
}

export interface LoginResponse {
  accessToken: string;
  name: string;
  email: string;
}

export interface RegisterResponse {
  name: string;
  email: string;
  id: number;
}

/* -------------------------------------------------------------------------- */
/*                        Global window extensions                            */
/* -------------------------------------------------------------------------- */

import type { NoroffPost } from '../services/posts/posts';
import type LoadingScreen from '../pages/LoadingScreen';

declare global {
  interface Window {
    // Router / navigation
    renderRoute?: (path?: string) => void | Promise<void>;
    navigateToProfile?: (username: string) => void;
    navigateToPage?: (page: number) => void;
    updateNavbarVisibility?: (path: string) => void;
    updateActiveNav?: () => void;
    refreshNavbar?: () => void;
    updateNavbarAfterLogout?: () => void;

    // Loading screen instance attached at boot
    loadingScreen?: LoadingScreen;

    // Search bridge from navbar to feed
    searchQuery?: string | null;
    searchResults?: NoroffPost[];
    userResults?: unknown[];

    // Feed-page handlers exposed for inline onclick handlers in postCard.ts
    togglePostMenu?: (postId: number) => void;
    editPost?: (postId: number) => void;
    deletePost?: (postId: number) => void;
    toggleComments?: (postId: number) => void;
    submitComment?: (postId: number) => void;
    startReply?: (commentId: number, authorName: string) => void;
    cancelReply?: (commentId: number) => void;
    submitReply?: (postId: number, parentCommentId: number) => void;
    deleteCommentFunction?: (postId: number, commentId: number) => void;
    toggleReaction?: (postId: number, emoji: string) => void;
    selectReaction?: (postId: number, emoji: string) => void;
    viewFullPost?: (postId: number) => void;
    closeEditModal?: () => void;
    closeFullPostModal?: () => void;
    showReactionsModal?: (postId: number) => void;
    hideReactionsModal?: (postId: number) => void;

    // Generic close hooks read by the navbar's outside-click listener
    closeModal?: () => void;
    createPost?: () => void;
  }
}
