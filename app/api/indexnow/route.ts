// Server-only — IndexNow API for instant Bing/Yandex indexing
import { NextResponse, type NextRequest } from "next/server";

const INDEXNOW_KEY = "2ddb109598fcb9f87cc47c58b2f5b32d";
const HOST = "https://ghost-tax.com";

const CORE_URLS = [
  "/",
  "/platform",
  "/pricing",
  "/intel",
  "/methodology",
  "/security-vault",
  "/about",
  "/faq",
  "/ghost-tax",
  "/contact",
  "/intel-benchmarks",
  "/procurement",
  "/estimator",
  "/case-studies",
  "/integrations",
];

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || !authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const urlList = CORE_URLS.map((path) => `${HOST}${path}`);

  try {
    const res = await fetch("https://api.indexnow.org/IndexNow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        host: "ghost-tax.com",
        key: INDEXNOW_KEY,
        keyLocation: `${HOST}/${INDEXNOW_KEY}.txt`,
        urlList,
      }),
    });

    return NextResponse.json({
      status: res.status,
      submitted: urlList.length,
      message: res.status === 200 ? "Submitted to IndexNow" : "IndexNow response: " + res.statusText,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "IndexNow submission failed", detail: String(error) },
      { status: 500 }
    );
  }
}
