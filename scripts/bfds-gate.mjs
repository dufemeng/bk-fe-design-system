#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = parseArgs(process.argv.slice(2));
const { help, json, checkOnly, root, titleArg, markArg, requestArg, targetArg, argErrors } = args;
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const cwd = process.cwd();

const PRODUCT_NAMES = ['PRODUCT.md', 'Product.md', 'product.md'];
const DESIGN_NAMES = ['DESIGN.md', 'Design.md', 'design.md'];
const TRUSTED_CONTEXT_DIRS = ['.', '.agents/context', 'docs'];
const CHANGE_TYPES_REQUIRING_CURRENT_SURFACE = new Set(['modify', 'remove', 'replace', 'restyle']);
const IMPLEMENTABLE_STATUS = new Set(['contract-ready', 'implementing', 'implemented', 'qa-failed', 'qa-passed', 'live-iterating', 'done']);
const MARKABLE_STATUS = new Set(['implementing', 'implemented', 'qa-failed', 'qa-passed', 'live-iterating', 'done']);
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

function usage() {
  return [
    'Usage: node bfds-gate.mjs <slug|docs/design/slug> [--json] [--check-only] [--root docs/design] [--title "..."] [--mark <state>] [--request "..."]',
    '',
    'Examples:',
    '  node skills/bfds-design/scripts/bfds-gate.mjs settings-prompt',
    '  node scripts/bfds-gate.mjs docs/design/settings-prompt --json',
    '  node scripts/bfds-gate.mjs settings-prompt --check-only'
  ].join('\n');
}

function parseArgs(argv) {
  const parsed = {
    json: false,
    help: false,
    checkOnly: false,
    root: 'docs/design',
    titleArg: null,
    markArg: null,
    requestArg: null,
    targetArg: null,
    argErrors: []
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      parsed.help = true;
    } else if (arg === '--json') {
      parsed.json = true;
    } else if (arg === '--check-only') {
      parsed.checkOnly = true;
    } else if (arg === '--sync-status') {
      // Backward-compatible no-op. Gate writes status by default.
    } else if (['--root', '--title', '--mark', '--request'].includes(arg)) {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) {
        parsed.argErrors.push(`${arg} requires a value`);
      } else {
        if (arg === '--root') parsed.root = value;
        if (arg === '--title') parsed.titleArg = value;
        if (arg === '--mark') parsed.markArg = value;
        if (arg === '--request') parsed.requestArg = value;
        index += 1;
      }
    } else if (arg.startsWith('--')) {
      parsed.argErrors.push(`unknown option ${arg}`);
    } else if (!parsed.targetArg) {
      parsed.targetArg = arg;
    } else {
      parsed.argErrors.push(`unexpected positional argument ${arg}`);
    }
  }

  if (parsed.checkOnly && parsed.markArg) {
    parsed.argErrors.push('--check-only cannot be combined with --mark');
  }

  return parsed;
}

function firstExisting(...candidates) {
  return candidates.find(candidate => fs.existsSync(candidate)) ?? candidates[0];
}

function schemaPath(file) {
  return firstExisting(
    path.join('templates/artifacts', file),
    path.join(scriptDir, '..', 'templates', 'artifacts', file),
    path.join(scriptDir, '..', 'assets', 'templates', 'artifacts', file),
    path.join(scriptDir, '..', '..', 'templates', 'artifacts', file)
  );
}

function rel(file) {
  return path.relative(cwd, file).split(path.sep).join('/') || '.';
}

function toProjectPath(file) {
  return rel(path.resolve(cwd, file));
}

function resolveDesignDir(target) {
  if (!target) return null;
  if (target.includes('/') || target.includes(path.sep)) return path.resolve(cwd, target);
  return path.resolve(cwd, root, target);
}

function slugFromDir(dir) {
  return path.basename(dir);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readJson(file, errors, label) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    errors.push(`${label}: ${error.message}`);
    return null;
  }
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

function resolveRef(rootSchema, ref) {
  if (!ref.startsWith('#/$defs/')) return null;
  return rootSchema.$defs?.[ref.slice('#/$defs/'.length)] ?? null;
}

