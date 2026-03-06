/**
 * VALUGUARD — AUTH MIDDLEWARE
 *
 * Protects /dashboard and /vault routes.
 * In dev mode without Supabase keys, access is allowed (bypass).
 */

import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PATHS = ["/dashboard", "/vault"];

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Only protect specific paths
    const isProtected = PROTECTED_PATHS.some(
        (p) => pathname.startsWith(p) || pathname === p
    );
    if (!isProtected) return NextResponse.next();

    // Dev bypass: if Supabase is not configured, allow access
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
        return NextResponse.next();
    }

    // Check for Supabase auth cookie
    const authCookies = request.cookies.getAll().filter(
        (c) =>
            c.name.startsWith("sb-") &&
            (c.name.endsWith("-auth-token") || c.name.endsWith("-auth-token.0"))
    );

    if (authCookies.length === 0) {
        // No auth session — redirect to landing
        const loginUrl = new URL("/", request.url);
        loginUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/dashboard/:path*", "/vault/:path*"],
};
