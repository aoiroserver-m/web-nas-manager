import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import { createReadStream } from "fs";
import path from "path";
import { Readable } from "stream";
import { validatePath, isNodeError } from "@/lib/pathUtils";

/**
 * GET /api/files/download?path=<relativePath>
 * Downloads a file with Content-Disposition: attachment.
 * ストリーミングで返すため、大容量ファイルでもメモリを圧迫しない。
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const requestedPath = searchParams.get("path");

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
        { error: "IS_DIRECTORY", message: "Cannot download a directory" },
        { status: 400 }
      );
    }

    const filename = path.basename(absolutePath);
    const nodeStream = createReadStream(absolutePath);
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;

    return new Response(webStream, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Content-Length": stat.size.toString(),
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

    console.error("GET /api/files/download error:", err);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Download failed" },
      { status: 500 }
    );
  }
}
