/**
 * GHOST TAX — OUTBOUND ORCHESTRATOR CRON
 *
 * Runs every 30 minutes (configured in vercel.json).
 * Processes the Sprint queue: for each READY account in an active market
 * whose local time is within the send window, sends the email.
 *
 * GET /api/cron/outbound-orchestrator
 */

import { NextRequest, NextResponse } from 'next/server';
import { sanitizeEmailText, sanitizeSubject, hasCorruptChars } from '@/lib/email/sanitize';

export const runtime = 'nodejs';
export const maxDuration = 30;

// ── Country Policies ──────────────────────────────────────
interface CountryPolicy {
  autoSendEnabled: boolean;
  timezone: string; // IANA timezone
  utcOffset: number; // hours, approximate for scheduling
  primaryWindow: [number, number]; // local hours [start, end]
  secondaryWindow: [number, number];
  activeDays: number[]; // 0=Sun, 1=Mon, ... 6=Sat
  dailyCap: number;
  minScore: number;
  minSignalConfidence: string;
  lang: string;
  priceLabel: string;
}

const POLICIES: Record<string, CountryPolicy> = {
  UK: {
    autoSendEnabled: true,
    timezone: 'Europe/London',
    utcOffset: 1, // BST
    primaryWindow: [9, 11],
    secondaryWindow: [14, 16],
    activeDays: [2, 3, 4], // Tue, Wed, Thu
    dailyCap: 5,
    minScore: 65,
    minSignalConfidence: 'MEDIUM',
    lang: 'en',
    priceLabel: '£490',
  },
  US: {
    autoSendEnabled: true,
    timezone: 'America/New_York',
    utcOffset: -4, // EDT
    primaryWindow: [9, 11],
    secondaryWindow: [14, 16],
    activeDays: [2, 3, 4],
    dailyCap: 5,
    minScore: 65,
    minSignalConfidence: 'MEDIUM',
    lang: 'en',
    priceLabel: '$490',
  },
  IE: {
    autoSendEnabled: true,
    timezone: 'Europe/Dublin',
    utcOffset: 1, // IST
    primaryWindow: [9, 11],
    secondaryWindow: [14, 16],
    activeDays: [2, 3, 4],
    dailyCap: 3,
    minScore: 65,
    minSignalConfidence: 'MEDIUM',
    lang: 'en',
    priceLabel: '€490',
  },
  DE: {
    autoSendEnabled: false, // NEVER auto-send to Germany
    timezone: 'Europe/Berlin',
    utcOffset: 2, // CEST
    primaryWindow: [9, 11],
    secondaryWindow: [14, 16],
    activeDays: [2, 3, 4],
    dailyCap: 0,
    minScore: 70,
    minSignalConfidence: 'HIGH',
    lang: 'de',
    priceLabel: '590€',
  },
};

// ── Auth ──────────────────────────────────────────────────
function isAuthorized(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || process.env.COMMAND_SECRET || '';
  if (!cronSecret) return false;
  // Vercel cron sends Authorization: Bearer <CRON_SECRET>
  if (authHeader === `Bearer ${cronSecret}`) return true;
  // Also accept x-command-key for manual triggers
  const commandKey = req.headers.get('x-command-key') || '';
  return commandKey === cronSecret;
}

// ── Time helpers ──────────────────────────────────────────
function getLocalHour(utcOffset: number): number {
  const now = new Date();
  return (now.getUTCHours() + utcOffset + 24) % 24;
}

function isInWindow(localHour: number, window: [number, number]): boolean {
  return localHour >= window[0] && localHour < window[1];
}

function isActiveDay(activeDays: number[]): boolean {
  return activeDays.includes(new Date().getUTCDay());
}

