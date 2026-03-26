import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/camera-image?make=Canon&model=EOS+R5
 * Wikipedia の REST API でカメラ製品写真を検索して返す。
 */
export async function GET(request: NextRequest) {
  const make = request.nextUrl.searchParams.get("make") ?? "";
  const model = request.nextUrl.searchParams.get("model") ?? "";

  if (!make && !model) {
    return NextResponse.json({ url: null });
  }

  try {
    // 1. Wikipedia search API でカメラページを検索
    const query = `${make} ${model}`.trim();
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query + " camera")}&format=json&srlimit=3&origin=*`;

    const searchRes = await fetch(searchUrl, {
      headers: { "User-Agent": "NASManager/1.0" },
      signal: AbortSignal.timeout(5000),
    });
    const searchData = await searchRes.json() as {
      query: { search: { pageid: number; title: string }[] }
    };

    const results = searchData.query?.search ?? [];
    if (results.length === 0) return NextResponse.json({ url: null });

    // 2. 最初のヒットのページ画像を取得
    const pageId = results[0].pageid;
    const imageUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&pithumbsize=300&pageids=${pageId}&format=json&origin=*`;

    const imageRes = await fetch(imageUrl, {
      headers: { "User-Agent": "NASManager/1.0" },
      signal: AbortSignal.timeout(5000),
    });
    const imageData = await imageRes.json() as {
      query: { pages: Record<string, { thumbnail?: { source: string } }> }
    };

    const page = imageData.query?.pages?.[String(pageId)];
    const thumbUrl = page?.thumbnail?.source ?? null;

    return NextResponse.json(
      { url: thumbUrl },
      { headers: { "Cache-Control": "public, max-age=86400" } }
    );
  } catch {
    return NextResponse.json({ url: null });
  }
}
