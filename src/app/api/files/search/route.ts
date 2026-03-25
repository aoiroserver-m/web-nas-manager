import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { validatePath, toRelativePath, getExtension, isImageFile, isVideoFile, isNodeError } from "@/lib/pathUtils";
import { DATA_ROOT } from "@/lib/constants";
import type { FileInfo } from "@/types/files";

const MAX_RESULTS = 200;
const MAX_DEPTH = 10;

/**
 * GET /api/files/search?q=<query>&path=<scope>
 * Recursively searches for files/folders matching the query.
 */
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  const scopePath = request.nextUrl.searchParams.get("path") || "";

  if (!query || query.length < 1) {
    return NextResponse.json(
      { error: "INVALID_REQUEST", message: "Search query is required" },
      { status: 400 }
    );
  }

  try {
    const searchRoot = scopePath ? validatePath(scopePath) : DATA_ROOT;
    const results: (FileInfo & { path: string })[] = [];
    const lowerQuery = query.toLowerCase();

    // 再帰的にディレクトリを走査
    async function walk(dirPath: string, depth: number) {
      if (depth > MAX_DEPTH || results.length >= MAX_RESULTS) return;

      let entries;
      try {
        entries = await fs.readdir(dirPath, { withFileTypes: true });
      } catch {
        return;
      }

      for (const entry of entries) {
        if (results.length >= MAX_RESULTS) break;
        if (entry.name.startsWith(".")) continue;

        const entryPath = path.join(dirPath, entry.name);

        // ファイル名がクエリにマッチするか
        if (entry.name.toLowerCase().includes(lowerQuery)) {
          try {
            const stat = await fs.stat(entryPath);
            const isDir = entry.isDirectory();
            const ext = getExtension(entry.name);
            const relativePath = toRelativePath(entryPath);

            results.push({
              name: entry.name,
              type: isDir ? "directory" : "file",
              size: isDir ? 0 : stat.size,
              modified: stat.mtime.toISOString(),
              extension: isDir ? "" : ext,
              isImage: !isDir && isImageFile(entry.name),
              isVideo: !isDir && isVideoFile(entry.name),
              thumbnailUrl:
                !isDir && (isImageFile(entry.name) || isVideoFile(entry.name))
                  ? `/api/thumbnail?path=${encodeURIComponent(relativePath)}`
                  : undefined,
              // 検索結果にはファイルのフルパスを含める
              path: relativePath,
            });
          } catch {
            // statに失敗したエントリはスキップ
          }
        }

        // サブディレクトリを再帰的に探索
        if (entry.isDirectory()) {
          await walk(entryPath, depth + 1);
        }
      }
    }

    await walk(searchRoot, 0);

    return NextResponse.json({
      query,
      results,
      total: results.length,
      truncated: results.length >= MAX_RESULTS,
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Access denied")) {
      return NextResponse.json(
        { error: "ACCESS_DENIED", message: err.message },
        { status: 403 }
      );
    }

    if (isNodeError(err) && err.code === "ENOENT") {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Search path not found" },
        { status: 404 }
      );
    }

    console.error("GET /api/files/search error:", err);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Search failed" },
      { status: 500 }
    );
  }
}
