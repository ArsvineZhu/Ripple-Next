import { defineConfig } from 'vite';
export default defineConfig({
  build: {
    minify: false,
    sourcemap: true,
    rolldownOptions: { output: { entryFileNames: 'preload.cjs' } },
  },
});
