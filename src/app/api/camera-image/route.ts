import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/camera-image?make=Canon&model=EOS+R5
 * DuckDuckGo 画像検索でカメラ製品写真を取得する（APIキー不要）。
 * フォールバック: Wikipedia pageimages
 */
export async function GET(request: NextRequest) {
  const make = request.nextUrl.searchParams.get("make") ?? "";
  const model = request.nextUrl.searchParams.get("model") ?? "";

  if (!make && !model) {
    return NextResponse.json({ url: null });
  }

  const query = `${make} ${model} camera`.trim();

  // 1. DuckDuckGo 画像検索を試みる
  const ddgUrl = await fetchDuckDuckGoImage(query);
  if (ddgUrl) {
    return NextResponse.json(
      { url: ddgUrl },
      { headers: { "Cache-Control": "public, max-age=86400" } }
    );
  }

  // 2. フォールバック: Wikipedia pageimages
  const wikiUrl = await fetchWikipediaImage(query);
  return NextResponse.json(
    { url: wikiUrl },
    { headers: { "Cache-Control": "public, max-age=86400" } }
  );
}

async function fetchDuckDuckGoImage(query: string): Promise<string | null> {
  try {
    // Step 1: vqd トークンを取得
    const searchPageRes = await fetch(
      `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
        },
        signal: AbortSignal.timeout(6000),
      }
    );

    const html = await searchPageRes.text();
    const vqdMatch = html.match(/vqd=['"]([^'"]+)['"]/);
    if (!vqdMatch) return null;
    const vqd = vqdMatch[1];

    // Step 2: 画像検索 API
    const imgRes = await fetch(
      `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${encodeURIComponent(vqd)}&f=,,,,,&p=1`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Referer": "https://duckduckgo.com/",
          "Accept": "application/json",
        },
        signal: AbortSignal.timeout(6000),
      }
    );

    if (!imgRes.ok) return null;
    const data = await imgRes.json() as { results?: { image: string; thumbnail: string }[] };
    const results = data.results ?? [];

    // 最初の有効な画像 URL を返す（thumbnail より image の方が高画質）
    for (const r of results.slice(0, 5)) {
      if (r.image && r.image.startsWith("http")) return r.image;
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchWikipediaImage(query: string): Promise<string | null> {
  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=3&origin=*`;
    const searchRes = await fetch(searchUrl, {
      headers: { "User-Agent": "NASManager/1.0" },
      signal: AbortSignal.timeout(5000),
    });
    const searchData = await searchRes.json() as {
      query: { search: { pageid: number }[] };
    };

    const results = searchData.query?.search ?? [];
    if (results.length === 0) return null;

    const pageId = results[0].pageid;
    const imageUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&pithumbsize=400&pageids=${pageId}&format=json&origin=*`;
    const imageRes = await fetch(imageUrl, {
      headers: { "User-Agent": "NASManager/1.0" },
      signal: AbortSignal.timeout(5000),
    });
    const imageData = await imageRes.json() as {
      query: { pages: Record<string, { thumbnail?: { source: string } }> };
    };

    return imageData.query?.pages?.[String(pageId)]?.thumbnail?.source ?? null;
  } catch {
    return null;
  }
}
