/**
 * GHOST TAX — SEND APPROVED MESSAGE
 *
 * POST /api/command/send-approved
 *
 * Called when Jean-Étienne clicks "Approuver" on an email in the cockpit.
 * Sends the email via Resend and marks the prospect as contacted.
 */

import { NextRequest, NextResponse } from 'next/server';
import { renderEmailHTML, renderEmailPlaintext } from '@/lib/email/template';
import { sanitizeEmailText, sanitizeSubject, validateEmailBeforeSend, hasMojibake } from '@/lib/email/sanitize';

export const runtime = 'nodejs';

// ── Language detection for template rendering ──
function detectLang(text: string): 'de' | 'en' | 'fr' | 'nl' {
  const lower = text.toLowerCase();
  const deMarkers = ['ich', 'und', 'der', 'die', 'das', 'nicht', 'für', 'sie', 'ein', 'mit'].filter(w => lower.includes(w));
  const frMarkers = ['je', 'vous', 'les', 'des', 'une', 'est', 'pas', 'que', 'pour'].filter(w => lower.includes(w));
  const nlMarkers = ['het', 'een', 'van', 'zijn', 'niet', 'voor', 'met', 'dat'].filter(w => lower.includes(w));
  if (deMarkers.length >= 3) return 'de';
  if (frMarkers.length >= 3) return 'fr';
  if (nlMarkers.length >= 3) return 'nl';
  return 'en';
}

