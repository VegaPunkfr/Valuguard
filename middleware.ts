/**
 * GHOST TAX — AUTH MIDDLEWARE
 *
 * Protects /dashboard, /vault, and /admin routes.
 * If Supabase is not configured, protected routes return 503 (Service Unavailable).
 * No dev bypass — missing config is a hard failure on protected routes.
 */

import { NextResponse, type NextRequest } from "next/server";

/**
 * Routes that require authentication.
 * /intel is intentionally excluded — it's the free scan entry point (top of funnel).
 */
const PROTECTED_PREFIXES = ["/dashboard", "/vault", "/admin"];

/**
 * Routes that should never be blocked by middleware.
 * Static files, API routes, and Next.js internals are already excluded by the matcher config,
 * but this serves as a secondary safety net.
 */
const PUBLIC_PREFIXES = [
    "/api/",
    "/_next/",
    "/favicon",
    "/sitemap",
    "/robots",
];

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Safety net: never block public/static/API routes even if matcher misconfigures
    if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
        return NextResponse.next();
    }

    // Only enforce auth on protected paths
    const isProtected = PROTECTED_PREFIXES.some((p) =>
        pathname === p || pathname.startsWith(p + "/")
    );
    if (!isProtected) {
        return NextResponse.next();
    }

    // ── Hard gate: if Supabase is not configured, block access (503) ──
    // In production, missing env vars means the auth system is non-functional.
    // Never silently allow unauthenticated access.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
        return new NextResponse(
            "Service temporarily unavailable. Authentication system is not configured.",
            { status: 503, headers: { "Retry-After": "300" } }
        );
    }

    // ── Check for Supabase auth cookies ──
    // Supabase stores auth tokens in cookies prefixed with "sb-".
    // We check for both the base token and chunked tokens (.0, .1, etc.)
    // which Supabase uses when the token exceeds cookie size limits.
    const authCookies = request.cookies.getAll().filter(
        (c) =>
            c.name.startsWith("sb-") &&
            (c.name.endsWith("-auth-token") ||
                c.name.endsWith("-auth-token.0") ||
                c.name.endsWith("-auth-token.1"))
    );

    // Verify cookies exist AND have non-empty values
    const hasValidCookie = authCookies.some(
        (c) => c.value && c.value.trim().length > 0
    );

    if (!hasValidCookie) {
        // No valid auth session — redirect to landing with return URL
        const loginUrl = new URL("/", request.url);
        loginUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(loginUrl);
    }

    // Auth cookie present — allow request through.
    // Note: Full JWT validation happens server-side in Supabase client (createServerSupabase).
    // Middleware only performs a fast presence check at the edge.
    return NextResponse.next();
}

export const config = {
    matcher: [
        "/dashboard/:path*",
        "/vault/:path*",
        "/admin/:path*",
    ],
};
