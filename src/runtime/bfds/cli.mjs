#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validateSchema } from './lib/schema.mjs';

const runtimeDir = path.dirname(fileURLToPath(import.meta.url));
const runtimeScriptsDir = path.join(runtimeDir, 'scripts');
const runtimeTemplatesDir = path.join(runtimeDir, 'templates');
const cwd = process.cwd();
const PLACEHOLDER = 'BFDS_PLACEHOLDER';
const OPTION_IDS = ['A', 'B', 'C'];
const CURRENT_SOURCE_VALUES = ['screenshot', 'figma', 'prototype', 'url', 'browser-capture', 'storybook', 'code-inference', 'user-description'];
const CHANGE_TYPE_VALUES = ['create', 'extend', 'modify', 'remove', 'replace', 'merge', 'restyle'];
const BRAINSTORM_DIMENSION_VALUES = ['primary-action', 'user-mindset', 'content-data-range', 'state-edge-cases', 'visual-direction', 'scene-sentence', 'anchor-reference', 'scope-fidelity', 'constraints-accessibility', 'local-preservation'];
const DIFFERENCE_DIMENSION_VALUES = ['information-architecture', 'hierarchy', 'density', 'state-treatment', 'interaction-model', 'motion-role', 'local-preservation', 'visual-signature'];
const INVALID_SELECTION_PATTERNS = [
  /你来选/,
  /挑.*稳/,
  /帮我.*推荐/,
  /你.*推荐/,
  /推荐\s*(一个|个|下|一下|一版|方案|最|吧)/,
  /你觉得.*用/,
  /都差不多/,
  /三个都行/,
  /都行.*(你|帮我)?.*(定|选|决定)?/,
  /都可以.*(你|帮我)?.*(定|选|决定)?/,
  /你.*(定|决定|选)/,
  /随便(选|挑|定|一个|哪个|你|吧)/,
  /agent.*选/i,
  /choose.*for me/i,
  /you pick/i
];

export function main(argv = process.argv.slice(2)) {
  const parsed = parseGlobal(argv);
  if (parsed.help || !parsed.command) {
    print(usage());
    return parsed.help ? 0 : 1;
  }

  try {
    const result = dispatch(parsed);
    if (typeof result === 'string') print(result);
    else if (result && typeof result.text === 'string') {
      print(result.text);
      return result.status ?? 0;
    }
    return 0;
  } catch (error) {
    if (error.nextCard) {
      print(error.message);
      print(error.nextCard);
      return 1;
    }
    const fallback = fallbackNextCard(parsed);
    console.error(error.message);
    if (fallback) print(fallback);
    return 1;
  }
}

function fallbackNextCard(global) {
  try {
    const parsed = parseCommand(global.rest);
    if (!parsed.target) return null;
    return renderNextCard(runGate(parsed.target, [], global.root), global.json);
  } catch {
    return null;
  }
}

function usage() {
  return [
    'Usage: node bfds.mjs <command> [args]',
    '',
    'Commands:',
    '  next <slug> [--request "..."]',
    '  list [--json] [--limit 4] [--state <state>]',
    '  validate <slug>',
    '  answer <slug> --stage <init|surface|brainstorm> [--field key=value]',
    '  directions <slug> --option A [--field key=value]',
    '  workbench <slug> --scaffold|--validate',
    '  select <slug> [--field key=value]',
    '  pack <slug> --add <entry>|--set key=value|--confirm [--field key=value]',
    '  mark <slug> --state <state>',
    '  qa <slug> --start|--check <id>|--pass [--field key=value]',
    '  live <slug> [--field key=value]'
  ].join('\n');
}

function dispatch(parsed) {
  const { command, rest } = parsed;
  if (command === 'next') return commandNext(rest, parsed);
  if (command === 'list') return commandList(rest, parsed);
  if (command === 'validate') return commandValidate(rest, parsed);
  if (command === 'answer') return commandAnswer(rest, parsed);
  if (command === 'directions') return commandDirections(rest, parsed);
  if (command === 'workbench') return commandWorkbench(rest, parsed);
  if (command === 'select') return commandSelect(rest, parsed);
  if (command === 'pack') return commandPack(rest, parsed);
  if (command === 'mark') return commandMark(rest, parsed);
  if (command === 'qa') return commandQa(rest, parsed);
  if (command === 'live') return commandLive(rest, parsed);
  throw new Error(`Unknown command: ${command}`);
}

function parseGlobal(argv) {
  const result = {
    command: null,
    rest: [],
    root: 'docs/design',
    json: false,
    help: false
  };
  const rest = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (arg === '--json') {
      result.json = true;
      rest.push(arg);
    } else if (arg === '--root') {
      result.root = argv[i + 1];
      rest.push(arg, argv[i + 1]);
      i += 1;
    } else if (!result.command) {
      result.command = arg;
    } else {
      rest.push(arg);
    }
  }
  result.rest = rest;
  return result;
}

function parseCommand(rest) {
  const result = {
    target: null,
    fields: new Map(),
    fieldList: [],
    flags: new Set(),
    options: new Map(),
    positionals: []
  };
  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (arg === '--field') {
      const pair = rest[i + 1];
      if (!pair || pair.startsWith('--')) throw new Error('--field requires key=value');
      addField(result, pair);
      i += 1;
    } else if (['--stage', '--option', '--add', '--set', '--state', '--request', '--limit', '--root', '--check'].includes(arg)) {
      const value = rest[i + 1];
      if (!value || value.startsWith('--')) throw new Error(`${arg} requires a value`);
      result.options.set(arg.slice(2), value);
      i += 1;
    } else if (arg.startsWith('--')) {
      result.flags.add(arg.slice(2));
    } else if (!result.target) {
      result.target = arg;
      result.positionals.push(arg);
    } else {
      result.positionals.push(arg);
    }
  }
  for (const [key, values] of readStdinFields()) {
    for (const value of values) addFieldValue(result, key, value);
  }
  return result;
}

function addField(parsed, pair) {
  const index = pair.indexOf('=');
  if (index <= 0) throw new Error(`Invalid --field ${pair}; expected key=value`);
  const key = pair.slice(0, index);
  const value = pair.slice(index + 1);
  if (/^\s*[\[{]/.test(value)) {
    throw new Error(`Field ${key} must not be a JSON string; use grouped fields instead`);
  }
  addFieldValue(parsed, key, value);
}

function addFieldValue(parsed, key, value) {
  if (!parsed.fields.has(key)) parsed.fields.set(key, []);
  parsed.fields.get(key).push(value);
  parsed.fieldList.push({ key, value });
}

function readStdinFields() {
  if (process.stdin.isTTY) return [];
  let input = '';
  try {
    input = fs.readFileSync(0, 'utf8');
  } catch {
    return [];
  }
  if (!input.trim()) return [];
  const entries = new Map();
  const lines = input.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const blockMatch = line.match(/^([A-Za-z0-9_.-]+)<<([A-Za-z0-9_-]+)$/);
    if (blockMatch) {
      const [, key, end] = blockMatch;
      const block = [];
      i += 1;
      while (i < lines.length && lines[i] !== end) {
        block.push(lines[i]);
        i += 1;
      }
      pushEntry(entries, key, block.join('\n'));
      continue;
    }
    const pairMatch = line.match(/^([A-Za-z0-9_.-]+):\s?(.*)$/);
    if (pairMatch) pushEntry(entries, pairMatch[1], pairMatch[2]);
  }
  return Array.from(entries.entries());
}

function pushEntry(map, key, value) {
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(value);
}

function fieldOne(parsed, key, fallback = '') {
  return parsed.fields.get(key)?.at(-1) ?? fallback;
}

function fieldAll(parsed, key) {
  return parsed.fields.get(key) ?? [];
}

function fieldRequired(parsed, key) {
  const value = fieldOne(parsed, key);
  if (!value) throw withNext(`Missing required field: ${key}`, null);
  return value;
}

function rel(file) {
  return path.relative(cwd, file).split(path.sep).join('/') || '.';
}

function resolveDesignDir(slug, root = 'docs/design') {
  if (!slug) throw new Error('Missing design task slug');
  if (slug.includes('/') || slug.includes(path.sep)) return path.resolve(cwd, slug);
  return path.resolve(cwd, root, slug);
}

function slugFromTarget(target) {
  return path.basename(resolveDesignDir(target));
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readJson(file, fallback = null) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, data) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

function removeIfExists(file) {
  if (fs.existsSync(file)) fs.rmSync(file, { force: true });
}

function readText(file, fallback = '') {
  if (!fs.existsSync(file)) return fallback;
  return fs.readFileSync(file, 'utf8');
}

function writeText(file, text) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, text);
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function scriptPath(name) {
  return path.join(runtimeScriptsDir, name);
}

