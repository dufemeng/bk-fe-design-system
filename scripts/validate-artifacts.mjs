#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
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
  'evidence/init-interview.json': schemaPath('init-interview.schema.json'),
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
    status.artifacts?.pendingRequest,
    status.artifacts?.initInterviewEvidence,
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

function runGate(projectRoot, slug, extraArgs = []) {
  const gateScript = path.join(scriptDir, 'bfds-gate.mjs');
  const output = execFileSync(process.execPath, [gateScript, slug, '--json', ...extraArgs], {
    cwd: projectRoot,
    encoding: 'utf8'
  });
  return JSON.parse(output);
}

function runGateWithArgs(projectRoot, slug, extraArgs) {
  return runGate(projectRoot, slug, extraArgs);
}

function runGateFailure(projectRoot, slug, extraArgs = []) {
  try {
    return { failed: false, result: runGate(projectRoot, slug, extraArgs) };
  } catch (error) {
    return { failed: true, result: JSON.parse(error.stdout.toString()) };
  }
}

function assertGateLogIncludes(projectRoot, slug, phase, errors, label) {
  const gateLog = path.join(projectRoot, 'docs', 'design', slug, 'evidence', 'gate-log.ndjson');
  if (!fs.existsSync(gateLog)) {
    errors.push(`${label}: expected gate-log.ndjson to exist`);
    return;
  }
  const phases = fs.readFileSync(gateLog, 'utf8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map(line => JSON.parse(line).phase);
  if (!phases.includes(phase)) errors.push(`${label}: expected gate log to include ${phase}, got ${phases.join(', ')}`);
}

function findRepoRoot() {
  const candidates = [
    path.resolve(scriptDir, '..'),
    path.resolve(scriptDir, '..', '..', '..')
  ];
  return candidates.find(candidate =>
    fs.existsSync(path.join(candidate, 'templates', 'artifacts')) &&
    fs.existsSync(path.join(candidate, 'skills', 'bfds-design')) &&
    fs.existsSync(path.join(candidate, 'skills', 'bfds-implement'))
  ) ?? null;
}

function assertSameFile(left, right, errors) {
  assertFile(left, errors);
  assertFile(right, errors);
  if (!fs.existsSync(left) || !fs.existsSync(right)) return;
  const leftBytes = fs.readFileSync(left);
  const rightBytes = fs.readFileSync(right);
  if (!leftBytes.equals(rightBytes)) errors.push(`bundled copy drift: ${right} differs from ${left}`);
}

function validateBundledCopyParity() {
  const errors = [];
  const repoRoot = findRepoRoot();
  if (!repoRoot) return errors;

  for (const skill of ['bfds-design', 'bfds-implement']) {
    assertSameFile(
      path.join(repoRoot, 'scripts', 'bfds-gate.mjs'),
      path.join(repoRoot, 'skills', skill, 'scripts', 'bfds-gate.mjs'),
      errors
    );
    assertSameFile(
      path.join(repoRoot, 'scripts', 'validate-artifacts.mjs'),
      path.join(repoRoot, 'skills', skill, 'scripts', 'validate-artifacts.mjs'),
      errors
    );
    for (const schema of [
      'design-contract.schema.json',
      'directions-evidence.schema.json',
      'init-interview.schema.json',
      'qa-plan.schema.json',
      'selection-evidence.schema.json',
      'status.schema.json',
      'surface-evidence.schema.json'
    ]) {
      assertSameFile(
        path.join(repoRoot, 'templates', 'artifacts', schema),
        path.join(repoRoot, 'skills', skill, 'assets', 'templates', 'artifacts', schema),
        errors
      );
    }
  }

  return errors;
}

function runHook(projectRoot, input) {
  const repoRoot = findRepoRoot();
  if (!repoRoot) return { status: 0, stdout: '', stderr: '' };
  const hookScript = path.join(repoRoot, 'scripts', 'bfds-guard-hook.mjs');
  if (!fs.existsSync(hookScript)) return { status: 0, stdout: '', stderr: '' };
  return spawnSync(process.execPath, [hookScript], {
    cwd: projectRoot,
    input: `${JSON.stringify(input)}\n`,
    encoding: 'utf8'
  });
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

function validProductMd() {
  return `# Product

## Register

product

## Users
Operators use this product to complete repeated work with confidence.

## Product Purpose
The product helps users manage settings without leaving the current workflow.

## Brand Personality
Calm, precise, and trustworthy.

## Anti-references
Avoid decorative dashboards, fake metrics, and loud gradients.

## Design Principles
1. Keep the primary task obvious.
2. Show state close to the action.
3. Preserve operational density.

## Accessibility & Inclusion
Support keyboard access, readable contrast, and reduced motion.
`;
}

function validDesignMd() {
  return `---
name: Demo Product
description: Operational UI design system
colors:
  primary: "#1B365D"
  surface: "#F7F8FA"
typography:
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "14px"
    lineHeight: 1.5
rounded:
  sm: "4px"
  md: "8px"
spacing:
  sm: "8px"
  md: "16px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.sm}"
---

# Design System: Demo Product

## 1. Overview
Quiet operational screens with clear hierarchy and restrained visual accents.

## 2. Colors
Primary ink blue is reserved for durable actions and selected states.

## 3. Typography
Body text uses a compact sans-serif stack with predictable line height.

## 4. Elevation
Depth is mostly tonal; shadows are reserved for overlays.

## 5. Components
Buttons, inputs, cards, and navigation use stable spacing and modest radius.

## 6. Do's and Don'ts
Do keep controls close to their data. Don't use decorative gradients or architecture diagrams as design guidance.
`;
}

function architectureDesignMd() {
  return `# DESIGN.md - Demo Frontend Architecture

## 技术栈
- React
- Less
- tnpm

## 项目结构
\`\`\`text
src/
  components/
  pages/
  hooks/
\`\`\`

## 包管理
Use internal npm registry.
`;
}

function baseInitInterview(slug) {
  return {
    slug,
    confirmedAt: '2026-06-09T11:55:00.000Z',
    source: 'user-interview',
    productPath: 'PRODUCT.md',
    designPath: 'DESIGN.md',
    productMode: 'created',
    designMode: 'scan',
    questions: [
      {
        question: '默认 register 是 product 还是 brand？',
        answerQuote: '这是 product，设计服务高频设置工作流。'
      },
      {
        question: '用户、品牌人格、反参考和可访问性要求是什么？',
        answerQuote: '用户是运营人员；风格要冷静精确；不要花哨渐变；需要键盘可达和清晰对比度。'
      }
    ],
    userConfirmationQuote: '确认以上项目级上下文，可以生成 PRODUCT.md 和 DESIGN.md。'
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
  const errors = validateBundledCopyParity();
  const slug = 'settings-prompt';
  const projectRoots = [];
  const makeProject = (withContext = true) => {
    const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'bfds-gate-'));
    projectRoots.push(projectRoot);
    if (withContext) {
      writeText(path.join(projectRoot, 'PRODUCT.md'), validProductMd());
      writeText(path.join(projectRoot, 'DESIGN.md'), validDesignMd());
      writeJson(path.join(projectRoot, 'docs', 'design', slug, 'evidence', 'init-interview.json'), baseInitInterview(slug));
    }
    return projectRoot;
  };
  const designDirFor = projectRoot => path.join(projectRoot, 'docs', 'design', slug);
  const evidenceDirFor = projectRoot => path.join(designDirFor(projectRoot), 'evidence');
  const writeWorkbench = (projectRoot, files = ['workbench.html', 'option-a.html', 'option-b.html', 'option-c.html']) => {
    for (const file of files) writeText(path.join(designDirFor(projectRoot), file), '<!doctype html><title>BFDS gate test</title>');
  };

  try {
    const checkOnlyRoot = makeProject();
    let result = runGate(checkOnlyRoot, slug, ['--check-only']);
    if (result.phase !== 'NEEDS_SURFACE') errors.push(`expected check-only NEEDS_SURFACE, got ${result.phase}`);
    if (fs.existsSync(path.join(designDirFor(checkOnlyRoot), 'status.json'))) errors.push('check-only must not write status.json');
    if (fs.existsSync(path.join(evidenceDirFor(checkOnlyRoot), 'gate-log.ndjson'))) errors.push('check-only must not write gate-log.ndjson');
    result = runGate(checkOnlyRoot, slug);
    if (result.phase !== 'NEEDS_SURFACE') errors.push(`expected default NEEDS_SURFACE, got ${result.phase}`);
    if (!fs.existsSync(path.join(designDirFor(checkOnlyRoot), 'status.json'))) errors.push('default gate must write status.json');
    assertGateLogIncludes(checkOnlyRoot, slug, 'NEEDS_SURFACE', errors, 'default gate');

    const noContextRoot = makeProject(false);
    const noContext = runGateFailure(noContextRoot, slug, ['--request', '用 /bfds-design 给首页新增一个内容型页面入口。']);
    if (!noContext.failed || noContext.result.phase !== 'CONTEXT_BLOCKED') errors.push(`expected CONTEXT_BLOCKED, got ${noContext.result.phase}`);
    if (!fs.existsSync(path.join(evidenceDirFor(noContextRoot), 'pending-request.json'))) errors.push('expected pending-request.json for blocked request');
    assertGateLogIncludes(noContextRoot, slug, 'CONTEXT_BLOCKED', errors, 'context blocked');

    const noInterviewRoot = makeProject(false);
    writeText(path.join(noInterviewRoot, 'PRODUCT.md'), validProductMd());
    writeText(path.join(noInterviewRoot, 'DESIGN.md'), validDesignMd());
    const noInterview = runGateFailure(noInterviewRoot, slug);
    if (!noInterview.failed || noInterview.result.phase !== 'CONTEXT_BLOCKED') errors.push(`expected missing init interview to be CONTEXT_BLOCKED, got ${noInterview.result.phase}`);

    const architectureRoot = makeProject(false);
    writeText(path.join(architectureRoot, 'PRODUCT.md'), validProductMd());
    writeText(path.join(architectureRoot, 'DESIGN.md'), architectureDesignMd());
    writeJson(path.join(evidenceDirFor(architectureRoot), 'init-interview.json'), baseInitInterview(slug));
    const architecture = runGateFailure(architectureRoot, slug);
    if (!architecture.failed || architecture.result.phase !== 'CONTEXT_BLOCKED') errors.push(`expected architecture DESIGN.md to be CONTEXT_BLOCKED, got ${architecture.result.phase}`);

    const hookRoot = makeProject(false);
    writeJson(path.join(evidenceDirFor(hookRoot), 'init-interview.json'), baseInitInterview(slug));
    let hook = runHook(hookRoot, {
      tool_name: 'Write',
      tool_input: {
        file_path: 'DESIGN.md',
        content: architectureDesignMd()
      }
    });
    if (hook.status === 0) errors.push('expected hook to block architecture DESIGN.md write');

    hook = runHook(hookRoot, {
      tool_name: 'Bash',
      tool_input: {
        command: 'cat > docs/design/settings-prompt/workbench.html'
      }
    });
    if (hook.status === 0) errors.push('expected hook to block Bash write into docs/design/**');

    const skippedRoot = makeProject();
    writeWorkbench(skippedRoot);
    const skipped = runGateFailure(skippedRoot, slug);
    if (!skipped.failed || skipped.result.phase !== 'INCONSISTENT') errors.push(`expected skipped workbench to be INCONSISTENT, got ${skipped.result.phase}`);
    assertGateLogIncludes(skippedRoot, slug, 'INCONSISTENT', errors, 'skipped workbench');

    const partialRoot = makeProject();
    writeJson(path.join(evidenceDirFor(partialRoot), 'surface.json'), baseSurface(slug));
    writeJson(path.join(evidenceDirFor(partialRoot), 'directions.json'), baseDirections(slug));
    writeWorkbench(partialRoot, ['workbench.html', 'option-a.html', 'option-b.html']);
    const partial = runGateFailure(partialRoot, slug);
    if (!partial.failed || partial.result.phase !== 'INCONSISTENT') errors.push(`expected partial workbench to be INCONSISTENT, got ${partial.result.phase}`);
    assertGateLogIncludes(partialRoot, slug, 'INCONSISTENT', errors, 'partial workbench');

    const lowConfidenceRoot = makeProject();
    const lowConfidenceSurface = baseSurface(slug);
    lowConfidenceSurface.surface.confidence = 'low';
    writeJson(path.join(evidenceDirFor(lowConfidenceRoot), 'surface.json'), lowConfidenceSurface);
    const lowConfidence = runGateFailure(lowConfidenceRoot, slug);
    if (!lowConfidence.failed || lowConfidence.result.phase !== 'INCONSISTENT') errors.push(`expected low confidence surface to be INCONSISTENT, got ${lowConfidence.result.phase}`);

    const markRoot = makeProject();
    const earlyMark = runGateFailure(markRoot, slug, ['--mark', 'implementing']);
    if (!earlyMark.failed || earlyMark.result.phase !== 'INCONSISTENT') errors.push(`expected early mark to be INCONSISTENT, got ${earlyMark.result.phase}`);

    const projectRoot = makeProject();
    const designDir = designDirFor(projectRoot);
    const evidenceDir = evidenceDirFor(projectRoot);

    result = runGate(projectRoot, slug);
    if (result.phase !== 'NEEDS_SURFACE') errors.push(`expected NEEDS_SURFACE, got ${result.phase}`);

    writeJson(path.join(evidenceDir, 'surface.json'), baseSurface(slug));
    result = runGate(projectRoot, slug);
    if (result.phase !== 'NEEDS_DIRECTIONS') errors.push(`expected NEEDS_DIRECTIONS, got ${result.phase}`);

    writeJson(path.join(evidenceDir, 'directions.json'), baseDirections(slug));
    result = runGate(projectRoot, slug);
    if (result.phase !== 'NEEDS_WORKBENCH') errors.push(`expected NEEDS_WORKBENCH, got ${result.phase}`);

    writeWorkbench(projectRoot);
    const future = new Date(Date.now() + 5000);
    fs.utimesSync(path.join(evidenceDir, 'directions.json'), future, future);
    result = runGate(projectRoot, slug);
    if (result.phase !== 'NEEDS_SELECTION') errors.push(`expected NEEDS_SELECTION, got ${result.phase}`);
    if (!result.warnings?.some(warning => warning.includes('stale workbench'))) errors.push('expected stale workbench warning');

    for (const quote of ['你来选一个最稳的。', '推荐一个。', '你帮我推荐一个吧。', '三个都行你定。']) {
      writeJson(path.join(evidenceDir, 'selection.json'), baseSelection(slug, quote));
      const invalid = runGateFailure(projectRoot, slug);
      if (!invalid.failed || invalid.result.phase !== 'INCONSISTENT') errors.push(`expected invalid selection ${quote} to be INCONSISTENT, got ${invalid.result.phase}`);
    }

    writeJson(path.join(evidenceDir, 'selection.json'), baseSelection(slug));
    result = runGate(projectRoot, slug);
    if (result.phase !== 'NEEDS_CONTRACT') errors.push(`expected NEEDS_CONTRACT, got ${result.phase}`);
    if (!result.rules?.some(rule => rule.includes('回显') && rule.includes('selection evidence'))) {
      errors.push('expected NEEDS_CONTRACT rules to require selection evidence echo confirmation');
    }

    writeJson(path.join(designDir, 'design-contract.json'), baseContract(slug));
    writeJson(path.join(designDir, 'qa-plan.json'), baseQaPlan(slug));
    writeText(path.join(designDir, 'implementation-handoff.md'), '# Implementation Handoff\n');
    result = runGate(projectRoot, slug);
    if (result.phase !== 'CONTRACT_READY') errors.push(`expected CONTRACT_READY, got ${result.phase}`);

    const qaWithoutReport = runGateFailure(projectRoot, slug, ['--mark', 'qa-passed']);
    if (!qaWithoutReport.failed || qaWithoutReport.result.phase !== 'INCONSISTENT') errors.push(`expected qa-passed without report to be INCONSISTENT, got ${qaWithoutReport.result.phase}`);

    writeText(path.join(designDir, 'qa-report.md'), '# QA Report\n');
    result = runGateWithArgs(projectRoot, slug, ['--mark', 'qa-passed']);
    if (result.status?.state !== 'qa-passed') errors.push(`expected status.state qa-passed, got ${result.status?.state}`);

    const gateLog = path.join(evidenceDir, 'gate-log.ndjson');
    if (!fs.existsSync(gateLog)) errors.push('expected gate-log.ndjson to be written');
    const logLines = fs.existsSync(gateLog) ? fs.readFileSync(gateLog, 'utf8').trim().split('\n').filter(Boolean) : [];
    if (logLines.length < 10) errors.push(`expected at least 10 gate log entries, got ${logLines.length}`);
  } finally {
    for (const projectRoot of projectRoots) {
      fs.rmSync(projectRoot, { recursive: true, force: true });
    }
  }

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
