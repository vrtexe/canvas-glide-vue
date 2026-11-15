<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';
import { Renderer } from './renderer.js';
import { useGlide, type GlideOptions } from './useGlide.js';
import CanvasRenderer from './renderer/CanvasRenderer.vue';
import HtmlRenderer from './renderer/HtmlRenderer.vue';
import ImageRenderer from './renderer/ImageRenderer.vue';

const props = withDefaults(
  defineProps<{
    /** The image to show; `null` clears the view. */
    image?: Blob | null;
    renderer?: Renderer;
    /** Engine options, read once when the component is created. */
    options?: GlideOptions;
  }>(),
  { image: null, renderer: Renderer.Canvas },
);

defineSlots<{
  /** Overlay content in image coordinates at scale 1, moved and scaled with the image. */
  default?: () => unknown;
}>();

const root = useTemplateRef<HTMLDivElement>('root');
const glide = useGlide(root, props.options);

defineExpose(glide);

const rootStyle = computed(() => ({
  position: 'relative' as const,
  width: '100%',
  height: '100%',
  overflow: 'hidden' as const,
  overscrollBehavior: 'contain' as const,
  cursor: glide.moving.value ? 'grabbing' : glide.engine.isPanEnabled() ? 'grab' : undefined,
}));

const overlayStyle = computed(() => {
  const { origin, scale } = glide.transform.value;
  const size = glide.contentSize.value;
  return {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    transformOrigin: '0 0',
    width: `${size?.width ?? 0}px`,
    height: `${size?.height ?? 0}px`,
    transform: `scale(${scale}) translate(${-origin.x}px, ${-origin.y}px)`,
  };
});
</script>

<template>
  <div ref="root" :style="rootStyle">
    <ImageRenderer v-if="renderer === Renderer.Image" :glide :image />
    <HtmlRenderer v-else-if="renderer === Renderer.Html" :glide :image />
    <CanvasRenderer v-else :glide :image />

    <div v-if="$slots.default && glide.contentSize.value" :style="overlayStyle">
      <slot />
    </div>
  </div>
</template>
