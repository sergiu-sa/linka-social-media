/**
 * @file client.ts
 * @description API client for handling requests to the Noroff API (v2).
 * Handles authentication, API keys, JSON parsing, and errors.
 */

import { API_URL } from '../../constant';
import { getLocalItem } from '../../utils/storage';
import { ApiError } from '../error/error';
import type {
  LoginCredentials,
  RegisterData,
  ApiResponse,
  LoginResponse,
  RegisterResponse,
} from '../../types/index';

interface ApiClientOptions extends Omit<RequestInit, 'body'> {
  body?: BodyInit | object | null;
}

type Endpoint = string;

const API_KEY_HEADER = 'X-Noroff-API-Key';

/** Resolve access token from any key shape used in the app */
function resolveAccessToken(): string | undefined {
  // Preferred
  const fromHelper = getLocalItem('accessToken') as string | null;

  // Fallbacks some older modules might use
  const rawToken = localStorage.getItem('token');
  let fromAuthObj: string | undefined;
  try {
    const auth = JSON.parse(localStorage.getItem('auth') || 'null');
    fromAuthObj = auth?.accessToken;
  } catch {
    // ignore JSON errors
  }

  return fromHelper || rawToken || fromAuthObj || undefined;
}

/**
 * Generic API client for making HTTP requests.
 * Automatically attaches headers for JSON, API key, and access token.
 */
async function apiClient(endpoint: string, options: ApiClientOptions = {}) {
  const { body, ...customOptions } = options;

  // Start with minimal defaults, let callers override via customOptions.headers
  const baseHeaders: Record<string, string> = {
    Accept: 'application/json',
  };

  const config: RequestInit = {
    method: body ? 'POST' : 'GET',
    ...customOptions,
    headers: {
      ...baseHeaders,
      ...(customOptions.headers as Record<string, string>),
    },
  };

  // JSON / FormData body handling
  if (body) {
    if (body instanceof FormData) {
      config.body = body; // browser sets correct content-type
    } else {
      config.body = JSON.stringify(body);
      (config.headers as Record<string, string>)['Content-Type'] =
        'application/json';
    }
  }

  // Attach auth headers
  const apiKey = getLocalItem('apiKey') as string | null;
  const accessToken = resolveAccessToken();

  if (apiKey) {
    (config.headers as Record<string, string>)[API_KEY_HEADER] = apiKey;
  }
  if (accessToken) {
    (config.headers as Record<string, string>)['Authorization'] =
      `Bearer ${accessToken}`;
  }

  try {
    const response = await fetch(API_URL + endpoint, config);

    const contentType = response.headers.get('content-type');

    // Handle empty/204 responses safely
    if (
      response.status === 204 ||
      !contentType ||
      !contentType.includes('application/json')
    ) {
      if (!response.ok) {
        throw new ApiError(`HTTP Error: ${response.status}`, response.status);
      }
      return null as any;
    }

    const responseData = await response.json();

    if (!response.ok) {
      const message =
        responseData?.errors?.[0]?.message || `HTTP Error: ${response.status}`;
      throw new ApiError(message, response.status);
    }

    return responseData;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new Error('A network or client error occurred.');
  }
}

/* -------------------------------------------------------------------------- */
/*                               Helper Methods                               */
/* -------------------------------------------------------------------------- */

export const get = <T = unknown>(endpoint: Endpoint): Promise<T> =>
  apiClient(endpoint);

export const post = (endpoint: Endpoint, body: object) =>
  apiClient(endpoint, { method: 'POST', body });

export const put = (endpoint: Endpoint, body: object) =>
  apiClient(endpoint, { method: 'PUT', body });

export const del = (endpoint: Endpoint) =>
  apiClient(endpoint, { method: 'DELETE' });

/* -------------------------------------------------------------------------- */
/*                          Auth Helper Functions                             */
/* -------------------------------------------------------------------------- */

export async function registerUser(
  data: RegisterData
): Promise<ApiResponse<RegisterResponse>> {
  const response = await fetch('https://v2.api.noroff.dev/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function loginUser(
  data: LoginCredentials
): Promise<ApiResponse<LoginResponse>> {
  const response = await fetch('https://v2.api.noroff.dev/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
}

/**
 * Fetches a new API key using the Noroff Auth API.
 */
export async function fetchApiKey(
  accessToken: string
): Promise<string | undefined> {
  const response = await fetch(
    'https://v2.api.noroff.dev/auth/create-api-key',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch API key: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();
  return data?.data?.key;
}
