import type { Problem } from "./types";

/** An API error with the server's problem+json details. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors: Record<string, string>;

  constructor(problem: Problem) {
    super(problem.detail || "Something went wrong");
    this.status = problem.status;
    this.code = problem.code;
    this.fieldErrors = problem.errors ?? {};
  }
}

async function parse<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;
  const type = res.headers.get("content-type") ?? "";
  const data = type.includes("json") ? await res.json() : await res.text();
  if (!res.ok) {
    const problem: Problem =
      typeof data === "object" && data
        ? { status: res.status, code: data.code ?? "error", detail: data.detail ?? data.message ?? "Request failed", errors: data.errors }
        : { status: res.status, code: "error", detail: String(data || "Request failed") };
    if (res.status === 401 && typeof window !== "undefined" && !location.pathname.startsWith("/login")) {
      // A full page load (not router.push) so cached client state from the expired session is dropped.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      location.href = `/login?next=${encodeURIComponent(location.pathname + location.search)}`;
    }
    throw new ApiError(problem);
  }
  return data as T;
}

function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  return fetch(`/api/backend${path}`, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: "same-origin",
  }).then(parse<T>);
}

/** Browser API client. Paths are the Spring paths without the leading /api (e.g. "/me/enrollments"). */
export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body ?? {}),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body ?? {}),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body ?? {}),
  delete: <T = void>(path: string) => request<T>("DELETE", path),
};

/** Session actions (login, signup, logout…) handled by Next.js route handlers that manage the cookies. */
export function session<T>(action: string, body?: unknown): Promise<T> {
  return fetch(`/api/session/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  }).then(parse<T>);
}