// Note: mojibake/placeholder/spam checks now handled by @/lib/email/sanitize

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

  // V6 Phase 1 — Guard L0 : refus d'envoi si autonomie désactivée
  // P0 FIX 2026-04-17 : fail-CLOSED. Si bot_settings indisponible → on REFUSE.
  // L'ancien comportement fail-open permettait envoi en L0 si Supabase hoquette.
  // Override explicite via env AUTONOMY_BYPASS=true pour scripts admin.
  if (process.env.AUTONOMY_BYPASS !== 'true') {
    try {
      const { createAdminSupabase: getDb } = await import('@/lib/supabase');
      const db = getDb();
      if (!db) {
        return NextResponse.json({ error: 'Envoi refusé : base de contrôle d\'autonomie inaccessible (fail-closed)' }, { status: 503 });
      }
      const { data: lvlRow, error: lvlErr } = await (db as any).from('bot_settings').select('value').eq('key', 'autonomy_level').maybeSingle();
      if (lvlErr) {
        return NextResponse.json({ error: 'Envoi refusé : lecture autonomy_level échouée (fail-closed)', detail: lvlErr.message }, { status: 503 });
      }
      const lvl = lvlRow?.value ? parseInt(JSON.parse(lvlRow.value), 10) : 0;
      if (lvl === 0) {
        return NextResponse.json({ error: 'Envoi interdit : autonomie L0 (lecture seule)' }, { status: 403 });
      }
    } catch (e) {
      return NextResponse.json({ error: 'Envoi refusé : erreur autonomie (fail-closed)', detail: e instanceof Error ? e.message : 'unknown' }, { status: 503 });
    }
  }

  try {
    const body = await req.json();
    const { to, subject, htmlBody, textBody, domain, prospectId, fromName } = body;

    if (!to || !subject || (!htmlBody && !textBody)) {
      return NextResponse.json({ error: 'Missing required fields: to, subject, body' }, { status: 400 });
    }

    // ── QUALITY GATE ─────────────────────────────────────────────
    const emailBody = textBody || htmlBody || '';

    // 1. Pre-normalization mojibake detection (catches raw corrupt input)
    if (hasMojibake(subject) || hasMojibake(emailBody)) {
      // Log but don't block — sanitize will fix mojibake. Only block if it persists after.
    }

    // 2. Sanitize all text through centralized module
    const cleanSubject = sanitizeSubject(subject);
    const cleanTextBody = textBody ? sanitizeEmailText(textBody) : textBody;
    const cleanHtmlBody = htmlBody ? sanitizeEmailText(htmlBody) : htmlBody;

    // 3. Centralized validation (covers: empty, corrupt, placeholders, spam, recipient)
    const validation = validateEmailBeforeSend({
      subject: cleanSubject,
      body: cleanTextBody || cleanHtmlBody || '',
      to,
      ctaUrl: 'https://ghost-tax.com/intel',
    });

    if (!validation.valid) {
      return NextResponse.json({
        error: `QUALITY_GATE_BLOCK: ${validation.errors[0]}`,
        gate: validation.gate,
        allErrors: validation.errors,
      }, { status: 422 });
    }

    console.log(`[QualityGate] PASS — to:${to}, subject:"${cleanSubject.slice(0, 50)}...", domain:${domain}, chars:${emailBody.length}`);
    // ── END QUALITY GATE ─────────────────────────────────────────

    // ── Template rendering ───────────────────────────────────────
    const lang = (body as any).lang || detectLang(cleanTextBody || cleanSubject || '');
    const senderName = fromName || 'Ghost Tax';

    const templateParams = {
      mode: 'external_send' as const,
      subject: cleanSubject,
      preheaderText: (cleanTextBody || '').slice(0, 90),
      recipientName: '',
      bodyText: cleanTextBody || '',
      deliverableBlock: {
        title: lang === 'de' ? 'Was Sie erhalten' : lang === 'fr' ? 'Ce que vous recevez' : lang === 'nl' ? 'Wat u ontvangt' : 'What you receive',
        items: lang === 'de'
          ? ['SaaS & IT-Bestandsaufnahme', 'Einspar-Roadmap mit konkreten Beträgen', 'Executive Memo (CFO-ready)']
          : lang === 'fr'
          ? ['Inventaire SaaS & IT', 'Feuille de route économies avec montants concrets', 'Mémo exécutif (CFO-ready)']
          : lang === 'nl'
          ? ['SaaS & IT-inventarisatie', 'Besparingsroadmap met concrete bedragen', 'Executive memo (CFO-ready)']
          : ['SaaS & IT inventory analysis', 'Savings roadmap with specific amounts', 'Executive memo (CFO-ready)'],
      },
      ctaText: lang === 'de' ? '\u2192 Diagnostic starten \u2014 Ergebnis in 48h' : lang === 'fr' ? '\u2192 Lancer le diagnostic \u2014 R\u00e9sultat en 48h' : '\u2192 Start diagnostic \u2014 Results in 48h',
      ctaUrl: 'https://ghost-tax.com/intel',
      trustItems: lang === 'de'
        ? ['21 Analysephasen', 'Zero-Knowledge-Architektur', 'SOC 2']
        : lang === 'fr'
        ? ['21 phases d\'analyse', 'Architecture Zero-Knowledge', 'SOC 2']
        : ['21 detection phases', 'Zero-knowledge architecture', 'SOC 2'],
      signature: {
        name: senderName,
        title: 'Financial Exposure Detection',
        email: 'audits@ghost-tax.com',
      },
      lang,
    };

    const htmlEmail = cleanHtmlBody || renderEmailHTML(templateParams);
    const plaintextEmail = cleanTextBody ? renderEmailPlaintext(templateParams) : undefined;

    // V6 Phase 1 : resolve strategy + generate attempt_id before send
    let v6StrategyVersion = 'pre-doctrine';
    let v6StrategyMode: 'native'|'retroactive'|'absent' = 'absent';
    const v6AttemptId = crypto.randomUUID();
    try {
      const { getActiveStrategyVersion } = await import('@/lib/outreach/events');
      const sv = await getActiveStrategyVersion();
      v6StrategyVersion = sv.version;
      v6StrategyMode = sv.mode;
    } catch (_) {}

    // Send via Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: `${senderName} <audits@ghost-tax.com>`,
        to: [to],
        // reply_to centralisé : fallback vers Gmail perso Edith tant que
        // audits@ghost-tax.com n'est pas confirmée accessible.
        // Override via env REPLY_TO_EMAIL.
        reply_to: process.env.REPLY_TO_EMAIL || 'contact@ghost-tax.com',
        subject: cleanSubject,
        html: htmlEmail,
        text: plaintextEmail,
        // Tracking forcé — auparavant off, explique 1/819 DELIVERED traqué.
        track_opens: process.env.TRACK_OPENS !== 'false',
        track_clicks: process.env.TRACK_CLICKS !== 'false',
        tags: [
          { name: 'type', value: 'outreach' },
          { name: 'domain', value: (domain || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_') },
          { name: 'prospect', value: (prospectId || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_') },
          { name: 'client_id', value: (prospectId || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_') },
          { name: 'attempt_id', value: v6AttemptId },
          { name: 'strategy_version', value: v6StrategyVersion.replace(/[^a-zA-Z0-9._-]/g, '_') },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `Resend error: ${err.slice(0, 200)}` }, { status: 502 });
    }

    const data = await res.json();

    // V6 Phase 1 : emit SEND_SUCCESS avec draft_snapshot
    try {
      const { emitOutreachEvent } = await import('@/lib/outreach/events');
      await emitOutreachEvent({
        at: new Date().toISOString(),
        client_id: prospectId || null,
        orphan: !prospectId,
        strategy_version: v6StrategyVersion,
        strategy_assignment_mode: v6StrategyMode,
        attempt_id: v6AttemptId,
        kind: 'SEND_SUCCESS',
        provider: 'resend',
        provider_event_id: data.id || null,
        provider_event_type: 'email.sent',
        actor: 'send-approved',
        ingest_mode: 'live',
        payload: { resend_id: data.id },
        derived: {
          to, from: `${senderName} <audits@ghost-tax.com>`,
          subject: cleanSubject,
          body_preview: (cleanTextBody || '').slice(0, 200),
          draft_snapshot: { subject: cleanSubject, body_preview: (cleanTextBody || '').slice(0, 200) },
        },
      });
    } catch (_) { /* fire-and-forget */ }

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
      gate: 'PASS',
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
