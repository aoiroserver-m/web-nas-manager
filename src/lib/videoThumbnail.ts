import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const execFileAsync = promisify(execFile);

function ffmpegCandidates(): string[] {
  const base = ["ffmpeg"];
  if (process.platform === "darwin") {
    return [...base, "/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg"];
  }
  return [...base, "/usr/bin/ffmpeg"];
}

async function extractWithFfmpeg(absolutePath: string, ffmpegBin: string): Promise<Buffer | null> {
  try {
    const { stdout } = await execFileAsync(
      ffmpegBin,
      [
        "-hide_banner",
        "-loglevel",
        "error",
        "-nostdin",
        "-ss",
        "0.25",
        "-i",
        absolutePath,
        "-frames:v",
        "1",
        "-f",
        "image2pipe",
        "-vcodec",
        "mjpeg",
        "-q:v",
        "2",
        "-",
      ],
      { maxBuffer: 40 * 1024 * 1024 }
    );
    if (Buffer.isBuffer(stdout) && stdout.length > 64) return stdout;
  } catch {
    /* デコーダ不足・パス問題など */
  }
  return null;
}

/**
 * macOS Quick Look（ffmpeg 無しでも動きやすい）。
 * GUI から起動した Node と違い PATH に依存しない。
 */
async function extractWithQlmanage(absolutePath: string): Promise<Buffer | null> {
  if (process.platform !== "darwin") return null;
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "web-nas-ql-"));
  try {
    await execFileAsync("/usr/bin/qlmanage", ["-t", "-s", "1024", "-o", tmp, absolutePath], {
      maxBuffer: 2 * 1024 * 1024,
    });
    const files = await fs.readdir(tmp);
    const png = files.find((f) => f.endsWith(".png"));
    if (!png) return null;
    const buf = await fs.readFile(path.join(tmp, png));
    return buf.length > 64 ? buf : null;
  } catch {
    return null;
  } finally {
    await fs.rm(tmp, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * 動画の代表フレームをビットマップとして返す（JPEG または PNG）。
 * ffmpeg を複数候補パスで試し、ダメなら macOS は qlmanage にフォールバック。
 */
export async function extractVideoFrameJpeg(absolutePath: string): Promise<Buffer | null> {
  for (const bin of ffmpegCandidates()) {
    try {
      await execFileAsync(bin, ["-version"], { maxBuffer: 4096 });
    } catch {
      continue;
    }
    const out = await extractWithFfmpeg(absolutePath, bin);
    if (out) return out;
  }

  return extractWithQlmanage(absolutePath);
}
