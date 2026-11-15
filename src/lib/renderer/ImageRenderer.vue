<script setup lang="ts">
import { computed } from 'vue';
import type { Glide } from '../useGlide.js';
import { useImageSource } from './useImageSource.js';

const { glide, image = null } = defineProps<{ glide: Glide; image?: Blob | null }>();

const { src, natural, onLoad } = useImageSource(glide, () => image);

const stageStyle = computed(() => {
  const { origin, scale } = glide.transform.value;
  const size = glide.contentSize.value;
  return {
    position: 'relative' as const,
    transformOrigin: '0 0',
    width: `${size?.width ?? 0}px`,
    height: `${size?.height ?? 0}px`,
    transform: `scale(${scale}) translate(${-origin.x}px, ${-origin.y}px)`,
  };
});
</script>

<template>
  <div :style="stageStyle">
    <img
      v-if="src"
      :src="src"
      alt=""
      draggable="false"
      :style="{ display: 'block', width: '100%', height: '100%', visibility: natural ? 'visible' : 'hidden' }"
      @load="onLoad"
    />
  </div>
</template>
