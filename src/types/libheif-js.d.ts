declare module "libheif-js" {
  interface HeifImageData {
    data: Uint8ClampedArray;
    width: number;
    height: number;
  }
  class HeifImage {
    get_width(): number;
    get_height(): number;
    display(imageData: HeifImageData, callback: (result: HeifImageData | null) => void): void;
  }
  class HeifDecoder {
    decode(data: Uint8Array | Buffer): HeifImage[];
  }
}
