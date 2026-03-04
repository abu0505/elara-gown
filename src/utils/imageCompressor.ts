export interface CompressedImage {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  sizeKB: number;
  originalSizeKB: number;
  compressionRatio: string;
}

const TARGET_MAX_KB = 50;
const MAX_DIMENSION = 1200;
const INITIAL_QUALITY = 0.85;
const MIN_QUALITY = 0.10;
const QUALITY_STEP = 0.05;

export async function compressImageToWebP(file: File): Promise<CompressedImage> {
  const originalSizeKB = file.size / 1024;
  const img = await loadImageFromFile(file);
  const { width, height } = calculateDimensions(img.width, img.height, MAX_DIMENSION);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, width, height);

  let quality = INITIAL_QUALITY;
  let blob: Blob | null = null;

  while (quality >= MIN_QUALITY) {
    blob = await canvasToBlob(canvas, 'image/webp', quality);
    if (blob.size <= TARGET_MAX_KB * 1024) break;
    quality -= QUALITY_STEP;
  }

  if (blob!.size > TARGET_MAX_KB * 1024) {
    let scaleFactor = 0.9;
    while (blob!.size > TARGET_MAX_KB * 1024 && scaleFactor > 0.3) {
      const newW = Math.floor(width * scaleFactor);
      const newH = Math.floor(height * scaleFactor);
      canvas.width = newW;
      canvas.height = newH;
      ctx.drawImage(img, 0, 0, newW, newH);
      blob = await canvasToBlob(canvas, 'image/webp', MIN_QUALITY);
      scaleFactor -= 0.1;
    }
  }

  const finalBlob = blob!;
  const dataUrl = await blobToDataUrl(finalBlob);

  return {
    blob: finalBlob,
    dataUrl,
    width: canvas.width,
    height: canvas.height,
    sizeKB: Math.round(finalBlob.size / 1024 * 10) / 10,
    originalSizeKB: Math.round(originalSizeKB * 10) / 10,
    compressionRatio: `${Math.round((1 - finalBlob.size / file.size) * 100)}%`,
  };
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(img.src); resolve(img); };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function calculateDimensions(w: number, h: number, max: number) {
  if (w <= max && h <= max) return { width: w, height: h };
  const ratio = Math.min(max / w, max / h);
  return { width: Math.floor(w * ratio), height: Math.floor(h * ratio) };
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('Canvas to blob failed')),
      type,
      quality
    );
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
