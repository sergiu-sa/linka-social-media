/**
 * @file services/api/client.ts
 * @description HTTP client for the Noroff API v2. Owns auth header
 *              attachment, JSON body handling, and error normalisation.
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

/** Read the access token from any key shape the app might have written. */
function resolveAccessToken(): string | undefined {
  const fromHelper = getLocalItem('accessToken') as string | null;
  const rawToken = localStorage.getItem('token');
  let fromAuthObj: string | undefined;
  try {
    fromAuthObj = JSON.parse(localStorage.getItem('auth') || 'null')
      ?.accessToken;
  } catch {
    /* ignore — malformed JSON is the same as no token here */
  }
  return fromHelper || rawToken || fromAuthObj || undefined;
}

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

/* -------------------------------------- HTTP verb helpers -------------------------------------- */

export const get = <T = unknown>(endpoint: Endpoint): Promise<T> =>
  apiClient(endpoint);

export const post = (endpoint: Endpoint, body: object) =>
  apiClient(endpoint, { method: 'POST', body });

export const put = (endpoint: Endpoint, body: object) =>
  apiClient(endpoint, { method: 'PUT', body });

export const del = (endpoint: Endpoint) =>
  apiClient(endpoint, { method: 'DELETE' });

/* -------------------------------------- Auth (login / register / api-key) -------------------------------------- */

/* `authPost` and friends bypass the main `apiClient` because /auth/* must
   not send the `X-Noroff-API-Key` header — that header is what the auth
   endpoints *issue*, so attaching it here causes the API to 401. */
async function authPost<T>(path: string, data: object): Promise<T> {
  const response = await fetch(`https://v2.api.noroff.dev${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      json?.errors?.[0]?.message || `HTTP Error: ${response.status}`;
    throw new ApiError(message, response.status);
  }
  return json as T;
}

export function registerUser(
  data: RegisterData
): Promise<ApiResponse<RegisterResponse>> {
  return authPost<ApiResponse<RegisterResponse>>('/auth/register', data);
}

export function loginUser(
  data: LoginCredentials
): Promise<ApiResponse<LoginResponse>> {
  return authPost<ApiResponse<LoginResponse>>('/auth/login', data);
}

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
