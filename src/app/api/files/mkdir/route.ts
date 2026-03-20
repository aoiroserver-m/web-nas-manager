import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import { validatePath, sanitizeFilename, validateChildPath, toRelativePath, isNodeError } from "@/lib/pathUtils";

/**
 * POST /api/files/mkdir
 * Creates a new directory.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path: targetPath, name } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "INVALID_REQUEST", message: "Folder name is required" },
        { status: 400 }
      );
    }

    // フォルダ名をサニタイズし、パスを検証
    const safeName = sanitizeFilename(name);
    const parentDir = validatePath(targetPath || "");
    const newDirPath = validateChildPath(parentDir, safeName);

    await fs.mkdir(newDirPath, { recursive: false });

    return NextResponse.json({
      success: true,
      path: toRelativePath(newDirPath),
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
        { error: "INVALID_NAME", message: "Invalid folder name" },
        { status: 400 }
      );
    }

    if (isNodeError(err) && err.code === "EEXIST") {
      return NextResponse.json(
        { error: "ALREADY_EXISTS", message: "Folder already exists" },
        { status: 409 }
      );
    }

    console.error("POST /api/files/mkdir error:", err);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Failed to create folder" },
      { status: 500 }
    );
  }
}
