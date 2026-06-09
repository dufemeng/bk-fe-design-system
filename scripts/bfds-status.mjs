#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const json = args.includes('--json');
const rootFlag = args.findIndex(arg => arg === '--root');
const limitFlag = args.findIndex(arg => arg === '--limit');
const stateFlag = args.findIndex(arg => arg === '--state');
const root = rootFlag >= 0 ? args[rootFlag + 1] : 'docs/design';
const limit = limitFlag >= 0 ? Number.parseInt(args[limitFlag + 1], 10) : null;
const stateFilter = stateFlag >= 0 ? args[stateFlag + 1] : null;

function readStatusFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => path.join(dir, entry.name, 'status.json'))
    .filter(file => fs.existsSync(file));
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    return {
      slug: path.basename(path.dirname(file)),
      state: 'invalid',
      error: error.message
    };
  }
}

const rows = readStatusFiles(root)
  .map(file => {
    const status = readJson(file);
    return {
      slug: status.slug ?? path.basename(path.dirname(file)),
      title: status.title ?? '',
      state: status.state ?? 'unknown',
      lastUpdated: status.lastUpdated ?? '',
      selectedOption: status.selectedOption ?? null,
      currentSurface: status.currentSurface ?? '',
      changeType: status.changeType ?? '',
      path: file,
      artifacts: status.artifacts ?? {},
      error: status.error
    };
  })
  .filter(row => !stateFilter || row.state === stateFilter)
  .sort((a, b) => {
    const left = Date.parse(a.lastUpdated) || 0;
    const right = Date.parse(b.lastUpdated) || 0;
    return right - left;
  });

const limitedRows = Number.isInteger(limit) && limit > 0 ? rows.slice(0, limit) : rows;

if (json) {
  process.stdout.write(`${JSON.stringify(limitedRows, null, 2)}\n`);
} else if (limitedRows.length === 0) {
  process.stdout.write(`No BFDS status files found under ${root}.\n`);
} else {
  for (const row of limitedRows) {
    process.stdout.write([
      `${row.slug}`,
      `state=${row.state}`,
      `updated=${row.lastUpdated || 'unknown'}`,
      `selected=${row.selectedOption ?? 'none'}`,
      `surface=${row.currentSurface || 'unknown'}`
    ].join(' | '));
    process.stdout.write('\n');
  }
}
