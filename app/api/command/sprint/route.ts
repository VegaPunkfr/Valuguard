/**
 * GHOST TAX — SPRINT API
 *
 * GET  /api/command/sprint         → read accounts + bot_settings
 * POST /api/command/sprint         → upsert account or update bot_settings
 * PATCH /api/command/sprint?action= → update account status / bot level
 */

import { NextRequest, NextResponse } from 'next/server';
import { sanitizeEmailText } from '@/lib/email/sanitize';

export const runtime = 'nodejs';

function sanitizeText(text: string | null | undefined): string | null {
  if (!text) return text as null;
  return sanitizeEmailText(text);
}

function isAuthorized(req: NextRequest): boolean {
  const key = req.headers.get('x-command-key') || '';
  const secret = process.env.COMMAND_SECRET || '';
  return secret.length > 0 && key === secret;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { createAdminSupabase } = await import('@/lib/supabase');
    const supabase = createAdminSupabase();
    if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });

    const [accountsRes, settingsRes, logRes] = await Promise.all([
      (supabase as any).from('sprint_accounts').select('*').order('score', { ascending: false }).limit(50),
      (supabase as any).from('bot_settings').select('*'),
      (supabase as any).from('bot_execution_log').select('*').order('executed_at', { ascending: false }).limit(5),
    ]);

    const settings: Record<string, any> = {};
    (settingsRes.data || []).forEach((r: any) => {
      try { settings[r.key] = JSON.parse(r.value); } catch { settings[r.key] = r.value; }
    });

    return NextResponse.json({
      accounts: accountsRes.data || [],
      settings,
      recentRuns: logRes.data || [],
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { createAdminSupabase } = await import('@/lib/supabase');
    const supabase = createAdminSupabase();
    if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });

    // Update bot setting
    if (body.setting && body.value !== undefined) {
      await (supabase as any).from('bot_settings').upsert({
        key: body.setting,
        value: JSON.stringify(body.value),
        updated_at: new Date().toISOString(),
      });
      return NextResponse.json({ ok: true, setting: body.setting });
    }

    // Upsert sprint account
    if (body.account) {
      const a = body.account;
      await (supabase as any).from('sprint_accounts').upsert({
        id: a.id,
        market: a.market,
        company: a.company,
        domain: a.domain,
        headcount: a.headcount || 0,
        industry: a.industry || '',
        revenue: a.revenue || '',
        contact_name: sanitizeText(a.contact?.name || a.contactName || '') || '',
        contact_title: sanitizeText(a.contact?.title || a.contactTitle || '') || '',
        contact_email: a.contact?.email || a.contactEmail || '',
        signals: a.signals || [],
        primary_signal: a.primarySignal || 'HIRING_IT',
        signal_confidence: a.signalConfidence || 'LOW',
        angle: a.angle || 'HIRING_IT',
        asset: a.asset || null,
        score: a.score || 0,
        data_quality: a.dataQuality || 'MINIMAL',
        source: a.source || 'manual',
        status: a.status || 'NEW',
        next_action: a.nextAction || '',
        draft_subject: sanitizeText(a.draft?.subject || a.draftSubject || null),
        draft_body: sanitizeText(a.draft?.body || a.draftBody || null),
        draft_gate_result: a.draft?.gateResult || a.draftGateResult || null,
        tech_stack: a.techStack || [],
        why_now: a.whyNow || null,
        why_this_contact: a.whyThisContact || null,
        why_ghost_tax: a.whyGhostTax || null,
        score_reasons: a.scoreReasons || [],
        score_alert: a.scoreAlert || null,
        contact_tier: a.contactTier || 'absent',
        last_action_at: new Date().toISOString(),
      });
      return NextResponse.json({ ok: true, id: a.id });
    }

    return NextResponse.json({ error: 'Missing setting or account in body' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { createAdminSupabase } = await import('@/lib/supabase');
    const supabase = createAdminSupabase();
    if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });

    if (body.id && body.status) {
      await (supabase as any).from('sprint_accounts')
        .update({ status: body.status, last_action_at: new Date().toISOString(), next_action: body.nextAction || '' })
        .eq('id', body.id);

      // V6 Phase 1 : emit outreach_event pour actions opérateur DEFER/REJECT
      if (body.status === 'DEFERRED' || body.status === 'REJECTED') {
        try {
          const { emitOutreachEvent, getActiveStrategyVersion } = await import('@/lib/outreach/events');
          const strat = await getActiveStrategyVersion();
          await emitOutreachEvent({
            at: new Date().toISOString(),
            client_id: body.id,
            orphan: false,
            strategy_version: strat.version,
            strategy_assignment_mode: strat.mode,
            kind: body.status === 'DEFERRED' ? 'DEFER' : 'REJECT',
            provider: 'internal',
            actor: 'operator',
            ingest_mode: 'live',
            derived: { reason: body.nextAction || null, source: 'cockpit_patch' },
          });
        } catch (_) { /* fire-and-forget : ne jamais bloquer le PATCH principal */ }
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Missing id and status' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown' }, { status: 500 });
  }
}
