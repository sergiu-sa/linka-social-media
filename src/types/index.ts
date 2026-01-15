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
