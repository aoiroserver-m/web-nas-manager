import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { validatePath, isNodeError, isRawFile, getExtension } from "@/lib/pathUtils";
import { THUMBNAIL_CACHE_DIR } from "@/lib/constants";
import { extractRawJpeg } from "@/lib/rawUtils";
import { createHash } from "crypto";

const THUMBNAIL_WIDTH = 800;
const THUMBNAIL_QUALITY = 80;

async function getSharp() {
  const mod = await import("sharp");
  return mod.default;
}

/**
 * GET /api/thumbnail?path=<relativePath>
 * Returns a thumbnail for the given image.
 * RAW: 部分読み込みで埋め込みJPEG抽出。HEIC/TIFF: sharp変換。通常画像: sharpリサイズ。
 */
export async function GET(request: NextRequest) {
  const requestedPath = request.nextUrl.searchParams.get("path");

  if (!requestedPath) {
    return NextResponse.json(
      { error: "INVALID_REQUEST", message: "Path is required" },
      { status: 400 }
    );
  }

  try {
    const absolutePath = validatePath(requestedPath);
    const ext = getExtension(absolutePath);

    // キャッシュチェック
    const hash = createHash("md5").update(absolutePath).digest("hex");
    const cachePath = path.join(THUMBNAIL_CACHE_DIR, `${hash}.jpg`);

    try {
      const cached = await fs.readFile(cachePath);
      return new NextResponse(new Uint8Array(cached), {
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "public, max-age=86400",
        },
      });
    } catch {
      // キャッシュなし
    }

    let thumbnailBuffer: Buffer;

    if (isRawFile(absolutePath)) {
      // RAWファイル: 部分読み込みで埋め込みJPEGを抽出
      const preview = await extractRawJpeg(absolutePath, ext);
      if (!preview) {
        return NextResponse.json(
          { error: "NO_PREVIEW", message: "No embedded preview in RAW file" },
          { status: 422 }
        );
      }

      const sharp = await getSharp();
      thumbnailBuffer = await sharp(preview)
        .resize(THUMBNAIL_WIDTH, undefined, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: THUMBNAIL_QUALITY })
        .toBuffer();
    } else if ([".svg"].includes(ext)) {
      return NextResponse.json(
        { error: "UNSUPPORTED", message: "SVG thumbnails not supported" },
        { status: 415 }
      );
    } else {
      // 通常画像/HEIC/TIFF: sharpでリサイズ
      const fileBuffer = await fs.readFile(absolutePath);
      const sharp = await getSharp();
      thumbnailBuffer = await sharp(fileBuffer)
        .resize(THUMBNAIL_WIDTH, undefined, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: THUMBNAIL_QUALITY })
        .toBuffer();
    }

    // キャッシュに保存
    try {
      await fs.mkdir(THUMBNAIL_CACHE_DIR, { recursive: true });
      await fs.writeFile(cachePath, thumbnailBuffer);
    } catch {
      // キャッシュ書き込み失敗は無視
    }

    return new NextResponse(new Uint8Array(thumbnailBuffer), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=86400",
      },
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
        { error: "NOT_FOUND", message: "Image not found" },
        { status: 404 }
      );
    }

    console.error("GET /api/thumbnail error:", err);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Thumbnail generation failed" },
      { status: 500 }
    );
  }
}
