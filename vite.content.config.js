/**
 * vite.content.config.js
 * Separate Vite build for the content script only.
 *
 * WHY: Content scripts cannot reliably use ES module imports to load shared
 * chunks from the extension bundle. Building as IIFE (Immediately Invoked
 * Function Expression) bundles React + all dependencies into a single
 * self-contained file — no external imports needed.
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],

  // React reads process.env.NODE_ENV — define it for browser environments
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },

  build: {
    outDir: 'dist',
    emptyOutDir: false, // Don't wipe dist/ — popup build already ran

    lib: {
      entry: resolve(__dirname, 'src/content/index.js'),
      formats: ['iife'],
      name: 'YCSContent', // Required for IIFE format (global var name)
    },

    rollupOptions: {
      output: {
        // Output as dist/content/index.js (override Vite's default .iife.js naming)
        entryFileNames: 'content/index.js',
        // CSS extracted from the content script's panel.css import
        assetFileNames: (asset) => {
          if (asset.name?.endsWith('.css')) return 'content/panel[extname]';
          return 'content/[name][extname]';
        },
      },
    },
  },
});
