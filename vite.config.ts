import { defineConfig } from 'vite';
import { GITHUB_PAGES_BASE } from './src/paths.ts';

export default defineConfig({
  base: GITHUB_PAGES_BASE,
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
  },
});
