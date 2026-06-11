const envApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, '');
const fallbackApiBaseUrl =
  window.location.hostname === 'localhost' ? 'http://localhost:3000' : window.location.origin;

export const API_BASE_URL = envApiBaseUrl || fallbackApiBaseUrl;
export const WS_BASE_URL = API_BASE_URL.replace(/^http/, 'ws');

type JsonValue = Record<string, unknown> | unknown[] | null;

export async function apiRequest<TResponse>(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  const isJsonBody = init.body && !(init.body instanceof FormData);

  if (isJsonBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });

  const rawText = await response.text();
  const payload = rawText ? (JSON.parse(rawText) as JsonValue) : null;

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'message' in payload
        ? String(payload.message)
        : `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload as TResponse;
}
