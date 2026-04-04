/**
 * GHOST TAX — AUTO-SENDER (via Resend)
 *
 * Sends approved/auto-send outreach emails through Resend API.
 * Integrates with the response feedback loop (hot-queue.ts)
 * for tracking and performance optimization.
 *
 * Non-interactive: designed for cron/API-triggered sends.
 */

const SEND_LOG_KEY = 'gt-send-log-v1';

export interface SendRecord {
  messageId: string;
  to: string;
  domain: string;
  prospectId: string;
  subject: string;
  sentAt: string;
  status: 'sent' | 'failed';
  error?: string;
}

function loadSendLog(): SendRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(SEND_LOG_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

function saveSendLog(records: SendRecord[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SEND_LOG_KEY, JSON.stringify(records));
}

export function getSendLog(): SendRecord[] {
  return loadSendLog();
}

export async function sendOutreachEmail(params: {
  to: string;
  subject: string;
  body: string;
  fromName?: string;
  replyTo?: string;
  domain: string;
  prospectId: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const {
    to,
    subject,
    body,
    fromName = 'Jean-Étienne',
    replyTo = 'audits@ghost-tax.com',
    domain,
    prospectId,
  } = params;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { success: false, error: 'RESEND_API_KEY not configured' };
  }

  // Build HTML body with tracking pixel (Resend handles open tracking natively,
  // but we add a ghost-tax pixel for our own analytics)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ghost-tax.com';
  const trackingPixel = `<img src="${siteUrl}/api/track/open?d=${encodeURIComponent(domain)}&p=${encodeURIComponent(prospectId)}" width="1" height="1" style="display:none" alt="" />`;

  const htmlBody = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#FFFFFF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<div style="max-width:600px;margin:0 auto;padding:24px 20px">
${body.split('\n').map(line => `<p style="font-size:14px;color:#1e293b;line-height:1.7;margin:0 0 12px 0">${line}</p>`).join('\n')}
</div>
${trackingPixel}
</body></html>`;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${fromName} <audits@ghost-tax.com>`,
        to: [to],
        reply_to: replyTo,
        subject,
        html: htmlBody,
        tags: [
          { name: 'domain', value: domain },
          { name: 'prospect_id', value: prospectId },
          { name: 'type', value: 'outreach' },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      const errorMsg = errorData.message || `Resend API error: ${response.status}`;

      // Log failure
      const log = loadSendLog();
      log.push({
        messageId: '',
        to,
        domain,
        prospectId,
        subject,
        sentAt: new Date().toISOString(),
        status: 'failed',
        error: errorMsg,
      });
      saveSendLog(log);

      return { success: false, error: errorMsg };
    }

    const data = await response.json();
    const messageId = data.id || '';

    // Log success
    const log = loadSendLog();
    log.push({
      messageId,
      to,
      domain,
      prospectId,
      subject,
      sentAt: new Date().toISOString(),
      status: 'sent',
    });
    saveSendLog(log);

    return { success: true, messageId };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Network error sending email';

    // Log failure
    const log = loadSendLog();
    log.push({
      messageId: '',
      to,
      domain,
      prospectId,
      subject,
      sentAt: new Date().toISOString(),
      status: 'failed',
      error: errorMsg,
    });
    saveSendLog(log);

    return { success: false, error: errorMsg };
  }
}

/**
 * Batch send: sends multiple emails with a small delay between each
 * to avoid rate limits. Returns results for each send.
 */
export async function sendOutreachBatch(
  emails: Array<{
    to: string;
    subject: string;
    body: string;
    domain: string;
    prospectId: string;
  }>,
  delayMs = 500,
): Promise<Array<{ domain: string; success: boolean; messageId?: string; error?: string }>> {
  const results: Array<{ domain: string; success: boolean; messageId?: string; error?: string }> = [];

  for (const email of emails) {
    const result = await sendOutreachEmail(email);
    results.push({ domain: email.domain, ...result });

    // Rate-limit pause between sends
    if (delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return results;
}
