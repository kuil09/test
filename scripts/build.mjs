import { cp, mkdir, rm, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const source = resolve(root, 'src');
const output = resolve(root, 'dist');
const requiredFiles = [
  'index.html',
  'styles.css',
  'app.mjs',
  'mindmap-store.mjs',
  'webmcp.mjs',
];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(source, output, { recursive: true });

for (const file of requiredFiles) {
  const info = await stat(resolve(output, file));
  if (!info.isFile() || info.size === 0) {
    throw new Error(`Build output is missing or empty: ${file}`);
  }
}

console.log(`Built ${requiredFiles.length} files into dist/`);
