#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const PRODUCT_NAMES = ['PRODUCT.md', 'Product.md', 'product.md'];
const DESIGN_NAMES = ['DESIGN.md', 'Design.md', 'design.md'];
const TRUSTED_CONTEXT_DIRS = ['.', '.agents/context', 'docs'];

const args = process.argv.slice(2);
const json = args.includes('--json');
const rootFlag = args.findIndex(arg => arg === '--root');
const root = path.resolve(rootFlag >= 0 ? args[rootFlag + 1] : process.cwd());

function firstExisting(dir, names) {
  for (const name of names) {
    const file = path.join(dir, name);
    if (fs.existsSync(file) && fs.statSync(file).isFile()) return file;
  }
  return null;
}

function safeRead(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}

function rel(file) {
  if (!file) return null;
  const relative = path.relative(root, file);
  return relative === '' ? '.' : relative;
}

function resolveContext(rootDir) {
  const checkedDirs = TRUSTED_CONTEXT_DIRS.map(dir => path.resolve(rootDir, dir));
  const matches = checkedDirs.map(dir => ({
    dir,
    productPath: firstExisting(dir, PRODUCT_NAMES),
    designPath: firstExisting(dir, DESIGN_NAMES)
  })).filter(match => match.productPath || match.designPath);

  const productMatch = matches.find(match => match.productPath);
  const designMatch = matches.find(match => match.designPath);
  const completeMatch = matches.find(match => match.productPath && match.designPath);
  const selected = completeMatch ?? productMatch ?? designMatch ?? {
    dir: rootDir,
    productPath: null,
    designPath: null
  };

  const status = productMatch?.productPath && designMatch?.designPath
    ? 'CONTEXT_READY'
    : productMatch?.productPath
      ? 'NO_DESIGN_MD'
      : designMatch?.designPath
        ? 'NO_PRODUCT_MD'
        : 'NO_CONTEXT';

  return {
    status,
    root: rootDir,
    trustedContextDirs: TRUSTED_CONTEXT_DIRS,
    contextDir: completeMatch ? rel(completeMatch.dir) : status === 'CONTEXT_READY' ? 'multiple trusted dirs' : rel(selected.dir),
    productContextDir: rel(productMatch?.dir),
    designContextDir: rel(designMatch?.dir),
    productPath: rel(productMatch?.productPath),
    designPath: rel(designMatch?.designPath),
    hasProduct: Boolean(productMatch?.productPath),
    hasDesign: Boolean(designMatch?.designPath),
    product: safeRead(productMatch?.productPath),
    design: safeRead(designMatch?.designPath),
    ignoredByDesign: ['vendor/**', 'open-sources/**', 'fixtures/**', 'PRODUCT.md/DESIGN.md outside trusted dirs']
  };
}

const context = resolveContext(root);

if (json) {
  process.stdout.write(`${JSON.stringify({
    status: context.status,
    root: context.root,
    trustedContextDirs: context.trustedContextDirs,
    contextDir: context.contextDir,
    productContextDir: context.productContextDir,
    designContextDir: context.designContextDir,
    productPath: context.productPath,
    designPath: context.designPath,
    hasProduct: context.hasProduct,
    hasDesign: context.hasDesign,
    ignoredByDesign: context.ignoredByDesign
  }, null, 2)}\n`);
} else if (context.status === 'CONTEXT_READY') {
  process.stdout.write([
    `CONTEXT_READY: Found trusted BFDS context in ${context.contextDir}.`,
    `PRODUCT_PATH: ${context.productPath}`,
    `DESIGN_PATH: ${context.designPath}`,
    '',
    `# PRODUCT.md`,
    '',
    context.product.trim(),
    '',
    '---',
    '',
    `# DESIGN.md`,
    '',
    context.design.trim()
  ].join('\n') + '\n');
} else {
  const missing = [];
  if (!context.hasProduct) missing.push('PRODUCT.md');
  if (!context.hasDesign) missing.push('DESIGN.md');
  process.stdout.write([
    `${context.status}: Missing ${missing.join(' and ')} in trusted BFDS context locations.`,
    `ROOT: ${context.root}`,
    `TRUSTED_CONTEXT_DIRS: ${TRUSTED_CONTEXT_DIRS.join(', ')}`,
    `IGNORED_BY_DESIGN: vendor/**, open-sources/**, fixtures/**, and any PRODUCT.md/DESIGN.md outside trusted context dirs.`,
    'NEXT_STEP: Stop BFDS design progression and follow Impeccable init/document flow, or ask the user to provide trusted context.'
  ].join('\n') + '\n');
}
