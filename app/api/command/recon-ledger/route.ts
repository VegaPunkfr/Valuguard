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

// ── State Machine: server-enforced transitions ──
const TRANSITIONS: Record<string, string[]> = {
  discovered: ['reviewed', 'first_seen_high_potential', 'suppressed'],
  first_seen_high_potential: ['reviewed', 'shortlisted', 'suppressed'],
  reviewed: ['shortlisted', 'suppressed', 'deferred'],
  shortlisted: ['contacted', 'deferred', 'suppressed'],
  contacted: ['replied', 'deferred', 'suppressed'],
  replied: ['nurturing', 'qualified', 'suppressed'],
  nurturing: ['qualified', 'deferred', 'suppressed'],
  deferred: ['discovered'],
  qualified: ['closed', 'suppressed'],
  closed: [],
  suppressed: [],
};

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

// ── LEGACY TOOLS DETECTION ──
const LEGACY_TOOLS = new Set(['dotnetnuke','phusion_passenger','act','homestead','html5_maker','siemens_simatic_s7','cedexis_radar','omniture_adobe','vmware','kvm','oracle_xml_db','microsoft_windows_server_2012','microsoft-iis','lotus_notes','ibm_websphere','arena_plm','systools_vba_password_recovery']);

function detectLegacy(techStack: unknown[]): boolean {
  if (!Array.isArray(techStack)) return false;
  return techStack.some(t => {
    const raw = typeof t === 'string' ? t : ((t as {name?:string})?.name || (t as {uid?:string})?.uid || '');
    const normalized = raw.toLowerCase().replace(/[^a-z0-9_]/g,'');
    // Check exact match AND substring match for names like "Microsoft Windows Server 2012"
    if (LEGACY_TOOLS.has(normalized)) return true;
    // Substring checks for common legacy indicators
    const lower = raw.toLowerCase();
    return lower.includes('dotnetnuke') || lower.includes('lotus notes') || lower.includes('ibm websphere') ||
      lower.includes('windows server 2012') || lower.includes('windows server 2008') ||
      lower.includes('phusion passenger') || lower.includes('arena plm') ||
      lower.includes('oracle xml db') || (lower === 'act!' || lower === 'act') ||
      lower.includes('homestead') || lower.includes('cedexis');
  });
}

function countClouds(techStack: unknown[]): boolean {
  if (!Array.isArray(techStack)) return false;
  let hasAws = false, hasAzure = false, hasGcp = false;
  techStack.forEach(t => {
    const name = (typeof t === 'string' ? t : (t as {name?:string})?.name || (t as {uid?:string})?.uid || '').toLowerCase();
    if (name.includes('aws') || name.includes('amazon')) hasAws = true;
    if (name.includes('azure') || name.includes('microsoft azure')) hasAzure = true;
    if (name.includes('google cloud') || name.includes('gcp') || name.includes('google compute') || name.includes('google kubernetes')) hasGcp = true;
  });
  return [hasAws, hasAzure, hasGcp].filter(Boolean).length >= 2;
}

// ── SCORING FUNCTIONS ──
function calcPressure(company: Record<string,unknown>, people: Record<string,unknown>[]): number {
  let s = 0;
  if ((company.headcount_growth_12m as number) < -0.1) s += 20;
  const hasCfo = people.some((p:any) => /cfo|chief financial/i.test(p.canonical_title||''));
  if (hasCfo) s += 15; // presence of CFO in our radar = we can reach decision maker
  if ((company.tool_count as number || 0) > 40) s += 15;
  if (company.has_legacy_tools) s += 10;
  if (company.multi_cloud) s += 10;
  const funding = company.latest_funding_stage as string || '';
  if (/series [bc]/i.test(funding)) s += 10;
  return Math.min(s, 100);
}

function calcCommittee(people: Record<string,unknown>[]): { score: number; coverage: string; gaps: string[] } {
  let s = 0;
  const gaps: string[] = [];
  const hasCfo = people.some((p:any) => /cfo|chief financial|vp finance|finance director|head of finance/i.test(p.canonical_title||''));
  const hasCio = people.some((p:any) => /cio|cto|chief technology|chief information|vp it|it director|head of it|vp engineering/i.test(p.canonical_title||''));
  const hasProc = people.some((p:any) => /procurement|purchasing|vendor|sourcing/i.test(p.canonical_title||''));
  if (hasCfo) s += 30; else gaps.push('cfo');
  if (hasCio) s += 25; else gaps.push('cio');
  if (hasProc) s += 20; else gaps.push('procurement');
  const enriched = people.filter((p:any) => p.canonical_email).length;
  if (enriched > 0) s += 10;
  const coverage = (hasCfo && hasCio) ? (hasProc ? 'complete' : 'partial') : 'none';
  return { score: Math.min(s, 100), coverage, gaps };
}

