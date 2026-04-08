/**
 * INTEL TAPE — Apollo Search Memory System
 *
 * GET  /api/command/intel-tape — list sessions + entities
 * POST /api/command/intel-tape — log a session with results + upsert entities
 *
 * Protected by COMMAND_SECRET via middleware.
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url, key };
}

async function sbFetch(path: string, options: RequestInit = {}) {
  const sb = getSupabase();
  if (!sb) return null;
  const res = await fetch(`${sb.url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: sb.key,
      Authorization: `Bearer ${sb.key}`,
      'Content-Type': 'application/json',
      Prefer: options.method === 'POST' ? 'return=representation' : 'return=minimal',
      ...((options.headers as Record<string, string>) || {}),
    },
  });
  if (!res.ok) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// ── Dedupe key generation ──
function dedupeKey(entity: { name?: string; email?: string; company?: string; domain?: string }): string {
  const email = entity.email?.toLowerCase().trim();
  if (email) return `email:${email}`;
  const name = (entity.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const company = (entity.company || entity.domain || '').toLowerCase().replace(/[^a-z0-9.]/g, '');
  return `name:${name}@${company}`;
}

// ── GET: List sessions and/or entities ──
export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get('type') || 'sessions';
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '50'), 100);
  const offset = parseInt(req.nextUrl.searchParams.get('offset') || '0');
  const search = req.nextUrl.searchParams.get('q') || '';
  const status = req.nextUrl.searchParams.get('status') || '';

  const sb = getSupabase();

  if (type === 'sessions') {
    if (!sb) return NextResponse.json({ sessions: [], source: 'none' });
    const sessions = await sbFetch(
      `intel_search_sessions?select=*&order=created_at.desc&limit=${limit}&offset=${offset}`
    );
    return NextResponse.json({ sessions: sessions || [], source: 'supabase' });
  }

  if (type === 'entities') {
    if (!sb) return NextResponse.json({ entities: [], source: 'none' });
    let query = `intel_canonical_entities?select=*&order=last_seen_at.desc&limit=${limit}&offset=${offset}`;
    if (search) query += `&or=(canonical_name.ilike.*${encodeURIComponent(search)}*,canonical_company.ilike.*${encodeURIComponent(search)}*,canonical_email.ilike.*${encodeURIComponent(search)}*)`;
    if (status) query += `&contact_status=eq.${encodeURIComponent(status)}`;
    const entities = await sbFetch(query);
    return NextResponse.json({ entities: entities || [], source: 'supabase' });
  }

  if (type === 'session_detail') {
    const sessionId = req.nextUrl.searchParams.get('session_id');
    if (!sessionId || !sb) return NextResponse.json({ snapshots: [] });
    const snapshots = await sbFetch(
      `intel_result_snapshots?session_id=eq.${sessionId}&order=rank_in_results.asc&limit=100`
    );
    return NextResponse.json({ snapshots: snapshots || [] });
  }

  if (type === 'entity_detail') {
    const entityId = req.nextUrl.searchParams.get('entity_id');
    if (!entityId || !sb) return NextResponse.json({ entity: null, sessions: [], enrichments: [] });
    const [entity, sessions, enrichments] = await Promise.all([
      sbFetch(`intel_canonical_entities?id=eq.${entityId}&limit=1`),
      sbFetch(`intel_entity_sessions?entity_id=eq.${entityId}&select=*,intel_search_sessions(*)&order=appeared_at.desc`),
      sbFetch(`intel_enrichment_events?entity_id=eq.${entityId}&order=created_at.desc&limit=20`),
    ]);
    return NextResponse.json({
      entity: entity?.[0] || null,
      sessions: sessions || [],
      enrichments: enrichments || [],
    });
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
}

// ── POST: Log session + snapshots + upsert entities ──
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { session, results } = body;

    if (!session) {
      return NextResponse.json({ error: 'Missing session data' }, { status: 400 });
    }

    const sb = getSupabase();
    if (!sb) {
      return NextResponse.json({
        ok: true,
        stored: false,
        message: 'Supabase not configured — data not persisted',
        session_id: null,
      });
    }

    // 1. Insert search session
    const sessionData = {
      provider: session.provider || 'apollo',
      search_type: session.search_type || 'people_search',
      query_payload: session.query_payload || {},
      filters_summary: session.filters_summary || '',
      trigger_source: session.trigger_source || 'manual',
      result_count: results?.length || 0,
      enrichment_flags: session.enrichment_flags || {},
      notes: session.notes || '',
      status: 'completed',
    };

    const insertedSession = await sbFetch('intel_search_sessions', {
      method: 'POST',
      body: JSON.stringify(sessionData),
    });

    const sessionId = insertedSession?.[0]?.id;
    if (!sessionId) {
      return NextResponse.json({ ok: false, error: 'Failed to create session' }, { status: 500 });
    }

    // 2. Insert result snapshots + upsert canonical entities
    const entityIds: string[] = [];

    if (results && Array.isArray(results)) {
      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        const dk = dedupeKey({
          name: r.name,
          email: r.email,
          company: r.company,
          domain: r.domain,
        });

        // Insert snapshot
        await sbFetch('intel_result_snapshots', {
          method: 'POST',
          body: JSON.stringify({
            session_id: sessionId,
            entity_type: r.entity_type || 'person',
            external_id: r.external_id || '',
            raw_payload: r.raw_payload || r,
            normalized: {
              name: r.name,
              email: r.email,
              title: r.title,
              company: r.company,
              domain: r.domain,
              country: r.country,
              industry: r.industry,
              headcount: r.headcount,
            },
            rank_in_results: i + 1,
            source_method: r.source_method || 'search',
            has_email: !!r.email,
            has_phone: !!r.phone,
          }),
        });

        // Upsert canonical entity
        const existing = await sbFetch(
          `intel_canonical_entities?dedupe_key=eq.${encodeURIComponent(dk)}&limit=1`
        );

        if (existing && existing.length > 0) {
          // Update existing
          const ent = existing[0];
          await sbFetch(`intel_canonical_entities?id=eq.${ent.id}`, {
            method: 'PATCH',
            headers: { Prefer: 'return=minimal' } as Record<string, string>,
            body: JSON.stringify({
              last_seen_at: new Date().toISOString(),
              last_enriched_at: r.email ? new Date().toISOString() : ent.last_enriched_at,
              appearance_count: (ent.appearance_count || 0) + 1,
              search_session_count: (ent.search_session_count || 0) + 1,
              canonical_email: r.email || ent.canonical_email,
              canonical_title: r.title || ent.canonical_title,
              tech_stack: r.tech_stack || ent.tech_stack,
              updated_at: new Date().toISOString(),
            }),
          });
          entityIds.push(ent.id);

          // Link entity to session
          await sbFetch('intel_entity_sessions', {
            method: 'POST',
            body: JSON.stringify({ entity_id: ent.id, session_id: sessionId }),
          }).catch(() => {}); // ignore duplicate
        } else {
          // Insert new entity
          const newEntity = await sbFetch('intel_canonical_entities', {
            method: 'POST',
            body: JSON.stringify({
              entity_type: r.entity_type || 'person',
              canonical_name: r.name || 'Unknown',
              canonical_email: r.email || null,
              canonical_title: r.title || null,
              canonical_company: r.company || null,
              canonical_domain: r.domain || null,
              canonical_country: r.country || null,
              canonical_industry: r.industry || null,
              external_ids: r.external_id ? [r.external_id] : [],
              dedupe_key: dk,
              contact_status: 'new',
              tech_stack: r.tech_stack || [],
              reusable_tags: r.tags || [],
            }),
          });

          if (newEntity?.[0]?.id) {
            entityIds.push(newEntity[0].id);
            await sbFetch('intel_entity_sessions', {
              method: 'POST',
              body: JSON.stringify({ entity_id: newEntity[0].id, session_id: sessionId }),
            }).catch(() => {});
          }
        }
      }
    }

    return NextResponse.json({
      ok: true,
      stored: true,
      session_id: sessionId,
      entities_processed: entityIds.length,
      source: 'supabase',
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
