import "server-only";

import type { NextResponse } from "next/server";

import { API_URL } from "./config";
import type { AuthResponse, Role } from "./types";

/**
 * The browser never sees Spring's tokens: the access token and refresh token live in httpOnly cookies set by
 * Next.js route handlers. `orb_role` is readable so the proxy can route people to the right area; it grants
 * nothing — the API checks every request.
 */
export const ACCESS_COOKIE = "orb_at";
export const REFRESH_COOKIE = "orb_rt";
export const ROLE_COOKIE = "orb_role";
/** "0" when the person unticked "Keep me signed in"; refreshes keep the same behaviour. */
export const REMEMBER_COOKIE = "orb_remember";

const secure = process.env.NODE_ENV === "production";
const THIRTY_DAYS = 60 * 60 * 24 * 30;

/** `remember: false` makes the refresh and role cookies session cookies (gone when the browser closes). */
export function setSession(res: NextResponse, auth: AuthResponse, remember = true) {
  res.cookies.set(ACCESS_COOKIE, auth.accessToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: Math.max(60, auth.expiresIn - 30),
  });
  res.cookies.set(REFRESH_COOKIE, auth.refreshToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/api",
    maxAge: remember ? THIRTY_DAYS : undefined,
  });
  res.cookies.set(ROLE_COOKIE, auth.role, { secure, sameSite: "lax", path: "/", maxAge: remember ? THIRTY_DAYS : undefined });
  res.cookies.set(REMEMBER_COOKIE, remember ? "1" : "0", { httpOnly: true, secure, sameSite: "lax", path: "/api", maxAge: remember ? THIRTY_DAYS : undefined });
}

export function clearSession(res: NextResponse) {
  res.cookies.set(ACCESS_COOKIE, "", { path: "/", maxAge: 0 });
  res.cookies.set(REFRESH_COOKIE, "", { path: "/api", maxAge: 0 });
  res.cookies.set(ROLE_COOKIE, "", { path: "/", maxAge: 0 });
  res.cookies.set(REMEMBER_COOKIE, "", { path: "/api", maxAge: 0 });
}

/** Exchanges a refresh token for a new pair. Returns null when the session is over. */
export async function refresh(refreshToken: string): Promise<AuthResponse | null> {
  const res = await fetch(`${API_URL}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
    cache: "no-store",
  });
  return res.ok ? ((await res.json()) as AuthResponse) : null;
}

export function homeFor(role: Role | string | undefined): string {
  if (role === "ADMIN") return "/admin";
  if (role === "INSTRUCTOR") return "/teach";
  return "/learn";
}
