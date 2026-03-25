import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { validatePath, toRelativePath, getExtension, isImageFile, isVideoFile, buildBreadcrumbs, isNodeError } from "@/lib/pathUtils";
import type { FileInfo, DirectoryListing } from "@/types/files";

/**
 * GET /api/files?path=<relativePath>
 * Returns directory listing for the given path.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const requestedPath = searchParams.get("path") || "";

  try {
    const absolutePath = validatePath(requestedPath);
    const stat = await fs.stat(absolutePath);

    if (!stat.isDirectory()) {
      return NextResponse.json(
        { error: "NOT_DIRECTORY", message: "Path is not a directory" },
        { status: 400 }
      );
    }

    const entries = await fs.readdir(absolutePath, { withFileTypes: true });
    const results = await Promise.all(
      entries
        .filter((entry) => !entry.name.startsWith("."))
        .map(async (entry): Promise<FileInfo | null> => {
          const entryPath = path.join(absolutePath, entry.name);
          let entryStat;
          try {
            entryStat = await fs.stat(entryPath);
          } catch {
            // シンボリックリンク先が存在しない場合などをスキップ
            return null;
          }

          const ext = getExtension(entry.name);
          const isDir = entry.isDirectory();
          const entryRelativePath = toRelativePath(entryPath);

          return {
            name: entry.name,
            type: isDir ? "directory" : "file",
            size: isDir ? 0 : entryStat.size,
            modified: entryStat.mtime.toISOString(),
            extension: isDir ? "" : ext,
            isImage: !isDir && isImageFile(entry.name),
            isVideo: !isDir && isVideoFile(entry.name),
            thumbnailUrl:
              !isDir && (isImageFile(entry.name) || isVideoFile(entry.name))
                ? `/api/thumbnail?path=${encodeURIComponent(entryRelativePath)}`
                : undefined,
          };
        })
    );

    // null（statに失敗したエントリ）を除外
    const validItems = results.filter((item): item is FileInfo => item !== null);

    const relativePath = toRelativePath(absolutePath);
    const listing: DirectoryListing = {
      path: relativePath,
      items: validItems,
      breadcrumbs: buildBreadcrumbs(relativePath),
    };

    return NextResponse.json(listing);
  } catch (err) {
    if (err instanceof Error && err.message.includes("Access denied")) {
      return NextResponse.json(
        { error: "ACCESS_DENIED", message: err.message },
        { status: 403 }
      );
    }

    if (isNodeError(err) && err.code === "ENOENT") {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Path not found" },
        { status: 404 }
      );
    }

    console.error("GET /api/files error:", err);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/files
 * Deletes a file or directory.
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { path: requestedPath } = body;

    if (!requestedPath) {
      return NextResponse.json(
        { error: "INVALID_REQUEST", message: "Path is required" },
        { status: 400 }
      );
    }

    const absolutePath = validatePath(requestedPath);
    const stat = await fs.stat(absolutePath);

    if (stat.isDirectory()) {
      await fs.rm(absolutePath, { recursive: true });
    } else {
      await fs.unlink(absolutePath);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Access denied")) {
      return NextResponse.json(
        { error: "ACCESS_DENIED", message: err.message },
        { status: 403 }
      );
    }

    console.error("DELETE /api/files error:", err);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Failed to delete" },
      { status: 500 }
    );
  }
}
