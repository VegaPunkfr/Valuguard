/**
 * GHOST TAX — EDGE MIDDLEWARE (WAF + AUTH + SURFACE ISOLATION)
 *
 * Platform Architecture — 3 Strict Surfaces:
 * ─────────────────────────────────────────────
 * PUBLIC  (marketing) — No auth. Attracts, converts, captures signals.
 *   Routes: /, /pricing, /faq, /about, /ghost-tax, /intel, /estimator, etc.
 *
 * CLIENT  (app)       — Supabase session. Post-conversion experience.
 *   Routes: /dashboard, /vault, /report/*, /audit/*
 *
 * FOUNDER (command)   — COMMAND_SECRET only. Private cockpit.
 *   Routes: /command/*, /admin/*
 *   NEVER accessible to clients. NEVER exposed publicly.
 *
 * Layers (executed in order at the Edge):
 * 1. EDGE WAF — Block SQL injection, XSS, malicious bots
 * 2. Security Headers — CSP, HSTS, X-Frame-Options
 * 3. Surface Router — Route to correct auth layer
 * 4a. Client Auth — Supabase session check
 * 4b. Founder Auth — COMMAND_SECRET check (cookie or query param)
 */

import { NextResponse, type NextRequest } from "next/server";

// ═══════════════════════════════════════════════════
// 1. EDGE WAF — Pattern-based threat detection
// ═══════════════════════════════════════════════════

