import { Platform } from 'react-native';
import { getAuthState } from '../store/authStore';

export class ApiError extends Error {
  status: number;
  payload?: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

const defaultBaseUrl = Platform.select({
  default: '',
});

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || defaultBaseUrl;

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  token?: string;
  signal?: AbortSignal;
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token, signal } = options;
  const authToken = token ?? getAuthState().token ?? undefined;

  if (!API_BASE_URL) {
    throw new ApiError(
      'Missing EXPO_PUBLIC_API_BASE_URL. Set it in your Expo environment or configure a same-origin proxy.',
      500,
    );
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    signal,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  const payload = text ? safeJsonParse(text) : null;

  if (!response.ok) {
    const detail = extractDetail(payload);
    throw new ApiError(detail ?? `Request failed with status ${response.status}`, response.status, payload);
  }

  return payload as T;
}

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function extractDetail(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object') {
    return undefined;
  }

  const detail = (payload as { detail?: unknown }).detail;
  if (typeof detail === 'string') {
    return detail;
  }

  return undefined;
}