function runNode(script, args, options = {}) {
  const child = spawnSync(process.execPath, [script, ...args], {
    cwd,
    encoding: 'utf8',
    ...options
  });
  return child;
}

function runGate(target, args = [], root = 'docs/design') {
  const gateArgs = [target, '--json', '--root', root, ...args];
  const child = runNode(scriptPath('bfds-gate.mjs'), gateArgs);
  const text = child.stdout || child.stderr;
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(text.trim() || `bfds-gate failed with status ${child.status}`);
  }
}

function schemaPath(name) {
  return path.join(runtimeDir, 'schemas', name);
}

function readSchema(name) {
  return readJson(schemaPath(name));
}

function assertSchemaValue(schema, value, label, target, global, rootSchema = schema) {
  const errors = [];
  validateSchema(schema, value, label, errors, rootSchema);
  if (errors.length > 0) throwInvalid(`${label} is invalid:\n- ${errors.join('\n- ')}`, target, global);
}

function assertSchemaFile(schemaName, value, label, target, global) {
  const schema = readSchema(schemaName);
  assertSchemaValue(schema, value, label, target, global);
}

function assertDirectionOption(option, target, global) {
  const schema = readSchema('directions-evidence.schema.json');
  assertSchemaValue(schema.$defs.option, option, `directions.options.${option.optionId}`, target, global, schema);
}

function nextCardForTarget(target, global) {
  if (!target || !global) return null;
  return renderNextCard(runGate(target, [], global.root), false);
}

function throwInvalid(message, target, global) {
  throw withNext(message, nextCardForTarget(target, global));
}

function commandNext(rest, global) {
  const parsed = parseCommand(rest);
  const request = parsed.options.get('request');
  const extra = request ? ['--request', request] : [];
  const result = runGate(parsed.target, extra, global.root);
  return {
    text: renderNextCard(result, global.json),
    status: ['CONTEXT_BLOCKED', 'INCONSISTENT'].includes(result.phase) ? 1 : 0
  };
}

function commandList(rest, global) {
  const parsed = parseCommand(rest);
  const args = ['--root', global.root];
  if (global.json || rest.includes('--json')) args.push('--json');
  if (parsed.options.has('limit')) args.push('--limit', parsed.options.get('limit'));
  if (parsed.options.has('state')) args.push('--state', parsed.options.get('state'));
  const child = runNode(scriptPath('bfds-status.mjs'), args);
  if (child.status !== 0) throw new Error(child.stderr || child.stdout);
  return child.stdout;
}

function commandValidate(rest, global) {
  const validateArgs = rest.length > 0 ? rest : ['fixtures/docs-design-sample/settings-prompt'];
  const child = runNode(scriptPath('validate-artifacts.mjs'), validateArgs);
  if (child.status !== 0) throw new Error(child.stderr || child.stdout);
  return child.stdout;
}

function commandAnswer(rest, global) {
  const parsed = parseCommand(rest);
  const stage = parsed.options.get('stage');
  if (!stage) throw new Error('answer requires --stage');
  const dir = resolveDesignDir(parsed.target, global.root);
  ensureDir(path.join(dir, 'evidence'));
  if (stage === 'surface') writeSurface(dir, parsed, global);
  else if (stage === 'init') writeInit(dir, parsed, global);
  else if (stage === 'brainstorm') writeBrainstorm(dir, parsed, global);
  else throw new Error(`Unsupported answer stage: ${stage}`);
  const result = runGate(parsed.target, [], global.root);
  return renderNextCard(result, global.json);
}

function writeInit(dir, parsed, global) {
  const slug = path.basename(dir);
  const draftFile = path.join(dir, 'evidence', 'init-interview.draft.json');
  const finalFile = path.join(dir, 'evidence', 'init-interview.json');
  const draft = readJson(draftFile, { slug, questions: [] });
  if (parsed.flags.has('append-round')) {
    const questions = fieldAll(parsed, 'question');
    const answers = fieldAll(parsed, 'answerQuote');
    if (questions.length === 0 || answers.length === 0) {
      throwInvalid('init append-round requires at least one --field question=... and --field answerQuote=...', parsed.target, global);
    }
    if (questions.length !== answers.length) {
      throwInvalid(`init append-round requires paired question/answerQuote fields; got ${questions.length} question and ${answers.length} answerQuote`, parsed.target, global);
    }
    for (let index = 0; index < questions.length; index += 1) {
      draft.questions.push({
        question: questions[index],
        answerQuote: answers[index]
      });
    }
    writeJson(draftFile, draft);
    return;
  }
  if (!parsed.flags.has('finalize')) throw new Error('init answer requires --append-round or --finalize');
  const data = {
    slug,
    confirmedAt: new Date().toISOString(),
    source: fieldOne(parsed, 'source', 'user-interview'),
    productPath: fieldRequired(parsed, 'productPath'),
    designPath: fieldRequired(parsed, 'designPath'),
    productMode: fieldOne(parsed, 'productMode', 'created'),
    designMode: fieldOne(parsed, 'designMode', 'scan'),
    questions: draft.questions,
    userConfirmationQuote: fieldRequired(parsed, 'userConfirmationQuote')
  };
  const notes = fieldOne(parsed, 'notes');
  if (notes) data.notes = notes;
  assertSchemaFile('init-interview.schema.json', data, 'evidence/init-interview.json', parsed.target, global);
  writeJson(finalFile, data);
  removeIfExists(draftFile);
}

function writeSurface(dir, parsed, global) {
  const slug = path.basename(dir);
  const context = runGate(slug, ['--check-only'], global.root).context ?? {};
  const currentSource = fieldAll(parsed, 'currentSource');
  const evidenceRefs = fieldAll(parsed, 'evidenceRef');
  const surface = {
    name: fieldRequired(parsed, 'surface'),
    type: fieldOne(parsed, 'surfaceType', 'component'),
    currentSource: currentSource.length ? currentSource : ['user-description'],
    confidence: fieldOne(parsed, 'confidence', 'user-confirmed')
  };
  const route = fieldOne(parsed, 'route');
  if (route) surface.route = route;
  if (evidenceRefs.length > 0) surface.evidenceRefs = evidenceRefs;
  const data = {
    slug,
    title: fieldOne(parsed, 'title', titleFromSlug(slug)),
    confirmedAt: new Date().toISOString(),
    productPath: fieldOne(parsed, 'productPath', context.productPath ?? 'PRODUCT.md'),
    designPath: fieldOne(parsed, 'designPath', context.designPath ?? 'DESIGN.md'),
    surface,
    changeType: fieldRequired(parsed, 'changeType'),
    keep: nonEmpty(fieldAll(parsed, 'keep'), 'keep'),
    change: nonEmpty(fieldAll(parsed, 'change'), 'change'),
    avoid: nonEmpty(fieldAll(parsed, 'avoid'), 'avoid'),
    confirmation: {
      quote: fieldRequired(parsed, 'confirmationQuote')
    }
  };
  const sourceSummary = fieldOne(parsed, 'sourceSummary');
  if (sourceSummary) data.sourceSummary = sourceSummary;
  const confirmedBy = fieldOne(parsed, 'confirmedBy');
  if (confirmedBy) data.confirmation.confirmedBy = confirmedBy;
  assertSchemaFile('surface-evidence.schema.json', data, 'evidence/surface.json', parsed.target, global);
  writeJson(path.join(dir, 'evidence', 'surface.json'), data);
}

