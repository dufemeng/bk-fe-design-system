#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validateSchema } from '../lib/schema.mjs';

const args = process.argv.slice(2);
const forwardMode = args.includes('--forward-tests');
const pressureMode = args.includes('--pressure-tests');
const gateMode = args.includes('--gate-tests');
const targetDir = args.find(arg => !arg.startsWith('--')) ?? 'fixtures/docs-design-sample/settings-prompt';
const scriptDir = path.dirname(fileURLToPath(import.meta.url));

function schemaPath(file) {
  return path.join(scriptDir, '..', 'schemas', file);
}

const schemaFiles = {
  'evidence/init-interview.json': schemaPath('init-interview.schema.json'),
  'evidence/surface.json': schemaPath('surface-evidence.schema.json'),
  'evidence/brainstorm-dialogue.json': schemaPath('brainstorm-dialogue.schema.json'),
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
  'tests/pressure/bfds-design-partial-answer-quote-drift.md',
  'tests/pressure/bfds-design-workbench-gate.md',
  'tests/pressure/bfds-design-contract-gate.md',
  'tests/pressure/bfds-implement-detect-target-gate.md',
  'tests/pressure/bfds-implement-critique-contract-lock.md',
  'tests/pressure/bfds-implement-live-contract-patch.md'
];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
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
  assertFile(path.join(dir, 'workbench.css'), errors);
  assertFile(path.join(dir, 'option-a.html'), errors);
  assertFile(path.join(dir, 'option-b.html'), errors);
  assertFile(path.join(dir, 'option-c.html'), errors);

  if (errors.length > 0) return errors;

  for (const file of ['workbench.html', 'workbench.css', 'option-a.html', 'option-b.html', 'option-c.html']) {
    const text = fs.readFileSync(path.join(dir, file), 'utf8');
    if (text.includes('BFDS_PLACEHOLDER')) errors.push(`${file} still contains BFDS_PLACEHOLDER`);
  }

  for (const [artifactFile, schemaFile] of Object.entries(schemaFiles)) {
    const schema = readJson(schemaFile);
    schema.$root = schema;
    const data = readJson(path.join(dir, artifactFile));
    validateSchema(schema, data, artifactFile, errors);
  }

  const directions = readJson(path.join(dir, 'evidence', 'directions.json'));
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

  const workbench = fs.readFileSync(path.join(dir, 'workbench.html'), 'utf8');
  for (const [optionId, file] of Object.entries({ A: 'option-a.html', B: 'option-b.html', C: 'option-c.html' })) {
    const name = directions.options?.[optionId]?.name;
    if (!name) {
      errors.push(`evidence/directions.json missing option ${optionId} name`);
      continue;
    }
    if (!workbench.includes(name)) errors.push(`workbench.html must include directions option ${optionId} name: ${name}`);
    const optionText = fs.readFileSync(path.join(dir, file), 'utf8');
    if (!optionText.includes(name)) errors.push(`${file} must include directions option ${optionId} name: ${name}`);
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
    status.artifacts?.brainstormDialogueEvidence,
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
    path.resolve(scriptDir, '..', '..', '..', '..'),
    path.resolve(scriptDir, '..')
  ];
  return candidates.find(candidate =>
    fs.existsSync(path.join(candidate, 'src', 'runtime', 'bfds', 'cli.mjs')) &&
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
  if (!leftBytes.equals(rightBytes)) errors.push(`wrapper drift: ${right} differs from ${left}`);
}

function assertAbsent(file, errors) {
  if (!fs.existsSync(file)) return;
  const stat = fs.statSync(file);
  if (stat.isFile()) {
    errors.push(`unexpected redundant BFDS copy: ${file}`);
    return;
  }
  if (stat.isDirectory() && listFiles(file).length > 0) {
    errors.push(`unexpected redundant BFDS copy: ${file}`);
  }
}

function listFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listFiles(fullPath));
    else if (entry.isFile()) files.push(fullPath);
  }
  return files;
}

