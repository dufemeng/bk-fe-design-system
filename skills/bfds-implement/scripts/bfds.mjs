#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const candidates = [
  path.resolve(scriptDir, '..', 'src', 'runtime', 'bfds', 'cli.mjs'),
  path.resolve(scriptDir, '..', 'runtime', 'bfds', 'cli.mjs')
];
const cli = candidates.find(candidate => fs.existsSync(candidate));

if (!cli) {
  console.error('Cannot find BFDS runtime cli.mjs.');
  process.exit(1);
}

const { main } = await import(pathToFileURL(cli).href);
process.exit(main(process.argv.slice(2)));
