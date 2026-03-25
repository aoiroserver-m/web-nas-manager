import { open, stat } from "fs/promises";

/**
 * Scan a buffer for the largest embedded JPEG (SOI … EOI).
 * Used for RAW previews and HEIC auxiliary JPEGs when sharp cannot decode HEIF.
 */
export function findLargestJpegInBuffer(scanBuf: Buffer, minSize: number): Buffer | null {
  let bestStart = -1;
  let bestSize = 0;
  let i = 0;

  while (i < scanBuf.length - 3) {
    if (scanBuf[i] === 0xFF && scanBuf[i + 1] === 0xD8 && scanBuf[i + 2] === 0xFF) {
      let advanced = false;
      for (let j = i + 3; j < scanBuf.length - 1; j++) {
        if (scanBuf[j] === 0xFF && scanBuf[j + 1] === 0xD9) {
          const size = j - i + 2;
          if (size > bestSize) {
            bestStart = i;
            bestSize = size;
          }
          i = j + 2;
          advanced = true;
          break;
        }
      }
      if (!advanced) i += 1;
    } else {
      i++;
    }
  }

  if (bestStart >= 0 && bestSize >= minSize) {
    return Buffer.from(scanBuf.subarray(bestStart, bestStart + bestSize));
  }

  return null;
}

/**
 * Read a specific range of bytes from a file without loading the entire file.
 */
async function readRange(filePath: string, offset: number, length: number): Promise<Buffer> {
  const fh = await open(filePath, "r");
  try {
    const buf = Buffer.alloc(length);
    await fh.read(buf, 0, length, offset);
    return buf;
  } finally {
    await fh.close();
  }
}

/**
 * Extract the embedded JPEG preview from a RAW file using partial reads.
 * RAFファイルはヘッダーの92バイトだけ読んでJPEGの位置を特定し、
 * そのJPEG部分のみを読み込む（200MBのRAF全体を読まない）。
 */
export async function extractRawJpeg(filePath: string, ext: string): Promise<Buffer | null> {
  try {
    // FUJIFILM RAF: ヘッダー92バイトからJPEGオフセットとサイズを取得
    if (ext === ".raf") {
      const header = await readRange(filePath, 0, 92);
      const magic = header.subarray(0, 16).toString("ascii");
      if (magic.startsWith("FUJIFILMCCD-RAW")) {
        const jpegOffset = header.readUInt32BE(84);
        const jpegLength = header.readUInt32BE(88);
        if (jpegOffset > 0 && jpegLength > 0) {
          const jpeg = await readRange(filePath, jpegOffset, jpegLength);
          if (jpeg[0] === 0xFF && jpeg[1] === 0xD8) {
            return jpeg;
          }
        }
      }
    }

    // その他のRAW: 先頭部分（最大20MB）からJPEGを探す
    // ほとんどのRAWフォーマットは先頭付近に埋め込みJPEGがある
    const SCAN_SIZE = 20 * 1024 * 1024;
    const scanBuf = await readRange(filePath, 0, SCAN_SIZE);
    return findLargestJpegInBuffer(scanBuf, 10240);
  } catch {
    return null;
  }
}

/**
 * HEIC: sharpのlibheifがその圧縮に対応していない環境がある。
 * 先頭付近に埋め込まれたJPEGプレビューを探してサムネイル元にする。
 */
export async function extractHeicEmbeddedJpeg(filePath: string): Promise<Buffer | null> {
  try {
    const st = await stat(filePath);
    const maxWhole = 64 * 1024 * 1024;
    const chunks: Buffer[] = [];

    if (st.size <= maxWhole) {
      chunks.push(await readRange(filePath, 0, Number(st.size)));
    } else {
      const head = 32 * 1024 * 1024;
      chunks.push(await readRange(filePath, 0, head));
      const tailLen = Math.min(12 * 1024 * 1024, st.size);
      chunks.push(await readRange(filePath, st.size - tailLen, tailLen));
    }

    for (const scanBuf of chunks) {
      for (const minSize of [4096, 2048, 1024, 512]) {
        const jpeg = findLargestJpegInBuffer(scanBuf, minSize);
        if (jpeg) return jpeg;
      }
    }
  } catch {
    return null;
  }
  return null;
}