function writeBrainstorm(dir, parsed, global) {
  const slug = path.basename(dir);
  const draftFile = path.join(dir, 'evidence', 'brainstorm-dialogue.draft.json');
  const finalFile = path.join(dir, 'evidence', 'brainstorm-dialogue.json');
  const draft = readJson(draftFile, { slug, turns: [] });
  if (parsed.flags.has('append-round')) {
    const dimensions = fieldAll(parsed, 'dimension');
    const questions = fieldAll(parsed, 'question');
    const answers = fieldAll(parsed, 'answer');
    const implications = fieldAll(parsed, 'designImplication');
    const designSystemImplications = fieldAll(parsed, 'designSystemImplication');
    const implementationImplications = fieldAll(parsed, 'implementationImplication');
    const count = questions.length;
    if (count === 0 || answers.length === 0 || implications.length === 0 || designSystemImplications.length === 0 || implementationImplications.length === 0 || dimensions.length === 0) {
      throwInvalid('brainstorm append-round requires paired dimension/question/answer/designImplication/designSystemImplication/implementationImplication fields', parsed.target, global);
    }
    if (answers.length !== count || implications.length !== count || designSystemImplications.length !== count || implementationImplications.length !== count || dimensions.length !== count) {
      throwInvalid(`brainstorm append-round requires paired fields; got ${dimensions.length} dimension, ${questions.length} question, ${answers.length} answer, ${implications.length} designImplication, ${designSystemImplications.length} designSystemImplication, ${implementationImplications.length} implementationImplication`, parsed.target, global);
    }
    if (count !== 1) {
      throwInvalid('brainstorm append-round records one user-participation judgment round at a time; ask one key design uncertainty, wait for the user, then append the next round', parsed.target, global);
    }
    for (let index = 0; index < count; index += 1) {
      if (!BRAINSTORM_DIMENSION_VALUES.includes(dimensions[index])) {
        throwInvalid(`Invalid brainstorm dimension: ${dimensions[index]}. Expected one of ${formatEnum(BRAINSTORM_DIMENSION_VALUES)}`, parsed.target, global);
      }
      draft.turns.push({
        dimension: dimensions[index],
        question: questions[index],
        answerQuote: answers[index],
        designImplication: implications[index],
        designSystemImplication: designSystemImplications[index],
        implementationImplication: implementationImplications[index]
      });
    }
    writeJson(draftFile, draft);
    return;
  }
  const mode = fieldOne(parsed, 'mode', 'socratic');
  if (!parsed.flags.has('finalize') && mode !== 'user-skipped') {
    throw new Error('brainstorm answer requires --append-round, --finalize, or mode=user-skipped');
  }
  const approaches = fieldAll(parsed, 'approach');
  if (approaches.length < 2) {
    const tradeoff = fieldOne(parsed, 'directionTradeoff');
    if (tradeoff) approaches.push(...tradeoff.split('|').map(value => value.trim()).filter(Boolean));
  }
  if (approaches.length < 2) {
    throwInvalid('brainstorm finalize requires at least two --field approach=... values', parsed.target, global);
  }
  if (mode === 'socratic' && draft.turns.length < 2) {
    throwInvalid('brainstorm finalize requires at least two design-question rounds before writing evidence/brainstorm-dialogue.json', parsed.target, global);
  }
  if (mode === 'socratic' && new Set(draft.turns.map(turn => turn.dimension)).size < 2) {
    throwInvalid('brainstorm finalize requires at least two professional design dimensions before writing evidence/brainstorm-dialogue.json', parsed.target, global);
  }
  if (mode === 'user-skipped' && draft.turns.length < 1) {
    throwInvalid('brainstorm user-skipped requires one compressed design-judgment round before writing evidence/brainstorm-dialogue.json', parsed.target, global);
  }
  const data = {
    slug,
    createdAt: new Date().toISOString(),
    surfaceEvidence: `docs/design/${slug}/evidence/surface.json`,
    mode,
    turns: draft.turns,
    approachesPresented: approaches,
    userConfirmationQuote: fieldRequired(parsed, 'confirmationQuote')
  };
  const skipReasonQuote = fieldOne(parsed, 'skipReasonQuote');
  if (mode === 'user-skipped') data.skipReasonQuote = skipReasonQuote || fieldRequired(parsed, 'skipReasonQuote');
  const notes = fieldOne(parsed, 'notes');
  if (notes) data.notes = notes;
  assertSchemaFile('brainstorm-dialogue.schema.json', data, 'evidence/brainstorm-dialogue.json', parsed.target, global);
  writeJson(finalFile, data);
  removeIfExists(draftFile);
}

function commandDirections(rest, global) {
  const parsed = parseCommand(rest);
  const dir = resolveDesignDir(parsed.target, global.root);
  ensureDir(path.join(dir, 'evidence'));
  const slug = path.basename(dir);
  const draftFile = path.join(dir, 'evidence', 'directions.draft.json');
  const finalFile = path.join(dir, 'evidence', 'directions.json');
  const draft = readJson(draftFile, {
    slug,
    createdAt: new Date().toISOString(),
    surfaceEvidence: `docs/design/${slug}/evidence/surface.json`,
    brainstormDialogueEvidence: `docs/design/${slug}/evidence/brainstorm-dialogue.json`,
    options: {}
  });
  const optionId = parsed.options.get('option');
  if (!OPTION_IDS.includes(optionId)) throw new Error('directions requires --option A|B|C');
  const option = directionOption(optionId, parsed);
  assertDirectionOption(option, parsed.target, global);
  const nextDraft = {
    ...draft,
    options: {
      ...draft.options,
      [optionId]: option
    }
  };
  if (OPTION_IDS.every(id => nextDraft.options[id])) {
    const finalData = {
      ...nextDraft,
      createdAt: new Date().toISOString(),
      selfCheck: {
        usesTrustedContext: true,
        noProductScopeAdded: true,
        differencesAreSubstantial: substantialDifferences(nextDraft.options),
        criticalStateOrInteractionCovered: criticalStateCovered(nextDraft.options),
        notes: fieldOne(parsed, 'selfCheckNotes', 'Generated by BFDS runtime directions command.')
      }
    };
    if (!finalData.selfCheck.differencesAreSubstantial) {
      throw withNext('A/B/C directions must differ in at least two substantial dimensions', renderNextCard(runGate(parsed.target, [], global.root), false));
    }
    if (!finalData.selfCheck.criticalStateOrInteractionCovered) {
      throw withNext('At least one direction must cover a critical state or interaction', renderNextCard(runGate(parsed.target, [], global.root), false));
    }
    assertSchemaFile('directions-evidence.schema.json', finalData, 'evidence/directions.json', parsed.target, global);
    writeJson(finalFile, finalData);
    removeIfExists(draftFile);
  } else {
    writeJson(draftFile, nextDraft);
  }
  const result = runGate(parsed.target, [], global.root);
  return renderNextCard(result, global.json);
}

