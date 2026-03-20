import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { validatePath, isImageFile, isRawFile, getExtension, toRelativePath, isNodeError } from "@/lib/pathUtils";
import { extractRawJpeg } from "@/lib/rawUtils";

const MAX_FILES = 500;
const MAX_DEPTH = 8;

interface GpsPhoto {
  name: string;
  path: string;
  latitude: number;
  longitude: number;
  takenAt?: string;
  thumbnailUrl: string;
}

/**
 * GET /api/files/gps-scan?path=<relativePath>&recursive=true
 * Scans a directory for images with GPS data.
 * 各画像のEXIFからGPS座標を抽出して返す。
 */
export async function GET(request: NextRequest) {
  const requestedPath = request.nextUrl.searchParams.get("path") || "";
  const recursive = request.nextUrl.searchParams.get("recursive") !== "false";

  try {
    const scanRoot = validatePath(requestedPath);
    const results: GpsPhoto[] = [];

    const exifr = await import("exifr");

    async function scanDir(dirPath: string, depth: number) {
      if (depth > MAX_DEPTH || results.length >= MAX_FILES) return;

      let entries;
      try {
        entries = await fs.readdir(dirPath, { withFileTypes: true });
      } catch {
        return;
      }

      for (const entry of entries) {
        if (results.length >= MAX_FILES) break;
        if (entry.name.startsWith(".")) continue;

        const entryPath = path.join(dirPath, entry.name);

        if (entry.isDirectory() && recursive) {
          await scanDir(entryPath, depth + 1);
          continue;
        }

        if (!isImageFile(entry.name)) continue;

        try {
          const ext = getExtension(entry.name);
          let parseBuffer: Buffer;

          // RAWファイルは部分読み込みで埋め込みJPEGを取得
          if (isRawFile(entry.name)) {
            const embedded = await extractRawJpeg(entryPath, ext);
            if (!embedded) continue;
            parseBuffer = embedded;
          } else {
            // 通常画像: EXIFは先頭64KBに含まれるため部分読み込み
            const fh = await fs.open(entryPath, "r");
            try {
              const buf = Buffer.alloc(65536);
              await fh.read(buf, 0, 65536, 0);
              parseBuffer = buf;
            } finally {
              await fh.close();
            }
          }

          const exif = await exifr.default.parse(parseBuffer, {
            pick: ["GPSLatitude", "GPSLongitude", "DateTimeOriginal", "CreateDate"],
            translateValues: true,
          });

          if (!exif || exif.GPSLatitude == null || exif.GPSLongitude == null) continue;

          const relativePath = toRelativePath(entryPath);
          const lat = typeof exif.GPSLatitude === "number" ? exif.GPSLatitude : exif.latitude;
          const lng = typeof exif.GPSLongitude === "number" ? exif.GPSLongitude : exif.longitude;

          if (lat == null || lng == null) continue;

          const dt = exif.DateTimeOriginal || exif.CreateDate;

          results.push({
            name: entry.name,
            path: relativePath,
            latitude: lat,
            longitude: lng,
            takenAt: dt instanceof Date ? dt.toISOString() : dt ? String(dt) : undefined,
            thumbnailUrl: `/api/thumbnail?path=${encodeURIComponent(relativePath)}`,
          });
        } catch {
          // EXIF解析失敗はスキップ
        }
      }
    }

    await scanDir(scanRoot, 0);

    return NextResponse.json({
      path: requestedPath,
      photos: results,
      total: results.length,
      truncated: results.length >= MAX_FILES,
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
        { error: "NOT_FOUND", message: "Path not found" },
        { status: 404 }
      );
    }

    console.error("GET /api/files/gps-scan error:", err);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "GPS scan failed" },
      { status: 500 }
    );
  }
}
