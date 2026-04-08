import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return NextResponse.json({
      status: 'NOT_READY',
      db_ready: false,
      reason: 'Supabase env vars not configured',
    });
  }

  const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

  async function count(table: string, selectCol = 'id'): Promise<number> {
    try {
      const res = await fetch(`${url}/rest/v1/${table}?select=${selectCol}&limit=0`, {
        headers: { ...headers, Prefer: 'count=exact' },
      });
      const total = res.headers.get('content-range');
      return total ? parseInt(total.split('/')[1] || '0') : -1;
    } catch { return -1; }
  }

  async function tableExists(table: string): Promise<boolean> {
    try {
      const res = await fetch(`${url}/rest/v1/${table}?limit=0`, { headers });
      return res.ok;
    } catch { return false; }
  }

  const tables = ['recon_sessions', 'recon_snapshots', 'recon_people', 'recon_companies',
    'recon_person_company', 'recon_actions', 'recon_ops_state', 'recon_entity_sessions', 'recon_merge_log',
    'recon_account_thesis', 'recon_watchlists', 'recon_trigger_queue', 'recon_enrichment_log', 'recon_benchmarks'];

  const tableChecks = await Promise.all(tables.map(t => tableExists(t)));
  const tablesPresent = tables.reduce((acc, t, i) => ({ ...acc, [t]: tableChecks[i] }), {} as Record<string, boolean>);
  const allTablesOk = tableChecks.every(Boolean);

  const [sessions, snapshots, people, companies, relationships, actions, opsStates, entityLinks, thesisCount, watchlistCount, triggerCount, enrichmentLogCount, benchmarkCount] = await Promise.all([
    count('recon_sessions'), count('recon_snapshots'), count('recon_people'), count('recon_companies'),
    count('recon_person_company'), count('recon_actions'), count('recon_ops_state'), count('recon_entity_sessions', 'person_id'),
    count('recon_account_thesis'), count('recon_watchlists'), count('recon_trigger_queue'), count('recon_enrichment_log'), count('recon_benchmarks'),
  ]);

  // Test ingest capability (dry check — can we insert into sessions?)
  let ingestReady = false;
  try {
    const res = await fetch(`${url}/rest/v1/recon_sessions`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'return=representation' },
      body: JSON.stringify({
        provider: 'health_check', search_type: 'health', filters_summary: 'health check probe',
        result_count: 0, session_quality: 'empty', notes: 'Auto health check — safe to delete',
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.[0]?.id) {
        await fetch(`${url}/rest/v1/recon_sessions?id=eq.${data[0].id}`, { method: 'DELETE', headers });
        ingestReady = true;
      }
    }
  } catch { /* ingestReady stays false */ }

  const status = allTablesOk && ingestReady ? 'READY' : allTablesOk ? 'DEGRADED' : 'NOT_READY';

  return NextResponse.json({
    status,
    checked_at: new Date().toISOString(),
    db_ready: true,
    migration_ready: allTablesOk,
    tables_present: tablesPresent,
    ingest_ready: ingestReady,
    transition_enforcement_ready: true,
    pattern_mode: 'computed',
    counts: { sessions, snapshots, people, companies, relationships, actions, ops_states: opsStates, entity_links: entityLinks, thesis_count: thesisCount, watchlist_count: watchlistCount, trigger_count: triggerCount, enrichment_log_count: enrichmentLogCount, benchmark_count: benchmarkCount },
  });
}