function directionOption(optionId, parsed) {
  return {
    optionId,
    name: fieldRequired(parsed, 'name'),
    designThesis: fieldRequired(parsed, 'designThesis'),
    sourceConstraints: fieldAll(parsed, 'sourceConstraint').length ? fieldAll(parsed, 'sourceConstraint') : ['PRODUCT.md', 'DESIGN.md'],
    designSystemRules: nonEmpty(fieldAll(parsed, 'designSystemRule'), 'designSystemRule'),
    codeReuseHypothesis: nonEmpty(fieldAll(parsed, 'codeReuseHypothesis'), 'codeReuseHypothesis'),
    allowedChangeBoundary: fieldRequired(parsed, 'allowedChangeBoundary'),
    hierarchy: fieldRequired(parsed, 'hierarchy'),
    density: fieldRequired(parsed, 'density'),
    motion: fieldRequired(parsed, 'motion'),
    stateTreatment: fieldRequired(parsed, 'stateTreatment'),
    layoutStrategy: fieldRequired(parsed, 'layoutStrategy'),
    interactionModel: fieldRequired(parsed, 'interactionModel'),
    visualSignature: fieldRequired(parsed, 'visualSignature'),
    differenceDimensions: nonEmpty(fieldAll(parsed, 'differenceDimension'), 'differenceDimension'),
    implementationRisk: fieldRequired(parsed, 'implementationRisk'),
    selfReviewChecks: nonEmpty(fieldAll(parsed, 'selfReviewCheck'), 'selfReviewCheck'),
    keep: nonEmpty(fieldAll(parsed, 'keep'), 'keep'),
    change: nonEmpty(fieldAll(parsed, 'change'), 'change'),
    avoid: nonEmpty(fieldAll(parsed, 'avoid'), 'avoid'),
    risks: nonEmpty(fieldAll(parsed, 'risks'), 'risks'),
    bestFor: fieldRequired(parsed, 'bestFor')
  };
}

function substantialDifferences(options) {
  const dimensions = new Set();
  for (const option of Object.values(options)) {
    for (const dimension of option.differenceDimensions ?? []) dimensions.add(dimension);
  }
  return dimensions.size >= 2;
}

function criticalStateCovered(options) {
  return Object.values(options).some(option =>
    /state|状态|error|success|loading|interaction|交互/i.test([
      option.stateTreatment,
      option.interactionModel,
      ...(option.differenceDimensions ?? [])
    ].join(' '))
  );
}

function commandWorkbench(rest, global) {
  const parsed = parseCommand(rest);
  const dir = resolveDesignDir(parsed.target, global.root);
  if (parsed.flags.has('scaffold')) {
    scaffoldWorkbench(dir);
  } else if (parsed.flags.has('validate')) {
    validateWorkbench(dir);
  } else {
    throw new Error('workbench requires --scaffold or --validate');
  }
  const result = runGate(parsed.target, [], global.root);
  return renderNextCard(result, global.json);
}

function scaffoldWorkbench(dir) {
  const templateDir = path.join(runtimeTemplatesDir, 'kami-workbench');
  for (const [srcName, destName] of [
    ['workbench.html', 'workbench.html'],
    ['workbench.css', 'workbench.css'],
    ['option.html', 'option-a.html'],
    ['option.html', 'option-b.html'],
    ['option.html', 'option-c.html']
  ]) {
    const src = path.join(templateDir, srcName);
    const dest = path.join(dir, destName);
    const text = fs.existsSync(src) ? readText(src) : '<!doctype html><html><body></body></html>';
    writeText(dest, `<!-- ${PLACEHOLDER} -->\n${text}`);
  }
}

function validateWorkbench(dir) {
  const files = ['workbench.html', 'workbench.css', 'option-a.html', 'option-b.html', 'option-c.html'];
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (!fs.existsSync(fullPath)) throw new Error(`Missing workbench file: ${rel(fullPath)}`);
    if (readText(fullPath).includes(PLACEHOLDER)) throw new Error(`Workbench file still contains ${PLACEHOLDER}: ${rel(fullPath)}`);
  }
  const workbench = readText(path.join(dir, 'workbench.html'));
  for (const option of ['option-a.html', 'option-b.html', 'option-c.html']) {
    if (!workbench.includes(option)) throw new Error(`workbench.html must reference ${option}`);
  }
  const directions = readJson(path.join(dir, 'evidence', 'directions.json'));
  if (!directions?.options) throw new Error('workbench validation requires evidence/directions.json');
  for (const [optionId, file] of Object.entries({ A: 'option-a.html', B: 'option-b.html', C: 'option-c.html' })) {
    const name = directions.options?.[optionId]?.name;
    if (!name) throw new Error(`directions.json missing option ${optionId} name`);
    if (!workbench.includes(name)) throw new Error(`workbench.html must include directions option ${optionId} name: ${name}`);
    const optionText = readText(path.join(dir, file));
    if (!optionText.includes(name)) throw new Error(`${file} must include directions option ${optionId} name: ${name}`);
  }
}

function commandSelect(rest, global) {
  const parsed = parseCommand(rest);
  const dir = resolveDesignDir(parsed.target, global.root);
  const slug = path.basename(dir);
  const selectedOptionId = fieldRequired(parsed, 'selectedOption');
  if (!/^[ABC](?:\+[ABC])*$/.test(selectedOptionId)) throw new Error('selectedOption must be A, B, C, or explicit merge such as B+A');
  const mergedFrom = normalizeMergedFrom(fieldAll(parsed, 'mergedFrom'), selectedOptionId);
  const data = {
    slug,
    selectedAt: new Date().toISOString(),
    selectionQuote: fieldRequired(parsed, 'selectionQuote'),
    selectedOption: {
      id: selectedOptionId,
      summary: fieldOne(parsed, 'summary', fieldRequired(parsed, 'selectionQuote')),
      mergedFrom
    },
    workbench: `docs/design/${slug}/workbench.html`,
    options: {
      A: `docs/design/${slug}/option-a.html`,
      B: `docs/design/${slug}/option-b.html`,
      C: `docs/design/${slug}/option-c.html`
    }
  };
  const decisionNotes = fieldOne(parsed, 'decisionNotes') || fieldOne(parsed, 'confirmationQuote');
  if (decisionNotes) data.selectedOption.decisionNotes = decisionNotes;
  if (invalidSelectionQuote(data.selectionQuote)) {
    throwInvalid('selectionQuote delegates the choice to the agent; ask the user to explicitly choose A/B/C or a merge', parsed.target, global);
  }
  assertSchemaFile('selection-evidence.schema.json', data, 'evidence/selection.json', parsed.target, global);
  writeJson(path.join(dir, 'evidence', 'selection.json'), data);
  const result = runGate(parsed.target, [], global.root);
  return renderNextCard(result, global.json);
}

function invalidSelectionQuote(quote) {
  return INVALID_SELECTION_PATTERNS.some(pattern => pattern.test(quote));
}

function normalizeMergedFrom(values, selectedOptionId) {
  const set = new Set(selectedOptionId.split('+').filter(Boolean));
  for (const value of values) {
    const match = value.match(/[ABC]/);
    if (match) set.add(match[0]);
  }
  return Array.from(set);
}

