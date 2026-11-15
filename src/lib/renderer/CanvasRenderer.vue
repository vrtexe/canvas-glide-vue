<script setup lang="ts">
import { onBeforeUnmount, shallowRef, useTemplateRef, watch, watchEffect } from 'vue';
import type { Glide } from '../useGlide.js';
import { drawImage } from '../util/draw.js';
import { createImageBitmapSafe } from '../util/image.js';
import { fitInto } from '../util/size.js';

const { glide, image = null } = defineProps<{ glide: Glide; image?: Blob | null }>();

const canvas = useTemplateRef<HTMLCanvasElement>('canvas');
const bitmap = shallowRef<ImageBitmap | null>(null);

// A new image is fitted once; a resize keeps the view and only updates the content size.
watch(
  () => image,
  async (next, _previous, onCleanup) => {
    if (typeof window === 'undefined') return;
    let current = true;
    onCleanup(() => (current = false));

    const loaded = await createImageBitmapSafe(next).catch(() => null);
    if (!current) {
      loaded?.close();
      return;
    }

    bitmap.value?.close();
    bitmap.value = loaded;
    glide.contentSize.value = loaded && fitInto(glide.viewportSize.value, loaded);
    if (loaded) glide.fit();
  },
  { immediate: true },
);

watch([() => glide.viewportSize.value, bitmap], ([viewportSize, loaded]) => {
  glide.contentSize.value = loaded && fitInto(viewportSize, loaded);
});

onBeforeUnmount(() => bitmap.value?.close());

watchEffect(
  () => {
    if (canvas.value) {
      drawImage(canvas.value, bitmap.value, glide.transform.value, glide.viewportSize.value, glide.contentSize.value);
    }
  },
  { flush: 'post' },
);
</script>

<template>
  <canvas ref="canvas" :style="{ position: 'absolute', inset: 0, width: '100%', height: '100%' }" />
</template>
