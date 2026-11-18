import { shallowRef, watch, type MaybeRefOrGetter, toValue, type WatchSource } from 'vue';
import type { Glide } from '../useGlide.js';
import { createImageUrlSafe, revokeImageUrl } from '../util/image.js';
import { fitInto, type Size } from '../util/size.js';

/** Keeps `glide.contentSize` fitted into the viewport; the returned function fits the view once the viewport has a size. */
export function useFitContent(glide: Glide, natural: WatchSource<Size | null>) {
  let fitPending = false;

  // A resize keeps the view and only updates the content size.
  watch([() => glide.viewportSize.value, natural], ([viewportSize, size]) => {
    glide.contentSize.value = size && fitInto(viewportSize, size);
    if (size && fitPending && viewportSize.width && viewportSize.height) {
      fitPending = false;
      glide.fit();
    }
  });

  return () => (fitPending = true);
}

/** The URL and natural size of the image for the img-based renderers; call `onLoad` from the img's load event. */
export function useImageSource(glide: Glide, image: MaybeRefOrGetter<Blob | null>) {
  const src = shallowRef<string | null>(null);
  const natural = shallowRef<Size | null>(null);
  const fitNext = useFitContent(glide, natural);

  watch(
    () => toValue(image),
    async (next, _previous, onCleanup) => {
      if (typeof window === 'undefined') return;
      let current = true;
      let url: string | null = null;
      onCleanup(() => {
        current = false;
        revokeImageUrl(url);
      });

      url = await createImageUrlSafe(next).catch(() => null);
      if (!current) {
        revokeImageUrl(url);
        return;
      }

      natural.value = null;
      src.value = url;
      if (!url) glide.contentSize.value = null;
    },
    { immediate: true },
  );

  /** A new image is fitted once, when it has loaded and the viewport has a size. */
  function onLoad(event: Event) {
    const img = event.currentTarget as HTMLImageElement;
    fitNext();
    natural.value = { width: img.naturalWidth, height: img.naturalHeight };
  }

  return { src, natural, onLoad };
}