function validateSchema(schema, value, location, errors, rootSchema = schema) {
  if (schema.$ref) {
    const resolved = resolveRef(rootSchema, schema.$ref);
    if (!resolved) {
      errors.push(`${location}: unsupported schema ref ${schema.$ref}`);
      return;
    }
    validateSchema(resolved, value, location, errors, rootSchema);
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

  if (schema.format === 'date-time' && typeof value === 'string' && Number.isNaN(Date.parse(value))) {
    errors.push(`${location}: invalid date-time`);
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
        validateSchema(childSchema, value[key], `${location}.${key}`, errors, rootSchema);
      }
    }
  }

  if (Array.isArray(value) && schema.items) {
    value.forEach((item, index) => validateSchema(schema.items, item, `${location}[${index}]`, errors, rootSchema));
  }
}

function validateJsonFile(file, schemaFile, label) {
  const errors = [];
  if (!fs.existsSync(file)) return { ok: false, exists: false, data: null, errors: [`missing file: ${toProjectPath(file)}`] };
  if (!fs.existsSync(schemaFile)) return { ok: false, exists: true, data: null, errors: [`missing schema: ${toProjectPath(schemaFile)}`] };
  const schema = readJson(schemaFile, errors, `${label} schema`);
  const data = readJson(file, errors, label);
  if (schema && data) validateSchema(schema, data, label, errors, schema);
  return { ok: errors.length === 0, exists: true, data, errors };
}

function firstExistingContext(rootDir, names) {
  for (const name of names) {
    const file = path.join(rootDir, name);
    if (fs.existsSync(file) && fs.statSync(file).isFile()) return file;
  }
  return null;
}

function resolveContext() {
  const checkedDirs = TRUSTED_CONTEXT_DIRS.map(dir => path.resolve(cwd, dir));
  const matches = checkedDirs.map(dir => ({
    dir,
    productPath: firstExistingContext(dir, PRODUCT_NAMES),
    designPath: firstExistingContext(dir, DESIGN_NAMES)
  })).filter(match => match.productPath || match.designPath);
  const productMatch = matches.find(match => match.productPath);
  const designMatch = matches.find(match => match.designPath);
  return {
    ready: Boolean(productMatch?.productPath && designMatch?.designPath),
    productPath: productMatch?.productPath ? rel(productMatch.productPath) : null,
    designPath: designMatch?.designPath ? rel(designMatch.designPath) : null
  };
}

function fileExists(dir, name) {
  return fs.existsSync(path.join(dir, name));
}

function phaseRules(phase) {
  const rules = {
    CONTEXT_BLOCKED: [
      '停止 BFDS 设计推进：可信 PRODUCT.md / DESIGN.md 缺失。',
      '只补项目级上下文，不追问当前目标界面的任务级信息。',
      '完成 Impeccable init/document 或用户提供可信上下文后，重新运行 gate。'
    ],
    NEEDS_SURFACE: [
      '只确认目标界面与变更边界，不生成三方向、不写工作台。',
      '写 evidence/surface.json：目标界面、现状来源、改动类型、必须保留、允许改变、必须避免。',
      'modify/remove/replace/restyle 必须有视觉证据或用户确认；仅代码推断要标注未视觉验证。',
      '写完后重新运行 gate。'
    ],
    NEEDS_DIRECTIONS: [
      '只做设计方向探索；可以跳过提问，不能跳过 A/B/C 三方向规格。',
      '三个方向至少在两个维度上不同，换色、换圆角、换阴影不算差异。',
      '不得新增未确认的产品能力、API、数据库、权限或后端范围。',
      '写 evidence/directions.json 后重新运行 gate。'
    ],
    NEEDS_WORKBENCH: [
      '只生成评审工作台和三个方案 HTML。',
      '必须使用 directions evidence 的 A/B/C 方向，不临时改方向。',
      '生成 workbench.html 和 option-a/b/c.html 后重新运行 gate。'
    ],
    NEEDS_SELECTION: [
      '停止等待用户选择，不写设计交付包。',
      '用户必须明确选择 A/B/C 或给出合并方案；推荐方案不算选择。',
      '有明确选择后写 evidence/selection.json，再重新运行 gate。'
    ],
    NEEDS_CONTRACT: [
      '只生成设计交付包：design-contract.json、implementation-handoff.md、qa-plan.json。',
      '交付包必须使用 selection evidence 和前置证据，不凭聊天记忆补写。',
      '生成前先向用户回显 selection evidence 的用户选择原话和选中方案摘要；用户确认回显无误后才写设计交付包。',
      '生成后运行 validate-artifacts，再重新运行 gate。'
    ],
    CONTRACT_READY: [
      '设计交付包完整；等待用户发起实现或验收。',
      '实现阶段必须读取 design-contract.json、implementation-handoff.md、qa-plan.json。'
    ],
    IMPLEMENT_READY: [
      '可以按 BFDS 设计契约实现或验收。',
      '不得凭聊天记忆改写设计契约；实现偏差写入 qa-report.md。'
    ],
    INCONSISTENT: [
      '停止：发现下游产物存在但上游证据缺失或证据无效。',
      '不要补猜缺失证据；先修正 evidence 或删除错误下游产物后再运行 gate。'
    ]
  };
  return rules[phase] ?? [];
}

