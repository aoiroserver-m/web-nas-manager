import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { validatePath, sanitizeFilename, validateChildPath } from "@/lib/pathUtils";

/**
 * POST /api/files/rename
 * Renames a file or directory.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path: targetPath, newName } = body;

    if (!targetPath || !newName || typeof newName !== "string") {
      return NextResponse.json(
        { error: "INVALID_REQUEST", message: "Path and newName are required" },
        { status: 400 }
      );
    }

    // 新しい名前をサニタイズし、パスを検証
    const safeName = sanitizeFilename(newName);
    const absolutePath = validatePath(targetPath);
    const parentDir = path.dirname(absolutePath);
    const newPath = validateChildPath(parentDir, safeName);

    // リネーム先が既に存在しないことを確認
    try {
      await fs.access(newPath);
      return NextResponse.json(
        { error: "ALREADY_EXISTS", message: "A file or folder with this name already exists" },
        { status: 409 }
      );
    } catch {
      // 存在しなければOK
    }

    await fs.rename(absolutePath, newPath);

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Access denied")) {
      return NextResponse.json(
        { error: "ACCESS_DENIED", message: err.message },
        { status: 403 }
      );
    }

    if (err instanceof Error && err.message === "Invalid filename") {
      return NextResponse.json(
        { error: "INVALID_NAME", message: "Invalid name" },
        { status: 400 }
      );
    }

    console.error("POST /api/files/rename error:", err);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Failed to rename" },
      { status: 500 }
    );
  }
}
