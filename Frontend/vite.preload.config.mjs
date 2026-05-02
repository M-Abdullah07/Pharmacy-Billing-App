/* global URL */
import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, '../Backend/app/preload.js'),
      name: 'preload',
      formats: ['cjs'],
      fileName: () => 'preload.js', // ✅ forces output to be exactly "preload.js"
    },
    outDir: '.vite/build', // ✅ same output dir as main
    emptyOutDir: false, // ✅ prevents wiping main build
    rollupOptions: {
      external: ['electron'], // ✅ don't bundle electron itself
    },
  },
});
