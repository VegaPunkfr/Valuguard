/**
 * GET /api/command/supabase-public-config
 *
 * Retourne l'URL + anon key Supabase (valeurs publiques) au module
 * GhostRealtime côté browser. Utilisé par J4 Live Supabase realtime.
 *
 * Rationale: les env vars NEXT_PUBLIC_* ne sont embarquées dans le bundle
 * que pour les routes/pages rendues par Next.js. Le cockpit-v6.html est
 * servi comme static asset depuis public/ — il n'a pas accès aux env vars
 * sans endpoint intermédiaire. Ces clés sont publiques (RLS protège les
 * tables), donc pas d'enjeu sécurité.
 */

import { NextResponse } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return NextResponse.json(
      { error: "Supabase public config not configured" },
      { status: 503 }
    );
  }

  return NextResponse.json(
    { url, anonKey },
    {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    }
  );
}