function commandPack(rest, global) {
  const parsed = parseCommand(rest);
  const dir = resolveDesignDir(parsed.target, global.root);
  const slug = path.basename(dir);
  const file = path.join(dir, 'evidence', 'contract-judgment.json');
  const judgment = readJson(file, {
    slug,
    screens: [],
    states: [],
    interactions: [],
    acceptanceRules: [],
    tokens: null,
    responsive: null,
    motion: null,
    assets: null
  });
  if (parsed.flags.has('confirm')) {
    const nextJudgment = {
      ...judgment,
      echoConfirmQuote: fieldRequired(parsed, 'echoConfirmQuote')
    };
    const missing = contractJudgmentMissing(nextJudgment);
    if (missing.length > 0) throw withNext(`Cannot confirm contract; missing ${missing.join(', ')}`, renderContractMissingCard(slug, missing));
    writeJson(file, nextJudgment);
    writeContractPack(dir, nextJudgment, parsed.target, global);
  } else if (parsed.options.has('add')) {
    addContractEntry(judgment, parsed.options.get('add'), parsed);
    writeJson(file, judgment);
  } else if (parsed.options.has('set')) {
    setContractField(judgment, parsed.options.get('set'), parsed);
    writeJson(file, judgment);
  } else {
    throw new Error('pack requires --add, --set, or --confirm');
  }
  const result = runGate(parsed.target, [], global.root);
  if (result.phase === 'NEEDS_CONTRACT') {
    const missing = contractJudgmentMissing(judgment);
    if (missing.length > 0) return renderContractMissingCard(slug, missing);
    if (!judgment.echoConfirmQuote) return renderContractEchoCard(dir, judgment);
  }
  return renderNextCard(result, global.json);
}

function addContractEntry(judgment, type, parsed) {
  if (type === 'screen') {
    judgment.screens.push({
      id: fieldRequired(parsed, 'id'),
      description: fieldRequired(parsed, 'description'),
      composition: fieldRequired(parsed, 'composition'),
      hierarchy: fieldRequired(parsed, 'hierarchy'),
      density: fieldOne(parsed, 'density')
    });
  } else if (type === 'state') {
    judgment.states.push({
      name: fieldRequired(parsed, 'name'),
      expectation: fieldRequired(parsed, 'expectation'),
      priority: fieldOne(parsed, 'priority', 'P2')
    });
  } else if (type === 'interaction') {
    const entry = {
      trigger: fieldRequired(parsed, 'trigger'),
      result: fieldRequired(parsed, 'result')
    };
    const accessibility = fieldOne(parsed, 'accessibility');
    if (accessibility) entry.accessibility = accessibility;
    judgment.interactions.push(entry);
  } else if (type === 'acceptanceRule') {
    judgment.acceptanceRules.push({
      id: fieldRequired(parsed, 'id'),
      rule: fieldRequired(parsed, 'rule'),
      severity: fieldOne(parsed, 'severity', 'P1')
    });
  } else if (type === 'token') {
    judgment.tokens = {
      source: fieldOne(parsed, 'source', 'DESIGN.md or existing project tokens'),
      rules: nonEmpty(fieldAll(parsed, 'rule'), 'rule')
    };
  } else if (type === 'responsive') {
    if (!Array.isArray(judgment.responsive)) judgment.responsive = [];
    judgment.responsive.push({
      viewport: fieldRequired(parsed, 'viewport'),
      rule: fieldRequired(parsed, 'rule')
    });
  } else if (type === 'motion') {
    if (!Array.isArray(judgment.motion)) judgment.motion = [];
    const entry = {
      name: fieldRequired(parsed, 'name'),
      rule: fieldRequired(parsed, 'rule')
    };
    const reducedMotion = fieldOne(parsed, 'reducedMotion');
    if (reducedMotion) entry.reducedMotion = reducedMotion;
    judgment.motion.push(entry);
  } else if (type === 'asset') {
    if (!Array.isArray(judgment.assets)) judgment.assets = [];
    judgment.assets.push({
      name: fieldRequired(parsed, 'name'),
      source: fieldRequired(parsed, 'source'),
      rule: fieldRequired(parsed, 'rule')
    });
  } else {
    throw new Error(`Unsupported contract entry type: ${type}`);
  }
}

function setContractField(judgment, assignment, parsed) {
  const [key, value] = assignment.split('=');
  if (!key || !value) throw new Error('--set requires key=value');
  if (!['tokens', 'responsive', 'motion', 'assets'].includes(key)) throw new Error(`Unsupported --set field: ${key}`);
  if (value !== 'none') throw new Error(`${key} can only be set to none; use --add for rules`);
  const reason = fieldRequired(parsed, 'reason');
  if (key === 'tokens') {
    judgment.tokens = {
      source: 'DESIGN.md or existing project tokens',
      rules: [reason]
    };
  } else {
    judgment[key] = [];
    if (!judgment.noneReasons) judgment.noneReasons = {};
    judgment.noneReasons[key] = reason;
  }
}

function contractJudgmentMissing(judgment) {
  const missing = [];
  for (const key of ['screens', 'states', 'interactions', 'acceptanceRules']) {
    if (!Array.isArray(judgment[key]) || judgment[key].length === 0) missing.push(key);
  }
  for (const key of ['tokens', 'responsive', 'motion', 'assets']) {
    if (judgment[key] === null || judgment[key] === undefined) missing.push(key);
  }
  return missing;
}

function writeContractPack(dir, judgment, target, global) {
  const slug = path.basename(dir);
  const surface = readJson(path.join(dir, 'evidence', 'surface.json'));
  const directions = readJson(path.join(dir, 'evidence', 'directions.json'));
  const selection = readJson(path.join(dir, 'evidence', 'selection.json'));
  const title = surface.title ?? titleFromSlug(slug);
  const implementationConstraints = implementationConstraintsFromDirections(selection, directions);
  const contract = {
    slug,
    title,
    selectedOption: selection.selectedOption,
    sourceArtifacts: {
      workbench: `docs/design/${slug}/workbench.html`,
      options: {
        A: `docs/design/${slug}/option-a.html`,
        B: `docs/design/${slug}/option-b.html`,
        C: `docs/design/${slug}/option-c.html`
      },
      productContext: surface.productPath,
      designContext: surface.designPath,
      directionsEvidence: `docs/design/${slug}/evidence/directions.json`,
      surfaceEvidence: [`docs/design/${slug}/evidence/surface.json`]
    },
    surface: surface.surface,
    changeType: surface.changeType,
    keep: surface.keep,
    change: surface.change,
    avoid: surface.avoid,
    screens: cleanObjects(judgment.screens),
    states: cleanObjects(judgment.states),
    interactions: cleanObjects(judgment.interactions),
    tokens: judgment.tokens,
    implementationConstraints,
    responsive: judgment.responsive ?? [],
    motion: judgment.motion ?? [],
    assets: judgment.assets ?? [],
    acceptanceRules: cleanObjects(judgment.acceptanceRules)
  };
  const qaPlan = renderQaPlan(contract);
  assertSchemaFile('design-contract.schema.json', contract, 'design-contract.json', target, global);
  assertSchemaFile('qa-plan.schema.json', qaPlan, 'qa-plan.json', target, global);
  writeJson(path.join(dir, 'design-contract.json'), contract);
  writeText(path.join(dir, 'implementation-handoff.md'), renderHandoff(contract, judgment));
  writeJson(path.join(dir, 'qa-plan.json'), qaPlan);
}

