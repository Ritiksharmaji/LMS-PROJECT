import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { API_URL } from "@/lib/config";
import { ACCESS_COOKIE, REFRESH_COOKIE, REMEMBER_COOKIE, clearSession, refresh, setSession } from "@/lib/session";
import type { AuthResponse } from "@/lib/types";

/**
 * Backend-for-frontend: forwards /api/backend/<path> to the Spring API's /api/<path>, attaching the session's
 * access token. When the token has expired it refreshes once, retries, and stores the new cookies.
 */
async function forward(request: Request, ctx: RouteContext<"/api/backend/[...path]">) {
  const { path } = await ctx.params;
  const url = new URL(request.url);
  const target = `${API_URL}/api/${path.map(encodeURIComponent).join("/")}${url.search}`;
  const store = await cookies();
  const body = request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer();

  const send = (token: string | undefined) => {
    const headers = new Headers();
    const type = request.headers.get("content-type");
    if (type) headers.set("content-type", type);
    headers.set("accept", request.headers.get("accept") ?? "application/json");
    if (token) headers.set("authorization", `Bearer ${token}`);
    return fetch(target, { method: request.method, headers, body, cache: "no-store", redirect: "manual" });
  };

  let renewed: AuthResponse | null = null;
  let upstream: Response;
  try {
    let token = store.get(ACCESS_COOKIE)?.value;
    const refreshToken = store.get(REFRESH_COOKIE)?.value;
    if (!token && refreshToken) {
      renewed = await refresh(refreshToken);
      token = renewed?.accessToken;
    }
    upstream = await send(token);
    if (upstream.status === 401 && refreshToken && !renewed) {
      renewed = await refresh(refreshToken);
      if (renewed) upstream = await send(renewed.accessToken);
    }
  } catch {
    return NextResponse.json(
      { status: 503, code: "api_unavailable", detail: "Orbitly is unreachable right now. Try again in a moment." },
      { status: 503 },
    );
  }

  const headers = new Headers();
  for (const name of ["content-type", "content-disposition", "cache-control"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  const res = new NextResponse(upstream.status === 204 ? null : upstream.body, { status: upstream.status, headers });
  if (renewed) setSession(res, renewed, store.get(REMEMBER_COOKIE)?.value !== "0");
  else if (upstream.status === 401) clearSession(res);
  return res;
}

export { forward as DELETE, forward as GET, forward as PATCH, forward as POST, forward as PUT };
