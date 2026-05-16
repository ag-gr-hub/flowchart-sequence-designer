import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [react()],
  base: '/flowchart-sequence-designer/',
  build: {
    outDir: 'dist',
  },
  resolve: {
    alias: {
      // Point package imports directly at the pre-built dist so the demo
      // doesn't need a separate bun install of the file: dependency.
      'flowchart-sequence-designer/ui': path.resolve(__dirname, '../dist/ui/index.js'),
      'flowchart-sequence-designer': path.resolve(__dirname, '../dist/index.js'),
    },
  },
});
