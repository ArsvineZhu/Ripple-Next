import { defineConfig } from 'vite';
export default defineConfig({
  build: {
    minify: false,
    sourcemap: true,
    reportCompressedSize: false,
    lib: { entry: 'src/main/index.ts', fileName: () => 'main.cjs', formats: ['cjs'] },
    rolldownOptions: { external: ['better-sqlite3', 'font-list', 'fontkit'] },
  },
});
