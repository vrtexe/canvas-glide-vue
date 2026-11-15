import type { Transform } from 'canvas-glide';
import type { Size } from './size.js';

/** Sizes the canvas backing store to the viewport in device pixels and draws the image, or clears it when there is none. */
export function drawImage(
  canvas: HTMLCanvasElement,
  image: CanvasImageSource | null | undefined,
  transform: Transform,
  viewportSize: Size,
  contentSize: Size | null,
) {
  const context = canvas.getContext('2d');
  if (!context) return;

  // devicePixelRatio is not reactive: a change (window moved to another screen) is picked up on the next frame.
  const dpr = window.devicePixelRatio || 1;
  if (canvas.width !== Math.floor(viewportSize.width * dpr) || canvas.height !== Math.floor(viewportSize.height * dpr)) {
    canvas.width = viewportSize.width * dpr;
    canvas.height = viewportSize.height * dpr;
  }

  context.resetTransform();
  context.clearRect(0, 0, canvas.width, canvas.height);
  if (!image || !contentSize) return;

  const s = transform.scale * dpr;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.setTransform(s, 0, 0, s, -transform.origin.x * s, -transform.origin.y * s);
  context.drawImage(image, 0, 0, contentSize.width, contentSize.height);
}

/** Loads an image URL and returns its natural size, or null when it fails. */
export async function naturalSizeOf(url: string): Promise<Size | null> {
  const image = new Image();
  image.src = url;
  try {
    await image.decode();
    return { width: image.naturalWidth, height: image.naturalHeight };
  } catch {
    return null;
  }
}
