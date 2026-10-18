import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { API_URL } from "@/lib/config";
import { ACCESS_COOKIE, REFRESH_COOKIE, clearSession, homeFor, setSession } from "@/lib/session";
import type { AuthResponse } from "@/lib/types";

/** Session actions that call a Spring auth endpoint and turn its tokens into cookies. */
const ACTIONS: Record<string, { path: string; auth?: boolean }> = {
  login: { path: "/api/auth/login" },
  signup: { path: "/api/auth/signup" },
  register: { path: "/api/auth/register-organization" },
  "accept-invite": { path: "/api/auth/invites/accept" },
  switch: { path: "/api/me/switch-organization", auth: true },
};

export async function POST(request: Request, ctx: RouteContext<"/api/session/[action]">) {
  const { action } = await ctx.params;
  const store = await cookies();

  if (action === "logout") {
    const refreshToken = store.get(REFRESH_COOKIE)?.value;
    if (refreshToken) {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      }).catch(() => undefined);
    }
    const res = NextResponse.json({ ok: true });
    clearSession(res);
    return res;
  }

  const target = ACTIONS[action];
  if (!target) {
    return NextResponse.json({ status: 404, code: "not_found", detail: "Unknown action" }, { status: 404 });
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (target.auth) {
    const token = store.get(ACCESS_COOKIE)?.value;
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const { remember = true, ...payload } = (await request.json().catch(() => ({}))) as Record<string, unknown> & { remember?: boolean };

  let upstream: Response;
  try {
    upstream = await fetch(`${API_URL}${target.path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { status: 503, code: "api_unavailable", detail: "Orbitly is unreachable right now. Try again in a moment." },
      { status: 503 },
    );
  }

  if (!upstream.ok) {
    const problem = await upstream.json().catch(() => ({ status: upstream.status, code: "error", detail: "Request failed" }));
    return NextResponse.json(problem, { status: upstream.status });
  }

  const auth = (await upstream.json()) as AuthResponse;
  const res = NextResponse.json({
    user: auth.user,
    organization: auth.organization,
    role: auth.role,
    home: homeFor(auth.role),
  });
  setSession(res, auth, remember !== false);
  return res;
}
