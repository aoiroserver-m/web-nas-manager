import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const execFileAsync = promisify(execFile);

/**
 * macOS の sips で HEIC → JPEG 変換。
 */
async function decodeHeicWithSips(absolutePath: string): Promise<Buffer | null> {
  if (process.platform !== "darwin") return null;
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "web-nas-heic-"));
  const outPath = path.join(tmp, "preview.jpg");
  try {
    await execFileAsync(
      "/usr/bin/sips",
      ["-s", "format", "jpeg", absolutePath, "--out", outPath],
      { maxBuffer: 512 * 1024 }
    );
    const buf = await fs.readFile(outPath);
    if (buf.length > 64) return buf;
  } catch {
    /* sips 失敗（権限・破損ファイルなど） */
  } finally {
    await fs.rm(tmp, { recursive: true, force: true }).catch(() => {});
  }
  return null;
}

/**
 * macOS Quick Look（qlmanage）で HEIC → PNG 変換。
 */
async function decodeHeicWithQlmanage(absolutePath: string): Promise<Buffer | null> {
  if (process.platform !== "darwin") return null;
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "web-nas-ql-"));
  try {
    await execFileAsync(
      "/usr/bin/qlmanage",
      ["-t", "-s", "1024", "-o", tmp, absolutePath],
      { maxBuffer: 2 * 1024 * 1024 }
    );
    const files = await fs.readdir(tmp);
    const img = files.find((f) => f.endsWith(".png") || f.endsWith(".jpg") || f.endsWith(".jpeg"));
    if (!img) return null;
    const buf = await fs.readFile(path.join(tmp, img));
    return buf.length > 64 ? buf : null;
  } catch {
    return null;
  } finally {
    await fs.rm(tmp, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * libheif-js（WASM）で HEIC → JPEG 変換。
 * ネイティブツール不要、Linux / macOS どちらでも動く。
 */
async function decodeHeicWithLibheifJs(absolutePath: string): Promise<Buffer | null> {
  try {
    // CJS モジュールなので .default でアクセス
    const libheif = (await import("libheif-js")).default as typeof import("libheif-js");
    const fileBuffer = await fs.readFile(absolutePath);
    const decoder = new libheif.HeifDecoder();
    const data = decoder.decode(fileBuffer);
    if (!data || data.length === 0) return null;

    const image = data[0];
    const width: number = image.get_width();
    const height: number = image.get_height();

    const imageData = { data: new Uint8ClampedArray(width * height * 4), width, height };
    const rgba = await new Promise<Uint8ClampedArray>((resolve, reject) => {
      image.display(imageData, (result: { data: Uint8ClampedArray } | null) => {
        if (!result) reject(new Error("display failed"));
        else resolve(result.data);
      });
    });

    const sharp = (await import("sharp")).default;
    return sharp(Buffer.from(rgba.buffer), { raw: { width, height, channels: 4 } })
      .jpeg({ quality: 85 })
      .toBuffer();
  } catch {
    return null;
  }
}

/**
 * Linux の heif-convert で HEIC → JPEG 変換。
 * sudo apt install libheif-examples でインストール可能。
 */
async function decodeHeicWithHeifConvert(absolutePath: string): Promise<Buffer | null> {
  if (process.platform !== "linux") return null;
  const candidates = ["/usr/bin/heif-convert", "heif-convert", "/usr/local/bin/heif-convert"];
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "web-nas-heic-"));
  const outPath = path.join(tmp, "preview.jpg");
  try {
    for (const bin of candidates) {
      try {
        await execFileAsync(bin, [absolutePath, outPath], { maxBuffer: 512 * 1024 });
        const buf = await fs.readFile(outPath);
        if (buf.length > 64) return buf;
      } catch {
        /* このバイナリは使えない、次を試す */
      }
    }
  } finally {
    await fs.rm(tmp, { recursive: true, force: true }).catch(() => {});
  }
  return null;
}

/**
 * ffmpeg で HEIC → JPEG（Linux / macOS どちらでも動く）。
 */
async function decodeHeicWithFfmpeg(absolutePath: string): Promise<Buffer | null> {
  const candidates =
    process.platform === "darwin"
      ? ["/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg", "ffmpeg"]
      : ["/usr/bin/ffmpeg", "/usr/local/bin/ffmpeg", "ffmpeg"];

  for (const bin of candidates) {
    try {
      await execFileAsync(bin, ["-version"], { maxBuffer: 4096 });
    } catch {
      continue;
    }
    try {
      const { stdout } = await execFileAsync(
        bin,
        [
          "-hide_banner", "-loglevel", "error",
          "-i", absolutePath,
          "-vframes", "1",
          "-f", "image2pipe",
          "-vcodec", "mjpeg",
          "-",
        ],
        { maxBuffer: 40 * 1024 * 1024, encoding: "buffer" }
      );
      if (stdout.length > 64) return stdout;
    } catch {
      /* デコーダ不足など */
    }
  }
  return null;
}

/**
 * HEIC を OS のツールで JPEG/PNG に変換して返す。
 * macOS: sips → qlmanage → ffmpeg
 * Linux: heif-convert → ffmpeg
 */
export async function decodeHeicWithSystemTools(absolutePath: string): Promise<Buffer | null> {
  return (
    (await decodeHeicWithSips(absolutePath)) ??
    (await decodeHeicWithQlmanage(absolutePath)) ??
    (await decodeHeicWithLibheifJs(absolutePath)) ??
    (await decodeHeicWithHeifConvert(absolutePath)) ??
    (await decodeHeicWithFfmpeg(absolutePath))
  );
}
