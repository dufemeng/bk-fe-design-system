#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const forwardMode = args.includes('--forward-tests');
const pressureMode = args.includes('--pressure-tests');
const gateMode = args.includes('--gate-tests');
const targetDir = args.find(arg => !arg.startsWith('--')) ?? 'fixtures/docs-design-sample/settings-prompt';
const scriptDir = path.dirname(fileURLToPath(import.meta.url));

function firstExisting(...candidates) {
  return candidates.find(candidate => fs.existsSync(candidate)) ?? candidates[0];
}

function schemaPath(file) {
  return firstExisting(
    path.join('templates/artifacts', file),
    path.join(scriptDir, '..', 'assets', 'templates', 'artifacts', file),
    path.join(scriptDir, '..', '..', 'templates', 'artifacts', file)
  );
}

const schemaFiles = {
  'evidence/surface.json': schemaPath('surface-evidence.schema.json'),
  'evidence/directions.json': schemaPath('directions-evidence.schema.json'),
  'evidence/selection.json': schemaPath('selection-evidence.schema.json'),
  'design-contract.json': schemaPath('design-contract.schema.json'),
  'qa-plan.json': schemaPath('qa-plan.schema.json'),
  'status.json': schemaPath('status.schema.json')
};

const forwardFiles = [
  'tests/forward/bfds-design-start.md',
  'tests/forward/bfds-design-existing-surface.md',
  'tests/forward/bfds-design-selection.md',
  'tests/forward/bfds-implement-no-artifacts.md',
  'tests/forward/bfds-implement-resume-one-slug.md',
  'tests/forward/bfds-implement-resume-many-slugs.md',
  'tests/forward/bfds-negative-api-database-bug.md'
];

const pressureFiles = [
  'tests/pressure/bfds-design-context-trap.md',
  'tests/pressure/bfds-design-init-request-quarantine.md',
  'tests/pressure/bfds-design-skip-question-not-brainstorm.md',
  'tests/pressure/bfds-design-workbench-gate.md',
  'tests/pressure/bfds-design-contract-gate.md',
  'tests/pressure/bfds-implement-detect-target-gate.md',
  'tests/pressure/bfds-implement-critique-contract-lock.md',
  'tests/pressure/bfds-implement-live-contract-patch.md'
];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function typeName(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (Number.isInteger(value)) return 'integer';
  return typeof value;
}

function typeMatches(value, expected) {
  const allowed = Array.isArray(expected) ? expected : [expected];
  return allowed.some(type => {
    if (type === 'integer') return Number.isInteger(value);
    if (type === 'array') return Array.isArray(value);
    if (type === 'null') return value === null;
    return typeof value === type && !Array.isArray(value) && value !== null;
  });
}

