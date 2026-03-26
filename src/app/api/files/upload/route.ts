import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import { validatePath, sanitizeFilename, validateChildPath, isNodeError } from "@/lib/pathUtils";
import { MAX_UPLOAD_SIZE } from "@/lib/constants";

/**
 * POST /api/files/upload
 * Uploads a file via multipart form data.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData() as unknown as { get(name: string): FormDataEntryValue | null };
    const file = formData.get("file") as File | null;
    const targetPath = formData.get("path") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "INVALID_REQUEST", message: "No file provided" },
        { status: 400 }
      );
    }

    if (file.size > MAX_UPLOAD_SIZE) {
      return NextResponse.json(
        { error: "FILE_TOO_LARGE", message: "File exceeds 2GB limit" },
        { status: 413 }
      );
    }

    // ファイル名をサニタイズし、ディレクトリパスを検証
    const safeName = sanitizeFilename(file.name);
    const dirPath = validatePath(targetPath || "");
    const filePath = validateChildPath(dirPath, safeName);

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    return NextResponse.json({
      success: true,
      name: safeName,
      size: file.size,
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Access denied")) {
      return NextResponse.json(
        { error: "ACCESS_DENIED", message: err.message },
        { status: 403 }
      );
    }

    if (err instanceof Error && err.message === "Invalid filename") {
      return NextResponse.json(
        { error: "INVALID_NAME", message: "Invalid filename" },
        { status: 400 }
      );
    }

    if (isNodeError(err) && err.code === "ENOENT") {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Upload directory not found" },
        { status: 404 }
      );
    }

    console.error("POST /api/files/upload error:", err);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Upload failed" },
      { status: 500 }
    );
  }
}
