/**
 * GHOST TAX — EMAIL VERIFICATION API (COMMAND-ONLY)
 *
 * POST /api/command/verify-email
 * Verifies an email candidate via MX lookup + catch-all detection.
 * Protected by COMMAND_SECRET.
 *
 * Returns: { valid, hasMx, isCatchAll, quality, confidence }
 */

import { NextResponse, type NextRequest } from 'next/server';
import { promises as dns } from 'dns';

export const runtime = 'nodejs';

// ── Known free/disposable providers ─────────────────────────

const FREE_PROVIDERS = new Set([
  'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'aol.com',
  'icloud.com', 'protonmail.com', 'proton.me', 'gmx.com', 'gmx.de',
  'web.de', 'mail.com', 'zoho.com', 'yandex.com', 'live.com',
]);

const DISPOSABLE_PROVIDERS = new Set([
  'guerrillamail.com', 'mailinator.com', 'tempmail.com', 'yopmail.com',
  'throwaway.email', 'sharklasers.com', 'trashmail.com',
]);

// ── Catch-all detection heuristic ───────────────────────────
// Some domains accept ANY email (catch-all). We can't know for sure
// without SMTP RCPT TO, but we can flag common patterns.

const KNOWN_CATCH_ALL_INDICATORS = [
  // Large companies often have catch-all
  // We flag domains with generic MX providers as potentially catch-all
];

export async function POST(request: NextRequest) {
  // Auth
  const secret = process.env.COMMAND_SECRET;
  if (!secret) return NextResponse.json({ error: 'Not configured' }, { status: 503 });

  const cookieKey = request.cookies.get('gt-command-key')?.value;
  const queryKey = request.nextUrl.searchParams.get('key');
  if (cookieKey !== secret && queryKey !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { email: string; domain?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.email || !body.email.includes('@')) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }

  const email = body.email.toLowerCase().trim();
  const domain = email.split('@')[1];

  // Check free/disposable
  if (FREE_PROVIDERS.has(domain)) {
    return NextResponse.json({
      email, valid: true, hasMx: true, isCatchAll: false,
      quality: 'free', confidence: 40,
      reason: 'Free email provider — not corporate',
    });
  }

  if (DISPOSABLE_PROVIDERS.has(domain)) {
    return NextResponse.json({
      email, valid: false, hasMx: false, isCatchAll: false,
      quality: 'disposable', confidence: 0,
      reason: 'Disposable email provider',
    });
  }

  // MX lookup
  let hasMx = false;
  let mxRecords: string[] = [];
  try {
    const records = await dns.resolveMx(domain);
    hasMx = records.length > 0;
    mxRecords = records.map(r => r.exchange.toLowerCase());
  } catch {
    // No MX records
  }

  if (!hasMx) {
    return NextResponse.json({
      email, valid: false, hasMx: false, isCatchAll: false,
      quality: 'no_mx', confidence: 5,
      reason: 'Domain has no MX records — email delivery unlikely',
    });
  }

  // Catch-all heuristic: Google Workspace and Microsoft 365 are NOT catch-all by default
  // Generic MX providers or custom MX may be catch-all
  const isGoogleWorkspace = mxRecords.some(mx => mx.includes('google') || mx.includes('aspmx'));
  const isMicrosoft365 = mxRecords.some(mx => mx.includes('outlook') || mx.includes('protection.outlook'));
  const isKnownProvider = isGoogleWorkspace || isMicrosoft365;

  // If it's a known provider, less likely to be catch-all
  const isCatchAll = !isKnownProvider; // conservative: flag unknown MX as potentially catch-all

  const confidence = isKnownProvider ? 75 : 50; // Higher confidence for Google/M365 domains

  return NextResponse.json({
    email,
    valid: true,
    hasMx: true,
    isCatchAll,
    quality: 'corporate',
    confidence,
    mxProvider: isGoogleWorkspace ? 'google_workspace' : isMicrosoft365 ? 'microsoft_365' : 'other',
    reason: isCatchAll
      ? 'Domain has MX but may be catch-all — email existence uncertain'
      : `Domain uses ${isGoogleWorkspace ? 'Google Workspace' : 'Microsoft 365'} — likely valid`,
  });
}
