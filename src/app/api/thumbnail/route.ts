import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { validatePath, isNodeError, isRawFile, isVideoFile, getExtension } from "@/lib/pathUtils";
import { THUMBNAIL_CACHE_DIR } from "@/lib/constants";
import { decodeHeicWithSystemTools } from "@/lib/heicDecode";
import { orientationTagToRotationDegrees, resolveExifRotationDegrees } from "@/lib/imageOrientation";
import { extractHeicEmbeddedJpeg, extractRawJpeg } from "@/lib/rawUtils";
import { extractVideoFrameJpeg } from "@/lib/videoThumbnail";
import { createHash } from "crypto";

const THUMBNAIL_WIDTH = 800;
const THUMBNAIL_QUALITY = 80;

/** サムネイル生成ロジック変更時に付け替えてキャッシュを無効化 */
const THUMBNAIL_CACHE_VERSION = "v4-orient-pixel-first";

async function getSharp() {
  const mod = await import("sharp");
  return mod.default;
}

type SharpFactory = Awaited<ReturnType<typeof getSharp>>;

/**
 * EXIF / HEIC の向きを反映してからリサイズ。
 * additionalSources: 画素に向きが無いときだけ参照（例: HEIC 本体）。画素が「正立」と言っている場合はコンテナを無視する。
 */
async function pipeThumbnail(
  sharpMod: SharpFactory,
  pixelBuffer: Buffer,
  additionalSources: Buffer[] = []
): Promise<Buffer> {
  let deg = await resolveExifRotationDegrees(pixelBuffer, additionalSources);
  if (deg === undefined) {
    try {
      const meta = await sharpMod(pixelBuffer).metadata();
      if (meta.orientation) {
        deg = orientationTagToRotationDegrees(meta.orientation);
      }
    } catch {
      /* ignore */
    }
  }

  let pipeline = sharpMod(pixelBuffer);
  if (deg !== undefined) {
    pipeline = pipeline.rotate(deg);
  } else {
    pipeline = pipeline.rotate();
  }
  return pipeline
    .resize(THUMBNAIL_WIDTH, undefined, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: THUMBNAIL_QUALITY })
    .toBuffer();
}

/**
 * GET /api/thumbnail?path=<relativePath>
 * Returns a thumbnail for the given image.
 * RAW / 画像 / HEIC: sharp。動画: ffmpeg で1フレーム取得後に同パイプライン。
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
    const hash = createHash("md5")
      .update(`${absolutePath}\0${THUMBNAIL_CACHE_VERSION}`)
      .digest("hex");
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
      thumbnailBuffer = await pipeThumbnail(sharp, preview, []);
    } else if (ext === ".heic" || ext === ".heif") {
      // HEIC: 配布版sharpのlibheifがHEVC等に未対応のことがある → 埋め込みJPEG経由でサムネイル化
      const fileBuffer = await fs.readFile(absolutePath);
      let preview: Buffer | null = null;

      try {
        const exifr = await import("exifr");
        const thumb = await exifr.default.thumbnail(fileBuffer);
        if (thumb && thumb.byteLength >= 100) {
          const b = Buffer.from(thumb);
          if (b[0] === 0xFF && b[1] === 0xD8) preview = b;
        }
      } catch {
        /* exifr は HEIC によってはサムネイルを返せない */
      }

      if (!preview) {
        preview = await extractHeicEmbeddedJpeg(absolutePath);
      }

      const sharp = await getSharp();
      if (preview) {
        thumbnailBuffer = await pipeThumbnail(sharp, preview, [fileBuffer]);
      } else {
        const systemJpeg = await decodeHeicWithSystemTools(absolutePath);
        if (systemJpeg) {
          thumbnailBuffer = await pipeThumbnail(sharp, systemJpeg, [fileBuffer]);
        } else {
          try {
            thumbnailBuffer = await pipeThumbnail(sharp, fileBuffer, []);
          } catch {
            return NextResponse.json(
              { error: "NO_PREVIEW", message: "HEIC preview not available in this environment" },
              { status: 422 }
            );
          }
        }
      }
    } else if (isVideoFile(absolutePath)) {
      const frame = await extractVideoFrameJpeg(absolutePath);
      if (!frame) {
        return NextResponse.json(
          {
            error: "NO_PREVIEW",
            message:
              "動画サムネイルを生成できませんでした（ffmpeg または macOS の Quick Look が使えない可能性があります）",
          },
          { status: 422 }
        );
      }
      const sharp = await getSharp();
      thumbnailBuffer = await pipeThumbnail(sharp, frame, []);
    } else if ([".svg"].includes(ext)) {
      return NextResponse.json(
        { error: "UNSUPPORTED", message: "SVG thumbnails not supported" },
        { status: 415 }
      );
    } else {
      // 通常画像/HEIC/TIFF: sharpでリサイズ
      const fileBuffer = await fs.readFile(absolutePath);
      const sharp = await getSharp();
      thumbnailBuffer = await pipeThumbnail(sharp, fileBuffer, []);
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
