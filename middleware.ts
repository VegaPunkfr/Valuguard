import { NextResponse, type NextRequest } from "next/server";

// ── Rate Limiting (in-memory, per-IP) ──────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_MAX_API = 30; // 30 req/min for API routes
const RATE_LIMIT_MAX_PAGE = 60; // 60 req/min for pages
const MAX_MAP_SIZE = 10_000; // prevent unbounded growth

let evictCounter = 0;

function isRateLimited(ip: string, max: number): boolean {
  const now = Date.now();

  // Lazy eviction every 100 checks (serverless-safe, no setInterval)
  evictCounter++;
  if (evictCounter % 100 === 0 || rateLimitMap.size > MAX_MAP_SIZE) {
    for (const [key, val] of rateLimitMap) {
      if (now > val.resetAt) rateLimitMap.delete(key);
    }
  }

  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return false;
  }

  entry.count++;
  return entry.count > max;
}

// ── Malicious Bot Detection ────────────────────────────────────────
const BLOCKED_USER_AGENTS = [
  /sqlmap/i,
  /nikto/i,
  /nessus/i,
  /masscan/i,
  /nmap/i,
  /dirbuster/i,
  /gobuster/i,
  /wpscan/i,
  /hydra/i,
  /metasploit/i,
  /burpsuite/i,
  /zgrab/i,
  /nuclei/i,
  /httpx/i,
  /havij/i,
  /acunetix/i,
  /w3af/i,
  /openvas/i,
  /jaeles/i,
  /commix/i,
  /fuzz/i,
];

// ── Sensitive Paths ────────────────────────────────────────────────
const BLOCKED_PATHS = [
  /\.env/,
  /\.git/,
  /wp-admin/,
  /wp-login/,
  /wp-content/,
  /wp-includes/,
  /xmlrpc\.php/,
  /phpmyadmin/i,
  /\.php$/,
  /\.asp$/,
  /\.aspx$/,
  /\.jsp$/,
  /\.cgi$/,
  /\.sql$/,
  /\.bak$/,
  /\.old$/,
  /\.orig$/,
  /\.swp$/,
  /\.DS_Store/,
  /\/\.well-known\/(?!acme-challenge)/,
  /\/cgi-bin/,
  /\/config\//,
  /\/\.htaccess/,
  /\/\.htpasswd/,
  /\/server-status/,
  /\/server-info/,
  /\/debug/,
  /\/trace/,
  /\/elmah/,
  /\/actuator/,
  /package\.json$/,
  /tsconfig\.json$/,
  /\.map$/,
  /\/node_modules/,
];

// ── Timing-safe string comparison ──────────────────────────────────
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const userAgent = request.headers.get("user-agent") || "";

  // ── 1. Block empty user-agents (automated scanners) ───────────
  if (!userAgent || userAgent.length < 5) {
    return new NextResponse(null, { status: 403 });
  }

  // ── 2. Block malicious scanners ──────────────────────────────
  if (BLOCKED_USER_AGENTS.some((re) => re.test(userAgent))) {
    return new NextResponse(null, { status: 403 });
  }

  // ── 3. Block sensitive path probes ───────────────────────────
  if (BLOCKED_PATHS.some((re) => re.test(pathname))) {
    return new NextResponse(null, { status: 404 });
  }

  // ── 4. Block path traversal attempts ─────────────────────────
  if (pathname.includes("..") || pathname.includes("//") || /%2e%2e/i.test(pathname)) {
    return new NextResponse(null, { status: 400 });
  }

  // ── 5. Rate limiting ────────────────────────────────────────
  const isApi = pathname.startsWith("/api/");
  const limit = isApi ? RATE_LIMIT_MAX_API : RATE_LIMIT_MAX_PAGE;

  if (isRateLimited(ip, limit)) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: { "Retry-After": "60" },
      }
    );
  }

  // ── 6. Protect cron endpoints from external access ──────────
  if (pathname.startsWith("/api/cron/")) {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || !authHeader || !timingSafeEqual(authHeader, `Bearer ${cronSecret}`)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // ── 7. Protect admin endpoints ──────────────────────────────
  if (pathname.startsWith("/api/admin/")) {
    const token = request.headers.get("x-admin-token");
    const expected = process.env.ADMIN_TOKEN;

    if (!expected || !token || !timingSafeEqual(token, expected)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // ── 8. Protect command endpoints ────────────────────────────
  // Routes cockpit accessibles sans auth (appelées depuis cockpit-v3.html)
  const cockpitOpenRoutes = [
    "/api/command/auto-pipeline",
    "/api/command/generate-message",
    "/api/command/send-approved",
    "/api/command/apollo-sync",
    "/api/command/apollo-enrich",
    "/api/command/notify",
  ];
  const isCockpitRoute = cockpitOpenRoutes.some(r => pathname.startsWith(r));

  if (pathname.startsWith("/api/command/") && !isCockpitRoute) {
    const secret = process.env.COMMAND_SECRET;
    if (!secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authHeader = request.headers.get("authorization");
    const bearerToken = authHeader?.replace("Bearer ", "");
    const queryKey = request.nextUrl.searchParams.get("key");
    const cookieKey = request.cookies.get("gt-command-key")?.value;

    const hasValidBearer = bearerToken ? timingSafeEqual(bearerToken, secret) : false;
    const hasValidQuery = queryKey ? timingSafeEqual(queryKey, secret) : false;
    const hasValidCookie = cookieKey ? timingSafeEqual(cookieKey, secret) : false;

    if (!hasValidBearer && !hasValidQuery && !hasValidCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // ── 9. Protect detect endpoints ─────────────────────────────
  if (pathname.startsWith("/api/detect/")) {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || !authHeader || !timingSafeEqual(authHeader, `Bearer ${cronSecret}`)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // ── 10. Protect connectors endpoints ────────────────────────
  if (pathname.startsWith("/api/connectors/")) {
    const authHeader = request.headers.get("authorization");
    const adminSecret = process.env.CRON_SECRET || process.env.CONNECTOR_ADMIN_SECRET;

    if (!adminSecret || !authHeader || !timingSafeEqual(authHeader, `Bearer ${adminSecret}`)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // ── 11. Security headers on all responses ───────────────────
  const response = NextResponse.next();

  response.headers.set("X-DNS-Prefetch-Control", "on");
  response.headers.set("X-Download-Options", "noopen");
  response.headers.set("X-Permitted-Cross-Domain-Policies", "none");
  response.headers.set(
    "Cross-Origin-Embedder-Policy",
    pathname.startsWith("/api/") ? "unsafe-none" : "credentialless"
  );
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|llms.txt|fonts|images|.*\\.png$|.*\\.jpg$|.*\\.svg$|.*\\.ico$|.*\\.webp$|.*\\.avif$|.*\\.woff2?$).*)",
  ],
};
