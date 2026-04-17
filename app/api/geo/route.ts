/**
 * GET /api/geo
 *
 * Détection country côté serveur via headers Vercel Edge / Accept-Language.
 * Créé 17 avril 2026 pour résoudre le pricing mismatch DACH :
 *  - Landing affichait 490€ même aux Allemands
 *  - Stripe checkout facturait 590€
 *  - => 70% abandon DACH
 *
 * Usage côté client :
 *   const { country, isDACH, price } = await fetch('/api/geo').then(r => r.json())
 */

import { NextRequest, NextResponse } from "next/server";
import { getRailAPrice, type PricingLocale } from "@/lib/pricing";

export const runtime = "edge"; // edge = plus rapide + x-vercel-ip-country dispo

const DACH = new Set(["DE", "AT", "CH"]);

export async function GET(request: NextRequest) {
  const headers = request.headers;

  // 1. Vercel edge header (production)
  const vercelCountry = (headers.get("x-vercel-ip-country") || "").toUpperCase();

  // 2. Accept-Language fallback (dev + quand Vercel edge absent)
  const acceptLang = headers.get("accept-language") || "";
  let langCountry = "";
  const langMatch = acceptLang.match(/([a-z]{2})-([A-Z]{2})/);
  if (langMatch) langCountry = langMatch[2].toUpperCase();

  // 3. Fallback guess depuis langue primaire
  if (!vercelCountry && !langCountry) {
    if (acceptLang.toLowerCase().startsWith("de")) langCountry = "DE";
    else if (acceptLang.toLowerCase().startsWith("nl")) langCountry = "NL";
  }

  const country = vercelCountry || langCountry || "";
  const isDACH = DACH.has(country);

  // Locale suggérée depuis country
  const locale: PricingLocale =
    country === "DE" || country === "AT" || country === "CH"
      ? "de"
      : country === "FR" || country === "BE"
        ? "fr"
        : "en";

  const price = getRailAPrice(undefined, locale, country);

  return NextResponse.json({
    country,
    locale,
    isDACH,
    priceEur: price,
    priceFormatted: `${price.toLocaleString(locale === "en" ? "en-US" : "de-DE")} €`,
    source: vercelCountry ? "vercel-edge" : langCountry ? "accept-language" : "fallback",
  });
}
