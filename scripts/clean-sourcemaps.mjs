#!/usr/bin/env node

/**
 * Removes .js.map files from production builds to prevent reverse engineering.
 * Runs automatically as part of `npm run dist`.
 *
 * Compatible with Node.js >= 20 (uses readdir recursive, not glob/Array.fromAsync).
 */

import { readdir, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const distDir = join(scriptDir, '..', 'dist');

const allFiles = await readdir(distDir, { recursive: true });
const maps = allFiles.filter((f) => f.endsWith('.js.map'));

if (maps.length === 0) {
  console.log('No source maps found.');
  process.exit(0);
}

for (const file of maps) {
  await rm(join(distDir, file));
}

console.log(`Removed ${maps.length} source map(s) from dist/.`);
