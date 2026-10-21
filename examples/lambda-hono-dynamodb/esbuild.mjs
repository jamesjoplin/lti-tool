import { writeFile } from 'node:fs/promises';

import * as esbuild from 'esbuild';

const result = await esbuild.build({
  entryPoints: ['src/lambda.ts'],
  outdir: 'dist',
  entryNames: 'index',
  outExtension: { '.js': '.mjs' },
  bundle: true,
  platform: 'node',
  format: 'esm',
  // Must match var.lambda_runtime in terraform/vars.tf (nodejs24.x). Change both together.
  target: 'node24',
  mainFields: ['module', 'main'],
  // Bundled CommonJS dependencies call require() for Node builtins, which ESM lacks.
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
  minify: true,
  keepNames: true,
  sourcemap: 'external',
  sourcesContent: false,
  metafile: true,
  logLevel: 'info',
});

// Inspect with https://esbuild.github.io/analyze/
await writeFile('esbuild-meta.json', JSON.stringify(result.metafile));