/** SQL injection signatures (case-insensitive match) */
const SQL_INJECTION_PATTERNS = [
  /(\b(union|select|insert|update|delete|drop|alter|create|exec|execute)\b.*\b(from|into|table|database|where|set)\b)/i,
  /(\b(or|and)\b\s+\d+\s*=\s*\d+)/i,        // OR 1=1, AND 1=1
  /(--|#|\/\*|\*\/)/,                          // SQL comments
  /(\bwaitfor\b\s+\bdelay\b)/i,               // Time-based blind SQLi
  /(\bsleep\s*\()/i,                           // MySQL sleep()
  /(\bbenchmark\s*\()/i,                       // MySQL benchmark()
  /(;\s*(drop|alter|create|truncate)\b)/i,     // Chained DDL
  /(\bchar\s*\(\d+\))/i,                       // char() encoding bypass
  /(\bhaving\b\s+\d)/i,                        // HAVING injection
];

/** XSS attack signatures */
const XSS_PATTERNS = [
  /<script[\s>]/i,
  /javascript\s*:/i,
  /on(error|load|click|mouseover|focus|blur|submit|change|input)\s*=/i,
  /<iframe[\s>]/i,
  /<object[\s>]/i,
  /<embed[\s>]/i,
  /<svg[\s>].*?on\w+\s*=/i,
  /\beval\s*\(/i,
  /\bdocument\s*\.\s*(cookie|location|write)/i,
  /\bwindow\s*\.\s*(location|open)/i,
];

/** Path traversal signatures */
const PATH_TRAVERSAL_PATTERNS = [
  /\.\.\//,                                    // ../
  /\.\.%2[fF]/,                                // ..%2f (URL-encoded)
  /%2[eE]%2[eE]%2[fF]/,                       // double-encoded
  /\/etc\/(passwd|shadow|hosts)/i,
  /\/proc\/self/i,
];

/** Known malicious bot User-Agents */
const MALICIOUS_BOT_UA = [
  /sqlmap/i,
  /nikto/i,
  /nmap/i,
  /masscan/i,
  /dirbuster/i,
  /gobuster/i,
  /wfuzz/i,
  /hydra/i,
  /medusa/i,
  /burpsuite/i,
  /nessus/i,
  /openvas/i,
  /acunetix/i,
  /w3af/i,
  /zap\/\d/i,                                  // OWASP ZAP
  /commix/i,
  /havij/i,
  /jbrofuzz/i,
  /arachni/i,
  /skipfish/i,
  /nuclei/i,
  /ffuf/i,
  /curl\/.*libcurl/i,                          // automated curl bots (not browser)
];

/**
 * Scan a string for WAF-blocked patterns.
 * Returns the threat category or null if clean.
 */
function detectThreat(input: string): string | null {
  for (const pattern of SQL_INJECTION_PATTERNS) {
    if (pattern.test(input)) return "sql_injection";
  }
  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(input)) return "xss";
  }
  for (const pattern of PATH_TRAVERSAL_PATTERNS) {
    if (pattern.test(input)) return "path_traversal";
  }
  return null;
}

/**
 * Inspect request for threats. Checks:
 * - URL path + query string
 * - User-Agent header
 * - Referer header
 *
 * Body inspection is NOT possible at the Edge middleware level
 * (body is a stream, can only be read once). Body validation
 * happens in individual API route handlers.
 */
function runWAF(request: NextRequest): { blocked: boolean; reason?: string } {
  const url = request.nextUrl;

  // 1. Check User-Agent against known attack tools
  const ua = request.headers.get("user-agent") || "";
  for (const pattern of MALICIOUS_BOT_UA) {
    if (pattern.test(ua)) {
      return { blocked: true, reason: `bot:${ua.slice(0, 40)}` };
    }
  }

  // 2. Check URL path for traversal/injection
  const fullPath = decodeURIComponent(url.pathname) + (url.search || "");
  const pathThreat = detectThreat(fullPath);
  if (pathThreat) {
    return { blocked: true, reason: `url:${pathThreat}` };
  }

  // 3. Check query parameters individually
  for (const [key, value] of url.searchParams) {
    const paramThreat = detectThreat(key) || detectThreat(value);
    if (paramThreat) {
      return { blocked: true, reason: `param:${paramThreat}:${key}` };
    }
  }

  // 4. Check Referer header (reflected XSS vector)
  const referer = request.headers.get("referer") || "";
  if (referer) {
    const refThreat = detectThreat(referer);
    if (refThreat) {
      return { blocked: true, reason: `referer:${refThreat}` };
    }
  }

  return { blocked: false };
}


// ═══════════════════════════════════════════════════
// 2. SECURITY HEADERS
// ═══════════════════════════════════════════════════

function applySecurityHeaders(response: NextResponse): NextResponse {
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://*.posthog.com https://va.vercel-scripts.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.stripe.com https://*.supabase.co",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://*.posthog.com https://*.ingest.us.i.posthog.com https://va.vercel-scripts.com",
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://checkout.stripe.com",
  ].join("; ");

  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");

  return response;
}


// ═══════════════════════════════════════════════════
// 3. AUTH GUARD
// ═══════════════════════════════════════════════════

const PROTECTED_PREFIXES = ["/dashboard", "/vault", "/admin", "/report", "/command"];

const PUBLIC_PREFIXES = [
  "/api/",
  "/_next/",
  "/favicon",
  "/sitemap",
  "/robots",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── LAYER 1: EDGE WAF ──
  // Run threat detection BEFORE any routing logic.
  // Blocks malicious requests at the edge without touching Node.js runtime.
  const waf = runWAF(request);
  if (waf.blocked) {
    // Return 403 with minimal info (don't leak WAF internals to attacker)
    return new NextResponse("Forbidden", {
      status: 403,
      headers: {
        "Content-Type": "text/plain",
        "X-Blocked-By": "ghost-tax-waf",
        // Log reason server-side only (Vercel function logs)
      },
    });
  }

  // ── LAYER 2: Public/static passthrough ──
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return applySecurityHeaders(NextResponse.next());
  }

  // ── LAYER 3: Non-protected routes ──
  const isProtected = PROTECTED_PREFIXES.some((p) =>
    pathname === p || pathname.startsWith(p + "/")
  );
  if (!isProtected) {
    return applySecurityHeaders(NextResponse.next());
  }

  // ── LAYER 4: Auth check (Supabase) ──
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return new NextResponse(
      "Service temporarily unavailable. Authentication system is not configured.",
      { status: 503, headers: { "Retry-After": "300" } }
    );
  }

  const authCookies = request.cookies.getAll().filter(
    (c) =>
      c.name.startsWith("sb-") &&
      (c.name.endsWith("-auth-token") ||
        c.name.endsWith("-auth-token.0") ||
        c.name.endsWith("-auth-token.1"))
  );

  const hasValidCookie = authCookies.some(
    (c) => c.value && c.value.trim().length > 0
  );

  // ── LAYER 4b: Command center secret bypass ──
  // For solofounder access without Supabase session
  if (pathname.startsWith("/command")) {
    const commandSecret = process.env.COMMAND_SECRET;
    const urlKey = request.nextUrl.searchParams.get("key");
    const cookieKey = request.cookies.get("gt-command-key")?.value;

    if (commandSecret && (urlKey === commandSecret || cookieKey === commandSecret)) {
      const response = applySecurityHeaders(NextResponse.next());
      // Set cookie so key doesn't need to stay in URL
      if (urlKey === commandSecret && !cookieKey) {
        response.cookies.set("gt-command-key", commandSecret, {
          httpOnly: true,
          secure: true,
          sameSite: "strict",
          maxAge: 60 * 60 * 24 * 30, // 30 days
          path: "/command",
        });
      }
      return response;
    }
  }

  if (!hasValidCookie) {
    const loginUrl = new URL("/intel", request.url);
    loginUrl.searchParams.set("auth", "required");
    return NextResponse.redirect(loginUrl);
  }

  return applySecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
