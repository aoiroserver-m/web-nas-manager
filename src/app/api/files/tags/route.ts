import { NextRequest, NextResponse } from "next/server";
import { toRelativePath, validatePath } from "@/lib/pathUtils";
import {
  getFileTags,
  updateFileTags,
  getFavorites,
  getFilesByTag,
  getAllTags,
} from "@/lib/tagsDb";

/**
 * GET /api/files/tags?path=<filePath>
 * GET /api/files/tags?favorites=true
 * GET /api/files/tags?tag=<tagName>
 * GET /api/files/tags?list=true (all tags)
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  try {
    // 全タグ一覧
    if (params.get("list") === "true") {
      const tags = await getAllTags();
      return NextResponse.json({ tags });
    }

    // お気に入り一覧
    if (params.get("favorites") === "true") {
      const favorites = await getFavorites();
      return NextResponse.json({ favorites });
    }

    // 特定タグのファイル一覧
    const tag = params.get("tag");
    if (tag) {
      const files = await getFilesByTag(tag);
      return NextResponse.json({ tag, files });
    }

    // 特定ファイルのタグ取得
    const filePath = params.get("path");
    if (!filePath) {
      return NextResponse.json(
        { error: "INVALID_REQUEST", message: "path, favorites, tag, or list parameter required" },
        { status: 400 }
      );
    }

    // パス検証
    validatePath(filePath);
    const data = await getFileTags(filePath);
    return NextResponse.json({ path: filePath, ...data });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Access denied")) {
      return NextResponse.json(
        { error: "ACCESS_DENIED", message: err.message },
        { status: 403 }
      );
    }

    console.error("GET /api/files/tags error:", err);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Failed to get tags" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/files/tags
 * Body: { path: string, favorite?: boolean, tags?: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path: filePath, favorite, tags } = body;

    if (!filePath) {
      return NextResponse.json(
        { error: "INVALID_REQUEST", message: "Path is required" },
        { status: 400 }
      );
    }

    // パス検証
    validatePath(filePath);

    const updateData: { favorite?: boolean; tags?: string[] } = {};
    if (favorite !== undefined) updateData.favorite = favorite;
    if (tags !== undefined) updateData.tags = tags;

    const updated = await updateFileTags(filePath, updateData);
    return NextResponse.json({ success: true, path: filePath, ...updated });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Access denied")) {
      return NextResponse.json(
        { error: "ACCESS_DENIED", message: err.message },
        { status: 403 }
      );
    }

    console.error("POST /api/files/tags error:", err);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Failed to update tags" },
      { status: 500 }
    );
  }
}
