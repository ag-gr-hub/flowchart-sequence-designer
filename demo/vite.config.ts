import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/flowchart-sequence-designer/',
  build: {
    outDir: 'dist',
  },
});
