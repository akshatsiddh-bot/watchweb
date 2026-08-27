import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Only the popup (React) is bundled by Vite. The background service worker
// and content script are plain, dependency-light scripts copied verbatim by
// the postbuild step in package.json's "build" script - the background
// worker uses native ES module `import` (supported via manifest's
// "type": "module"), and the content script is deliberately a single
// self-contained classic script since MV3 content scripts injected via
// chrome.scripting.executeScript cannot use ES module imports.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup.html'),
      },
    },
  },
});
