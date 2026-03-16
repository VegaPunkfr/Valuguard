/**
 * GHOST TAX — COMMAND INGEST API
 *
 * Receives platform events and stores them for the Founder Mission Control.
 * Protected by COMMAND_SECRET — only internal systems can push events.
 *
 * This is the ONLY entry point for external data into the command system.
 * The command cockpit reads these events on the client side and processes
 * them through the bridge (lib/command/bridge.ts).
 *
 * POST /api/command/ingest
 * Headers: Authorization: Bearer <COMMAND_SECRET>
 * Body: PlatformEvent JSON
 */

import { NextResponse, type NextRequest } from 'next/server';

export const runtime = 'nodejs';

interface IngestPayload {
  type: string;
  domain: string;
  email?: string;
  companyName?: string;
  contactName?: string;
  headcount?: number;
  industry?: string;
  country?: string;
  data?: Record<string, unknown>;
}

const VALID_TYPES = [
  'lead_captured',
  'scan_requested',
  'scan_completed',
  'payment_completed',
  'checkout_abandoned',
  'report_generated',
  'contact_form_submitted',
  'high_intent_detected',
  'return_visit',
  'memo_copied',
];

export async function POST(request: NextRequest) {
  // Auth check
  const secret = process.env.COMMAND_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  }

  const authHeader = request.headers.get('authorization');
  const bearerToken = authHeader?.replace('Bearer ', '');
  const queryKey = request.nextUrl.searchParams.get('key');

  if (bearerToken !== secret && queryKey !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse body
  let body: IngestPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Validate
  if (!body.type || !body.domain) {
    return NextResponse.json({ error: 'Missing required fields: type, domain' }, { status: 400 });
  }

  if (!VALID_TYPES.includes(body.type)) {
    return NextResponse.json({ error: `Invalid event type. Valid: ${VALID_TYPES.join(', ')}` }, { status: 400 });
  }

  // Domain validation
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/;
  if (!domainRegex.test(body.domain)) {
    return NextResponse.json({ error: 'Invalid domain format' }, { status: 400 });
  }

  // Store event in Supabase (if available) for persistence
  // The command cockpit reads from localStorage but events are also
  // persisted server-side for durability
  try {
    const { createAdminSupabase } = await import('@/lib/supabase');
    const supabase = createAdminSupabase();

    if (supabase) {
      await (supabase as any).from('command_events').insert({
        event_type: body.type,
        domain: body.domain,
        email: body.email || null,
        company_name: body.companyName || null,
        contact_name: body.contactName || null,
        headcount: body.headcount || null,
        industry: body.industry || null,
        country: body.country || null,
        event_data: body.data || {},
        processed: false,
        created_at: new Date().toISOString(),
      }).then(() => {});
    }
  } catch {
    // Supabase not available — event still accepted
    // The cockpit will process it client-side
  }

  return NextResponse.json({
    ok: true,
    event: {
      type: body.type,
      domain: body.domain,
      timestamp: new Date().toISOString(),
    },
  });
}

// PATCH — mark events as processed (after ACCEPT/DISMISS in cockpit)
export async function PATCH(request: NextRequest) {
  const secret = process.env.COMMAND_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  }

  const queryKey = request.nextUrl.searchParams.get('key');
  const cookieKey = request.cookies.get('gt-command-key')?.value;

  if (queryKey !== secret && cookieKey !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { ids: number[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
    return NextResponse.json({ error: 'Missing ids array' }, { status: 400 });
  }

  try {
    const { createAdminSupabase } = await import('@/lib/supabase');
    const supabase = createAdminSupabase();

    if (supabase) {
      await (supabase as any)
        .from('command_events')
        .update({ processed: true, processed_at: new Date().toISOString() })
        .in('id', body.ids);
    }

    return NextResponse.json({ ok: true, marked: body.ids.length });
  } catch {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

// GET — fetch unprocessed events (for cockpit polling)
export async function GET(request: NextRequest) {
  const secret = process.env.COMMAND_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  }

  const queryKey = request.nextUrl.searchParams.get('key');
  const cookieKey = request.cookies.get('gt-command-key')?.value;

  if (queryKey !== secret && cookieKey !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { createAdminSupabase } = await import('@/lib/supabase');
    const supabase = createAdminSupabase();

    if (!supabase) {
      return NextResponse.json({ events: [] });
    }

    const { data: events } = await (supabase as any)
      .from('command_events')
      .select('*')
      .eq('processed', false)
      .order('created_at', { ascending: false })
      .limit(50);

    return NextResponse.json({ events: events || [] });
  } catch {
    return NextResponse.json({ events: [] });
  }
}
