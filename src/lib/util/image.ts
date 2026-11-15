// A blob: URL shares the page's origin, so only raster types get one: a script in an SVG or HTML blob opened in its own tab would run as the host app.
const BLOB_URL_TYPES = /^image\/(png|jpeg|gif|webp|avif|bmp)$/i;

export function createImageBitmapSafe(
  blob?: Blob | null | undefined,
): Promise<ImageBitmap | null> {
  if (!blob) return Promise.resolve(null);
  return createImageBitmap(blob);
}

export function createImageUrlSafe(
  blob?: Blob | null | undefined,
): Promise<string | null> {
  if (!blob) return Promise.resolve(null);
  if (BLOB_URL_TYPES.test(blob.type)) return Promise.resolve(URL.createObjectURL(blob));
  return createImageDataUrl(blob);
}

export function revokeImageUrl(url: string | null) {
  if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
}

function createImageDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(blob);
  });
}
