import { fileURLToPath } from 'node:url';
import { copyFile } from 'node:fs/promises';
import { build } from 'esbuild';

await build({
  absWorkingDir: fileURLToPath(new URL('..', import.meta.url)),
  entryPoints: { renderer: 'src/exporter/headless.ts' },
  outdir: 'skills/prismcard/assets',
  bundle: true,
  minify: true,
  platform: 'browser',
  format: 'iife',
  target: 'chrome120',
  define: { 'process.env.NODE_ENV': '"production"' },
  legalComments: 'linked',
});
await copyFile(new URL('../LICENSE', import.meta.url), new URL('../skills/prismcard/LICENSE', import.meta.url));
