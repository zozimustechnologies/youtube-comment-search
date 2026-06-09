import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { mkdirSync, existsSync, readFileSync, writeFileSync, rmSync } from 'fs';

/**
 * Vite configuration for building a Chrome/Edge Manifest V3 extension.
 *
 * Build strategy:
 *  - The popup is a normal HTML page built via Vite's multi-page support.
 *  - The content script and background service worker are plain JS entries
 *    built so they produce predictable output file names.
 */
export default defineConfig({
  // Use relative base so HTML asset paths work as local extension files
  base: '',

  plugins: [
    react(),
    // Custom plugin: relocate popup HTML from dist/src/popup/ → dist/popup/
    // (Vite outputs HTML entries mirroring their src/ path, but we want popup/index.html)
    {
      name: 'relocate-popup-html',
      closeBundle() {
        const htmlSrc = resolve(__dirname, 'dist/src/popup/index.html');
        const htmlDest = resolve(__dirname, 'dist/popup/index.html');
        const popupDir = resolve(__dirname, 'dist/popup');
        if (!existsSync(popupDir)) mkdirSync(popupDir, { recursive: true });
        if (existsSync(htmlSrc)) {
          // Fix relative asset paths so they resolve from dist/popup/
          let html = readFileSync(htmlSrc, 'utf8');
          html = html.replace(/\.\.\/\.\.\/popup\//g, './');
          html = html.replace(/\.\.\/\.\.\/chunks\//g, '../chunks/');
          writeFileSync(htmlDest, html);
          // Remove the mirrored src/ directory from dist
          rmSync(resolve(__dirname, 'dist/src'), { recursive: true, force: true });
        }
      },
    },
  ],

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Use relative paths in HTML so the popup works as a local extension page
    assetsInlineLimit: 0,

    rollupOptions: {
      input: {
        // Popup HTML page (Vite builds this as a full HTML bundle)
        popup: resolve(__dirname, 'src/popup/index.html'),
        // Background service worker (no React, no shared chunks needed)
        background: resolve(__dirname, 'src/background/index.js'),
        // NOTE: content script is built separately via vite.content.config.js
        // as a self-contained IIFE — content scripts can't use ES module imports
      },

      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === 'background') return 'background/index.js';
          return 'popup/[name]-[hash].js';
        },
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: (asset) => {
          if (asset.name?.endsWith('.css')) return 'popup/[name][extname]';
          return 'assets/[name][extname]';
        },
      },
    },
  },

  // Allow absolute imports from src/
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