function invalidSelectionQuote(quote) {
  return INVALID_SELECTION_PATTERNS.some(pattern => pattern.test(quote));
}

function expectedStatus(phase, existingState, markState = null) {
  if (markState) return markState;
  if (['CONTEXT_BLOCKED', 'INCONSISTENT'].includes(phase)) return existingState ?? 'draft';
  if (phase === 'CONTRACT_READY') {
    return IMPLEMENTABLE_STATUS.has(existingState) ? existingState : 'contract-ready';
  }
  if (phase === 'IMPLEMENT_READY') return IMPLEMENTABLE_STATUS.has(existingState) ? existingState : 'contract-ready';
  if (phase === 'NEEDS_CONTRACT') return 'selected';
  if (phase === 'NEEDS_SELECTION') return 'workbench-ready';
  return 'draft';
}

function collectArtifacts(dir) {
  const artifact = name => fileExists(dir, name) ? toProjectPath(path.join(dir, name)) : null;
  const evidenceDirExists = fs.existsSync(path.join(dir, 'evidence'));
  return {
    pendingRequest: artifact('evidence/pending-request.json'),
    surfaceEvidence: artifact('evidence/surface.json'),
    directionsEvidence: artifact('evidence/directions.json'),
    selectionEvidence: artifact('evidence/selection.json'),
    gateLog: evidenceDirExists ? toProjectPath(path.join(dir, 'evidence', 'gate-log.ndjson')) : null,
    workbench: artifact('workbench.html'),
    optionA: artifact('option-a.html'),
    optionB: artifact('option-b.html'),
    optionC: artifact('option-c.html'),
    designContract: artifact('design-contract.json'),
    implementationHandoff: artifact('implementation-handoff.md'),
    qaPlan: artifact('qa-plan.json'),
    qaReport: artifact('qa-report.md')
  };
}

function buildStatus(dir, slug, title, phase, existingStatus, surface, selection, markState = null) {
  const artifacts = collectArtifacts(dir);
  return {
    slug,
    title: title || surface?.title || existingStatus?.title || slug,
    state: expectedStatus(phase, existingStatus?.state, markState),
    lastUpdated: new Date().toISOString(),
    selectedOption: selection?.selectedOption?.summary ?? existingStatus?.selectedOption ?? null,
    artifacts,
    sourceSummary: surface?.sourceSummary ?? existingStatus?.sourceSummary ?? null,
    currentSurface: surface?.surface?.name ?? existingStatus?.currentSurface ?? null,
    changeType: surface?.changeType ?? existingStatus?.changeType ?? null,
    notes: existingStatus?.notes ?? 'Managed by bfds-gate.mjs.'
  };
}

function writeStatusAndLog(dir, status, result) {
  ensureDir(path.join(dir, 'evidence'));
  fs.writeFileSync(path.join(dir, 'status.json'), `${JSON.stringify(status, null, 2)}\n`);
  const logLine = {
    time: new Date().toISOString(),
    phase: result.phase,
    status: status.state,
    missing: result.missing,
    warnings: result.warnings,
    errors: result.errors
  };
  fs.appendFileSync(path.join(dir, 'evidence', 'gate-log.ndjson'), `${JSON.stringify(logLine)}\n`);
}

