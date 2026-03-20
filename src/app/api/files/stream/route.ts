import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import { createReadStream } from "fs";
import path from "path";
import { Readable } from "stream";
import { validatePath, isNodeError } from "@/lib/pathUtils";

const MIME_MAP: Record<string, string> = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".avi": "video/x-msvideo",
  ".mkv": "video/x-matroska",
  ".m4v": "video/x-m4v",
  ".wmv": "video/x-ms-wmv",
};

/**
 * GET /api/files/stream?path=<relativePath>
 * Streams a video file with Range Request support.
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
    const stat = await fs.stat(absolutePath);

    if (stat.isDirectory()) {
      return NextResponse.json(
        { error: "IS_DIRECTORY", message: "Cannot stream a directory" },
        { status: 400 }
      );
    }

    const ext = path.extname(absolutePath).toLowerCase();
    const contentType = MIME_MAP[ext] || "application/octet-stream";
    const fileSize = stat.size;
    const rangeHeader = request.headers.get("range");

    // Range Requestなしの場合は全体を返す
    if (!rangeHeader) {
      const stream = createReadStream(absolutePath);
      const webStream = Readable.toWeb(stream) as ReadableStream;

      return new Response(webStream, {
        headers: {
          "Content-Type": contentType,
          "Content-Length": fileSize.toString(),
          "Accept-Ranges": "bytes",
        },
      });
    }

    // Range Requestの解析
    const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
    if (!match) {
      return new Response("Invalid range", { status: 416 });
    }

    const start = parseInt(match[1], 10);
    const end = match[2] ? parseInt(match[2], 10) : Math.min(start + 1024 * 1024 - 1, fileSize - 1);
    const chunkSize = end - start + 1;

    if (start >= fileSize || end >= fileSize) {
      return new Response("Range not satisfiable", {
        status: 416,
        headers: { "Content-Range": `bytes */${fileSize}` },
      });
    }

    const stream = createReadStream(absolutePath, { start, end });
    const webStream = Readable.toWeb(stream) as ReadableStream;

    return new Response(webStream, {
      status: 206,
      headers: {
        "Content-Type": contentType,
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Content-Length": chunkSize.toString(),
        "Accept-Ranges": "bytes",
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
        { error: "NOT_FOUND", message: "File not found" },
        { status: 404 }
      );
    }

    console.error("GET /api/files/stream error:", err);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Streaming failed" },
      { status: 500 }
    );
  }
}
