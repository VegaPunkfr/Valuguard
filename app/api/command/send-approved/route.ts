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

export async function POST(req: NextRequest) {
  const key = req.headers.get('x-command-key') || '';
  const secret = process.env.CRON_SECRET || process.env.COMMAND_KEY || '';
  // If a secret is configured, require it. If not, allow cockpit access.
  if (secret && key !== secret) {
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
        from: `${fromName || 'Jean-Étienne'} <audits@ghost-tax.com>`,
        to: [to],
        reply_to: 'audits@ghost-tax.com',
        subject,
        html: htmlBody || `<pre style="font-family: sans-serif; white-space: pre-wrap;">${textBody}</pre>`,
        text: textBody || undefined,
        tags: [
          { name: 'type', value: 'outreach' },
          { name: 'domain', value: domain || 'unknown' },
          { name: 'prospect', value: prospectId || 'unknown' },
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
