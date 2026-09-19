import jsQR from 'jsqr';

export interface QrScanResult {
  text: string;
  source: 'barcode-detector' | 'jsqr';
}

/**
 * Scan a video frame using native BarcodeDetector or jsQR
 */
export async function scanQrFromVideo(video: HTMLVideoElement): Promise<string | null> {
  if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || video.videoWidth === 0 || video.videoHeight === 0) {
    return null;
  }

  // 1. Try native BarcodeDetector if available (hardware accelerated)
  if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
    try {
      const barcodeDetector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
      const barcodes = await barcodeDetector.detect(video);
      if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
        const raw = barcodes[0].rawValue.trim();
        if (raw) return raw;
      }
    } catch (_) {
      // Fall through to jsQR
    }
  }

  // 2. Fallback to jsQR with dynamic resolution scaling
  try {
    const canvas = document.createElement('canvas');
    // Optimal scanning resolution for QR in real-time camera is 480-640px width
    const targetWidth = Math.min(640, video.videoWidth);
    const scale = targetWidth / video.videoWidth;
    canvas.width = targetWidth;
    canvas.height = Math.round(video.videoHeight * scale);

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'attemptBoth',
    });

    if (code && code.data && code.data.trim()) {
      return code.data.trim();
    }
  } catch (err) {
    console.warn('jsQR video scan error:', err);
  }

  return null;
}

/**
 * Scan a static HTMLCanvasElement directly using native BarcodeDetector or jsQR
 */
export async function scanQrFromCanvas(canvas: HTMLCanvasElement): Promise<string | null> {
  if (!canvas || canvas.width === 0 || canvas.height === 0) return null;

  // 1. Native BarcodeDetector
  if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
    try {
      const barcodeDetector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
      const barcodes = await barcodeDetector.detect(canvas);
      if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
        const raw = barcodes[0].rawValue.trim();
        if (raw) return raw;
      }
    } catch (_) {
      // Fall through
    }
  }

  // 2. jsQR on canvas image data
  try {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (ctx) {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imgData.data, imgData.width, imgData.height, {
        inversionAttempts: 'attemptBoth',
      });
      if (code && code.data && code.data.trim()) {
        return code.data.trim();
      }
    }
  } catch (err) {
    console.warn('scanQrFromCanvas error:', err);
  }

  return null;
}

/**
 * Scan a static image element or data URL using multi-scale attempts
 */
export async function scanQrFromImage(img: HTMLImageElement): Promise<string | null> {
  if (!img.naturalWidth || !img.naturalHeight) return null;

  // 1. Try native BarcodeDetector on image element
  if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
    try {
      const barcodeDetector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
      const barcodes = await barcodeDetector.detect(img);
      if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
        return barcodes[0].rawValue.trim();
      }
    } catch (_) {
      // Fall through
    }
  }

  // 2. Multi-scale jsQR passes (phones take 12MP photos; downscale to 800px, 1200px, then original if smaller)
  const candidateScales = [
    Math.min(1, 800 / Math.max(img.naturalWidth, img.naturalHeight)),
    Math.min(1, 1200 / Math.max(img.naturalWidth, img.naturalHeight)),
    1,
  ];

  const uniqueScales = Array.from(new Set(candidateScales.filter((s) => s > 0 && s <= 1)));

  for (const scale of uniqueScales) {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) continue;

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth',
      });

      if (code && code.data && code.data.trim()) {
        return code.data.trim();
      }
    } catch (_) {
      // Try next scale
    }
  }

  return null;
}

/**
 * Read File blob as image and extract QR
 */
export async function scanQrFromFile(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = async () => {
        const text = await scanQrFromImage(img);
        resolve(text);
      };
      img.onerror = () => resolve(null);
      img.src = reader.result as string;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}
