/// <reference types="vite/client" />

declare module 'jsqr' {
  export interface QRCode {
    binaryData: number[];
    data: string;
    chunks: any[];
    location: {
      topRightCorner: { x: number; y: number };
      topLeftCorner: { x: number; y: number };
      bottomRightCorner: { x: number; y: number };
      bottomLeftCorner: { x: number; y: number };
    };
  }
  export default function jsQR(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    options?: { inversionAttempts?: 'dontInvert' | 'onlyInvert' | 'both' | 'attemptBoth' }
  ): QRCode | null;
}

declare class BarcodeDetector {
  constructor(options?: { formats: string[] });
  static getSupportedFormats(): Promise<string[]>;
  detect(image: ImageBitmapSource): Promise<Array<{ rawValue: string; format: string }>>;
}

interface Window {
  BarcodeDetector?: typeof BarcodeDetector;
}
