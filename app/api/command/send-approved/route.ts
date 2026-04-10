/**
 * GHOST TAX — SEND APPROVED MESSAGE
 *
 * POST /api/command/send-approved
 *
 * Called when Jean-Étienne clicks "Approuver" on an email in the cockpit.
 * Sends the email via Resend and marks the prospect as contacted.
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// ── Rate limiting: 50/hour per IP, 200/day total ──
const emailRateMap = new Map<string, { count: number; reset: number }>();
let dailyTotal = 0;
let dailyReset = Date.now() + 86_400_000;

function checkEmailRateLimit(ip: string): { allowed: boolean; reason?: string } {
  const now = Date.now();
  if (now > dailyReset) { dailyTotal = 0; dailyReset = now + 86_400_000; }
  if (dailyTotal >= 200) return { allowed: false, reason: 'Daily email limit reached (200)' };
  const entry = emailRateMap.get(ip);
  if (!entry || now > entry.reset) {
    emailRateMap.set(ip, { count: 1, reset: now + 3_600_000 });
    dailyTotal++;
    return { allowed: true };
  }
  if (entry.count >= 50) return { allowed: false, reason: 'Hourly email limit reached (50/ip)' };
  entry.count++;
  dailyTotal++;
  return { allowed: true };
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rl = checkEmailRateLimit(ip);
  if (!rl.allowed) {
    return NextResponse.json({ error: rl.reason }, { status: 429, headers: { 'Retry-After': '3600' } });
  }

  const key = req.headers.get('x-command-key') || req.headers.get('authorization')?.replace('Bearer ', '') || '';
  const commandSecret = process.env.COMMAND_SECRET || '';
  const cronSecret = process.env.CRON_SECRET || '';
  // SECURITY FIX 2026-04-06: Refuse by default if no secret configured
  if (!commandSecret && !cronSecret) {
    return NextResponse.json({ error: 'COMMAND_SECRET not configured — email sending disabled' }, { status: 503 });
  }
  if (key !== commandSecret && key !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { to, subject, htmlBody, textBody, domain, prospectId, fromName } = body;

    if (!to || !subject || (!htmlBody && !textBody)) {
      return NextResponse.json({ error: 'Missing required fields: to, subject, body' }, { status: 400 });
    }

    // Send via Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: `${fromName || 'Jean-Etienne'} <audits@ghost-tax.com>`,
        to: [to],
        reply_to: 'audits@ghost-tax.com',
        subject,
        html: htmlBody || `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><pre style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; line-height: 1.6; white-space: pre-wrap; color: #1a1a1a;">${textBody}</pre></body></html>`,
        text: textBody || undefined,
        tags: [
          { name: 'type', value: 'outreach' },
          { name: 'domain', value: (domain || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_') },
          { name: 'prospect', value: (prospectId || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_') },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `Resend error: ${err.slice(0, 200)}` }, { status: 502 });
    }

    const data = await res.json();

    // Mark as sent in Supabase if available
    if (domain && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const { createAdminSupabase } = await import('@/lib/supabase');
        const supabase = createAdminSupabase();
        if (supabase) {
          await (supabase as any).from('outreach_log').insert({
            domain,
            channel: 'email',
            status: 'sent',
            message_id: data.id,
            sent_at: new Date().toISOString(),
          });
        }
      } catch { /* non-blocking */ }
    }

    return NextResponse.json({
      success: true,
      messageId: data.id,
      sentTo: to,
      sentAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
