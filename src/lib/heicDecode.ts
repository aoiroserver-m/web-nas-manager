import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const execFileAsync = promisify(execFile);

/**
 * HEIC を OS 標準ツールで JPEG に落とす（sharp の libheif が不足している環境向け）。
 * - macOS: sips（ほぼ確実）
 * - その他: ffmpeg が PATH にあれば試行
 */
export async function decodeHeicWithSystemTools(absolutePath: string): Promise<Buffer | null> {
  if (process.platform === "darwin") {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "web-nas-heic-"));
    const outPath = path.join(tmp, "preview.jpg");
    try {
      await execFileAsync("sips", ["-s", "format", "jpeg", absolutePath, "--out", outPath], {
        maxBuffer: 10 * 1024 * 1024,
      });
      const buf = await fs.readFile(outPath);
      if (buf.length > 64) return buf;
    } catch {
      /* sips 失敗（権限・破損ファイルなど） */
    } finally {
      await fs.rm(tmp, { recursive: true, force: true }).catch(() => {});
    }
  }

  try {
    const { stdout } = await execFileAsync(
      "ffmpeg",
      [
        "-hide_banner",
        "-loglevel",
        "error",
        "-i",
        absolutePath,
        "-vframes",
        "1",
        "-f",
        "image2pipe",
        "-vcodec",
        "mjpeg",
        "-",
      ],
      { maxBuffer: 40 * 1024 * 1024 }
    );
    if (Buffer.isBuffer(stdout) && stdout.length > 64) return stdout;
  } catch {
    /* ffmpeg なし / HEIC デコーダなし */
  }

  return null;
}
