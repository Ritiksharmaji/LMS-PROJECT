import { DEFAULT_API_URL } from '../config';
import type { AuthResponse, Problem } from './types';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly errors?: Record<string, string>,
  ) {
    super(message);
  }
}

type Tokens = { access: string | null; refresh: string | null };

/**
 * Thin JSON client for the Spring Boot API. Keeps the short-lived access token in memory, refreshes it once on a 401
 * (refresh tokens rotate, so concurrent 401s share one refresh) and reports rotated tokens to the session layer.
 */
class Api {
  baseUrl = DEFAULT_API_URL;
  private tokens: Tokens = { access: null, refresh: null };
  private refreshing: Promise<AuthResponse | null> | null = null;
  /** Called with the new auth response after a refresh, or null when the session ended. */
  onSession: (auth: AuthResponse | null) => void = () => {};

  setTokens(access: string | null, refresh: string | null) {
    this.tokens = { access, refresh };
  }

  get hasSession() {
    return !!this.tokens.refresh;
  }

  async refresh(): Promise<AuthResponse | null> {
    if (!this.tokens.refresh) return null;
    this.refreshing ??= (async () => {
      try {
        const res = await fetch(this.baseUrl + '/api/auth/refresh', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ refreshToken: this.tokens.refresh }),
        });
        if (!res.ok) {
          this.setTokens(null, null);
          this.onSession(null);
          return null;
        }
        const auth = (await res.json()) as AuthResponse;
        this.setTokens(auth.accessToken, auth.refreshToken);
        this.onSession(auth);
        return auth;
      } finally {
        this.refreshing = null;
      }
    })();
    return this.refreshing;
  }

  async request<T>(
    method: string,
    path: string,
    body?: unknown,
    retry = true,
  ): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (this.tokens.access)
      headers.Authorization = 'Bearer ' + this.tokens.access;
    let res: Response;
    try {
      res = await fetch(this.baseUrl + '/api' + path, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new ApiError(
        0,
        'network',
        `Can't reach the server at ${this.baseUrl}. Check your connection.`,
      );
    }
    if (res.status === 401 && retry && this.tokens.refresh) {
      if (await this.refresh())
        return this.request<T>(method, path, body, false);
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    const data = text ? JSON.parse(text) : undefined;
    if (!res.ok) {
      const p = (data ?? {}) as Partial<Problem>;
      throw new ApiError(
        res.status,
        p.code ?? 'error',
        p.detail ?? `Request failed (${res.status})`,
        p.errors,
      );
    }
    return data as T;
  }

  get = <T>(path: string) => this.request<T>('GET', path);
  post = <T>(path: string, body?: unknown) =>
    this.request<T>('POST', path, body ?? {});
  put = <T>(path: string, body?: unknown) => this.request<T>('PUT', path, body);
  patch = <T>(path: string, body?: unknown) =>
    this.request<T>('PATCH', path, body);
  del = <T>(path: string) => this.request<T>('DELETE', path);
}

export const api = new Api();

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong';
}

/** `?a=1&b=two`, skipping empty values. */
export function qs(
  params: Record<string, string | number | boolean | null | undefined>,
): string {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(
      ([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`,
    );
  return parts.length ? '?' + parts.join('&') : '';
}
