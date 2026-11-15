<!--
  Scroll-based renderer: no CSS transform and no <canvas>. Zoom resizes the <img>, so the browser rasterizes it at its
  displayed size, and pan scrolls an overflow: hidden box. The img's padding adds one viewport of slack on every side,
  so the image can be panned fully off-screen and negative origins are reachable scroll positions.
-->
<script setup lang="ts">
import { computed, useTemplateRef, watchEffect } from 'vue';
import type { Glide } from '../useGlide.js';
import { useImageSource } from './useImageSource.js';

const { glide, image = null } = defineProps<{ glide: Glide; image?: Blob | null }>();

const scroller = useTemplateRef<HTMLDivElement>('scroller');
const { src, natural, onLoad } = useImageSource(glide, () => image);

const imageStyle = computed(() => {
  const { scale } = glide.transform.value;
  const size = glide.contentSize.value;
  const viewport = glide.viewportSize.value;
  return {
    display: 'block',
    boxSizing: 'content-box' as const,
    width: `${(size?.width ?? 0) * scale}px`,
    height: `${(size?.height ?? 0) * scale}px`,
    padding: `${viewport.height}px ${viewport.width}px`,
  };
});

// flush: 'post' runs after the DOM update that applied the new img size, so the scroll range is current.
watchEffect(
  () => {
    const { origin, scale } = glide.transform.value;
    const { width, height } = glide.viewportSize.value;
    if (natural.value) scroller.value?.scrollTo(width + origin.x * scale, height + origin.y * scale);
  },
  { flush: 'post' },
);
</script>

<template>
  <div ref="scroller" :style="{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }">
    <img v-if="src" :src="src" alt="" draggable="false" :style="imageStyle" @load="onLoad" />
  </div>
</template>
