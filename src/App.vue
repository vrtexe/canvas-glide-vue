<script setup lang="ts">
import './App.css';
import { shallowRef, useTemplateRef, watchEffect } from 'vue';
import { GlideCanvas, Renderer } from './lib/index.js';
import { useLocalStorageBlob } from './showcase/useLocalStorageBlob.js';

type Tab = (typeof Tab)[keyof typeof Tab];
const Tab = Object.freeze({ Canvas: 'canvas', Img: 'img', Html: 'html' } as const);
const tabs: Tab[] = Object.values(Tab);
const tabRenderer: Record<Tab, Renderer> = { canvas: Renderer.Canvas, img: Renderer.Image, html: Renderer.Html };
const tabLabel: Record<Tab, string> = { canvas: 'Canvas', img: 'Image', html: 'html' };

type Theme = 'light' | 'dark' | 'auto';
const themeOptions: { value: Theme; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

function initialTheme(): Theme {
  const saved = localStorage.getItem('theme');
  return saved === 'light' || saved === 'dark' || saved === 'auto' ? saved : 'auto';
}

const tab = shallowRef<Tab>(Tab.Canvas);
const theme = shallowRef<Theme>(initialTheme());
const themeOpen = shallowRef(false);
const upload = useTemplateRef<HTMLInputElement>('upload');
const viewer = useTemplateRef<InstanceType<typeof GlideCanvas>>('viewer');
const file = useLocalStorageBlob<File | null>('file', null);

watchEffect(() => {
  if (theme.value === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', theme.value);
  localStorage.setItem('theme', theme.value);
});

function onUpload(event: Event) {
  file.set((event.currentTarget as HTMLInputElement).files?.[0] ?? null);
}

function clear() {
  if (upload.value) upload.value.value = '';
  file.set(null);
}

function chooseTheme(value: Theme) {
  theme.value = value;
  themeOpen.value = false;
}
</script>

<template>
  <div class="toolbar toolbar--tabs">
    <button v-for="t in tabs" :key="t" :class="['tab', { 'tab--active': t === tab }]" @click="tab = t">
      {{ tabLabel[t] }}
    </button>
  </div>

  <div class="toolbar-row">
    <div class="toolbar toolbar--controls">
      <button class="icon-btn" title="Zoom in" @click="viewer?.zoomIn()">+</button>
      <button class="icon-btn" title="Zoom out" @click="viewer?.zoomOut()">−</button>
      <span class="divider"></span>
      <button @click="viewer?.center()">Center</button>
      <button @click="viewer?.fit()">Fit</button>
      <span class="divider"></span>
      <label class="upload-btn">
        Upload
        <input ref="upload" type="file" accept="image/*" @change="onUpload" />
      </label>
      <button @click="clear">✕</button>
    </div>

    <div class="toolbar toolbar--theme">
      <div class="dropdown">
        <button class="dropdown-trigger" aria-haspopup="listbox" :aria-expanded="themeOpen" @click="themeOpen = !themeOpen">
          <span class="dropdown-value">
            <span class="dropdown-label">{{ themeOptions.find((option) => option.value === theme)?.label }}</span>
          </span>
        </button>
        <ul v-if="themeOpen" class="dropdown-menu" role="listbox">
          <li v-for="option in themeOptions" :key="option.value" role="none">
            <button
              role="option"
              :aria-selected="theme === option.value"
              :class="['dropdown-item', { 'dropdown-item--active': theme === option.value }]"
              @click="chooseTheme(option.value)"
            >
              {{ option.label }}
            </button>
          </li>
        </ul>
      </div>
    </div>
  </div>

  <div style="width: 100dvw; height: 100dvh; overflow: hidden">
    <GlideCanvas ref="viewer" :renderer="tabRenderer[tab]" :image="file.value.value" />
  </div>
</template>
