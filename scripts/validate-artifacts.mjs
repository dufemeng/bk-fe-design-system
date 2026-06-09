#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const forwardMode = args.includes('--forward-tests');
const pressureMode = args.includes('--pressure-tests');
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
        validateSchema(childSchema, value[key], `${location}.${key}`, errors);
      }
    }
  }

  if (Array.isArray(value) && schema.items) {
    value.forEach((item, index) => validateSchema(schema.items, item, `${location}[${index}]`, errors));
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
    status.artifacts?.designContract,
    status.artifacts?.implementationHandoff,
    status.artifacts?.qaPlan
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

const errors = pressureMode
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
  pressureMode
    ? 'Pressure test files are structurally valid.\n'
    : forwardMode
      ? 'Forward test files are structurally valid.\n'
      : `Artifacts valid: ${targetDir}\n`
);
