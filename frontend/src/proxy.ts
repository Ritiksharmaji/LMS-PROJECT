import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic routing only: sends signed-out visitors to /login and people to the area their role can use. The
 * API authorizes every request, so a tampered role cookie gains nothing.
 */
const AREAS: { prefix: string; roles: string[] }[] = [
  { prefix: "/admin", roles: ["ADMIN"] },
  { prefix: "/teach", roles: ["INSTRUCTOR", "ADMIN"] },
  { prefix: "/learn", roles: ["STUDENT", "INSTRUCTOR", "ADMIN"] },
  { prefix: "/checkout", roles: ["STUDENT", "INSTRUCTOR", "ADMIN"] },
];

function home(role?: string) {
  return role === "ADMIN" ? "/admin" : role === "INSTRUCTOR" ? "/teach" : "/learn";
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const signedIn = request.cookies.has("orb_at") || request.cookies.has("orb_role");
  const role = request.cookies.get("orb_role")?.value;

  const area = AREAS.find((a) => pathname === a.prefix || pathname.startsWith(a.prefix + "/"));
  if (area) {
    if (!signedIn) {
      const login = new URL("/login", request.url);
      login.searchParams.set("next", pathname + search);
      return NextResponse.redirect(login);
    }
    if (role && !area.roles.includes(role)) {
      return NextResponse.redirect(new URL(home(role), request.url));
    }
  }

  if ((pathname === "/login" || pathname === "/signup") && signedIn && role) {
    return NextResponse.redirect(new URL(request.nextUrl.searchParams.get("next") ?? home(role), request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/teach/:path*", "/learn/:path*", "/checkout/:path*", "/login", "/signup"],
};
