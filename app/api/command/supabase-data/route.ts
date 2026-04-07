import { NextResponse } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET() {
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!sbUrl || !sbKey) {
    return NextResponse.json(
      { vault_sessions: [], osint_prospects: [] },
      { status: 200 }
    );
  }

  const headers = {
    apikey: sbKey,
    Authorization: `Bearer ${sbKey}`,
  };

  try {
    const [vaultRes, osintRes] = await Promise.all([
      fetch(
        `${sbUrl}/rest/v1/vault_sessions?select=company_name,ghost_tax_annual,headcount,industry,country&order=created_at.desc&limit=8`,
        { headers }
      ),
      fetch(
        `${sbUrl}/rest/v1/osint_prospects?select=company_name,industry,headcount,exposure_low_eur,exposure_high_eur,geo_market,intent_score&order=intent_score.desc&limit=10`,
        { headers }
      ),
    ]);

    const vault_sessions = vaultRes.ok ? await vaultRes.json() : [];
    const osint_prospects = osintRes.ok ? await osintRes.json() : [];

    return NextResponse.json({ vault_sessions, osint_prospects });
  } catch {
    return NextResponse.json(
      { vault_sessions: [], osint_prospects: [] },
      { status: 200 }
    );
  }
}
