import { defineConfig } from 'vite';

export default defineConfig({
  // Use a relative base so the bundle works regardless of the GitHub Pages
  // project folder name (e.g. after renames).
  base: './',
});
