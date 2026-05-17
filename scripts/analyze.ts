#!/usr/bin/env bun
/**
 * Bundle size analyzer. Runs an esbuild bundle of each public entry point
 * (with the standard externals applied), writes a metafile to
 * `dist/.metafile-*.json`, and prints a sorted breakdown of the largest
 * inputs plus the final bundle size. Intended to be invoked from CI or
 * locally via `bun run analyze`.
 */

import { build } from 'esbuild';
import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dir, '..');
const DIST = resolve(ROOT, 'dist');
const EXTERNAL = ['react', 'react-dom', '@xyflow/react'];

interface Entry {
  name: string;
  entry: string;
}

const ENTRIES: Entry[] = [
  { name: 'core', entry: 'src/index.ts' },
  { name: 'ui', entry: 'src/ui/index.ts' },
];

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(2)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

async function analyzeEntry({ name, entry }: Entry): Promise<void> {
  const result = await build({
    entryPoints: [resolve(ROOT, entry)],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2020',
    external: EXTERNAL,
    minify: true,
    write: false,
    metafile: true,
    sourcemap: false,
    logLevel: 'silent',
  });

  await mkdir(DIST, { recursive: true });
  await writeFile(
    resolve(DIST, `.metafile-${name}.json`),
    JSON.stringify(result.metafile, null, 2),
  );

  const out = result.outputFiles[0];
  const totalBytes = out.contents.byteLength;
  const inputs = Object.entries(result.metafile.inputs)
    .map(([path, info]) => ({ path, bytes: info.bytes }))
    .sort((a, b) => b.bytes - a.bytes);

  const sumInputs = inputs.reduce((acc, i) => acc + i.bytes, 0);

  console.log(`\n── ${name} bundle ──`);
  console.log(`  minified bundle: ${fmtBytes(totalBytes)}`);
  console.log(`  total input source: ${fmtBytes(sumInputs)}`);
  console.log(`  externalized: ${EXTERNAL.join(', ')}`);
  console.log(`  top 10 inputs by source size:`);
  for (const { path, bytes } of inputs.slice(0, 10)) {
    const pct = ((bytes / sumInputs) * 100).toFixed(1);
    console.log(`    ${fmtBytes(bytes).padStart(9)}  ${pct.padStart(5)}%  ${path}`);
  }
}

for (const e of ENTRIES) {
  await analyzeEntry(e);
}

console.log('\nMetafiles written to dist/.metafile-*.json.');
console.log('Drop them into https://esbuild.github.io/analyze/ for a visual treemap.');
