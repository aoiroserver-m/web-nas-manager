import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import { validatePath, isNodeError, isRawFile, getExtension } from "@/lib/pathUtils";
import { extractRawJpeg } from "@/lib/rawUtils";
import type { ImageMetadata } from "@/types/metadata";

/**
 * GET /api/files/metadata?path=<relativePath>
 * Returns EXIF/GPS metadata for an image file.
 * RAWファイルは部分読み込みで埋め込みJPEGからEXIFを取得。
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

    // RAWファイルは埋め込みJPEGを抽出してEXIF取得（CR3はISOBMFF形式のでファイル全体を読む）
    // その他のファイルはファイル全体をバッファとして渡す
    const ext = getExtension(absolutePath);
    let parseBuffer: Buffer;
    if (isRawFile(absolutePath) && ext !== ".cr3") {
      const embedded = await extractRawJpeg(absolutePath, ext);
      if (!embedded) {
        return NextResponse.json({ metadata: null });
      }
      parseBuffer = embedded;
    } else {
      parseBuffer = await fs.readFile(absolutePath);
    }

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

    if (!exif) {
      return NextResponse.json({ metadata: null });
    }

    let shutterSpeed: string | undefined;
    if (exif.ExposureTime) {
      if (exif.ExposureTime >= 1) {
        shutterSpeed = `${exif.ExposureTime}s`;
      } else {
        shutterSpeed = `1/${Math.round(1 / exif.ExposureTime)}s`;
      }
    }

    const metadata: ImageMetadata = {};

    if (exif.Make || exif.Model) {
      metadata.camera = { make: exif.Make, model: exif.Model };
    }

    if (exif.LensModel) {
      metadata.lens = exif.LensModel;
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
    if (dt) {
      metadata.datetime = dt instanceof Date ? dt.toISOString() : String(dt);
    }

    const w = exif.ExifImageWidth || exif.ImageWidth;
    const h = exif.ExifImageHeight || exif.ImageHeight;
    if (w && h) {
      metadata.dimensions = { width: w, height: h };
    }

    return NextResponse.json({ metadata });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Access denied")) {
      return NextResponse.json(
        { error: "ACCESS_DENIED", message: err.message },
        { status: 403 }
      );
    }

    if (isNodeError(err) && err.code === "ENOENT") {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "File not found" },
        { status: 404 }
      );
    }

    console.error("GET /api/files/metadata error:", err);
    return NextResponse.json({ metadata: null });
  }
}
