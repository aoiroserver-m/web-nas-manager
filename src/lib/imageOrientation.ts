/**
 * EXIF Orientation (1–8) を sharp.rotate(deg) の角度へ（時計回りが正）。
 * https://sirv.com/help/articles/rotate-photos-to-be-upright/
 */
const ORIENTATION_TO_DEGREES: Record<number, number> = {
  1: 0,
  2: 0,
  3: 180,
  4: 180,
  5: 90,
  6: 90,
  7: 270,
  8: 270,
};

export function orientationTagToRotationDegrees(tag: number): number | undefined {
  if (tag < 1 || tag > 8) return undefined;
  const deg = ORIENTATION_TO_DEGREES[tag];
  return deg === 0 ? undefined : deg;
}

type OrientRead = "unknown" | "normal" | number;

async function readOrientationDegrees(buf: Buffer): Promise<OrientRead> {
  const exifr = await import("exifr");
  try {
    const o = await exifr.default.orientation(buf);
    if (typeof o !== "number" || o < 1 || o > 8) return "unknown";
    if (o === 1 || o === 2) return "normal";
    const deg = ORIENTATION_TO_DEGREES[o];
    return deg !== 0 ? deg : "normal";
  } catch {
    return "unknown";
  }
}

/**
 * 画素バッファ（サムネ元）を先に見る。Orientation=1 と分かればコンテナを見ない（二重回転防止）。
 * 画素に向き情報が無いときだけ HEIC 本体など additional を参照する。
 */
export async function resolveExifRotationDegrees(
  pixelBuffer: Buffer,
  additionalSources: Buffer[] = []
): Promise<number | undefined> {
  const exifr = await import("exifr");

  const pixel = await readOrientationDegrees(pixelBuffer);
  if (pixel === "normal") return undefined;
  if (typeof pixel === "number") return pixel;

  for (const buf of additionalSources) {
    if (!buf?.length || buf === pixelBuffer) continue;
    const r = await readOrientationDegrees(buf);
    if (r === "normal") return undefined;
    if (typeof r === "number") return r;
  }

  for (const buf of [pixelBuffer, ...additionalSources]) {
    if (!buf?.length) continue;
    try {
      const rot = await exifr.default.rotation(buf);
      if (rot && typeof rot.deg === "number") {
        const n = ((rot.deg % 360) + 360) % 360;
        if (n !== 0) return rot.deg;
      }
    } catch {
      continue;
    }
  }

  return undefined;
}