function implementationConstraintsFromDirections(selection, directions) {
  const optionIds = normalizeMergedFrom(selection.selectedOption?.mergedFrom ?? [], selection.selectedOption?.id ?? '');
  const options = optionIds.map(id => directions.options?.[id]).filter(Boolean);
  if (options.length === 0) {
    throw new Error('Cannot derive implementation constraints from directions.json; selected options are missing');
  }
  return {
    sourceOptions: optionIds.filter(id => directions.options?.[id]),
    designSystemRules: uniqueFlat(options, 'designSystemRules'),
    codeReuseHypothesis: uniqueFlat(options, 'codeReuseHypothesis'),
    allowedChangeBoundary: uniqueFlat(options, 'allowedChangeBoundary'),
    implementationRisk: highestImplementationRisk(options.map(option => option.implementationRisk)),
    selfReviewChecks: uniqueFlat(options, 'selfReviewChecks')
  };
}

function uniqueFlat(items, key) {
  const values = [];
  for (const item of items) {
    const value = item?.[key];
    if (Array.isArray(value)) values.push(...value);
    else if (value) values.push(value);
  }
  return Array.from(new Set(values));
}

function highestImplementationRisk(values) {
  if (values.includes('high')) return 'high';
  if (values.includes('medium')) return 'medium';
  return 'low';
}

function cleanObjects(items) {
  return items.map(item => Object.fromEntries(Object.entries(item).filter(([, value]) => value !== '' && value !== undefined)));
}

function renderHandoff(contract, judgment) {
  const noneReasons = judgment.noneReasons ?? {};
  return `# ${contract.title}

设计任务标识：\`${contract.slug}\`
状态：\`contract-ready\`
更新时间：\`${new Date().toISOString()}\`

## 1. 设计目标

${contract.selectedOption.summary}

## 2. 选中方案与合并决策

- 选中方案：\`${contract.selectedOption.id}\`
- 合并来源：${(contract.selectedOption.mergedFrom ?? []).join(', ') || '无'}
- 决策说明：${contract.selectedOption.decisionNotes ?? '见 selection evidence'}
- 评审工作台：\`${contract.sourceArtifacts.workbench}\`

## 3. 当前目标界面和改动类型

- 目标界面：${contract.surface.name}
- 当前来源：${contract.surface.currentSource.join(', ')}
- 证据置信度：${contract.surface.confidence}
- 改动类型：${contract.changeType}

如果实现时发现目标代码与这里描述的目标界面不一致，停止并重新确认，不要继续猜。

## 4. 必须保留

${list(contract.keep)}

## 5. 允许改变

${list(contract.change)}

## 6. 禁止改变

${list(contract.avoid)}

## 7. 视觉还原纪律

- DESIGN.md 是唯一设计规范事实源，不得引入合同外的新颜色、字体、圆角、阴影、动效或组件语气。
- 设计系统规则：${contract.implementationConstraints.designSystemRules.join('；')}
- 代码复用假设：${contract.implementationConstraints.codeReuseHypothesis.join('；')}
- 允许变更边界：${contract.implementationConstraints.allowedChangeBoundary.join('；')}
- 实现风险：${contract.implementationConstraints.implementationRisk}
- 不编数据。有真实来源才写；没有就用明确标注的占位符。
- 不用占位图、emoji、文本符号、CSS art、手写 SVG 或近似图形替代真实资产。
- 必须检查字体、间距、颜色、资产、状态、交互、响应式和可访问性。
- 选中的方案卡和局部示意只用于方向校准；实现必须以 design-contract.json、implementation-handoff.md 和 DESIGN.md 为准。

自审检查：
${list(contract.implementationConstraints.selfReviewChecks)}

## 8. 数据与文案来源

- 数据和文案必须来自用户材料、目标项目代码或明确标注的占位。
- 未知项不得自行补全。

## 9. 状态与交互

${list([
  ...contract.states.map(state => `${state.name}: ${state.expectation}`),
  ...contract.interactions.map(interaction => `${interaction.trigger}: ${interaction.result}`)
])}

## 10. 响应式要求

${contract.responsive.length ? list(contract.responsive.map(item => `${item.viewport}: ${item.rule}`)) : list([noneReasons.responsive ?? '无额外响应式规则，沿用现有布局纪律。'])}

## 11. 资产与图标约束

${contract.assets.length ? list(contract.assets.map(item => `${item.name}: ${item.source}; ${item.rule}`)) : list([noneReasons.assets ?? '不新增资产。'])}

## 12. 验收入口

- 设计契约：\`docs/design/${contract.slug}/design-contract.json\`
- 验收计划：\`docs/design/${contract.slug}/qa-plan.json\`
- 验收报告：\`docs/design/${contract.slug}/qa-report.md\`

## 13. 未决事项

${list([
  noneReasons.motion ? `动效：${noneReasons.motion}` : null,
  noneReasons.responsive ? `响应式：${noneReasons.responsive}` : null,
  noneReasons.assets ? `资产：${noneReasons.assets}` : null
].filter(Boolean).concat('无其他未决事项。'))}
`;
}

function renderQaPlan(contract) {
  const route = contract.surface.route || contract.surface.name;
  const selfReviewChecks = contract.implementationConstraints.selfReviewChecks.map((rule, index) => ({
    id: `self-review-${index + 1}`,
    category: 'contract',
    description: rule,
    blockingLevel: contract.implementationConstraints.implementationRisk === 'high' ? 'P1' : 'P2'
  }));
  const designSystemChecks = contract.implementationConstraints.designSystemRules.map((rule, index) => ({
    id: `design-system-${index + 1}`,
    category: 'contract',
    description: rule,
    blockingLevel: 'P1'
  }));
  return {
    slug: contract.slug,
    targetRoutes: [{ route, purpose: contract.surface.name }],
    viewports: [
      { name: 'desktop', width: 1440, height: 900 },
      { name: 'tablet', width: 834, height: 1112 },
      { name: 'mobile', width: 390, height: 844 }
    ],
    states: contract.states.map(state => ({
      name: state.name,
      setup: state.expectation,
      expected: state.expectation,
      blockingLevel: state.priority ?? 'P2'
    })),
    interactions: contract.interactions.map(interaction => ({
      name: interaction.trigger,
      steps: [interaction.trigger],
      expected: interaction.result,
      blockingLevel: 'P2'
    })),
    referenceScreenshots: [
      { artifact: contract.sourceArtifacts.options.A, description: '方案 A 局部方案预览' },
      { artifact: contract.sourceArtifacts.options.B, description: '方案 B 局部方案预览' },
      { artifact: contract.sourceArtifacts.options.C, description: '方案 C 局部方案预览' }
    ],
    checks: [
      ...contract.acceptanceRules.map(rule => ({
        id: rule.id,
        category: 'contract',
        description: rule.rule,
        blockingLevel: rule.severity
      })),
      ...designSystemChecks,
      ...selfReviewChecks
    ],
    blockers: [
      ...contract.acceptanceRules.filter(rule => ['P0', 'P1', 'P2'].includes(rule.severity)).map(rule => rule.id),
      ...designSystemChecks.map(check => check.id),
      ...selfReviewChecks.filter(check => ['P1', 'P2'].includes(check.blockingLevel)).map(check => check.id)
    ],
    impeccable: {
      detect: { enabled: false, targets: [], notes: 'Enable when a concrete implementation target exists.' },
      critique: { enabled: false, notes: 'Optional after implementation screenshot capture.' }
    },
    reports: {
      qaReport: `docs/design/${contract.slug}/qa-report.md`,
      evidenceDir: `docs/design/${contract.slug}/qa-evidence`
    }
  };
}

function commandMark(rest, global) {
  const parsed = parseCommand(rest);
  const state = parsed.options.get('state');
  if (!state) throw new Error('mark requires --state');
  if (state === 'qa-passed') throw new Error('qa-passed must be set through qa --pass');
  const result = runGate(parsed.target, ['--mark', state], global.root);
  return renderNextCard(result, global.json);
}