// ── Main handler ─────────────────────────────────────────
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const log: string[] = [];
  const sent: string[] = [];
  const blocked: string[] = [];
  let totalProcessed = 0;

  // Track daily sends per market (in-memory, resets per cold start — acceptable for cron)
  const dailySends: Record<string, number> = { UK: 0, US: 0, IE: 0, DE: 0 };

  const triggerSource = req.headers.get('x-command-key') ? 'manual' : 'cron';

  try {
    const { createAdminSupabase } = await import('@/lib/supabase');
    const supabase = createAdminSupabase();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
    }

    // Read bot settings
    let autonomyLevel = 0;
    try {
      const { data: levelRow } = await (supabase as any).from('bot_settings').select('value').eq('key', 'autonomy_level').single();
      if (levelRow) autonomyLevel = parseInt(String(levelRow.value), 10) || 0;
    } catch { /* default 0 */ }

    if (autonomyLevel < 2) {
      log.push(`Bot level L${autonomyLevel} — auto-send disabled. Use L2 to enable.`);
      // Still log the execution
      await (supabase as any).from('bot_execution_log').insert({
        autonomy_level: autonomyLevel, accounts_processed: 0, accounts_sent: 0, accounts_blocked: 0,
        sent_details: [], blocked_details: [], log_lines: log, trigger_source: triggerSource
      });
      return NextResponse.json({ status: 'paused', autonomy_level: autonomyLevel, log, timestamp: new Date().toISOString() });
    }

    // Load READY Sprint accounts from Supabase
    let accounts: any[] = [];
    try {
      const { data } = await (supabase as any)
        .from('sprint_accounts')
        .select('*')
        .in('status', ['READY'])
        .order('score', { ascending: false })
        .limit(20);
      if (data) accounts = data;
    } catch {
      log.push('Failed to read sprint_accounts');
    }

    // Count today's sends per market from outreach_log
    try {
      const today = new Date().toISOString().slice(0, 10);
      const { data: todaySends } = await (supabase as any)
        .from('outreach_log')
        .select('domain')
        .gte('sent_at', today + 'T00:00:00Z');
      if (todaySends) {
        // Simple count — all markets combined for now
        const alreadySent = todaySends.length;
        log.push(`Already sent today: ${alreadySent}`);
      }
    } catch { /* non-critical */ }

    if (!accounts.length) {
      log.push('No READY accounts in queue. Orchestrator idle.');
      return NextResponse.json({
        status: 'idle',
        log,
        sent: [],
        blocked: [],
        timestamp: new Date().toISOString()
      });
    }

    const commandSecret = process.env.COMMAND_SECRET || '';
    const resendKey = process.env.RESEND_API_KEY;

    for (const account of accounts) {
      totalProcessed++;
      const market = account.market || 'UK';
      const policy = POLICIES[market];

      if (!policy) {
        blocked.push(`${account.company}: unknown market ${market}`);
        log.push(`BLOCK ${account.company} — unknown market`);
        continue;
      }

      // Check policy allows auto-send
      if (!policy.autoSendEnabled) {
        blocked.push(`${account.company}: ${market} is review-only`);
        log.push(`HOLD ${account.company} — ${market} policy: review-only`);
        continue;
      }

      // Check active day
      if (!isActiveDay(policy.activeDays)) {
        log.push(`SKIP ${account.company} — not an active day for ${market}`);
        continue;
      }

      // Check time window
      const localHour = getLocalHour(policy.utcOffset);
      const inPrimary = isInWindow(localHour, policy.primaryWindow);
      const inSecondary = isInWindow(localHour, policy.secondaryWindow);
      if (!inPrimary && !inSecondary) {
        log.push(`DEFER ${account.company} — ${market} local hour ${localHour} outside windows`);
        continue;
      }

      // Check daily cap
      if (dailySends[market] >= policy.dailyCap) {
        log.push(`CAP ${account.company} — ${market} daily cap ${policy.dailyCap} reached`);
        continue;
      }

      // Check score
      if ((account.score || 0) < policy.minScore) {
        blocked.push(`${account.company}: score ${account.score} < ${policy.minScore}`);
        log.push(`BLOCK ${account.company} — score too low`);
        continue;
      }

      // Check data quality (Supabase column: data_quality)
      if (account.data_quality !== 'RICH' && account.source !== 'apollo_mcp') {
        blocked.push(`${account.company}: source ${account.source} not RICH`);
        log.push(`BLOCK ${account.company} — source not RICH/apollo_mcp`);
        continue;
      }

      // Check draft exists (Supabase columns: draft_body, draft_subject)
      if (!account.draft_body || !account.draft_subject) {
        blocked.push(`${account.company}: no draft`);
        log.push(`BLOCK ${account.company} — no draft ready`);
        continue;
      }

      // Check contact email (Supabase column: contact_email)
      if (!account.contact_email) {
        blocked.push(`${account.company}: no email`);
        log.push(`BLOCK ${account.company} — no contact email`);
        continue;
      }

      // Check for corrupted characters in draft (centralized)
      if (hasCorruptChars(account.draft_subject || '') || hasCorruptChars(account.draft_body || '')) {
        blocked.push(`${account.company}: corrupted characters in draft`);
        log.push(`BLOCK ${account.company} — draft contains U+FFFD replacement character`);
        continue;
      }

      // All checks passed — SEND
      if (!resendKey) {
        log.push(`DRY-RUN ${account.company} — RESEND_API_KEY not set`);
        continue;
      }

      try {
        // Direct Resend call (no HTTP roundtrip through middleware)
        const { renderEmailHTML, renderEmailPlaintext } = await import('@/lib/email/template');
        const cleanedSubject = sanitizeSubject(account.draft_subject || '');
        const cleanedBody = sanitizeEmailText(account.draft_body || '');
        const emailParams = {
          mode: 'external_send' as const,
          subject: cleanedSubject,
          preheaderText: cleanedBody.slice(0, 90),
          recipientName: account.contact_name?.split(' ')[0] || '',
          bodyText: cleanedBody,
          deliverableBlock: {
            title: policy.lang === 'de' ? 'Was Sie erhalten' : 'What you receive',
            items: policy.lang === 'de'
              ? ['SaaS & IT-Bestandsaufnahme', 'Einspar-Roadmap mit konkreten Beträgen', 'Executive Memo (CFO-ready)']
              : ['SaaS & IT inventory analysis', 'Savings roadmap with specific amounts', 'Executive memo (CFO-ready)'],
          },
          ctaText: policy.lang === 'de' ? '\u2192 Diagnostic starten \u2014 Ergebnis in 48h' : '\u2192 Start diagnostic \u2014 Results in 48h',
          ctaUrl: 'https://ghost-tax.com/intel',
          trustItems: policy.lang === 'de'
            ? ['21 Analysephasen', 'Zero-Knowledge-Architektur', 'SOC 2']
            : ['21 detection phases', 'Zero-knowledge architecture', 'SOC 2'],
          signature: { name: 'Ghost Tax', title: 'Financial Exposure Detection', email: 'audits@ghost-tax.com' },
          lang: (policy.lang || 'en') as 'de' | 'en' | 'fr' | 'nl',
        };
        const html = renderEmailHTML(emailParams);
        const text = renderEmailPlaintext(emailParams);

        const sendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${resendKey}` },
          body: JSON.stringify({
            from: 'Ghost Tax <audits@ghost-tax.com>',
            to: [account.contact_email],
            reply_to: process.env.REPLY_TO_EMAIL || 'contact@ghost-tax.com',
            subject: cleanedSubject,
            html,
            text,
            track_opens: process.env.TRACK_OPENS !== 'false',
            track_clicks: process.env.TRACK_CLICKS !== 'false',
            tags: [
              { name: 'type', value: 'outreach' },
              { name: 'source', value: 'bot-cron' },
              { name: 'market', value: market },
            ],
          }),
        });

        if (sendRes.ok) {
          dailySends[market]++;
          sent.push(`${account.company} → ${account.contact_email} (${market}, ${localHour}:00 local)`);
          log.push(`SENT ${account.company} → ${account.contact_email} at ${market} ${localHour}:00`);

          // Update status in Supabase
          try {
            await (supabase as any)
              .from('sprint_accounts')
              .update({ status: 'SENT', last_action_at: new Date().toISOString() })
              .eq('id', account.id);
          } catch { /* non-blocking */ }
        } else {
          const errText = await sendRes.text().catch(() => '');
          blocked.push(`${account.company}: send failed ${sendRes.status}`);
          log.push(`FAIL ${account.company} — send-approved returned ${sendRes.status}: ${errText.slice(0, 100)}`);
        }
      } catch (e) {
        log.push(`ERROR ${account.company} — ${e instanceof Error ? e.message : 'unknown'}`);
      }
    }
  } catch (e) {
    log.push(`FATAL: ${e instanceof Error ? e.message : 'unknown error'}`);
  }

  // Log execution to Supabase
  try {
    const { createAdminSupabase } = await import('@/lib/supabase');
    const sb = createAdminSupabase();
    if (sb) {
      await (sb as any).from('bot_execution_log').insert({
        autonomy_level: 2,
        accounts_processed: totalProcessed,
        accounts_sent: sent.length,
        accounts_blocked: blocked.length,
        sent_details: sent,
        blocked_details: blocked,
        log_lines: log,
        trigger_source: triggerSource,
      });
      // Also persist autonomy_level changes from bot_settings
      await (sb as any).from('bot_settings').upsert({ key: 'last_run', value: JSON.stringify(new Date().toISOString()), updated_at: new Date().toISOString() });
    }
  } catch { /* non-blocking */ }

  return NextResponse.json({
    status: sent.length > 0 ? 'active' : 'idle',
    processed: totalProcessed,
    sent,
    blocked,
    log,
    timestamp: new Date().toISOString(),
  });
}
