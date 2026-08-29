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
    // The demo and the package each have their own node_modules. Because the
    // aliases below point at ../dist (outside the demo root), the package's
    // `import ... from 'react'` would otherwise resolve to the *root*
    // node_modules copy while the demo's own code uses the demo copy. Two
    // React instances means the hook dispatcher is null during render and the
    // app dies on the first useCallback. Pin both to the demo's copy.
    dedupe: ['react', 'react-dom'],
    alias: {
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      // Point package imports directly at the pre-built dist so the demo
      // doesn't need a separate bun install of the file: dependency.
      'flowchart-sequence-designer/ui': path.resolve(__dirname, '../dist/ui/index.js'),
      'flowchart-sequence-designer': path.resolve(__dirname, '../dist/index.js'),
    },
  },
});