function commandQa(rest, global) {
  const parsed = parseCommand(rest);
  const dir = resolveDesignDir(parsed.target, global.root);
  const slug = path.basename(dir);
  const reportFile = path.join(dir, 'qa-report.md');
  if (parsed.flags.has('start')) {
    writeText(reportFile, `# BFDS QA Report\n\n设计任务标识：\`${slug}\`\n\n`);
  } else if (parsed.options.has('check')) {
    const checkId = parsed.options.get('check');
    const text = [
      readText(reportFile, `# BFDS QA Report\n\n设计任务标识：\`${slug}\`\n\n`),
      `## Check ${checkId}`,
      '',
      `Result: ${fieldRequired(parsed, 'result')}`,
      `Evidence: ${fieldRequired(parsed, 'evidence')}`,
      `Notes: ${fieldOne(parsed, 'notes', '')}`,
      ''
    ].join('\n');
    writeText(reportFile, text);
  } else if (parsed.flags.has('pass')) {
    assertQaReportCoversPlan(dir);
    const result = runGate(parsed.target, ['--mark', 'qa-passed'], global.root);
    return renderNextCard(result, global.json);
  } else {
    throw new Error('qa requires --start, --check, or --pass');
  }
  const result = runGate(parsed.target, [], global.root);
  return renderNextCard(result, global.json);
}

function assertQaReportCoversPlan(dir) {
  const report = readText(path.join(dir, 'qa-report.md'));
  const plan = readJson(path.join(dir, 'qa-plan.json'));
  const missing = (plan.checks ?? []).map(check => check.id).filter(id => !report.includes(id));
  if (missing.length > 0) throw new Error(`qa-report.md does not cover qa-plan checks: ${missing.join(', ')}`);
}

function commandLive(rest, global) {
  const parsed = parseCommand(rest);
  const dir = resolveDesignDir(parsed.target, global.root);
  const file = path.join(dir, 'evidence', 'live-iteration.json');
  const existing = readJson(file, { slug: path.basename(dir), iterations: [] });
  existing.iterations.push({
    time: new Date().toISOString(),
    region: fieldRequired(parsed, 'region'),
    intent: fieldRequired(parsed, 'intent'),
    result: fieldRequired(parsed, 'result')
  });
  writeJson(file, existing);
  const result = runGate(parsed.target, ['--mark', 'live-iterating'], global.root);
  return renderNextCard(result, global.json);
}

function renderNextCard(result, json = false) {
  const card = cardForResult(result);
  if (json) return `${JSON.stringify(card, null, 2)}\n`;
  return renderCardText(card);
}

function cardForResult(result) {
  const phase = result.phase;
  const missing = result.missing ?? [];
  const card = {
    version: 1,
    slug: result.slug,
    phase,
    state: ['CONTEXT_BLOCKED', 'INCONSISTENT'].includes(phase) ? null : result.status?.state ?? null,
    required: [],
    guidance: [],
    forbidden: [],
    nextCommand: '',
    references: [],
    missing,
    warnings: result.warnings ?? [],
    errors: result.errors ?? []
  };
  if (phase === 'CONTEXT_BLOCKED') {
    card.required = ['项目级 PRODUCT.md / DESIGN.md', 'init 多轮用户问答', '用户确认原话'];
    card.guidance = ['只补项目级上下文；先扫描可推断信息，再每轮成组询问 2-3 个项目级问题。', '把推断作为选项或假设呈现给用户确认，不缩减 Impeccable init 的问题覆盖面。', 'PRODUCT.md / DESIGN.md 由父会话分段写；不要默认交给静默 subagent。', '预计超过 60 秒时，先告诉用户正在生成哪个文件。', '选择/确认类优先使用问答 UI。', ...(result.contextTask ?? [])];
    card.forbidden = ['进入目标界面确认', '生成三方案', '把当前任务需求写成项目级上下文'];
    card.nextCommand = `node <skill-dir>/scripts/bfds.mjs answer ${result.slug} --stage init --append-round --field question="..." --field answerQuote="..." --field question="..." --field answerQuote="..."`;
    card.references = ['impeccable-integration.md'];
  } else if (phase === 'NEEDS_SURFACE') {
    card.required = ['目标界面', '现状来源', '改动类型', '必须保留', '允许改变', '必须避免', '用户确认原话'];
    card.guidance = [
      '先归纳候选边界，再让用户确认或修正。',
      '选择/确认类优先使用问答 UI。',
      `currentSource enum: ${formatEnum(CURRENT_SOURCE_VALUES)}`,
      `changeType enum: ${formatEnum(CHANGE_TYPE_VALUES)}`
    ];
    card.forbidden = ['生成三方案', '生成评审工作台', '生成设计交付包'];
    card.nextCommand = `node <skill-dir>/scripts/bfds.mjs answer ${result.slug} --stage surface --field surface="..." --field currentSource="user-description" --field changeType="modify" --field keep="..." --field change="..." --field avoid="..." --field confirmationQuote="..."`;
    card.references = ['surface-change-framing.md'];
  } else if (phase === 'NEEDS_DIRECTIONS') {
    card.required = missing.includes('evidence/brainstorm-dialogue.json')
      ? ['目标界面证据、DESIGN.md 具体规则和源码/组件 grounding', '至少 2 轮用户参与的判断校准', '每轮 1 个关键设计不确定性', '至少两个专业维度', '每轮设计系统影响和实现影响', '2-3 个方向取舍确认', '未消除关键不确定性时继续追问']
      : ['A/B/C 三个可实现方向规格', 'DESIGN.md 具体 token/组件规则/小节引用', '带源码路径或组件名的代码复用假设', '允许变更边界', '实现风险', '自审检查点', '至少两个实质差异维度', 'keep/change/avoid', '关键状态或交互覆盖'];
    card.guidance = [
      '先读 design-brainstorm.md；每轮只校准一个最高价值设计不确定性。',
      '先定位目标界面证据、DESIGN.md token/组件规则/小节、可复用源码文件或组件名；找不到源码证据要明说，不写空泛复用假设。',
      '提问前说明它会影响哪个设计表达维度、哪些 DESIGN.md 规则、哪些现有组件/源码复用和后续自审。',
      '若内容范围、关键状态、DESIGN.md 偏离边界、代码复用边界或方向分叉仍不清楚，继续追问。',
      '不重复询问原型里已经可见的布局事实；上下文明确时用“我判断为 X，确认吗？”。',
      `brainstorm dimension enum: ${formatEnum(BRAINSTORM_DIMENSION_VALUES)}`,
      '不脑暴产品/API/数据库/权限。',
      `differenceDimension enum: ${formatEnum(DIFFERENCE_DIMENSION_VALUES)}`
    ];
    card.forbidden = ['生成评审工作台', '临时扩大产品范围'];
    card.nextCommand = missing.includes('evidence/brainstorm-dialogue.json')
      ? `node <skill-dir>/scripts/bfds.mjs answer ${result.slug} --stage brainstorm --append-round --field dimension="primary-action" --field question="..." --field answer="..." --field designImplication="..." --field designSystemImplication="..." --field implementationImplication="..."`
      : `node <skill-dir>/scripts/bfds.mjs directions ${result.slug} --option A --field name="..." --field designThesis="..." --field designSystemRule="..." --field codeReuseHypothesis="..." --field allowedChangeBoundary="..." --field hierarchy="..." --field density="..." --field motion="..." --field stateTreatment="..." --field layoutStrategy="..." --field interactionModel="..." --field visualSignature="..." --field differenceDimension="hierarchy" --field differenceDimension="density" --field implementationRisk="medium" --field selfReviewCheck="..." --field selfReviewCheck="..." --field keep="..." --field change="..." --field avoid="..." --field risks="..." --field bestFor="..."`;
    card.references = ['design-brainstorm.md'];
  } else if (phase === 'NEEDS_WORKBENCH') {
    card.required = ['workbench.html', 'workbench.css', 'option-a.html', 'option-b.html', 'option-c.html', '无 BFDS_PLACEHOLDER'];
    card.guidance = ['方案必须忠于 directions.json。', '生成方案卡、局部示意和实现约束摘要；不要默认生成三套完整页面。', '每个方案展示 DESIGN.md 规则、实现边界、实现风险和自审检查点。', '局部改造时未改区域只能作为基底、上下文或锁定说明，不要重画整页。', '不用假资产、emoji、文本符号或 CSS art 冒充真实资产。', '文本不溢出，移动和桌面模拟器不能互相挤压。', '逐个方案或逐个文件生成；预计超过 60 秒时先向用户说明当前进度。'];
    card.forbidden = ['临时改方向', '用占位文件推进到用户选择', '把局部方案预览包装成最终完整高保真设计稿'];
    card.nextCommand = `node <skill-dir>/scripts/bfds.mjs workbench ${result.slug} --scaffold`;
    card.references = ['workbench-authoring.md'];
  } else if (phase === 'NEEDS_SELECTION') {
    card.required = ['用户明确选择 A/B/C 或合并方案', '用户选择原话'];
    card.guidance = ['必须用问答 UI 让用户确认；推荐不算选择。'];
    card.forbidden = ['由 agent 代替用户选择', '生成设计交付包'];
    card.nextCommand = `node <skill-dir>/scripts/bfds.mjs select ${result.slug} --field selectionQuote="..." --field selectedOption="B" --field confirmationQuote="..."`;
  } else if (phase === 'NEEDS_CONTRACT') {
    card.required = ['contract 判断字段', '实现约束汇总', 'contract 回显确认', 'design-contract.json', 'implementation-handoff.md', 'qa-plan.json'];
    card.guidance = ['runtime 从 directions.json 汇总 DESIGN.md 规则、代码复用假设、允许变更边界、实现风险和自审检查。', '大模型只提交 screens/states/interactions/acceptanceRules 等判断字段，不让用户手写结构化 JSON。', '生成前确认用户选择原话和选中方案摘要。'];
    card.forbidden = ['凭聊天记忆补字段', '缺用户选择时生成交付包'];
    card.nextCommand = `node <skill-dir>/scripts/bfds.mjs pack ${result.slug} --add screen --field id="..." --field description="..." --field composition="..." --field hierarchy="..."`;
    card.references = ['contract-pack.md'];
  } else if (phase === 'CONTRACT_READY' || phase === 'IMPLEMENT_READY') {
    card.required = ['等待实现、验收或局部实时微调请求'];
    card.guidance = ['实现必须读取 DESIGN.md、design-contract.json、implementation-handoff.md、qa-plan.json。', '实现后按 implementationConstraints.selfReviewChecks 做代码层设计自审，再进入运行态验收或 live 微调。'];
    card.forbidden = ['凭聊天记忆改写设计契约', '绕过 DESIGN.md 发明新视觉系统'];
    card.nextCommand = `node <skill-dir>/scripts/bfds.mjs mark ${result.slug} --state implementing`;
  } else if (phase === 'INCONSISTENT') {
    card.required = ['修正或删除错误产物', '重新运行 next 确认阶段回到可继续状态'];
    card.guidance = ['优先处理“错误”和“缺失”中点名的文件；越序写入时删除已写的下游 evidence/artifacts 后重走当前阶段。', '不要补猜缺失证据。'];
    card.forbidden = ['继续下游阶段', '保留无效 evidence 反复重跑'];
    card.nextCommand = `node <skill-dir>/scripts/bfds.mjs next ${result.slug}`;
  } else {
    card.required = ['修正错误后重跑 next'];
    card.guidance = ['不要补猜缺失证据。'];
    card.forbidden = ['继续下游阶段'];
    card.nextCommand = `node <skill-dir>/scripts/bfds.mjs next ${result.slug}`;
  }
  return card;
}

