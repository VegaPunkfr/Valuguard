/**
 * RECON LEDGER — 6-Layer Operational Memory API
 *
 * GET  /api/command/recon-ledger?type=sessions|people|companies|ops|actions|patterns|person_detail
 * POST /api/command/recon-ledger — ingest session + results, upsert entities, log actions, update ops
 *
 * Protected by COMMAND_SECRET via middleware.
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function sb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url, key };
}

async function q(path: string, opts: RequestInit = {}) {
  const s = sb();
  if (!s) return null;
  const prefer = opts.method === 'POST' ? 'return=representation'
    : opts.method === 'PATCH' ? 'return=minimal'
    : '';
  const res = await fetch(`${s.url}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: s.key, Authorization: `Bearer ${s.key}`,
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {}),
      ...((opts.headers as Record<string, string>) || {}),
    },
  });
  if (!res.ok) { console.error(`[Recon] ${opts.method || 'GET'} ${path} → ${res.status}`); return null; }
  const txt = await res.text();
  return txt ? JSON.parse(txt) : null;
}

function personDedupeKey(d: { email?: string; name?: string; company?: string; domain?: string }): string {
  if (d.email) return `email:${d.email.toLowerCase().trim()}`;
  const n = (d.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const c = (d.company || d.domain || '').toLowerCase().replace(/[^a-z0-9.]/g, '');
  return `name:${n}@${c}`;
}

function companyDedupeKey(d: { domain?: string; name?: string }): string {
  if (d.domain) return `domain:${d.domain.toLowerCase().replace(/^www\./, '')}`;
  return `name:${(d.name || '').toLowerCase().replace(/[^a-z0-9]/g, '')}`;
}

// ── GET ──
export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get('type') || 'sessions';
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '50'), 100);
  const offset = parseInt(req.nextUrl.searchParams.get('offset') || '0');
  const search = req.nextUrl.searchParams.get('q') || '';
  const status = req.nextUrl.searchParams.get('status') || '';
  const entityId = req.nextUrl.searchParams.get('entity_id') || '';
  const sessionId = req.nextUrl.searchParams.get('session_id') || '';

  if (!sb()) return NextResponse.json({ data: [], source: 'none' });

  switch (type) {
    case 'sessions': {
      const data = await q(`recon_sessions?select=*&order=created_at.desc&limit=${limit}&offset=${offset}`);
      return NextResponse.json({ data: data || [] });
    }
    case 'session_detail': {
      if (!sessionId) return NextResponse.json({ data: [] });
      const data = await q(`recon_snapshots?session_id=eq.${sessionId}&order=rank_in_results.asc&limit=100`);
      return NextResponse.json({ data: data || [] });
    }
    case 'people': {
      let path = `recon_people?select=*&order=last_seen_at.desc&limit=${limit}&offset=${offset}`;
      if (search) path += `&or=(canonical_name.ilike.*${encodeURIComponent(search)}*,canonical_email.ilike.*${encodeURIComponent(search)}*,canonical_title.ilike.*${encodeURIComponent(search)}*)`;
      const data = await q(path);
      return NextResponse.json({ data: data || [] });
    }
    case 'companies': {
      let path = `recon_companies?select=*&order=last_seen_at.desc&limit=${limit}&offset=${offset}`;
      if (search) path += `&or=(canonical_name.ilike.*${encodeURIComponent(search)}*,canonical_domain.ilike.*${encodeURIComponent(search)}*)`;
      const data = await q(path);
      return NextResponse.json({ data: data || [] });
    }
    case 'ops': {
      let path = `recon_ops_state?select=*&limit=${limit}&offset=${offset}`;
      if (status) path += `&current_status=eq.${encodeURIComponent(status)}`;
      path += '&order=priority_score.desc';
      const data = await q(path);
      return NextResponse.json({ data: data || [] });
    }
    case 'ops_actionable': {
      const data = await q(`recon_ops_state?actionable_now=eq.true&order=priority_score.desc&limit=${limit}&offset=${offset}`);
      return NextResponse.json({ data: data || [] });
    }
    case 'actions': {
      if (!entityId) return NextResponse.json({ data: [] });
      const data = await q(`recon_actions?entity_id=eq.${entityId}&order=created_at.desc&limit=${limit}`);
      return NextResponse.json({ data: data || [] });
    }
    case 'relationships': {
      if (!entityId) return NextResponse.json({ data: [] });
      const data = await q(`recon_person_company?person_id=eq.${entityId}&order=last_observed_at.desc`);
      return NextResponse.json({ data: data || [] });
    }
    case 'person_detail': {
      if (!entityId) return NextResponse.json({ person: null, ops: null, relationships: [], actions: [], sessions: [] });
      const [person, ops, rels, actions, sess] = await Promise.all([
        q(`recon_people?id=eq.${entityId}&limit=1`),
        q(`recon_ops_state?entity_id=eq.${entityId}&limit=1`),
        q(`recon_person_company?person_id=eq.${entityId}&order=last_observed_at.desc`),
        q(`recon_actions?entity_id=eq.${entityId}&order=created_at.desc&limit=20`),
        q(`recon_entity_sessions?person_id=eq.${entityId}&order=appeared_at.desc`),
      ]);
      return NextResponse.json({
        person: person?.[0] || null,
        ops: ops?.[0] || null,
        relationships: rels || [],
        actions: actions || [],
        sessions: sess || [],
      });
    }
    case 'patterns': {
      const sessions = await q(`recon_sessions?select=*&order=created_at.desc&limit=100`);
      return NextResponse.json({ data: sessions || [] });
    }
    default:
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  }
}

// ── POST ──
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (!sb()) return NextResponse.json({ ok: false, error: 'Supabase not configured' }, { status: 503 });

    // ── INGEST: full session + results pipeline ──
    if (action === 'ingest') {
      const { session, results } = body;
      if (!session || !results) return NextResponse.json({ error: 'Missing session/results' }, { status: 400 });

      // 1. Create session
      const sess = await q('recon_sessions', {
        method: 'POST',
        body: JSON.stringify({
          provider: session.provider || 'apollo',
          search_type: session.search_type || 'people_search',
          strategic_intent: session.strategic_intent || '',
          trigger_source: session.trigger_source || 'manual',
          query_payload: session.query_payload || {},
          filters_summary: session.filters_summary || '',
          result_count: results.length,
          credits_consumed: session.credits_consumed || 0,
          notes: session.notes || '',
        }),
      });
      const sessId = sess?.[0]?.id;
      if (!sessId) return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });

      let peopleProcessed = 0, companiesProcessed = 0;

      for (let i = 0; i < results.length; i++) {
        const r = results[i];

        // 2. Upsert company
        let companyId: string | null = null;
        if (r.company || r.domain) {
          const cdk = companyDedupeKey({ domain: r.domain, name: r.company });
          const existing = await q(`recon_companies?dedupe_key=eq.${encodeURIComponent(cdk)}&limit=1`);
          if (existing?.length) {
            companyId = existing[0].id;
            await q(`recon_companies?id=eq.${companyId}`, {
              method: 'PATCH',
              body: JSON.stringify({
                last_seen_at: new Date().toISOString(),
                appearance_count: (existing[0].appearance_count || 0) + 1,
                search_session_count: (existing[0].search_session_count || 0) + 1,
                ...(r.tech_stack ? { tech_stack: r.tech_stack } : {}),
                ...(r.employee_count ? { employee_count: r.employee_count } : {}),
                ...(r.revenue ? { revenue_printed: r.revenue } : {}),
                updated_at: new Date().toISOString(),
              }),
            });
          } else {
            const ins = await q('recon_companies', {
              method: 'POST',
              body: JSON.stringify({
                dedupe_key: cdk,
                canonical_name: r.company || r.domain || 'Unknown',
                canonical_domain: r.domain,
                canonical_industry: r.industry,
                canonical_country: r.country,
                employee_count: r.employee_count,
                revenue_printed: r.revenue,
                tech_stack: r.tech_stack || [],
                external_ids: r.org_id ? [r.org_id] : [],
              }),
            });
            companyId = ins?.[0]?.id;
            companiesProcessed++;
          }
        }

        // 3. Upsert person
        const pdk = personDedupeKey({ email: r.email, name: r.name, company: r.company, domain: r.domain });
        const existingP = await q(`recon_people?dedupe_key=eq.${encodeURIComponent(pdk)}&limit=1`);
        let personId: string;

        if (existingP?.length) {
          personId = existingP[0].id;
          const updates: Record<string, unknown> = {
            last_seen_at: new Date().toISOString(),
            appearance_count: (existingP[0].appearance_count || 0) + 1,
            search_session_count: (existingP[0].search_session_count || 0) + 1,
            data_version: (existingP[0].data_version || 0) + 1,
            updated_at: new Date().toISOString(),
          };
          if (r.email && !existingP[0].canonical_email) {
            updates.canonical_email = r.email;
            updates.contact_improved_flag = true;
            updates.last_enriched_at = new Date().toISOString();
          }
          if (r.title && r.title !== existingP[0].canonical_title) {
            updates.canonical_title = r.title;
            if (existingP[0].canonical_title) updates.job_changed_flag = true;
          }
          await q(`recon_people?id=eq.${personId}`, { method: 'PATCH', body: JSON.stringify(updates) });
        } else {
          const ins = await q('recon_people', {
            method: 'POST',
            body: JSON.stringify({
              dedupe_key: pdk,
              canonical_name: r.name || 'Unknown',
              canonical_email: r.email,
              canonical_title: r.title,
              canonical_linkedin: r.linkedin,
              canonical_country: r.country,
              canonical_city: r.city,
              external_ids: r.person_id ? [r.person_id] : [],
              email_status: r.email_status || 'unknown',
              data_confidence: r.email ? 'medium' : 'low',
              ...(r.email ? { first_enriched_at: new Date().toISOString(), last_enriched_at: new Date().toISOString() } : {}),
            }),
          });
          personId = ins?.[0]?.id;
          if (!personId) continue;
          peopleProcessed++;

          // Create initial ops state
          await q('recon_ops_state', {
            method: 'POST',
            body: JSON.stringify({
              entity_type: 'person',
              entity_id: personId,
              current_status: 'discovered',
              priority_score: r.email ? 30 : 10,
              priority_reason: r.email ? 'Has verified email' : 'No email yet',
              actionable_now: !!r.email,
            }),
          });
        }

        // 4. Snapshot
        await q('recon_snapshots', {
          method: 'POST',
          body: JSON.stringify({
            session_id: sessId,
            entity_type: 'person',
            external_id: r.person_id || '',
            source_method: r.source_method || 'search',
            rank_in_results: i + 1,
            raw_payload: r,
            normalized: { name: r.name, email: r.email, title: r.title, company: r.company, domain: r.domain, country: r.country },
            has_email: !!r.email,
            has_phone: !!r.phone,
          }),
        });

        // 5. Person-company relationship
        if (companyId && personId) {
          const existingRel = await q(`recon_person_company?person_id=eq.${personId}&company_name=eq.${encodeURIComponent(r.company || '')}&limit=1`);
          if (existingRel?.length) {
            await q(`recon_person_company?id=eq.${existingRel[0].id}`, {
              method: 'PATCH',
              body: JSON.stringify({
                last_observed_at: new Date().toISOString(),
                observation_count: (existingRel[0].observation_count || 0) + 1,
                title: r.title || existingRel[0].title,
              }),
            });
          } else {
            await q('recon_person_company', {
              method: 'POST',
              body: JSON.stringify({
                person_id: personId,
                company_id: companyId,
                company_name: r.company || '',
                company_domain: r.domain,
                title: r.title,
                is_current: true,
                started_at: r.started_at || null,
              }),
            });
          }
        }

        // 6. Entity-session link
        await q('recon_entity_sessions', {
          method: 'POST',
          body: JSON.stringify({ person_id: personId, session_id: sessId }),
        }).catch(() => {}); // ignore duplicate
      }

      return NextResponse.json({ ok: true, session_id: sessId, people_processed: peopleProcessed, companies_processed: companiesProcessed });
    }

    // ── LOG ACTION ──
    if (action === 'log_action') {
      const { entity_type, entity_id, action_type, action_data, campaign_id, channel } = body;
      if (!entity_id || !action_type) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
      await q('recon_actions', {
        method: 'POST',
        body: JSON.stringify({ entity_type: entity_type || 'person', entity_id, action_type, action_data: action_data || {}, campaign_id, channel }),
      });
      return NextResponse.json({ ok: true });
    }

    // ── UPDATE OPS STATE ──
    if (action === 'update_ops') {
      const { entity_id, updates } = body;
      if (!entity_id || !updates) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
      updates.updated_at = new Date().toISOString();
      if (updates.current_status) updates.status_changed_at = new Date().toISOString();
      await q(`recon_ops_state?entity_id=eq.${entity_id}`, { method: 'PATCH', body: JSON.stringify(updates) });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}