function calcActivation(thesis: Record<string,unknown>, hasVerifiedEmail: boolean, signalAge: number): number {
  let s = 0;
  if (thesis.snapshot_written) s += 25;
  if (thesis.email_drafted) s += 20;
  if (hasVerifiedEmail) s += 25;
  if (signalAge < 30) s += 15;
  else if (signalAge < 60) s += 5;
  return Math.min(s, 100);
}

function calcExpectedValue(composite: number, hasOutreach: boolean, committeeCoverage: string, signalAge: number): number {
  const outreachFactor = hasOutreach ? 1.0 : 0.3;
  const committeeFactor = committeeCoverage !== 'none' ? 1.0 : 0.5;
  const freshFactor = signalAge < 14 ? 1.0 : signalAge < 30 ? 0.7 : 0.4;
  return Math.round(composite * outreachFactor * committeeFactor * freshFactor);
}

function benchmarkConfidence(sampleSize: number): string {
  if (sampleSize >= 50) return 'publishable';
  if (sampleSize >= 30) return 'defensible';
  if (sampleSize >= 10) return 'indicative';
  return 'internal';
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
    case 'thesis': {
      let path = `recon_account_thesis?select=*&order=composite_score.desc&limit=${limit}&offset=${offset}`;
      if (status) path += `&thesis_status=eq.${encodeURIComponent(status)}`;
      if (search) path += `&company_domain=ilike.*${encodeURIComponent(search)}*`;
      const data = await q(path);
      return NextResponse.json({ data: data || [] });
    }
    case 'thesis_detail': {
      const companyId = req.nextUrl.searchParams.get('company_id');
      if (!companyId) return NextResponse.json({ thesis: null });
      const data = await q(`recon_account_thesis?company_id=eq.${companyId}&limit=1`);
      return NextResponse.json({ thesis: data?.[0] || null });
    }
    case 'watchlists': {
      const data = await q(`recon_watchlists?select=*&order=created_at.desc&limit=${limit}`);
      return NextResponse.json({ data: data || [] });
    }
    case 'triggers': {
      const pending = req.nextUrl.searchParams.get('pending');
      let path = `recon_trigger_queue?select=*&order=expected_value.desc&limit=${limit}`;
      if (pending === 'true') path += '&approved=eq.false&executed=eq.false&rejected=eq.false';
      const data = await q(path);
      return NextResponse.json({ data: data || [] });
    }
    case 'enrichment_log': {
      const data = await q(`recon_enrichment_log?select=*&order=created_at.desc&limit=${limit}`);
      return NextResponse.json({ data: data || [] });
    }
    case 'benchmarks': {
      const segment = req.nextUrl.searchParams.get('segment') || '';
      let path = `recon_benchmarks?select=*&order=segment_key.asc`;
      if (segment) path += `&segment_key=eq.${encodeURIComponent(segment)}`;
      const data = await q(path);
      return NextResponse.json({ data: data || [] });
    }
    case 'committee': {
      const companyId = req.nextUrl.searchParams.get('company_id');
      if (!companyId) return NextResponse.json({ data: [] });
      const data = await q(`recon_person_company?company_id=eq.${companyId}&order=is_current.desc,last_observed_at.desc`);
      return NextResponse.json({ data: data || [] });
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

      let peopleProcessed = 0, companiesProcessed = 0, peopleReappeared = 0, dataImproved = 0, snapshotsCreated = 0;

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
            dataImproved++;
          }
          if (r.title && r.title !== existingP[0].canonical_title) {
            updates.canonical_title = r.title;
            if (existingP[0].canonical_title) { updates.job_changed_flag = true; dataImproved++; }
          }
          await q(`recon_people?id=eq.${personId}`, { method: 'PATCH', body: JSON.stringify(updates) });
          peopleReappeared++;
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
        snapshotsCreated++;
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

      // Update session quality based on results
      const quality = peopleProcessed + peopleReappeared > 0 ? (dataImproved > 0 ? 'productive' : 'mixed') : 'empty';
      await q(`recon_sessions?id=eq.${sessId}`, {
        method: 'PATCH',
        body: JSON.stringify({ useful_count: peopleProcessed + dataImproved, session_quality: quality }),
      });

      // Count actionable
      const actionableRes = await q('recon_ops_state?actionable_now=eq.true&select=entity_id&limit=0', {
        headers: { Prefer: 'count=exact' } as Record<string, string>,
      });

      // ── POST-INGEST: Update company metadata ──
      for (const r of results) {
        if (r.domain || r.company) {
          const cdk = companyDedupeKey({ domain: r.domain, name: r.company });
          const comp = await q(`recon_companies?dedupe_key=eq.${encodeURIComponent(cdk)}&limit=1`);
          if (comp?.length) {
            const c = comp[0];
            // Use ingest tech_stack if available (fresher than DB), fallback to DB
            const stack = (r.tech_stack && Array.isArray(r.tech_stack) && r.tech_stack.length > 0) ? r.tech_stack : (c.tech_stack || []);
            const tc = Array.isArray(stack) ? stack.length : 0;
            const legacy = detectLegacy(stack);
            const mc = countClouds(stack);
            if (tc !== c.tool_count || legacy !== c.has_legacy_tools || mc !== c.multi_cloud) {
              await q(`recon_companies?id=eq.${c.id}`, { method: 'PATCH', body: JSON.stringify({ tool_count: tc, has_legacy_tools: legacy, multi_cloud: mc }) });
            }

            // Auto-create thesis if company seen >= 2
            if ((c.appearance_count || 0) >= 2) {
              const existingThesis = await q(`recon_account_thesis?company_id=eq.${c.id}&limit=1`);
              const companyPeople = await q(`recon_person_company?company_id=eq.${c.id}&is_current=eq.true&select=person_id`);
              const peopleIds = (companyPeople || []).map((pc:any) => pc.person_id);
              let peopleData: Record<string,unknown>[] = [];
              if (peopleIds.length) {
                peopleData = await q(`recon_people?id=in.(${peopleIds.join(',')})&limit=20`) || [];
              }

              const pressure = calcPressure(c, peopleData);
              const { score: commScore, coverage, gaps } = calcCommittee(peopleData);
              const hasVerified = peopleData.some((p:any) => p.canonical_email && p.email_status === 'verified');
              const primarySignal = session.strategic_intent || 'discovery';

              const thesisData = {
                account_pressure_score: pressure,
                committee_completeness_score: commScore,
                committee_coverage: coverage,
                committee_gaps: gaps,
                target_committee: peopleData.map((p:any) => ({ person_id: p.id, name: p.canonical_name, title: p.canonical_title, enriched: !!p.canonical_email })),
                contact_count: peopleData.length,
                enriched_contact_count: peopleData.filter((p:any) => p.canonical_email).length,
                tool_count: tc,
                has_verified_contact: hasVerified,
                company_seen_count: c.appearance_count || 0,
                primary_signal: primarySignal,
                primary_signal_age_days: 0,
                benchmark_readiness: false,
                version: (existingThesis?.[0]?.version || 0) + 1,
                last_computed_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };

              const activationScore = calcActivation(existingThesis?.[0] || {}, hasVerified, 0);
              (thesisData as any).activation_readiness_score = activationScore;
              (thesisData as any).composite_score = Math.round(pressure * 0.4 + commScore * 0.3 + activationScore * 0.3);

              // Recommended next move
              const comp_score = (thesisData as any).composite_score;
              (thesisData as any).recommended_next_move = comp_score >= 85 ? 'Activate — send Intelligence Drop' : comp_score >= 70 ? 'Enrich — trigger queue for missing emails' : comp_score >= 50 ? 'Prepare — write snapshot, draft email' : comp_score >= 30 ? 'Review — check committee gaps' : 'Monitor — rescan next week';

              if (existingThesis?.length) {
                // Preserve editorial fields
                await q(`recon_account_thesis?company_id=eq.${c.id}`, { method: 'PATCH', body: JSON.stringify(thesisData) });
              } else {
                await q('recon_account_thesis', { method: 'POST', body: JSON.stringify({ ...thesisData, company_id: c.id, company_domain: c.canonical_domain || '' }) });
              }
            }
          }
        }
      }

      // ── POST-INGEST: Update benchmarks ──
      const allCompanies = await q('recon_companies?select=canonical_industry,employee_count,tool_count,has_legacy_tools,multi_cloud&tool_count=gt.0&limit=500') || [];
      if (allCompanies.length >= 3) {
        // Group by employee range
        const ranges = [
          { key: 'emp_100_300', min: 100, max: 300 },
          { key: 'emp_300_1000', min: 300, max: 1000 },
          { key: 'emp_all', min: 0, max: 100000 }
        ];
        for (const range of ranges) {
          const segment = allCompanies.filter((c:any) => (c.employee_count||0) >= range.min && (c.employee_count||0) < range.max);
          if (segment.length < 3) continue;
          const tools = segment.map((c:any) => c.tool_count).sort((a:number,b:number) => a-b);
          const conf = benchmarkConfidence(tools.length);
          const median = tools[Math.floor(tools.length/2)];
          const p25 = tools[Math.floor(tools.length*0.25)];
          const p75 = tools[Math.floor(tools.length*0.75)];

          // Upsert benchmark
          const existing = await q(`recon_benchmarks?segment_key=eq.${range.key}&metric_name=eq.tool_count&limit=1`);
          const bmData = { segment_key: range.key, metric_name: 'tool_count', sample_size: tools.length, min_val: tools[0], p25_val: p25, median_val: median, p75_val: p75, max_val: tools[tools.length-1], confidence_level: conf, last_computed_at: new Date().toISOString() };
          if (existing?.length) {
            await q(`recon_benchmarks?id=eq.${existing[0].id}`, { method: 'PATCH', body: JSON.stringify(bmData) });
          } else {
            await q('recon_benchmarks', { method: 'POST', body: JSON.stringify(bmData) });
          }
        }
      }

      return NextResponse.json({
        ok: true,
        session_id: sessId,
        stats: {
          snapshots_created: snapshotsCreated,
          new_people: peopleProcessed,
          reappeared: peopleReappeared,
          data_improved: dataImproved,
          new_companies: companiesProcessed,
          session_quality: quality,
        },
      });
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

    // ── UPDATE OPS STATE (with server-enforced state machine) ──
    if (action === 'update_ops') {
      const { entity_id, updates } = body;
      if (!entity_id || !updates) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

      // If status change requested, enforce transitions
      if (updates.current_status) {
        const current = await q(`recon_ops_state?entity_id=eq.${entity_id}&select=current_status&limit=1`);
        if (!current?.length) return NextResponse.json({ error: 'Entity not found in ops_state' }, { status: 404 });

        const from = current[0].current_status;
        const to = updates.current_status;
        const allowed = TRANSITIONS[from] || [];

        if (!allowed.includes(to)) {
          return NextResponse.json({
            error: `Transition refused: ${from} → ${to}`,
            allowed_transitions: allowed,
            current_status: from,
          }, { status: 422 });
        }

        updates.previous_status = from;
        updates.status_changed_at = new Date().toISOString();

        // Log the transition as an action
        await q('recon_actions', {
          method: 'POST',
          body: JSON.stringify({
            entity_type: 'person',
            entity_id,
            action_type: 'status_changed',
            action_data: { from, to },
          }),
        });
      }

      updates.updated_at = new Date().toISOString();
      await q(`recon_ops_state?entity_id=eq.${entity_id}`, { method: 'PATCH', body: JSON.stringify(updates) });
      return NextResponse.json({ ok: true });
    }

    // ── UPSERT WATCHLIST ──
    if (action === 'upsert_watchlist') {
      const { watchlist } = body;
      if (!watchlist?.name) return NextResponse.json({ error: 'Missing watchlist name' }, { status: 400 });
      if (watchlist.id) {
        await q(`recon_watchlists?id=eq.${watchlist.id}`, { method: 'PATCH', body: JSON.stringify({ ...watchlist, updated_at: new Date().toISOString() }) });
        return NextResponse.json({ ok: true });
      }
      const res = await q('recon_watchlists', { method: 'POST', body: JSON.stringify(watchlist) });
      return NextResponse.json({ ok: true, id: res?.[0]?.id });
    }

    // ── APPROVE TRIGGER ──
    if (action === 'approve_trigger') {
      const { trigger_id } = body;
      if (!trigger_id) return NextResponse.json({ error: 'Missing trigger_id' }, { status: 400 });

      // Check gates
      const trigger = await q(`recon_trigger_queue?id=eq.${trigger_id}&limit=1`);
      if (!trigger?.length) return NextResponse.json({ error: 'Trigger not found' }, { status: 404 });
      const t = trigger[0];

      if (t.committee_completeness < 25 && t.trigger_type !== 'job_change_detected') {
        return NextResponse.json({ error: 'Gate blocked: committee_completeness too low (<25). Find more contacts first.', gate: 'committee' }, { status: 422 });
      }
      if (t.activation_readiness < 25 && t.trigger_type === 'outreach_ready') {
        return NextResponse.json({ error: 'Gate blocked: activation_readiness too low (<25). Prepare snapshot first.', gate: 'activation' }, { status: 422 });
      }

      await q(`recon_trigger_queue?id=eq.${trigger_id}`, { method: 'PATCH', body: JSON.stringify({ approved: true, approved_at: new Date().toISOString() }) });
      return NextResponse.json({ ok: true });
    }

    // ── REJECT TRIGGER ──
    if (action === 'reject_trigger') {
      const { trigger_id, reason } = body;
      if (!trigger_id) return NextResponse.json({ error: 'Missing trigger_id' }, { status: 400 });
      await q(`recon_trigger_queue?id=eq.${trigger_id}`, { method: 'PATCH', body: JSON.stringify({ rejected: true, rejected_reason: reason || 'Operator decision' }) });
      return NextResponse.json({ ok: true });
    }

    // ── LOG ENRICHMENT ──
    if (action === 'log_enrichment') {
      const { entity_id, trigger_id, credits, reason, data_before, data_after, value_gained } = body;
      if (!entity_id || !reason) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

      // Check benchmark governance: no client-facing benchmark if confidence < defensible

      await q('recon_enrichment_log', { method: 'POST', body: JSON.stringify({
        entity_id, entity_type: 'person', trigger_id: trigger_id || null,
        credits_consumed: credits || 1, reason, data_before: data_before || {},
        data_after: data_after || {}, value_gained: value_gained || ''
      }) });

      if (trigger_id) {
        await q(`recon_trigger_queue?id=eq.${trigger_id}`, { method: 'PATCH', body: JSON.stringify({ executed: true, executed_at: new Date().toISOString() }) });
      }

      return NextResponse.json({ ok: true });
    }

    // ── UPDATE THESIS EDITORIAL FIELDS ──
    if (action === 'update_thesis') {
      const { company_id, updates } = body;
      if (!company_id || !updates) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
      // Only allow editorial + workflow fields to be updated manually
      const allowed = ['why_now','outreach_angle','snapshot_notes','internal_hypothesis','operator_notes','thesis_status','snapshot_written','email_drafted','primary_contact_id'];
      const clean: Record<string,unknown> = {};
      for (const k of allowed) { if (updates[k] !== undefined) clean[k] = updates[k]; }
      clean.last_edited_at = new Date().toISOString();
      clean.updated_at = new Date().toISOString();
      await q(`recon_account_thesis?company_id=eq.${company_id}`, { method: 'PATCH', body: JSON.stringify(clean) });
      return NextResponse.json({ ok: true });
    }

    // ── REFRESH BENCHMARKS (on-demand) ──
    if (action === 'refresh_benchmarks') {
      const allCompanies = await q('recon_companies?select=canonical_industry,employee_count,tool_count,has_legacy_tools,multi_cloud&tool_count=gt.0&limit=500') || [];
      let updated = 0;
      if (allCompanies.length >= 3) {
        const ranges = [
          { key: 'emp_100_300', min: 100, max: 300 },
          { key: 'emp_300_1000', min: 300, max: 1000 },
          { key: 'emp_all', min: 0, max: 100000 }
        ];
        for (const range of ranges) {
          const segment = allCompanies.filter((c: any) => (c.employee_count || 0) >= range.min && (c.employee_count || 0) < range.max);
          if (segment.length < 3) continue;
          const tools = segment.map((c: any) => c.tool_count).sort((a: number, b: number) => a - b);
          const conf = benchmarkConfidence(tools.length);
          const median = tools[Math.floor(tools.length / 2)];
          const p25 = tools[Math.floor(tools.length * 0.25)];
          const p75 = tools[Math.floor(tools.length * 0.75)];
          const existing = await q(`recon_benchmarks?segment_key=eq.${range.key}&metric_name=eq.tool_count&limit=1`);
          const bmData = { segment_key: range.key, metric_name: 'tool_count', sample_size: tools.length, min_val: tools[0], p25_val: p25, median_val: median, p75_val: p75, max_val: tools[tools.length - 1], confidence_level: conf, last_computed_at: new Date().toISOString() };
          if (existing?.length) {
            await q(`recon_benchmarks?id=eq.${existing[0].id}`, { method: 'PATCH', body: JSON.stringify(bmData) });
          } else {
            await q('recon_benchmarks', { method: 'POST', body: JSON.stringify(bmData) });
          }
          updated++;
        }
      }
      return NextResponse.json({ ok: true, segments_updated: updated, companies_scanned: allCompanies.length });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}
