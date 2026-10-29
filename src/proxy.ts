import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";
import { canAccessPath } from "@/config/permissions";
import type { ApiFailure } from "@/types/api";

/**
 * Coarse route protection. This reads the role from the signed session token, so a
 * role change only takes effect here after the next sign-in. Server pages and API
 * routes re-check against the database (see `AuthService` and `withAuth`), which
 * means a revoked permission is enforced immediately.
 */
const { auth } = NextAuth(authConfig);

/** Reachable without a session. `/login` redirects signed-in users itself. */
const PUBLIC_PREFIXES = ["/login", "/api/auth", "/api/health"];

const isPublic = (pathname: string) =>
  PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

function json(body: ApiFailure, status: number) {
  return NextResponse.json(body, { status });
}

export default auth((req) => {
  const { nextUrl } = req;
  const { pathname, search } = nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  const isApi = pathname.startsWith("/api/");
  const session = req.auth;

  if (!session?.user) {
    if (isApi) return json({ success: false, error: "You must be signed in." }, 401);
    const loginUrl = new URL("/login", nextUrl);
    if (pathname !== "/") loginUrl.searchParams.set("redirect", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (!canAccessPath(session.user.role, pathname)) {
    if (isApi) return json({ success: false, error: "You do not have permission to do this." }, 403);
    return NextResponse.rewrite(new URL("/forbidden", nextUrl), { status: 403 });
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Everything except Next internals and static files.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|map|txt|webmanifest)$).*)",
  ],
};
