import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import { createWriteStream } from "fs";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import Busboy from "busboy";
import { jwtVerify } from "jose";
import { validatePath, sanitizeFilename, validateChildPath, isNodeError } from "@/lib/pathUtils";
import { MAX_UPLOAD_SIZE } from "@/lib/constants";

export const maxDuration = 300;

function getSecret(): Uint8Array {
  const s = process.env.SESSION_SECRET || process.env.TOTP_SECRET || "fallback-secret";
  return new TextEncoder().encode(s);
}

async function verifyAuth(request: NextRequest): Promise<boolean> {
  if (!process.env.TOTP_SECRET) return true; // 認証未設定なら通す
  const token = request.cookies.get("nas-session")?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, getSecret());
    return true;
  } catch {
    return false;
  }
}

/**
 * POST /api/files/upload
 * Uploads a file via multipart form data (streaming, supports large files).
 */
export async function POST(request: NextRequest) {
  if (!(await verifyAuth(request))) {
    return NextResponse.json({ error: "UNAUTHORIZED", message: "認証が必要です" }, { status: 401 });
  }

  try {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json({ error: "INVALID_REQUEST", message: "multipart/form-data required" }, { status: 400 });
    }
    if (!request.body) {
      return NextResponse.json({ error: "INVALID_REQUEST", message: "No request body" }, { status: 400 });
    }
    return await streamUpload(request, contentType);
  } catch (err) {
    if (err instanceof Error && err.message.includes("Access denied")) {
      return NextResponse.json({ error: "ACCESS_DENIED", message: err.message }, { status: 403 });
    }
    if (err instanceof Error && err.message === "Invalid filename") {
      return NextResponse.json({ error: "INVALID_NAME", message: "Invalid filename" }, { status: 400 });
    }
    if (isNodeError(err) && err.code === "ENOENT") {
      return NextResponse.json({ error: "NOT_FOUND", message: "Upload directory not found" }, { status: 404 });
    }
    if (err instanceof Error && err.message === "FILE_TOO_LARGE") {
      return NextResponse.json({ error: "FILE_TOO_LARGE", message: "File exceeds 2GB limit" }, { status: 413 });
    }
    console.error("POST /api/files/upload error:", err);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: "Upload failed" }, { status: 500 });
  }
}

function streamUpload(request: NextRequest, contentType: string): Promise<NextResponse> {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: { "content-type": contentType }, limits: { fileSize: MAX_UPLOAD_SIZE } });

    let targetPath = "";
    // filePromise が resolve/reject するまで finish を待つ
    let filePromise: Promise<{ success: boolean; name: string; size: number }> | null = null;

    busboy.on("field", (name: string, value: string) => {
      if (name === "path") targetPath = value;
    });

    busboy.on("file", (_name: string, stream: NodeJS.ReadableStream, info: { filename: string }) => {
      const currentPath = targetPath; // fieldより先にfileイベントが来ることがあるため後でも読める
      filePromise = (async () => {
        const safeName = sanitizeFilename(info.filename);
        const dirPath = validatePath(currentPath);
        const filePath = validateChildPath(dirPath, safeName);

        await fs.mkdir(dirPath, { recursive: true });

        let size = 0;
        let fileTooLarge = false;
        const writeStream = createWriteStream(filePath);

        stream.on("data", (chunk: Buffer) => { size += chunk.length; });
        stream.on("limit", () => {
          fileTooLarge = true;
          // busboy が超過分を無視してくれるので stream.resume() は不要
        });

        await pipeline(stream as Readable, writeStream);

        if (fileTooLarge) {
          await fs.unlink(filePath).catch(() => {});
          throw new Error("FILE_TOO_LARGE");
        }

        return { success: true as const, name: safeName, size };
      })();
    });

    busboy.on("finish", async () => {
      try {
        if (!filePromise) return reject(new Error("No file provided"));
        const result = await filePromise;
        resolve(NextResponse.json(result));
      } catch (err) {
        reject(err);
      }
    });

    busboy.on("error", (err: Error) => reject(err));

    const nodeStream = Readable.fromWeb(request.body! as Parameters<typeof Readable.fromWeb>[0]);
    nodeStream.pipe(busboy);
  });
}
