<script setup lang="ts">
import { onBeforeUnmount, shallowRef, useTemplateRef, watch, watchEffect } from 'vue';
import type { Glide } from '../useGlide.js';
import { drawImage } from '../util/draw.js';
import { createImageBitmapSafe } from '../util/image.js';
import { useFitContent } from './useImageSource.js';

const { glide, image = null } = defineProps<{ glide: Glide; image?: Blob | null }>();

const canvas = useTemplateRef<HTMLCanvasElement>('canvas');
const bitmap = shallowRef<ImageBitmap | null>(null);
const fitNext = useFitContent(glide, bitmap);

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
    if (loaded) fitNext();
    bitmap.value = loaded;
  },
  { immediate: true },
);

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