function validateSchema(schema, value, location, errors) {
  if (schema.$ref) {
    const resolved = schema.$ref.startsWith('#/$defs/')
      ? schema.$root?.$defs?.[schema.$ref.slice('#/$defs/'.length)]
      : null;
    if (!resolved) {
      errors.push(`${location}: unsupported schema ref ${schema.$ref}`);
      return;
    }
    validateSchema({ ...resolved, $root: schema.$root }, value, location, errors);
    return;
  }

  if (schema.type && !typeMatches(value, schema.type)) {
    errors.push(`${location}: expected ${JSON.stringify(schema.type)}, got ${typeName(value)}`);
    return;
  }

  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${location}: expected one of ${schema.enum.join(', ')}, got ${JSON.stringify(value)}`);
  }

  if (schema.pattern && typeof value === 'string') {
    const regex = new RegExp(schema.pattern);
    if (!regex.test(value)) errors.push(`${location}: does not match pattern ${schema.pattern}`);
  }

  if (schema.format === 'date-time' && typeof value === 'string') {
    if (Number.isNaN(Date.parse(value))) errors.push(`${location}: invalid date-time`);
  }

  if (typeof schema.minLength === 'number' && typeof value === 'string' && value.length < schema.minLength) {
    errors.push(`${location}: expected minLength ${schema.minLength}`);
  }

  if (typeof schema.minimum === 'number' && typeof value === 'number' && value < schema.minimum) {
    errors.push(`${location}: expected minimum ${schema.minimum}`);
  }

  if (typeof schema.minItems === 'number' && Array.isArray(value) && value.length < schema.minItems) {
    errors.push(`${location}: expected at least ${schema.minItems} items`);
  }

  if (schema.uniqueItems && Array.isArray(value)) {
    const seen = new Set(value.map(item => JSON.stringify(item)));
    if (seen.size !== value.length) errors.push(`${location}: expected unique items`);
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const required of schema.required ?? []) {
      if (!Object.prototype.hasOwnProperty.call(value, required)) {
        errors.push(`${location}.${required}: required property missing`);
      }
    }

    if (schema.additionalProperties === false && schema.properties) {
      for (const key of Object.keys(value)) {
        if (!Object.prototype.hasOwnProperty.call(schema.properties, key)) {
          errors.push(`${location}.${key}: additional property not allowed`);
        }
      }
    }

    for (const [key, childSchema] of Object.entries(schema.properties ?? {})) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        validateSchema({ ...childSchema, $root: schema.$root ?? schema }, value[key], `${location}.${key}`, errors);
      }
    }
  }

  if (Array.isArray(value) && schema.items) {
    value.forEach((item, index) => validateSchema({ ...schema.items, $root: schema.$root ?? schema }, item, `${location}[${index}]`, errors));
  }
}

function assertFile(file, errors) {
  if (!fs.existsSync(file)) errors.push(`missing file: ${file}`);
}

function validateArtifactDir(dir) {
  const errors = [];

  for (const [artifactFile, schemaFile] of Object.entries(schemaFiles)) {
    assertFile(schemaFile, errors);
    assertFile(path.join(dir, artifactFile), errors);
  }

  assertFile(path.join(dir, 'implementation-handoff.md'), errors);
  assertFile(path.join(dir, 'workbench.html'), errors);
  assertFile(path.join(dir, 'option-a.html'), errors);
  assertFile(path.join(dir, 'option-b.html'), errors);
  assertFile(path.join(dir, 'option-c.html'), errors);

  if (errors.length > 0) return errors;

  for (const [artifactFile, schemaFile] of Object.entries(schemaFiles)) {
    const schema = readJson(schemaFile);
    schema.$root = schema;
    const data = readJson(path.join(dir, artifactFile));
    validateSchema(schema, data, artifactFile, errors);
  }

  const contract = readJson(path.join(dir, 'design-contract.json'));
  const qaPlan = readJson(path.join(dir, 'qa-plan.json'));
  const status = readJson(path.join(dir, 'status.json'));
  const dirSlug = path.basename(dir);

  if (contract.slug !== dirSlug) errors.push(`design-contract.json.slug must equal directory slug ${dirSlug}`);
  if (qaPlan.slug !== dirSlug) errors.push(`qa-plan.json.slug must equal directory slug ${dirSlug}`);
  if (status.slug !== dirSlug) errors.push(`status.json.slug must equal directory slug ${dirSlug}`);

  if (qaPlan.impeccable?.detect?.enabled && (qaPlan.impeccable.detect.targets ?? []).length === 0) {
    errors.push('qa-plan.json.impeccable.detect.targets must include at least one concrete target when detect is enabled');
  }

  for (const target of qaPlan.impeccable?.detect?.targets ?? []) {
    if (/[<>]/.test(target)) {
      errors.push(`qa-plan.json.impeccable.detect.targets must be concrete, got placeholder-like value ${JSON.stringify(target)}`);
    }
  }

  if (qaPlan.impeccable?.critique?.target && /[<>]/.test(qaPlan.impeccable.critique.target)) {
    errors.push(`qa-plan.json.impeccable.critique.target must be concrete when present, got placeholder-like value ${JSON.stringify(qaPlan.impeccable.critique.target)}`);
  }

  for (const file of [
    contract.sourceArtifacts?.workbench,
    contract.sourceArtifacts?.options?.A,
    contract.sourceArtifacts?.options?.B,
    contract.sourceArtifacts?.options?.C,
    status.artifacts?.workbench,
    status.artifacts?.optionA,
    status.artifacts?.optionB,
    status.artifacts?.optionC,
    status.artifacts?.surfaceEvidence,
    status.artifacts?.directionsEvidence,
    status.artifacts?.selectionEvidence,
    status.artifacts?.gateLog,
    status.artifacts?.designContract,
    status.artifacts?.implementationHandoff,
    status.artifacts?.qaPlan,
    status.artifacts?.qaReport
  ].filter(Boolean)) {
    assertFile(file, errors);
  }

  return errors;
}

function validateMarkdownScenarios(files, headings) {
  const errors = [];

  for (const file of files) {
    assertFile(file, errors);
    if (!fs.existsSync(file)) continue;
    const content = fs.readFileSync(file, 'utf8');
    for (const heading of headings) {
      if (!content.includes(heading)) errors.push(`${file}: missing heading ${heading}`);
    }
  }

  return errors;
}

function validateForwardTests() {
  return validateMarkdownScenarios(forwardFiles, [
    '## 用户输入',
    '## 仓库初始状态',
    '## 期望 Skill',
    '## 预期读取文件',
    '## 期望行为',
    '## 停止/继续',
    '## 期望产物'
  ]);
}

function validatePressureTests() {
  return validateMarkdownScenarios(pressureFiles, [
    '## 目标',
    '## 用户输入',
    '## 仓库布置',
    '## 压力诱因',
    '## 禁止行为',
    '## 通过标准'
  ]);
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

function writeText(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

function runGate(projectRoot, slug) {
  const gateScript = path.join(scriptDir, 'bfds-gate.mjs');
  const output = execFileSync(process.execPath, [gateScript, slug, '--json', '--sync-status'], {
    cwd: projectRoot,
    encoding: 'utf8'
  });
  return JSON.parse(output);
}

function runGateWithArgs(projectRoot, slug, extraArgs) {
  const gateScript = path.join(scriptDir, 'bfds-gate.mjs');
  const output = execFileSync(process.execPath, [gateScript, slug, '--json', '--sync-status', ...extraArgs], {
    cwd: projectRoot,
    encoding: 'utf8'
  });
  return JSON.parse(output);
}

function baseSurface(slug) {
  return {
    slug,
    title: 'Demo Surface',
    confirmedAt: '2026-06-09T12:00:00.000Z',
    productPath: 'PRODUCT.md',
    designPath: 'DESIGN.md',
    sourceSummary: 'Test request with confirmed target surface.',
    surface: {
      name: '/settings prompt input component',
      type: 'component',
      route: '/settings',
      currentSource: ['user-description'],
      confidence: 'user-confirmed'
    },
    changeType: 'modify',
    keep: ['Existing route'],
    change: ['Prompt editor hierarchy'],
    avoid: ['No backend scope'],
    confirmation: {
      quote: '确认这个目标界面和边界。'
    }
  };
}

function baseDirections(slug) {
  const option = (id, dimensions) => ({
    optionId: id,
    name: `方案 ${id}`,
    designThesis: `方案 ${id} 的设计主张。`,
    sourceConstraints: ['PRODUCT.md', 'DESIGN.md'],
    hierarchy: `方案 ${id} 的层级。`,
    density: 'snug',
    motion: '低存在感反馈。',
    stateTreatment: '明确展示 default/error/success。',
    layoutStrategy: `方案 ${id} 的布局策略。`,
    interactionModel: `方案 ${id} 的交互模型。`,
    visualSignature: `方案 ${id} 的视觉签名。`,
    differenceDimensions: dimensions,
    keep: ['Existing route'],
    change: ['Prompt editor hierarchy'],
    avoid: ['No backend scope'],
    risks: ['Risk note'],
    bestFor: 'Settings workflow'
  });
  return {
    slug,
    createdAt: '2026-06-09T12:05:00.000Z',
    surfaceEvidence: `docs/design/${slug}/evidence/surface.json`,
    options: {
      A: option('A', ['hierarchy', 'density']),
      B: option('B', ['interaction-model', 'state-treatment']),
      C: option('C', ['motion-role', 'visual-signature'])
    },
    selfCheck: {
      usesTrustedContext: true,
      noProductScopeAdded: true,
      differencesAreSubstantial: true,
      criticalStateOrInteractionCovered: true,
      notes: 'Gate test directions are intentionally small.'
    }
  };
}

function baseSelection(slug, quote = '选 B，但导航用 A 的。') {
  return {
    slug,
    selectedAt: '2026-06-09T12:10:00.000Z',
    selectionQuote: quote,
    selectedOption: {
      id: 'B+A',
      summary: '以方案 B 为主，合并方案 A 的导航。',
      mergedFrom: ['A', 'B'],
      decisionNotes: 'User chose B with A navigation.'
    },
    workbench: `docs/design/${slug}/workbench.html`,
    options: {
      A: `docs/design/${slug}/option-a.html`,
      B: `docs/design/${slug}/option-b.html`,
      C: `docs/design/${slug}/option-c.html`
    }
  };
}

function baseContract(slug) {
  return {
    slug,
    title: 'Demo Surface',
    selectedOption: {
      id: 'B+A',
      summary: '以方案 B 为主，合并方案 A 的导航。',
      mergedFrom: ['A', 'B']
    },
    sourceArtifacts: {
      workbench: `docs/design/${slug}/workbench.html`,
      options: {
        A: `docs/design/${slug}/option-a.html`,
        B: `docs/design/${slug}/option-b.html`,
        C: `docs/design/${slug}/option-c.html`
      },
      productContext: 'PRODUCT.md',
      designContext: 'DESIGN.md',
      surfaceEvidence: [`docs/design/${slug}/evidence/surface.json`]
    },
    surface: {
      name: '/settings prompt input component',
      type: 'component',
      route: '/settings',
      currentSource: ['user-description'],
      confidence: 'user-confirmed'
    },
    changeType: 'modify',
    keep: ['Existing route'],
    change: ['Prompt editor hierarchy'],
    avoid: ['No backend scope'],
    screens: [{
      id: 'default',
      description: 'Default screen',
      composition: 'Editor with preview',
      hierarchy: 'Editor first',
      density: 'snug'
    }],
    states: [{ name: 'default', expectation: 'Ready state', priority: 'P1' }],
    interactions: [{ trigger: 'Save', result: 'Saved state appears', accessibility: 'Button is reachable' }],
    tokens: { source: 'DESIGN.md', rules: ['Use existing tokens'] },
    responsive: [{ viewport: 'mobile', rule: 'Single column' }],
    motion: [{ name: 'state-feedback', rule: 'Low presence', reducedMotion: 'No animation required' }],
    assets: [{ name: 'icons', source: 'Existing icon set', rule: 'Consistent style' }],
    acceptanceRules: [{ id: 'AR-001', rule: 'Follow selected design contract', severity: 'P1' }]
  };
}

function baseQaPlan(slug) {
  return {
    slug,
    targetRoutes: [{ route: '/settings', purpose: 'Verify prompt editor' }],
    viewports: [{ name: 'mobile', width: 390, height: 844 }],
    states: [{ name: 'default', setup: 'Open route', expected: 'Editor visible', blockingLevel: 'P1' }],
    interactions: [{ name: 'save', steps: ['Click save'], expected: 'Saved state appears', blockingLevel: 'P1' }],
    referenceScreenshots: [{ artifact: `docs/design/${slug}/option-b.html`, description: 'Main option' }],
    checks: [{ id: 'QA-001', category: 'contract', description: 'Contract alignment', blockingLevel: 'P1' }],
    blockers: ['Cannot open target route'],
    impeccable: {
      detect: { enabled: false, targets: [] },
      critique: { enabled: false }
    },
    reports: {
      qaReport: `docs/design/${slug}/qa-report.md`,
      evidenceDir: `docs/design/${slug}/evidence`
    }
  };
}

function validateGateTests() {
  const errors = [];
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'bfds-gate-'));
  const slug = 'settings-prompt';
  const designDir = path.join(projectRoot, 'docs', 'design', slug);
  const evidenceDir = path.join(designDir, 'evidence');

  writeText(path.join(projectRoot, 'PRODUCT.md'), '# Product\n');
  writeText(path.join(projectRoot, 'DESIGN.md'), '# Design\n');

  let result = runGate(projectRoot, slug);
  if (result.phase !== 'NEEDS_SURFACE') errors.push(`expected NEEDS_SURFACE, got ${result.phase}`);

  writeJson(path.join(evidenceDir, 'surface.json'), baseSurface(slug));
  result = runGate(projectRoot, slug);
  if (result.phase !== 'NEEDS_DIRECTIONS') errors.push(`expected NEEDS_DIRECTIONS, got ${result.phase}`);

  writeJson(path.join(evidenceDir, 'directions.json'), baseDirections(slug));
  result = runGate(projectRoot, slug);
  if (result.phase !== 'NEEDS_WORKBENCH') errors.push(`expected NEEDS_WORKBENCH, got ${result.phase}`);

  for (const file of ['workbench.html', 'option-a.html', 'option-b.html', 'option-c.html']) {
    writeText(path.join(designDir, file), '<!doctype html><title>BFDS gate test</title>');
  }
  result = runGate(projectRoot, slug);
  if (result.phase !== 'NEEDS_SELECTION') errors.push(`expected NEEDS_SELECTION, got ${result.phase}`);

  writeJson(path.join(evidenceDir, 'selection.json'), baseSelection(slug, '你来选一个最稳的。'));
  try {
    result = runGate(projectRoot, slug);
    if (result.phase !== 'INCONSISTENT') errors.push(`expected invalid selection to be INCONSISTENT, got ${result.phase}`);
  } catch (error) {
    const parsed = JSON.parse(error.stdout.toString());
    if (parsed.phase !== 'INCONSISTENT') errors.push(`expected invalid selection to be INCONSISTENT, got ${parsed.phase}`);
  }

  writeJson(path.join(evidenceDir, 'selection.json'), baseSelection(slug));
  result = runGate(projectRoot, slug);
  if (result.phase !== 'NEEDS_CONTRACT') errors.push(`expected NEEDS_CONTRACT, got ${result.phase}`);

  writeJson(path.join(designDir, 'design-contract.json'), baseContract(slug));
  writeJson(path.join(designDir, 'qa-plan.json'), baseQaPlan(slug));
  writeText(path.join(designDir, 'implementation-handoff.md'), '# Implementation Handoff\n');
  result = runGate(projectRoot, slug);
  if (result.phase !== 'CONTRACT_READY') errors.push(`expected CONTRACT_READY, got ${result.phase}`);

  try {
    runGateWithArgs(projectRoot, slug, ['--mark', 'qa-passed']);
    errors.push('expected qa-passed mark without qa-report.md to fail');
  } catch (error) {
    const parsed = JSON.parse(error.stdout.toString());
    if (parsed.phase !== 'INCONSISTENT') errors.push(`expected qa-passed without report to be INCONSISTENT, got ${parsed.phase}`);
  }

  writeText(path.join(designDir, 'qa-report.md'), '# QA Report\n');
  result = runGateWithArgs(projectRoot, slug, ['--mark', 'qa-passed']);
  if (result.status?.state !== 'qa-passed') errors.push(`expected status.state qa-passed, got ${result.status?.state}`);

  const gateLog = path.join(evidenceDir, 'gate-log.ndjson');
  if (!fs.existsSync(gateLog)) errors.push('expected gate-log.ndjson to be written');
  const logLines = fs.existsSync(gateLog) ? fs.readFileSync(gateLog, 'utf8').trim().split('\n').filter(Boolean) : [];
  if (logLines.length < 6) errors.push(`expected at least 6 gate log entries, got ${logLines.length}`);

  return errors;
}

const errors = gateMode
  ? validateGateTests()
  : pressureMode
  ? validatePressureTests()
  : forwardMode
    ? validateForwardTests()
    : validateArtifactDir(targetDir);

if (errors.length > 0) {
  process.stderr.write(errors.map(error => `- ${error}`).join('\n'));
  process.stderr.write('\n');
  process.exit(1);
}

process.stdout.write(
  gateMode
    ? 'Gate tests passed.\n'
    : pressureMode
    ? 'Pressure test files are structurally valid.\n'
    : forwardMode
      ? 'Forward test files are structurally valid.\n'
      : `Artifacts valid: ${targetDir}\n`
);
