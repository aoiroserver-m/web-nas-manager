import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import { validatePath, isNodeError, isRawFile, getExtension } from "@/lib/pathUtils";
import { extractRawJpeg } from "@/lib/rawUtils";
import { extractMetadataWithExiftool, formatExposureTime } from "@/lib/exiftoolMetadata";
import type { ImageMetadata } from "@/types/metadata";

/**
 * GET /api/files/metadata?path=<relativePath>
 * Returns EXIF/GPS metadata for an image file.
 * 優先順位: exifr（高速） → exiftool（CR3等の未対応形式のフォールバック）
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

    // --- exifr で試みる ---
    let exifrResult: ImageMetadata | null = null;
    try {
      let parseBuffer: Buffer;
      if (isRawFile(absolutePath)) {
        const embedded = await extractRawJpeg(absolutePath, ext);
        if (embedded) parseBuffer = embedded;
        else parseBuffer = Buffer.alloc(0); // 空バッファ → exifr が null を返す
      } else {
        parseBuffer = await fs.readFile(absolutePath);
      }

      if (parseBuffer.length > 0) {
        const exifr = await import("exifr");
        const exif = await exifr.default.parse(parseBuffer, {
          pick: [
            "Make", "Model", "LensModel",
            "ISO", "FNumber", "ExposureTime", "FocalLength",
            "GPSLatitude", "GPSLongitude", "GPSAltitude",
            "DateTimeOriginal", "CreateDate",
            "ImageWidth", "ImageHeight", "ExifImageWidth", "ExifImageHeight",
          ],
          translateValues: true,
        });

        if (exif) {
          exifrResult = buildMetadata(exif);
        }
      }
    } catch {
      // exifr 失敗 → exiftool にフォールバック
    }

    if (exifrResult && hasUsefulData(exifrResult)) {
      return NextResponse.json({ metadata: exifrResult });
    }

    // --- exiftool フォールバック（CR3・特殊TIFFなど）---
    const raw = await extractMetadataWithExiftool(absolutePath);
    if (!raw) {
      return NextResponse.json({ metadata: exifrResult ?? null });
    }

    const metadata: ImageMetadata = {};

    if (raw.Make || raw.Model) {
      metadata.camera = { make: raw.Make, model: raw.Model };
    }
    if (raw.LensModel || raw.LensInfo) {
      metadata.lens = raw.LensModel ?? raw.LensInfo;
    }

    const shutterSpeed = formatExposureTime(raw.ExposureTime);
    const focalLength = typeof raw.FocalLength === "string"
      ? parseFloat(raw.FocalLength)
      : raw.FocalLength;

    if (raw.ISO || raw.FNumber || raw.ExposureTime || raw.FocalLength) {
      metadata.settings = {
        iso: raw.ISO,
        aperture: raw.FNumber,
        shutterSpeed,
        focalLength,
      };
    }

    if (raw.GPSLatitude != null && raw.GPSLongitude != null) {
      metadata.gps = {
        latitude: raw.GPSLatitude,
        longitude: raw.GPSLongitude,
        altitude: typeof raw.GPSAltitude === "string"
          ? parseFloat(raw.GPSAltitude)
          : raw.GPSAltitude,
      };
    }

    const dt = raw.DateTimeOriginal ?? raw.CreateDate;
    if (dt) metadata.datetime = dt;

    const w = raw.ExifImageWidth ?? raw.ImageWidth;
    const h = raw.ExifImageHeight ?? raw.ImageHeight;
    if (w && h) metadata.dimensions = { width: w, height: h };

    return NextResponse.json({ metadata });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Access denied")) {
      return NextResponse.json({ error: "ACCESS_DENIED", message: err.message }, { status: 403 });
    }
    if (isNodeError(err) && err.code === "ENOENT") {
      return NextResponse.json({ error: "NOT_FOUND", message: "File not found" }, { status: 404 });
    }
    console.error("GET /api/files/metadata error:", err);
    return NextResponse.json({ metadata: null });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildMetadata(exif: Record<string, any>): ImageMetadata {
  const metadata: ImageMetadata = {};

  if (exif.Make || exif.Model) {
    metadata.camera = { make: exif.Make, model: exif.Model };
  }
  if (exif.LensModel) metadata.lens = exif.LensModel;

  let shutterSpeed: string | undefined;
  if (exif.ExposureTime) {
    shutterSpeed = exif.ExposureTime >= 1
      ? `${exif.ExposureTime}s`
      : `1/${Math.round(1 / exif.ExposureTime)}s`;
  }

  if (exif.ISO || exif.FNumber || exif.ExposureTime || exif.FocalLength) {
    metadata.settings = {
      iso: exif.ISO,
      aperture: exif.FNumber,
      shutterSpeed,
      focalLength: exif.FocalLength,
    };
  }

  if (exif.GPSLatitude != null && exif.GPSLongitude != null) {
    metadata.gps = {
      latitude: typeof exif.GPSLatitude === "number" ? exif.GPSLatitude : exif.latitude,
      longitude: typeof exif.GPSLongitude === "number" ? exif.GPSLongitude : exif.longitude,
      altitude: exif.GPSAltitude,
    };
  }

  const dt = exif.DateTimeOriginal || exif.CreateDate;
  if (dt) metadata.datetime = dt instanceof Date ? dt.toISOString() : String(dt);

  const w = exif.ExifImageWidth || exif.ImageWidth;
  const h = exif.ExifImageHeight || exif.ImageHeight;
  if (w && h) metadata.dimensions = { width: w, height: h };

  return metadata;
}

function hasUsefulData(m: ImageMetadata): boolean {
  return !!(m.camera || m.settings || m.lens || m.datetime || m.dimensions);
}
