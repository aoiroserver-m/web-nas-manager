import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { validatePath, sanitizeFilename, validateChildPath } from "@/lib/pathUtils";

/**
 * POST /api/files/copy
 * Copies a file or directory to the specified destination directory.
 * Body: { sourcePath: string, destDir: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourcePath, destDir } = body;

    if (!sourcePath || !destDir || typeof sourcePath !== "string" || typeof destDir !== "string") {
      return NextResponse.json(
        { error: "INVALID_REQUEST", message: "sourcePath and destDir are required" },
        { status: 400 }
      );
    }

    const absoluteSource = validatePath(sourcePath);
    const absoluteDestDir = validatePath(destDir);

    // ソースが存在するか確認
    await fs.stat(absoluteSource);

    // 宛先フォルダが存在するか確認
    const destDirStat = await fs.stat(absoluteDestDir);
    if (!destDirStat.isDirectory()) {
      return NextResponse.json(
        { error: "INVALID_DEST", message: "Destination must be a directory" },
        { status: 400 }
      );
    }

    const fileName = path.basename(absoluteSource);
    const safeName = sanitizeFilename(fileName);
    const absoluteDest = validateChildPath(absoluteDestDir, safeName);

    // 宛先に同名ファイルが存在しないことを確認
    try {
      await fs.access(absoluteDest);
      return NextResponse.json(
        { error: "ALREADY_EXISTS", message: "A file or folder with this name already exists in the destination" },
        { status: 409 }
      );
    } catch {
      // 存在しなければOK
    }

    // 再帰的にコピー
    await fs.cp(absoluteSource, absoluteDest, { recursive: true });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Access denied")) {
      return NextResponse.json(
        { error: "ACCESS_DENIED", message: err.message },
        { status: 403 }
      );
    }

    console.error("POST /api/files/copy error:", err);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Failed to copy" },
      { status: 500 }
    );
  }
}
