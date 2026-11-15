import { shallowRef, watch, type MaybeRefOrGetter, toValue } from 'vue';
import type { Glide } from '../useGlide.js';
import { createImageUrlSafe, revokeImageUrl } from '../util/image.js';
import { fitInto, type Size } from '../util/size.js';

/** The URL and natural size of the image for the img-based renderers; call `onLoad` from the img's load event. */
export function useImageSource(glide: Glide, image: MaybeRefOrGetter<Blob | null>) {
  const src = shallowRef<string | null>(null);
  const natural = shallowRef<Size | null>(null);

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

  // A resize keeps the view and only updates the content size.
  watch([() => glide.viewportSize.value, natural], ([viewportSize, size]) => {
    if (size) glide.contentSize.value = fitInto(viewportSize, size);
  });

  /** A new image is fitted once, when it has loaded. */
  function onLoad(event: Event) {
    const img = event.currentTarget as HTMLImageElement;
    natural.value = { width: img.naturalWidth, height: img.naturalHeight };
    glide.contentSize.value = fitInto(glide.viewportSize.value, natural.value);
    glide.fit();
  }

  return { src, natural, onLoad };
}