function writePendingRequest(dir, slug, request) {
  if (!request?.trim()) return;
  ensureDir(path.join(dir, 'evidence'));
  const file = path.join(dir, 'evidence', 'pending-request.json');
  if (fs.existsSync(file)) return;
  const data = {
    slug,
    createdAt: new Date().toISOString(),
    request: request.trim()
  };
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

function mtimeMs(file) {
  return fs.statSync(file).mtimeMs;
}

function warnIfOlder(warnings, dir, upstreamName, downstreamNames, label) {
  const upstream = path.join(dir, upstreamName);
  if (!fs.existsSync(upstream)) return;
  const upstreamTime = mtimeMs(upstream);
  for (const downstreamName of downstreamNames) {
    const downstream = path.join(dir, downstreamName);
    if (fs.existsSync(downstream) && mtimeMs(downstream) < upstreamTime) {
      warnings.push(`${label}: ${downstreamName} is older than ${upstreamName}`);
    }
  }
}

function evaluate(dir) {
  const errors = [];
  const warnings = [];
  const slug = slugFromDir(dir);
  const context = resolveContext();
  const statusPath = path.join(dir, 'status.json');
  const existingStatus = fs.existsSync(statusPath) ? readJson(statusPath, errors, 'status.json') : null;

  const surfaceResult = validateJsonFile(path.join(dir, 'evidence', 'surface.json'), schemaPath('surface-evidence.schema.json'), 'surface evidence');
  const directionsResult = validateJsonFile(path.join(dir, 'evidence', 'directions.json'), schemaPath('directions-evidence.schema.json'), 'directions evidence');
  const selectionResult = validateJsonFile(path.join(dir, 'evidence', 'selection.json'), schemaPath('selection-evidence.schema.json'), 'selection evidence');
  const contractResult = validateJsonFile(path.join(dir, 'design-contract.json'), schemaPath('design-contract.schema.json'), 'design contract');
  const qaPlanResult = validateJsonFile(path.join(dir, 'qa-plan.json'), schemaPath('qa-plan.schema.json'), 'qa plan');

  const surfaceExists = surfaceResult.exists;
  const directionsExists = directionsResult.exists;
  const selectionExists = selectionResult.exists;
  const workbenchFiles = ['workbench.html', 'option-a.html', 'option-b.html', 'option-c.html'].filter(name => fileExists(dir, name));
  const hasWorkbench = workbenchFiles.length === 4;
  const hasPartialWorkbench = workbenchFiles.length > 0 && workbenchFiles.length < 4;
  const contractFiles = ['design-contract.json', 'implementation-handoff.md', 'qa-plan.json'].filter(name => fileExists(dir, name));
  const hasContractPack = contractFiles.length === 3;
  const hasPartialContractPack = contractFiles.length > 0 && contractFiles.length < 3;

  if (!context.ready) {
    return { phase: 'CONTEXT_BLOCKED', slug, dir: toProjectPath(dir), context, missing: ['trusted PRODUCT.md', 'trusted DESIGN.md'].filter((_, index) => index === 0 ? !context.productPath : !context.designPath), errors, warnings };
  }

  if (surfaceExists && !surfaceResult.ok) errors.push(...surfaceResult.errors);
  if (directionsExists && !directionsResult.ok) errors.push(...directionsResult.errors);
  if (selectionExists && !selectionResult.ok) errors.push(...selectionResult.errors);

  if (surfaceResult.ok && surfaceResult.data?.slug !== slug) errors.push(`surface evidence slug must equal directory slug ${slug}`);
  if (directionsResult.ok && directionsResult.data?.slug !== slug) errors.push(`directions evidence slug must equal directory slug ${slug}`);
  if (selectionResult.ok && selectionResult.data?.slug !== slug) errors.push(`selection evidence slug must equal directory slug ${slug}`);

  if (surfaceResult.ok) {
    if (surfaceResult.data.productPath !== context.productPath) warnings.push(`surface evidence productPath ${surfaceResult.data.productPath} differs from current trusted path ${context.productPath}`);
    if (surfaceResult.data.designPath !== context.designPath) warnings.push(`surface evidence designPath ${surfaceResult.data.designPath} differs from current trusted path ${context.designPath}`);
    if (CHANGE_TYPES_REQUIRING_CURRENT_SURFACE.has(surfaceResult.data.changeType) && surfaceResult.data.surface.confidence === 'low') {
      errors.push('surface evidence for modify/remove/replace/restyle cannot use low confidence');
    }
  }

  if (directionsResult.ok) {
    for (const [key, option] of Object.entries(directionsResult.data.options)) {
      if (option.optionId !== key) errors.push(`directions evidence options.${key}.optionId must be ${key}`);
    }
    for (const [key, value] of Object.entries(directionsResult.data.selfCheck)) {
      if (key !== 'notes' && value !== true) errors.push(`directions evidence selfCheck.${key} must be true`);
    }
  }

  if (selectionResult.ok) {
    if (invalidSelectionQuote(selectionResult.data.selectionQuote)) {
      errors.push('selection evidence quote is not an explicit user choice');
    }
    for (const file of [
      selectionResult.data.workbench,
      selectionResult.data.options.A,
      selectionResult.data.options.B,
      selectionResult.data.options.C
    ]) {
      if (!fs.existsSync(path.resolve(cwd, file))) errors.push(`selection evidence references missing file: ${file}`);
    }
  }
  if (fileExists(dir, 'design-contract.json')) {
    if (!contractResult.ok) errors.push(...contractResult.errors);
    if (contractResult.ok && contractResult.data.slug !== slug) errors.push(`design contract slug must equal directory slug ${slug}`);
  }
  if (fileExists(dir, 'qa-plan.json')) {
    if (!qaPlanResult.ok) errors.push(...qaPlanResult.errors);
    if (qaPlanResult.ok && qaPlanResult.data.slug !== slug) errors.push(`qa plan slug must equal directory slug ${slug}`);
  }
  if (fileExists(dir, 'implementation-handoff.md') && fs.statSync(path.join(dir, 'implementation-handoff.md')).size === 0) {
    errors.push('implementation-handoff.md is empty');
  }

  if (directionsExists && !surfaceExists) errors.push('directions evidence exists before surface evidence');
  if ((hasWorkbench || hasPartialWorkbench) && !directionsExists) errors.push('workbench files exist before directions evidence');
  if (selectionExists && !hasWorkbench) errors.push('selection evidence exists before complete workbench files');
  if ((hasContractPack || hasPartialContractPack) && !selectionExists) errors.push('contract files exist before selection evidence');
  if (hasPartialWorkbench) errors.push(`incomplete workbench files: found ${workbenchFiles.join(', ')}`);
  if (hasPartialContractPack) errors.push(`incomplete contract pack: found ${contractFiles.join(', ')}`);

  warnIfOlder(warnings, dir, 'evidence/surface.json', ['evidence/directions.json'], 'stale evidence');
  warnIfOlder(warnings, dir, 'evidence/directions.json', ['workbench.html', 'option-a.html', 'option-b.html', 'option-c.html'], 'stale workbench');
  warnIfOlder(warnings, dir, 'workbench.html', ['evidence/selection.json'], 'stale selection');
  warnIfOlder(warnings, dir, 'evidence/selection.json', ['design-contract.json', 'implementation-handoff.md', 'qa-plan.json'], 'stale contract pack');

  if (errors.length > 0) {
    return { phase: 'INCONSISTENT', slug, dir: toProjectPath(dir), context, missing: [], errors, warnings };
  }
  if (!surfaceExists) return { phase: 'NEEDS_SURFACE', slug, dir: toProjectPath(dir), context, missing: ['evidence/surface.json'], errors, warnings };
  if (!directionsExists) return { phase: 'NEEDS_DIRECTIONS', slug, dir: toProjectPath(dir), context, missing: ['evidence/directions.json'], errors, warnings, surface: surfaceResult.data };
  if (!hasWorkbench) return { phase: 'NEEDS_WORKBENCH', slug, dir: toProjectPath(dir), context, missing: ['workbench.html', 'option-a.html', 'option-b.html', 'option-c.html'].filter(name => !fileExists(dir, name)), errors, warnings, surface: surfaceResult.data, directions: directionsResult.data };
  if (!selectionExists) return { phase: 'NEEDS_SELECTION', slug, dir: toProjectPath(dir), context, missing: ['evidence/selection.json'], errors, warnings, surface: surfaceResult.data, directions: directionsResult.data };
  if (!hasContractPack) return { phase: 'NEEDS_CONTRACT', slug, dir: toProjectPath(dir), context, missing: ['design-contract.json', 'implementation-handoff.md', 'qa-plan.json'].filter(name => !fileExists(dir, name)), errors, warnings, surface: surfaceResult.data, directions: directionsResult.data, selection: selectionResult.data };
  return { phase: IMPLEMENTABLE_STATUS.has(existingStatus?.state) ? 'IMPLEMENT_READY' : 'CONTRACT_READY', slug, dir: toProjectPath(dir), context, missing: [], errors, warnings, surface: surfaceResult.data, directions: directionsResult.data, selection: selectionResult.data };
}

function renderText(result) {
  const lines = [
    `BFDS_GATE: ${result.phase}`,
    `设计任务: ${result.slug}`,
    `目录: ${result.dir}`
  ];
  if (result.context) {
    lines.push(`PRODUCT.md: ${result.context.productPath ?? 'missing'}`);
    lines.push(`DESIGN.md: ${result.context.designPath ?? 'missing'}`);
  }
  if (result.missing?.length) lines.push(`缺失: ${result.missing.join(', ')}`);
  if (result.errors?.length) lines.push(...result.errors.map(error => `错误: ${error}`));
  if (result.warnings?.length) lines.push(...result.warnings.map(warning => `警告: ${warning}`));
  if (result.phase === 'NEEDS_CONTRACT' && result.selection) {
    lines.push(`用户选择原话: ${result.selection.selectionQuote}`);
    lines.push(`选中方案摘要: ${result.selection.selectedOption?.summary ?? 'missing'}`);
  }
  lines.push('下一步规则:');
  for (const rule of phaseRules(result.phase)) lines.push(`- ${rule}`);
  return `${lines.join('\n')}\n`;
}

if (help) {
  process.stdout.write(`${usage()}\n`);
  process.exit(0);
}

if (argErrors.length > 0) {
  process.stderr.write(`${argErrors.join('\n')}\n${usage()}\n`);
  process.exit(1);
}

if (!targetArg) {
  process.stderr.write(`${usage()}\n`);
  process.exit(1);
}

if (markArg && !MARKABLE_STATUS.has(markArg)) {
  process.stderr.write(`Invalid --mark state: ${markArg}\n`);
  process.exit(1);
}

const dir = resolveDesignDir(targetArg);
if (!checkOnly) ensureDir(path.join(dir, 'evidence'));
const result = evaluate(dir);
const statusPath = path.join(dir, 'status.json');
const existingStatusErrors = [];
const existingStatus = fs.existsSync(statusPath) ? readJson(statusPath, existingStatusErrors, 'status.json') : null;
let markState = null;

if (markArg) {
  if (!['CONTRACT_READY', 'IMPLEMENT_READY'].includes(result.phase)) {
    result.phase = 'INCONSISTENT';
    result.errors.push(`cannot mark ${markArg} before contract is ready`);
  } else if (['qa-failed', 'qa-passed', 'done'].includes(markArg) && !fileExists(dir, 'qa-report.md')) {
    result.phase = 'INCONSISTENT';
    result.errors.push(`cannot mark ${markArg} before qa-report.md exists`);
  } else {
    markState = markArg;
  }
}

if (!checkOnly) {
  if (result.phase === 'CONTEXT_BLOCKED') writePendingRequest(dir, result.slug, requestArg);
  const status = buildStatus(dir, result.slug, titleArg, result.phase, existingStatus, result.surface, result.selection, markState);
  writeStatusAndLog(dir, status, result);
  result.status = status;
}
result.rules = phaseRules(result.phase);

if (json) {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} else {
  process.stdout.write(renderText(result));
}

process.exit(['INCONSISTENT', 'CONTEXT_BLOCKED'].includes(result.phase) ? 2 : 0);
