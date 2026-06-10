#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runtimeSource = path.join(repoRoot, 'src', 'runtime', 'bfds');
const scriptSource = path.join(repoRoot, 'scripts', 'bfds.mjs');
const skills = ['bfds-design', 'bfds-implement'];

function copyDir(src, dest) {
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true, force: true });
}

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

if (!fs.existsSync(runtimeSource)) {
  console.error(`Missing runtime source: ${runtimeSource}`);
  process.exit(1);
}

for (const skill of skills) {
  const skillDir = path.join(repoRoot, 'skills', skill);
  copyDir(runtimeSource, path.join(skillDir, 'runtime', 'bfds'));
  copyFile(scriptSource, path.join(skillDir, 'scripts', 'bfds.mjs'));
  console.log(`synced ${skill}`);
}
