# @canvas-glide/vue

Pan, zoom and pinch-to-zoom for Vue 3, built on [canvas-glide](https://github.com/vrtexe/canvas-glide): a `useGlide` composable that turns any element into a pan-and-zoom viewport with reactive state, and a ready `GlideCanvas` image viewer.

[![npm version](https://img.shields.io/npm/v/@canvas-glide/vue.svg?style=flat-square)](https://www.npmjs.com/package/@canvas-glide/vue)
[![license](https://img.shields.io/npm/l/@canvas-glide/vue.svg?style=flat-square)](LICENSE.md)

It needs Vue 3.5 or newer and ships no stylesheet: the components style themselves inline. Components render on the server; input handling starts when the element is mounted in the browser.

## Install

```sh
npm install @canvas-glide/vue
```

`canvas-glide` is a dependency and installs with it. `vue` is a peer dependency.

## Image viewer

```vue
<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue';
import { GlideCanvas, Renderer } from '@canvas-glide/vue';

const file = shallowRef<File | null>(null);
const viewer = useTemplateRef('viewer');

function onChange(event: Event) {
  file.value = (event.target as HTMLInputElement).files?.[0] ?? null;
}
</script>

<template>
  <input type="file" accept="image/*" @change="onChange" />
  <button @click="viewer?.zoomIn()">+</button>
  <button @click="viewer?.zoomOut()">−</button>
  <button @click="viewer?.fit()">Fit</button>
  <span>{{ Math.round((viewer?.transform.scale ?? 1) * 100) }}%</span>

  <div style="width: 800px; height: 500px">
    <GlideCanvas ref="viewer" :image="file" :renderer="Renderer.Image" />
  </div>
</template>
```

`GlideCanvas` fills its parent, so the parent needs a size. At scale 1 the image is fitted inside the box with its aspect ratio kept, and a new image starts fitted. The image can be panned until it just leaves the box, and no further. Through a template ref, the component exposes everything `useGlide` returns.

## useGlide

`useGlide(target, options?)` attaches pan and zoom to `target`, an element, a template ref or a getter. When the target is mounted it gets pointer and wheel listeners (the wheel listener is not passive, so the wheel zooms instead of scrolling the page), `touch-action: none` and `user-select: none`; the listeners are removed when it unmounts or changes.

| Member | Type | Meaning |
|---|---|---|
| `transform` | read-only `Ref<Transform>` | The current `{ origin, scale }`, updated at most once per animation frame. |
| `moving` | read-only `Ref<boolean>` | Whether a pointer drag is in progress. |
| `viewportSize` | read-only `Ref<Size>` | The target's size in CSS pixels. |
| `contentSize` | `Ref<Size \| null>` | The content's size at scale 1; `fit`, `center` and the default pan limit use it. You can assign it. |
| `engine` | `CanvasEngine` | The underlying engine, with every method documented in the [canvas-glide README](https://github.com/vrtexe/canvas-glide#methods). |
| `zoomIn`, `zoomOut`, `zoomTo`, `panTo`, `setTransform`, `fit`, `center`, `reset` | function | The engine methods of the same names. `zoomIn` and `zoomOut` ignore a non-number argument, so `@click="zoomIn"` works. |

`options` are the [canvas-glide options](https://github.com/vrtexe/canvas-glide#options) without `getViewportRect`, which the composable provides from the target. `getCanvasRect` is optional and defaults to `contentSize`. `useGlide` adds a default origin limit that keeps the content reachable; `constraints.origin` replaces it. The options are read once, when the composable runs.

## Your own content

This example pans and zooms a 1200 by 800 pixel `<div>`:

```vue
<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';
import { useGlide } from '@canvas-glide/vue';

const viewport = useTemplateRef<HTMLDivElement>('viewport');
const { transform, contentSize } = useGlide(viewport);
contentSize.value = { width: 1200, height: 800 };

const contentStyle = computed(() => {
  const { origin, scale } = transform.value;
  return { transform: `translate(${-origin.x * scale}px, ${-origin.y * scale}px) scale(${scale})` };
});
</script>

<template>
  <div ref="viewport" class="viewport">
    <div class="content" :style="contentStyle">Your content</div>
  </div>
</template>

<style scoped>
.viewport {
  width: 800px;
  height: 500px;
  overflow: hidden;
}

.content {
  width: 1200px;
  height: 800px;
  transform-origin: 0 0;
}
</style>
```

## GlideCanvas

| Prop | Type | Usage |
|---|---|---|
| `image` | `Blob \| null` | The image to show; a `File` from an `<input type="file">` is a `Blob`. `null` clears the view. |
| `renderer` | `Renderer` | `Renderer.Canvas` (default), `Renderer.Image` or `Renderer.Html`. |
| `options` | `GlideOptions` | The `useGlide` options, read once when the component is created. |

The default slot is an overlay in image coordinates at scale 1, moved and scaled with the image, for markers and annotations. Other attributes, such as `class`, `style` or listeners, fall through to the outer `<div>`.

| Renderer | How it draws |
|---|---|
| `Renderer.Canvas` | Draws the decoded bitmap into a `<canvas>` sized in device pixels. |
| `Renderer.Image` | Moves and scales an `<img>` with a CSS `transform`. |
| `Renderer.Html` | Resizes the `<img>` to the zoomed size and scrolls its container, with no CSS transform, so the browser rasterizes the image at its displayed size. |

The image and HTML renderers load PNG, JPEG, GIF, WebP, AVIF and BMP through a `blob:` URL and every other type, such as SVG, through a `data:` URL, so a script inside an uploaded SVG cannot run in your page's origin.

## Development

The package source is `src/lib`, and `npm run dev` starts a demo app (`src/App.vue`) that uses it. `canvas-glide` is listed twice: `^1.0.1` in `dependencies` for consumers, and `../lib` in `devDependencies`, which npm links during local development. Build `lib` first, then:

```sh
npm install
npm test
npm run build
```

`npm test` runs the Vitest suite in `test/` in jsdom, with the 2D context, `createImageBitmap` and `ResizeObserver` stubbed, and one server render. `npm run build` type-checks with `vue-tsc` and writes `dist/` with Vite: `canvas-glide.js` (ES module) and the type declarations. `npm run build:demo` builds the demo into `demo-dist/`.

## License

MIT, see [LICENSE.md](LICENSE.md).
