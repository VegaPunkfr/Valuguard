import { NextRequest, NextResponse } from "next/server";

const INDEXNOW_KEY = "ghost-tax-indexnow-2026";

export async function GET() {
  // Return the key for verification
  return new NextResponse(INDEXNOW_KEY, { headers: { "Content-Type": "text/plain" } });
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") || "";
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const urls: string[] = body.urls || [];

  if (urls.length === 0) {
    return NextResponse.json({ error: "No URLs provided" }, { status: 400 });
  }

  // Submit to IndexNow (Bing + Yandex + Naver)
  const payload = {
    host: "ghost-tax.com",
    key: INDEXNOW_KEY,
    keyLocation: "https://ghost-tax.com/api/indexnow",
    urlList: urls.map(u => u.startsWith("http") ? u : `https://ghost-tax.com${u}`),
  };

  const results = await Promise.allSettled([
    fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
    fetch("https://www.bing.com/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  ]);

  return NextResponse.json({
    submitted: urls.length,
    results: results.map((r, i) => ({
      endpoint: i === 0 ? "indexnow.org" : "bing.com",
      status: r.status === "fulfilled" ? r.value.status : "failed",
    })),
  });
}