function validateSlimRuntimeLayout() {
  const errors = [];
  const repoRoot = findRepoRoot();
  if (!repoRoot) return errors;

  for (const skill of ['bfds-design', 'bfds-implement']) {
    assertSameFile(
      path.join(repoRoot, 'scripts', 'bfds.mjs'),
      path.join(repoRoot, 'skills', skill, 'scripts', 'bfds.mjs'),
      errors
    );
    assertAbsent(path.join(repoRoot, 'skills', skill, 'runtime'), errors);
    assertAbsent(path.join(repoRoot, 'skills', skill, 'scripts', 'bfds-gate.mjs'), errors);
    assertAbsent(path.join(repoRoot, 'skills', skill, 'scripts', 'bfds-status.mjs'), errors);
    assertAbsent(path.join(repoRoot, 'skills', skill, 'scripts', 'validate-artifacts.mjs'), errors);
    assertAbsent(path.join(repoRoot, 'skills', skill, 'assets', 'templates'), errors);
  }

  for (const schema of [
    'design-contract.schema.json',
    'brainstorm-dialogue.schema.json',
    'directions-evidence.schema.json',
    'init-interview.schema.json',
    'qa-plan.schema.json',
    'selection-evidence.schema.json',
    'status.schema.json',
    'surface-evidence.schema.json'
  ]) {
    assertFile(path.join(repoRoot, 'src', 'runtime', 'bfds', 'schemas', schema), errors);
  }

  for (const template of [
    'option.html',
    'workbench.css',
    'workbench.html'
  ]) {
    assertFile(path.join(repoRoot, 'src', 'runtime', 'bfds', 'templates', 'kami-workbench', template), errors);
  }

  for (const legacyPath of [
    path.join(repoRoot, 'templates'),
    path.join(repoRoot, 'skills', 'bfds-design', 'assets', 'templates'),
    path.join(repoRoot, 'skills', 'bfds-implement', 'assets', 'templates')
  ]) {
    assertAbsent(legacyPath, errors);
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

function runSessionStartHook() {
  const repoRoot = findRepoRoot();
  if (!repoRoot) return { status: 0, stdout: '', stderr: '' };
  const hookScript = path.join(repoRoot, 'scripts', 'bfds-session-start.mjs');
  if (!fs.existsSync(hookScript)) return { status: 0, stdout: '', stderr: '' };
  return spawnSync(process.execPath, [hookScript], {
    cwd: repoRoot,
    input: '{}\n',
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

function baseBrainstormDialogue(slug) {
  return {
    slug,
    createdAt: '2026-06-09T12:03:00.000Z',
    surfaceEvidence: `docs/design/${slug}/evidence/surface.json`,
    mode: 'socratic',
    turns: [
      {
        dimension: 'primary-action',
        question: '这个目标界面最先要被用户看见的信息是什么？',
        answerQuote: '提示词输入本身必须最先被看见，其他说明都要弱一点。',
        designImplication: '层级以输入区为主，说明和导航降低视觉存在感。',
        designSystemImplication: '映射到 DESIGN.md 的 spacing.sm/md、rounded.sm 和 components.button-primary。',
        implementationImplication: '复用 src/pages/settings/SettingsPromptPanel.tsx 和 src/components/forms/PromptTextarea.tsx，只调整输入区层级和帮助信息位置。'
      },
      {
        dimension: 'state-edge-cases',
        question: '错误、保存和加载状态需要做到什么精度？',
        answerQuote: '错误和保存要清楚，加载不要占满屏幕，保持局部反馈。',
        designImplication: '方案必须覆盖 default/error/success/loading 的局部状态表达。',
        designSystemImplication: '状态表达映射到 DESIGN.md 的语义色、焦点和状态文案规则。',
        implementationImplication: '实现后自审覆盖 default/error/success/loading，确认反馈不锁住整页。'
      }
    ],
    approachesPresented: [
      '方案 A：保留安静导航和低干扰节奏，强调输入区。',
      '方案 B：组织为操作工作台，让输入、模板、预览和状态更近。',
      '方案 C：突出错误恢复和保存反馈，降低配置失败成本。'
    ],
    userConfirmationQuote: '这三个方向可以，先按 A/B/C 展开。'
  };
}

function baseDirections(slug) {
  const option = (id, dimensions) => ({
    optionId: id,
    name: `方案 ${id}`,
    designThesis: `方案 ${id} 的设计主张。`,
    sourceConstraints: ['PRODUCT.md: 高频设置场景', 'DESIGN.md: colors.primary / spacing.sm / components.button-primary'],
    designSystemRules: [`方案 ${id} 引用 DESIGN.md: colors.primary、spacing.sm/md 和 components.button-primary 规则。`],
    codeReuseHypothesis: [`方案 ${id} 复用 src/pages/settings/SettingsPromptPanel.tsx 和 src/components/forms/PromptTextarea.tsx。`],
    allowedChangeBoundary: `方案 ${id} 只改目标输入区域和局部状态反馈。`,
    hierarchy: `方案 ${id} 的层级。`,
    density: 'snug',
    motion: '低存在感反馈。',
    stateTreatment: '明确展示 default/error/success。',
    layoutStrategy: `方案 ${id} 的布局策略。`,
    interactionModel: `方案 ${id} 的交互模型。`,
    visualSignature: `方案 ${id} 的视觉签名。`,
    differenceDimensions: dimensions,
    implementationRisk: 'medium',
    selfReviewChecks: [`方案 ${id} 不硬编码 colors.primary 以外的新强调色。`, `方案 ${id} 不触及 SettingsPromptPanel.tsx 的 route 和组件 API。`],
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
    brainstormDialogueEvidence: `docs/design/${slug}/evidence/brainstorm-dialogue.json`,
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
      directionsEvidence: `docs/design/${slug}/evidence/directions.json`,
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
    tokens: { source: 'DESIGN.md', rules: ['Use colors.primary only for durable actions', 'Use spacing.sm/md and rounded.sm for prompt controls'] },
    implementationConstraints: {
      sourceOptions: ['A', 'B'],
      designSystemRules: ['DESIGN.md: colors.primary reserved for durable actions; spacing.sm/md controls prompt editor rhythm'],
      codeReuseHypothesis: ['src/pages/settings/SettingsPromptPanel.tsx and src/components/forms/PromptTextarea.tsx remain the reuse anchors'],
      allowedChangeBoundary: ['Only change prompt editor hierarchy and local state feedback'],
      implementationRisk: 'medium',
      selfReviewChecks: ['No hard-coded new emphasis color outside colors.primary', 'Keep SettingsPromptPanel.tsx route and public component API unchanged']
    },
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
  const errors = validateSlimRuntimeLayout();
  const slug = 'settings-prompt';
  const projectRoots = [];
  const writeSourceGroundingFiles = projectRoot => {
    writeText(path.join(projectRoot, 'src', 'pages', 'settings', 'SettingsPromptPanel.tsx'), 'export function SettingsPromptPanel() { return null; }\n');
    writeText(path.join(projectRoot, 'src', 'components', 'forms', 'PromptTextarea.tsx'), 'export function PromptTextarea() { return null; }\n');
    writeText(path.join(projectRoot, 'src', 'components', 'InlineStatus.tsx'), 'export function InlineStatus() { return null; }\n');
  };
  const makeProject = (withContext = true) => {
    const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'bfds-gate-'));
    projectRoots.push(projectRoot);
    if (withContext) {
      writeText(path.join(projectRoot, 'PRODUCT.md'), validProductMd());
      writeText(path.join(projectRoot, 'DESIGN.md'), validDesignMd());
      writeSourceGroundingFiles(projectRoot);
      writeJson(path.join(projectRoot, 'docs', 'design', slug, 'evidence', 'init-interview.json'), baseInitInterview(slug));
    }
    return projectRoot;
  };
  const designDirFor = projectRoot => path.join(projectRoot, 'docs', 'design', slug);
  const evidenceDirFor = projectRoot => path.join(designDirFor(projectRoot), 'evidence');
  const writeWorkbench = (projectRoot, files = ['workbench.html', 'workbench.css', 'option-a.html', 'option-b.html', 'option-c.html']) => {
    for (const file of files) writeText(path.join(designDirFor(projectRoot), file), '<!doctype html><title>BFDS gate test</title>');
  };
  const writePlaceholderWorkbench = projectRoot => {
    for (const file of ['workbench.html', 'workbench.css', 'option-a.html', 'option-b.html', 'option-c.html']) {
      writeText(path.join(designDirFor(projectRoot), file), `<!-- BFDS_PLACEHOLDER -->\n<!doctype html><title>${file}</title>`);
    }
  };
  const runBfds = (projectRoot, args) => {
    const repoRoot = findRepoRoot();
    const bfdsScript = path.join(repoRoot, 'scripts', 'bfds.mjs');
    return spawnSync(process.execPath, [bfdsScript, ...args], {
      cwd: projectRoot,
      encoding: 'utf8'
    });
  };

  try {
    const sessionStart = runSessionStartHook();
    if (sessionStart.status !== 0) errors.push('expected SessionStart hook to exit 0');
    try {
      const sessionStartOutput = JSON.parse(sessionStart.stdout || '{}');
      const context = sessionStartOutput.hookSpecificOutput?.additionalContext ?? '';
      if (!context.includes('bfds.mjs next') || !context.includes('next-card') || !context.includes('AskUserQuestion')) {
        errors.push('expected SessionStart hook context to mention bfds.mjs next, next-card, and AskUserQuestion');
      }
    } catch {
      errors.push('expected SessionStart hook to emit JSON');
    }

    const checkOnlyRoot = makeProject();
    let result = runGate(checkOnlyRoot, slug, ['--check-only']);
    if (result.phase !== 'NEEDS_SURFACE') errors.push(`expected check-only NEEDS_SURFACE, got ${result.phase}`);
    if (fs.existsSync(path.join(designDirFor(checkOnlyRoot), 'status.json'))) errors.push('check-only must not write status.json');
    if (fs.existsSync(path.join(evidenceDirFor(checkOnlyRoot), 'gate-log.ndjson'))) errors.push('check-only must not write gate-log.ndjson');
    result = runGate(checkOnlyRoot, slug);
    if (result.phase !== 'NEEDS_SURFACE') errors.push(`expected default NEEDS_SURFACE, got ${result.phase}`);
    if (!fs.existsSync(path.join(designDirFor(checkOnlyRoot), 'status.json'))) errors.push('default gate must write status.json');
    assertGateLogIncludes(checkOnlyRoot, slug, 'NEEDS_SURFACE', errors, 'default gate');

    const preflightSurfaceRoot = makeProject();
    const invalidSurface = runBfds(preflightSurfaceRoot, [
      'answer',
      slug,
      '--stage',
      'surface',
      '--field',
      'surface=/settings prompt input',
      '--field',
      'currentSource=code',
      '--field',
      'changeType=modify',
      '--field',
      'keep=Existing navigation',
      '--field',
      'change=Prompt input layout',
      '--field',
      'avoid=Backend scope',
      '--field',
      'confirmationQuote=确认目标界面。'
    ]);
    if (invalidSurface.status === 0) errors.push('expected invalid surface currentSource to fail before write');
    if (fs.existsSync(path.join(evidenceDirFor(preflightSurfaceRoot), 'surface.json'))) {
      errors.push('invalid surface currentSource must not write evidence/surface.json');
    }
    if (!invalidSurface.stdout.includes('currentSource enum')) {
      errors.push('expected invalid surface card to print currentSource enum');
    }

    const preflightBrainstormRoot = makeProject();
    writeJson(path.join(evidenceDirFor(preflightBrainstormRoot), 'surface.json'), baseSurface(slug));
    const zeroRoundBrainstorm = runBfds(preflightBrainstormRoot, [
      'answer',
      slug,
      '--stage',
      'brainstorm',
      '--finalize',
      '--field',
      'approach=方案 A',
      '--field',
      'approach=方案 B',
      '--field',
      'confirmationQuote=确认两个方向。'
    ]);
    if (zeroRoundBrainstorm.status === 0) errors.push('expected zero-round brainstorm finalize to fail before write');
    if (fs.existsSync(path.join(evidenceDirFor(preflightBrainstormRoot), 'brainstorm-dialogue.json'))) {
      errors.push('zero-round brainstorm must not write evidence/brainstorm-dialogue.json');
    }

    const groupedBrainstormRoot = makeProject();
    writeJson(path.join(evidenceDirFor(groupedBrainstormRoot), 'surface.json'), baseSurface(slug));
    const groupedBrainstorm = runBfds(groupedBrainstormRoot, [
      'answer',
      slug,
      '--stage',
      'brainstorm',
      '--append-round',
      '--field',
      'dimension=primary-action',
      '--field',
      'question=最先看什么？',
      '--field',
      'answer=先看输入区。',
      '--field',
      'designImplication=输入区层级最高。',
      '--field',
      'designSystemImplication=引用 DESIGN.md: spacing.sm/md 和 components.button-primary。',
      '--field',
      'implementationImplication=复用 src/components/forms/PromptTextarea.tsx。',
      '--field',
      'dimension=state-edge-cases',
      '--field',
      'question=状态要多强？',
      '--field',
      'answer=错误和保存要清楚。',
      '--field',
      'designImplication=覆盖局部状态。',
      '--field',
      'designSystemImplication=引用 DESIGN.md: Colors 和 Accessibility 状态规则。',
      '--field',
      'implementationImplication=把状态纳入自审。'
    ]);
    if (groupedBrainstorm.status === 0) errors.push('expected grouped brainstorm append to fail before write');
    if (fs.existsSync(path.join(evidenceDirFor(groupedBrainstormRoot), 'brainstorm-dialogue.draft.json'))) {
      errors.push('grouped brainstorm append must not write evidence/brainstorm-dialogue.draft.json');
    }

    const preflightDirectionsRoot = makeProject();
    writeJson(path.join(evidenceDirFor(preflightDirectionsRoot), 'surface.json'), baseSurface(slug));
    writeJson(path.join(evidenceDirFor(preflightDirectionsRoot), 'brainstorm-dialogue.json'), baseBrainstormDialogue(slug));
    const oneDimensionDirection = runBfds(preflightDirectionsRoot, [
      'directions',
      slug,
      '--option',
      'A',
      '--field',
      'name=方案 A',
      '--field',
      'designThesis=强调输入区。',
      '--field',
      'designSystemRule=DESIGN.md: spacing.sm/md、rounded.sm 和 components.button-primary 约束输入与保存动作。',
      '--field',
      'codeReuseHypothesis=src/pages/settings/SettingsPromptPanel.tsx + src/components/forms/PromptTextarea.tsx 是复用锚点。',
      '--field',
      'allowedChangeBoundary=只改提示词输入区域。',
      '--field',
      'hierarchy=输入区优先。',
      '--field',
      'density=snug',
      '--field',
      'motion=低存在感反馈。',
      '--field',
      'stateTreatment=覆盖 default/error/success。',
      '--field',
      'layoutStrategy=保留周边布局。',
      '--field',
      'interactionModel=保存和错误反馈局部完成。',
      '--field',
      'visualSignature=稳定基线和细分隔。',
      '--field',
      'differenceDimension=hierarchy',
      '--field',
      'implementationRisk=medium',
      '--field',
      'selfReviewCheck=保存主动作之外不硬编码新的 colors.primary 强调色。',
      '--field',
      'selfReviewCheck=未改变导航区域。',
      '--field',
      'keep=Existing navigation',
      '--field',
      'change=Prompt input layout',
      '--field',
      'avoid=Backend scope',
      '--field',
      'risks=差异不足',
      '--field',
      'bestFor=高频设置'
    ]);
    if (oneDimensionDirection.status === 0) errors.push('expected one-dimension direction option to fail before write');
    if (fs.existsSync(path.join(evidenceDirFor(preflightDirectionsRoot), 'directions.draft.json'))) {
      errors.push('invalid direction option must not write evidence/directions.draft.json');
    }
    if (!oneDimensionDirection.stdout.includes('differenceDimension enum')) {
      errors.push('expected invalid direction card to print differenceDimension enum');
    }

    const missingReusePathRoot = makeProject();
    writeJson(path.join(evidenceDirFor(missingReusePathRoot), 'surface.json'), baseSurface(slug));
    writeJson(path.join(evidenceDirFor(missingReusePathRoot), 'brainstorm-dialogue.json'), baseBrainstormDialogue(slug));
    const missingReusePathDirection = runBfds(missingReusePathRoot, [
      'directions',
      slug,
      '--option',
      'A',
      '--field',
      'name=方案 A',
      '--field',
      'designThesis=强调输入区。',
      '--field',
      'designSystemRule=DESIGN.md: spacing.sm/md、rounded.sm 和 components.button-primary 约束输入与保存动作。',
      '--field',
      'codeReuseHypothesis=src/missing/FakePromptPanel.tsx 是复用锚点。',
      '--field',
      'allowedChangeBoundary=只改提示词输入区域。',
      '--field',
      'hierarchy=输入区优先。',
      '--field',
      'density=snug',
      '--field',
      'motion=低存在感反馈。',
      '--field',
      'stateTreatment=覆盖 default/error/success。',
      '--field',
      'layoutStrategy=保留周边布局。',
      '--field',
      'interactionModel=保存和错误反馈局部完成。',
      '--field',
      'visualSignature=稳定基线和细分隔。',
      '--field',
      'differenceDimension=hierarchy',
      '--field',
      'differenceDimension=density',
      '--field',
      'implementationRisk=medium',
      '--field',
      'selfReviewCheck=保存主动作之外不硬编码新的 colors.primary 强调色。',
      '--field',
      'selfReviewCheck=未改变导航区域。',
      '--field',
      'keep=Existing navigation',
      '--field',
      'change=Prompt input layout',
      '--field',
      'avoid=Backend scope',
      '--field',
      'risks=路径不存在',
      '--field',
      'bestFor=高频设置'
    ]);
    if (missingReusePathDirection.status === 0) errors.push('expected nonexistent codeReuseHypothesis path to fail before write');
    if (fs.existsSync(path.join(evidenceDirFor(missingReusePathRoot), 'directions.draft.json'))) {
      errors.push('invalid codeReuseHypothesis path must not write evidence/directions.draft.json');
    }
    if (!missingReusePathDirection.stdout.includes('missing source path')) {
      errors.push('expected nonexistent codeReuseHypothesis path error to mention missing source path');
    }

    const draftCleanupRoot = makeProject(false);
    let writeResult = runBfds(draftCleanupRoot, [
      'answer',
      slug,
      '--stage',
      'init',
      '--append-round',
      '--field',
      'question=项目类型是什么？',
      '--field',
      'answerQuote=这是设置页设计任务。',
      '--field',
      'question=用户和目的是什么？',
      '--field',
      'answerQuote=用户是运营人员，目的是高频编辑设置。'
    ]);
    if (writeResult.status !== 0) errors.push(`expected init append to pass, got ${writeResult.status}: ${writeResult.stderr || writeResult.stdout}`);
    writeResult = runBfds(draftCleanupRoot, [
      'answer',
      slug,
      '--stage',
      'init',
      '--finalize',
      '--field',
      'productPath=PRODUCT.md',
      '--field',
      'designPath=DESIGN.md',
      '--field',
      'userConfirmationQuote=确认项目上下文。'
    ]);
    if (writeResult.status !== 0) errors.push(`expected init finalize to pass, got ${writeResult.status}: ${writeResult.stderr || writeResult.stdout}`);
    const finalizedInit = readJson(path.join(evidenceDirFor(draftCleanupRoot), 'init-interview.json'));
    if (finalizedInit.questions.length !== 2) {
      errors.push(`expected grouped init append to keep two Q/A entries, got ${finalizedInit.questions.length}`);
    }
    if (fs.existsSync(path.join(evidenceDirFor(draftCleanupRoot), 'init-interview.draft.json'))) {
      errors.push('init finalize must remove init-interview.draft.json');
    }

    writeText(path.join(draftCleanupRoot, 'PRODUCT.md'), validProductMd());
    writeText(path.join(draftCleanupRoot, 'DESIGN.md'), validDesignMd());
    writeSourceGroundingFiles(draftCleanupRoot);
    writeJson(path.join(evidenceDirFor(draftCleanupRoot), 'surface.json'), baseSurface(slug));
    for (const [dimension, question, answer, implication] of [
      ['primary-action', '最先看什么？', '先看输入区。', '输入区层级最高。'],
      ['state-edge-cases', '状态要多强？', '错误和保存要清楚。', '覆盖局部状态。']
    ]) {
      writeResult = runBfds(draftCleanupRoot, [
        'answer',
        slug,
        '--stage',
        'brainstorm',
        '--append-round',
        '--field',
        `dimension=${dimension}`,
        '--field',
        `question=${question}`,
        '--field',
        `answer=${answer}`,
        '--field',
        `designImplication=${implication}`,
        '--field',
        'designSystemImplication=引用 DESIGN.md: spacing.sm/md、components.button-primary 和 Colors 状态规则。',
        '--field',
        'implementationImplication=复用 src/pages/settings/SettingsPromptPanel.tsx 和 src/components/forms/PromptTextarea.tsx，并把结果纳入自审检查。'
      ]);
      if (writeResult.status !== 0) errors.push(`expected brainstorm append to pass, got ${writeResult.status}: ${writeResult.stderr || writeResult.stdout}`);
    }
    writeResult = runBfds(draftCleanupRoot, [
      'answer',
      slug,
      '--stage',
      'brainstorm',
      '--finalize',
      '--field',
      'approach=方案 A：输入优先。',
      '--field',
      'approach=方案 B：状态优先。',
      '--field',
      'confirmationQuote=确认进入三方向。'
    ]);
    if (writeResult.status !== 0) errors.push(`expected brainstorm finalize to pass, got ${writeResult.status}: ${writeResult.stderr || writeResult.stdout}`);
    if (fs.existsSync(path.join(evidenceDirFor(draftCleanupRoot), 'brainstorm-dialogue.draft.json'))) {
      errors.push('brainstorm finalize must remove brainstorm-dialogue.draft.json');
    }

    for (const [optionId, dimensions] of [
      ['A', ['hierarchy', 'density']],
      ['B', ['interaction-model', 'state-treatment']],
      ['C', ['motion-role', 'visual-signature']]
    ]) {
      const args = [
        'directions',
        slug,
        '--option',
        optionId,
        '--field',
        `name=方案 ${optionId}`,
        '--field',
        `designThesis=方案 ${optionId} 的主张。`,
        '--field',
        `designSystemRule=方案 ${optionId} 引用 DESIGN.md: colors.primary、spacing.sm/md 和 components.button-primary 规则。`,
        '--field',
        `codeReuseHypothesis=方案 ${optionId} 复用 src/pages/settings/SettingsPromptPanel.tsx 和 src/components/forms/PromptTextarea.tsx。`,
        '--field',
        `allowedChangeBoundary=方案 ${optionId} 只改目标输入区域。`,
        '--field',
        `hierarchy=方案 ${optionId} 的层级。`,
        '--field',
        'density=snug',
        '--field',
        'motion=低存在感反馈。',
        '--field',
        'stateTreatment=覆盖 default/error/success。',
        '--field',
        `layoutStrategy=方案 ${optionId} 的布局。`,
        '--field',
        `interactionModel=方案 ${optionId} 的交互。`,
        '--field',
        `visualSignature=方案 ${optionId} 的视觉签名。`,
        '--field',
        `differenceDimension=${dimensions[0]}`,
        '--field',
        `differenceDimension=${dimensions[1]}`,
        '--field',
        'implementationRisk=medium',
        '--field',
        `selfReviewCheck=方案 ${optionId} 不硬编码 colors.primary 以外的新强调色。`,
        '--field',
        `selfReviewCheck=方案 ${optionId} 未改变 keep 区域。`,
        '--field',
        'keep=Existing navigation',
        '--field',
        'change=Prompt input layout',
        '--field',
        'avoid=Backend scope',
        '--field',
        'risks=Risk note',
        '--field',
        'bestFor=Settings workflow'
      ];
      writeResult = runBfds(draftCleanupRoot, args);
      if (writeResult.status !== 0) errors.push(`expected directions ${optionId} to pass, got ${writeResult.status}: ${writeResult.stderr || writeResult.stdout}`);
    }
    if (fs.existsSync(path.join(evidenceDirFor(draftCleanupRoot), 'directions.draft.json'))) {
      errors.push('directions finalize must remove directions.draft.json');
    }

    const noContextRoot = makeProject(false);
    const noContext = runGateFailure(noContextRoot, slug, ['--request', '用 /bfds-design 给首页新增一个内容型页面入口。']);
    if (!noContext.failed || noContext.result.phase !== 'CONTEXT_BLOCKED') errors.push(`expected CONTEXT_BLOCKED, got ${noContext.result.phase}`);
    if (!fs.existsSync(path.join(evidenceDirFor(noContextRoot), 'pending-request.json'))) errors.push('expected pending-request.json for blocked request');
    if (!noContext.result.contextTask?.some(task => task.includes('AskUserQuestion') && task.includes('product') && task.includes('brand'))) {
      errors.push('expected CONTEXT_BLOCKED task to require AskUserQuestion product/brand register choice');
    }
    const blockedNextCard = runBfds(noContextRoot, ['next', slug, '--request', '用 /bfds-design 给首页新增一个内容型页面入口。']);
    if (blockedNextCard.status === 0) errors.push('expected bfds next to exit non-zero for CONTEXT_BLOCKED');
    if (!blockedNextCard.stdout.includes('BFDS_NEXT_CARD') || !blockedNextCard.stdout.includes('phase: CONTEXT_BLOCKED')) {
      errors.push('expected blocked bfds next to still print CONTEXT_BLOCKED next-card');
    }
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

    hook = runHook(hookRoot, {
      tool_name: 'Write',
      tool_input: {
        file_path: 'docs/design/settings-prompt/evidence/directions.json',
        content: JSON.stringify(baseDirections(slug), null, 2)
      }
    });
    if (hook.status === 0) errors.push('expected hook to block directions.json before brainstorm-dialogue.json');

    hook = runHook(hookRoot, {
      tool_name: 'Task',
      tool_input: {
        description: '写 BFDS 上下文产物',
        prompt: '请根据 init-interview.json 生成 PRODUCT.md 和 DESIGN.md。'
      }
    });
    if (hook.status === 0) errors.push('expected hook to block delegated PRODUCT.md / DESIGN.md writing');

    hook = runHook(hookRoot, {
      tool_name: 'Task',
      tool_input: {
        description: '只读调研',
        prompt: '请读取 PRODUCT.md 并总结已有项目级上下文，不要写入任何文件。'
      }
    });
    if (hook.status !== 0) errors.push(`expected hook to allow read-only delegated PRODUCT.md research, got ${hook.status}: ${hook.stderr || hook.stdout}`);

    const skippedRoot = makeProject();
    writeWorkbench(skippedRoot);
    const skipped = runGateFailure(skippedRoot, slug);
    if (!skipped.failed || skipped.result.phase !== 'INCONSISTENT') errors.push(`expected skipped workbench to be INCONSISTENT, got ${skipped.result.phase}`);
    const inconsistentNextCard = runBfds(skippedRoot, ['next', slug]);
    if (inconsistentNextCard.status === 0) errors.push('expected bfds next to exit non-zero for INCONSISTENT');
    if (!inconsistentNextCard.stdout.includes('BFDS_NEXT_CARD') || !inconsistentNextCard.stdout.includes('phase: INCONSISTENT')) {
      errors.push('expected inconsistent bfds next to still print INCONSISTENT next-card');
    }
    assertGateLogIncludes(skippedRoot, slug, 'INCONSISTENT', errors, 'skipped workbench');

    const partialRoot = makeProject();
    writeJson(path.join(evidenceDirFor(partialRoot), 'surface.json'), baseSurface(slug));
    writeJson(path.join(evidenceDirFor(partialRoot), 'brainstorm-dialogue.json'), baseBrainstormDialogue(slug));
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
    if (!result.missing?.includes('evidence/brainstorm-dialogue.json')) errors.push(`expected missing brainstorm-dialogue.json, got ${result.missing?.join(', ')}`);

    const noBrainstormRoot = makeProject();
    writeJson(path.join(evidenceDirFor(noBrainstormRoot), 'surface.json'), baseSurface(slug));
    writeJson(path.join(evidenceDirFor(noBrainstormRoot), 'directions.json'), baseDirections(slug));
    const noBrainstorm = runGateFailure(noBrainstormRoot, slug);
    if (!noBrainstorm.failed || noBrainstorm.result.phase !== 'INCONSISTENT') errors.push(`expected directions before brainstorm to be INCONSISTENT, got ${noBrainstorm.result.phase}`);

    writeJson(path.join(evidenceDir, 'brainstorm-dialogue.json'), baseBrainstormDialogue(slug));
    result = runGate(projectRoot, slug);
    if (result.phase !== 'NEEDS_DIRECTIONS') errors.push(`expected NEEDS_DIRECTIONS after brainstorm, got ${result.phase}`);
    if (!result.missing?.includes('evidence/directions.json')) errors.push(`expected missing directions.json, got ${result.missing?.join(', ')}`);

    writeJson(path.join(evidenceDir, 'directions.json'), baseDirections(slug));
    result = runGate(projectRoot, slug);
    if (result.phase !== 'NEEDS_WORKBENCH') errors.push(`expected NEEDS_WORKBENCH, got ${result.phase}`);

    writePlaceholderWorkbench(projectRoot);
    result = runGate(projectRoot, slug);
    if (result.phase !== 'NEEDS_WORKBENCH') errors.push(`expected placeholder workbench to stay NEEDS_WORKBENCH, got ${result.phase}`);
    if (!result.missing?.includes('workbench.html') || !result.missing?.includes('workbench.css')) {
      errors.push(`expected placeholder workbench files to be reported missing, got ${result.missing?.join(', ')}`);
    }

    writeWorkbench(projectRoot);
    const future = new Date(Date.now() + 5000);
    fs.utimesSync(path.join(evidenceDir, 'directions.json'), future, future);
    result = runGate(projectRoot, slug);
    if (result.phase !== 'NEEDS_SELECTION') errors.push(`expected NEEDS_SELECTION, got ${result.phase}`);
    if (!result.warnings?.some(warning => warning.includes('stale workbench'))) errors.push('expected stale workbench warning');
    if (!result.rules?.some(rule => rule.includes('AskUserQuestion') && rule.includes('A/B/C'))) {
      errors.push('expected NEEDS_SELECTION rules to require AskUserQuestion A/B/C selection');
    }

    for (const quote of ['你来选一个最稳的。', '推荐一个。', '你帮我推荐一个吧。', '三个都行你定。']) {
      writeJson(path.join(evidenceDir, 'selection.json'), baseSelection(slug, quote));
      const warned = runGate(projectRoot, slug);
      if (warned.phase !== 'NEEDS_SELECTION') errors.push(`expected delegated selection ${quote} to stay NEEDS_SELECTION, got ${warned.phase}`);
      if (!warned.warnings?.some(warning => warning.includes('may delegate the choice to the agent'))) {
        errors.push(`expected delegated selection ${quote} to emit delegated-choice warning`);
      }
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

    const implementedWithoutReview = runGateFailure(projectRoot, slug, ['--mark', 'implemented']);
    if (!implementedWithoutReview.failed || implementedWithoutReview.result.phase !== 'INCONSISTENT') {
      errors.push(`expected implemented without self-review evidence to be INCONSISTENT, got ${implementedWithoutReview.result.phase}`);
    }

    const implemented = runBfds(projectRoot, [
      'mark',
      slug,
      '--state',
      'implemented',
      '--field',
      'selfReviewNote=已逐项检查 implementationConstraints.selfReviewChecks：保存主动作、设置面板边界、输入控件小屏状态和可访问状态均通过；无剩余 P0/P1/P2 偏差。'
    ]);
    if (implemented.status !== 0) errors.push(`expected mark implemented with selfReviewNote to pass, got ${implemented.status}: ${implemented.stderr || implemented.stdout}`);
    const selfReviewFile = path.join(evidenceDir, 'implementation-self-review.json');
    if (!fs.existsSync(selfReviewFile)) errors.push('expected implementation-self-review.json after mark implemented');
    const implementedStatus = readJson(path.join(designDir, 'status.json'));
    if (implementedStatus.state !== 'implemented') errors.push(`expected status.state implemented, got ${implementedStatus.state}`);
    if (!implementedStatus.artifacts?.implementationSelfReview?.endsWith('evidence/implementation-self-review.json')) {
      errors.push('expected status artifacts to include implementationSelfReview');
    }

    const qaWithoutReport = runGateFailure(projectRoot, slug, ['--mark', 'qa-passed']);
    if (!qaWithoutReport.failed || qaWithoutReport.result.phase !== 'INCONSISTENT') errors.push(`expected qa-passed without report to be INCONSISTENT, got ${qaWithoutReport.result.phase}`);

    writeText(path.join(designDir, 'qa-report.md'), '# QA Report\n\nQA-001\n');
    const shallowQaPass = runBfds(projectRoot, ['qa', slug, '--pass']);
    if (shallowQaPass.status === 0) errors.push('expected qa --pass with shallow check-id-only report to fail');
    if (!`${shallowQaPass.stderr}\n${shallowQaPass.stdout}`.includes('non-empty Result and Evidence')) {
      errors.push('expected shallow qa --pass failure to require Result and Evidence');
    }

    writeResult = runBfds(projectRoot, ['qa', slug, '--start']);
    if (writeResult.status !== 0) errors.push(`expected qa --start to pass, got ${writeResult.status}: ${writeResult.stderr || writeResult.stdout}`);
    writeResult = runBfds(projectRoot, [
      'qa',
      slug,
      '--check',
      'QA-001',
      '--field',
      'result=not-run',
      '--field',
      'evidence=未运行：gate fixture 不包含可运行实现；这是结构化证据占位。',
      '--field',
      'notes=真实执行时替换为截图路径、命令输出、diff 范围或未运行原因。'
    ]);
    if (writeResult.status !== 0) errors.push(`expected qa --check to pass, got ${writeResult.status}: ${writeResult.stderr || writeResult.stdout}`);
    writeResult = runBfds(projectRoot, ['qa', slug, '--pass']);
    if (writeResult.status !== 0) errors.push(`expected qa --pass with structured evidence to pass, got ${writeResult.status}: ${writeResult.stderr || writeResult.stdout}`);
    const qaPassedStatus = readJson(path.join(designDir, 'status.json'));
    if (qaPassedStatus.state !== 'qa-passed') errors.push(`expected status.state qa-passed, got ${qaPassedStatus.state}`);

    const nextCard = runBfds(projectRoot, ['next', slug]);
    if (nextCard.status !== 0) errors.push(`expected bfds next to exit 0, got ${nextCard.status}`);
    if (!nextCard.stdout.includes('BFDS_NEXT_CARD')) errors.push('expected bfds next output to include BFDS_NEXT_CARD');
    const nextCardLines = nextCard.stdout.trim().split('\n').length;
    if (nextCardLines > 80) errors.push(`expected next-card <= 80 lines, got ${nextCardLines}`);

    const repoRoot = findRepoRoot();
    const skillLocal = spawnSync(process.execPath, [path.join(repoRoot, 'skills', 'bfds-design', 'scripts', 'bfds.mjs'), 'list', '--json', '--limit', '4'], {
      cwd: projectRoot,
      encoding: 'utf8'
    });
    if (skillLocal.status !== 0) errors.push(`expected skill-local bfds.mjs to exit 0, got ${skillLocal.status}: ${skillLocal.stderr}`);
    if (!skillLocal.stdout.includes(slug)) errors.push('expected skill-local bfds.mjs list to include test slug');

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
