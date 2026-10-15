import { auth } from './firebase';

/**
 * Returns authenticated headers including Bearer token if user is signed in with Firebase or local session
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  try {
    const currentUser = auth.currentUser;
    if (currentUser) {
      const idToken = await currentUser.getIdToken();
      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
        return headers;
      }
    }
  } catch (err) {
    console.warn('[ApiClient] Failed to acquire Firebase ID token:', err);
  }

  // Fallback: check stored local session token from login/register
  if (typeof window !== 'undefined') {
    const localToken =
      sessionStorage.getItem('sm_auth_token') ||
      localStorage.getItem('sm_auth_token');
    if (localToken) {
      headers['Authorization'] = `Bearer ${localToken}`;
      headers['x-auth-token'] = localToken;
    }
  }

  return headers;
}

/**
 * Robust, authenticated fetch wrapper for Summons Mitra backend API.
 * Ensures authorization header is attached, cookies are included, errors are cleanly propagated,
 * and requests have a reasonable bounded timeout (default 10s) to never hang indefinitely.
 */
export async function apiFetch<T = any>(
  url: string,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<T> {
  const authHeaders = await getAuthHeaders();
  const mergedHeaders = {
    ...authHeaders,
    ...((options.headers as Record<string, string>) || {}),
  };

  const timeoutMs = options.timeoutMs ?? 10000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  // If a caller signal was provided, link it to abort controller
  if (options.signal) {
    options.signal.addEventListener('abort', () => controller.abort());
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: mergedHeaders,
      signal: controller.signal,
    });
  } catch (fetchErr: any) {
    if (fetchErr.name === 'AbortError') {
      const timeoutError = new Error(`Network request to ${url} timed out after ${timeoutMs / 1000}s. Server may be temporarily slow.`);
      (timeoutError as any).status = 408;
      throw timeoutError;
    }
    throw fetchErr;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    let errorMsg = `Server request to ${url} failed with status ${response.status}`;
    try {
      const errData = await response.json();
      if (errData && errData.error) {
        errorMsg = errData.error;
      }
    } catch (_) {
      try {
        const text = await response.text();
        if (text) errorMsg = text;
      } catch (_) {}
    }
    const error = new Error(errorMsg);
    (error as any).status = response.status;
    throw error;
  }

  // Handle empty 204 or empty response body
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return (await response.json()) as T;
  }
  return (await response.text()) as unknown as T;
}

