/**
 * GHOST TAX — COMMAND CENTER MIDDLEWARE
 *
 * Simple, robust. No heavy WAF — Vercel Edge doesn't need it.
 * Only job: protect /command/* with COMMAND_SECRET.
 */

import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Static/API passthrough ──
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  ) {
    return NextResponse.next();
  }

  // ── Command center auth ──
  if (pathname.startsWith("/command")) {
    const secret = process.env.COMMAND_SECRET;
    if (!secret) {
      return new NextResponse("Command center not configured", { status: 503 });
    }

    const urlKey = request.nextUrl.searchParams.get("key");
    const cookieKey = request.cookies.get("gt-command-key")?.value;

    if (urlKey === secret || cookieKey === secret) {
      const response = NextResponse.next();
      // Set cookie so key doesn't need to stay in URL
      if (urlKey === secret && cookieKey !== secret) {
        response.cookies.set("gt-command-key", secret, {
          httpOnly: true,
          secure: true,
          sameSite: "strict",
          maxAge: 60 * 60 * 24 * 30, // 30 days
          path: "/command",
        });
      }
      return response;
    }

    return new NextResponse("Unauthorized", { status: 401 });
  }

  // ── Everything else: pass through ──
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
