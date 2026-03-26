import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export interface ExiftoolOutput {
  Make?: string;
  Model?: string;
  LensModel?: string;
  LensInfo?: string;
  ISO?: number;
  FNumber?: number;
  ExposureTime?: number | string;
  FocalLength?: string | number;
  GPSLatitude?: number;
  GPSLongitude?: number;
  GPSAltitude?: number | string;
  DateTimeOriginal?: string;
  CreateDate?: string;
  ImageWidth?: number;
  ImageHeight?: number;
  ExifImageWidth?: number;
  ExifImageHeight?: number;
}

/**
 * exiftool コマンドを使ってメタデータをJSONで取得する。
 * exifr が対応していない CR3 / 特殊TIFFなどのフォールバック。
 */
export async function extractMetadataWithExiftool(absolutePath: string): Promise<ExiftoolOutput | null> {
  try {
    const { stdout } = await execFileAsync("exiftool", [
      "-json",
      "-Make", "-Model", "-LensModel", "-LensInfo",
      "-ISO", "-FNumber", "-ExposureTime", "-FocalLength",
      "-GPSLatitude#", "-GPSLongitude#", "-GPSAltitude#",
      "-DateTimeOriginal", "-CreateDate",
      "-ImageWidth", "-ImageHeight", "-ExifImageWidth", "-ExifImageHeight",
      absolutePath,
    ], { timeout: 10000 });

    const parsed = JSON.parse(stdout) as ExiftoolOutput[];
    return parsed[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * exiftool の ExposureTime 値（"1/100" や 0.01 など）をシャッタースピード文字列に変換。
 */
export function formatExposureTime(value: string | number | undefined): string | undefined {
  if (value == null) return undefined;
  if (typeof value === "string") {
    // "1/100" 形式はそのまま返す
    if (value.includes("/")) return `${value}s`;
    const n = parseFloat(value);
    if (isNaN(n)) return undefined;
    value = n;
  }
  if (value >= 1) return `${value}s`;
  return `1/${Math.round(1 / value)}s`;
}
