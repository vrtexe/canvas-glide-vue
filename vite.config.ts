import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import dts from 'vite-plugin-dts';

// `vite build` packages src/lib into dist/; `vite build --mode demo` builds the demo app into demo-dist/.
export default defineConfig(({ mode }) =>
  mode === 'demo'
    ? { plugins: [vue()], build: { outDir: 'demo-dist' } }
    : {
        plugins: [vue(), dts({ tsconfigPath: './tsconfig.app.json', entryRoot: 'src/lib', include: ['src/lib'] })],
        publicDir: false,
        build: {
          lib: { entry: 'src/lib/index.ts', fileName: 'canvas-glide', formats: ['es'] },
          rollupOptions: { external: ['vue', 'canvas-glide'] },
        },
      },
);
