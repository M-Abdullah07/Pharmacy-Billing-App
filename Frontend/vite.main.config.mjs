/* global URL */
import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, '../Backend/app/main.js'),
      name: 'main',
      formats: ['cjs'],
      fileName: () => 'main.js', // ✅ forces output to be exactly "main.js"
    },
    outDir: '.vite/build', // ✅ matches what package.json "main" expects
    emptyOutDir: false, // ✅ prevents wiping preload build
    rollupOptions: {
      external: ['electron', 'argon2', 'pg'], // ✅ don't bundle native modules
    },
  },
});
