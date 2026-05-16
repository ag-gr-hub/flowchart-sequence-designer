import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: { index: 'src/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
    external: ['react', 'react-dom', '@xyflow/react'],
  },
  {
    entry: { 'ui/index': 'src/ui/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    external: ['react', 'react-dom', '@xyflow/react'],
  },
]);