function renderCardText(card) {
  const lines = [
    `BFDS_NEXT_CARD v${card.version}`,
    `slug: ${card.slug}`,
    `phase: ${card.phase}`
  ];
  if (card.state) lines.push(`state: ${card.state}`);
  pushSection(lines, '本阶段必须获得', card.required);
  pushSection(lines, '建议问法', card.guidance);
  pushSection(lines, '禁止', card.forbidden);
  if (card.errors.length) pushSection(lines, '错误', card.errors);
  if (card.warnings.length) pushSection(lines, '警告', card.warnings);
  if (card.missing.length) pushSection(lines, '缺失', card.missing);
  lines.push('');
  lines.push('完成后运行:');
  lines.push(card.nextCommand || '无');
  lines.push('');
  lines.push('必要 reference:');
  lines.push(card.references.length ? card.references.join(', ') : '无');
  return `${lines.join('\n')}\n`;
}

function formatEnum(values) {
  return values.join(', ');
}

function pushSection(lines, title, items) {
  lines.push('');
  lines.push(`${title}:`);
  if (!items.length) lines.push('- 无');
  for (const item of items) lines.push(`- ${item}`);
}

function renderContractMissingCard(slug, missing) {
  return renderCardText({
    version: 1,
    slug,
    phase: 'NEEDS_CONTRACT_JUDGMENT',
    state: null,
    required: missing,
    guidance: ['使用 pack --add 条目式提交对象数组；不要把 JSON 字符串塞进 --field。', 'tokens/responsive/motion/assets 可以显式 none，但必须说明原因。'],
    forbidden: ['生成设计交付包', '跳过用户回显确认'],
    nextCommand: `node <skill-dir>/scripts/bfds.mjs pack ${slug} --add screen --field id="..." --field description="..." --field composition="..." --field hierarchy="..."`,
    references: ['contract-pack.md'],
    missing,
    warnings: [],
    errors: []
  });
}

function renderContractEchoCard(dir, judgment) {
  const slug = path.basename(dir);
  const selection = readJson(path.join(dir, 'evidence', 'selection.json'), {});
  return renderCardText({
    version: 1,
    slug,
    phase: 'NEEDS_CONTRACT_ECHO',
    state: null,
    required: ['用户确认回显无误', 'echoConfirmQuote'],
    guidance: [
      `selectionQuote: ${selection.selectionQuote ?? 'missing'}`,
      `selectedOption: ${selection.selectedOption?.id ?? 'missing'} ${selection.selectedOption?.summary ?? ''}`,
      `screens: ${judgment.screens.length}, states: ${judgment.states.length}, interactions: ${judgment.interactions.length}, acceptanceRules: ${judgment.acceptanceRules.length}`,
      '用问答 UI 让用户确认无误或要求修正。'
    ],
    forbidden: ['未确认回显就生成设计交付包'],
    nextCommand: `node <skill-dir>/scripts/bfds.mjs pack ${slug} --confirm --field echoConfirmQuote="..."`,
    references: ['contract-pack.md'],
    missing: [],
    warnings: [],
    errors: []
  });
}

function titleFromSlug(slug) {
  return slug.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function nonEmpty(values, key) {
  const cleaned = values.filter(Boolean);
  if (cleaned.length === 0) throw new Error(`Missing required field: ${key}`);
  return cleaned;
}

function list(items) {
  return items.map(item => `- ${item}`).join('\n');
}

function withNext(message, nextCard) {
  const error = new Error(message);
  error.nextCard = nextCard;
  return error;
}

function print(text) {
  process.stdout.write(text.endsWith('\n') ? text : `${text}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(main());
}
