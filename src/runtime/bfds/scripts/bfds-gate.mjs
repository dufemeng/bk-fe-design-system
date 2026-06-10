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
const INIT_INTERVIEW_FILE = 'evidence/init-interview.json';
const BRAINSTORM_DIALOGUE_FILE = 'evidence/brainstorm-dialogue.json';
const CHANGE_TYPES_REQUIRING_CURRENT_SURFACE = new Set(['modify', 'remove', 'replace', 'restyle']);
const IMPLEMENTABLE_STATUS = new Set(['contract-ready', 'implementing', 'implemented', 'qa-failed', 'qa-passed', 'live-iterating', 'done']);
const MARKABLE_STATUS = new Set(['implementing', 'implemented', 'qa-failed', 'qa-passed', 'live-iterating', 'done']);
const PRODUCT_CONTEXT_HEADINGS = [
  /^##\s+Users\b/im,
  /^##\s+Product Purpose\b/im,
  /^##\s+Brand Personality\b/im,
  /^##\s+Anti-references\b/im,
  /^##\s+Design Principles\b/im,
  /^##\s+Accessibility & Inclusion\b/im,
  /^##\s+用户/im,
  /^##\s+产品目的/im,
  /^##\s+品牌人格/im,
  /^##\s+反参考/im,
  /^##\s+设计原则/im,
  /^##\s+可访问/im
];
const DESIGN_STITCH_HEADINGS = [
  /^##\s*(?:\d+\.\s*)?Overview\b/im,
  /^##\s*(?:\d+\.\s*)?Colors\b/im,
  /^##\s*(?:\d+\.\s*)?Typography\b/im,
  /^##\s*(?:\d+\.\s*)?Elevation\b/im,
  /^##\s*(?:\d+\.\s*)?Components\b/im,
  /^##\s*(?:\d+\.\s*)?Do'?s and Don'?ts\b/im
];
const DESIGN_VISUAL_MARKERS = [
  /\bcolors?\b/i,
  /\btypography\b/i,
  /\belevation\b/i,
  /\bcomponents?\b/i,
  /\bspacing\b/i,
  /\btokens?\b/i,
  /\bvisual\b/i,
  /颜色|色彩|字体|排版|间距|组件|动效|视觉|设计系统|设计\s*token|设计变量/i
];
const DESIGN_ARCHITECTURE_HEADINGS = [
  /^#{1,3}\s*.*\bArchitecture\b.*$/im,
  /^#{1,3}\s*.*技术栈.*$/m,
  /^#{1,3}\s*.*项目结构.*$/m,
  /^#{1,3}\s*.*目录结构.*$/m,
  /^#{1,3}\s*.*工程结构.*$/m,
  /^#{1,3}\s*.*架构设计.*$/m,
  /^#{1,3}\s*.*前端架构.*$/m,
  /^#{1,3}\s*.*包管理.*$/m,
  /^#{1,3}\s*.*运行环境.*$/m
];
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
    '  node <skill-dir>/scripts/bfds.mjs next settings-prompt',
    '  node scripts/bfds.mjs next docs/design/settings-prompt --json',
    '  node scripts/bfds.mjs next settings-prompt'
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

function schemaPath(file) {
  return path.join(scriptDir, '..', 'schemas', file);
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

function readTextFile(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return '';
  }
}

function countMatches(text, patterns) {
  return patterns.filter(pattern => pattern.test(text)).length;
}

function validateProductContext(file) {
  const errors = [];
  const text = readTextFile(file);
  const registerMatch = text.match(/^##\s+Register\s*\n+([^\n#]+)/im);

  if (!registerMatch) {
    errors.push(`${toProjectPath(file)} must include ## Register with bare brand or product`);
  } else {
    const register = registerMatch[1].trim().toLowerCase();
    if (!['brand', 'product'].includes(register)) {
      errors.push(`${toProjectPath(file)} ## Register must be exactly brand or product, got ${JSON.stringify(registerMatch[1].trim())}`);
    }
  }

  const headingCount = countMatches(text, PRODUCT_CONTEXT_HEADINGS);
  if (headingCount < 3) {
    errors.push(`${toProjectPath(file)} does not look like Impeccable PRODUCT.md; expected users/purpose/brand/anti-reference/principles/accessibility context`);
  }

  return { ok: errors.length === 0, errors };
}

function yamlFrontmatter(text) {
  if (!text.startsWith('---')) return null;
  const match = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
  return match?.[1] ?? null;
}

function validateDesignContext(file) {
  const errors = [];
  const text = readTextFile(file);
  const frontmatter = yamlFrontmatter(text);
  const frontmatterHasTokens = Boolean(frontmatter && /\b(colors|typography|rounded|spacing|components)\s*:/i.test(frontmatter));
  const stitchHeadingCount = countMatches(text, DESIGN_STITCH_HEADINGS);
  const visualMarkerCount = countMatches(text, DESIGN_VISUAL_MARKERS);
  const architectureHeadings = DESIGN_ARCHITECTURE_HEADINGS
    .map(pattern => text.match(pattern)?.[0]?.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  if (architectureHeadings.length > 0) {
    errors.push(`${toProjectPath(file)} looks like a technical architecture document, not a Stitch visual DESIGN.md: ${architectureHeadings.join('; ')}`);
  }
  if (!frontmatterHasTokens) {
    errors.push(`${toProjectPath(file)} must include YAML frontmatter with visual tokens such as colors, typography, rounded, spacing, or components`);
  }
  if (stitchHeadingCount < 4) {
    errors.push(`${toProjectPath(file)} must follow Stitch DESIGN.md body shape; expected Overview, Colors, Typography, Elevation, Components, and Do's and Don'ts sections`);
  }
  if (visualMarkerCount < 3) {
    errors.push(`${toProjectPath(file)} does not contain enough visual-system markers; expected color, typography, spacing, component, token, motion, or visual guidance`);
  }

  return { ok: errors.length === 0, errors };
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
  const productValidation = productMatch?.productPath
    ? validateProductContext(productMatch.productPath)
    : { ok: false, errors: [] };
  const designValidation = designMatch?.designPath
    ? validateDesignContext(designMatch.designPath)
    : { ok: false, errors: [] };

  return {
    ready: Boolean(productMatch?.productPath && designMatch?.designPath && productValidation.ok && designValidation.ok),
    productPath: productMatch?.productPath ? rel(productMatch.productPath) : null,
    designPath: designMatch?.designPath ? rel(designMatch.designPath) : null,
    productOk: productValidation.ok,
    designOk: designValidation.ok,
    problems: [...productValidation.errors, ...designValidation.errors]
  };
}

function fileExists(dir, name) {
  return fs.existsSync(path.join(dir, name));
}

function fileContains(dir, name, text) {
  const file = path.join(dir, name);
  if (!fs.existsSync(file)) return false;
  return fs.readFileSync(file, 'utf8').includes(text);
}

function phaseRules(phase) {
  const rules = {
    CONTEXT_BLOCKED: [
      '停止 BFDS 设计推进：Impeccable 项目级上下文未就绪。',
      '父会话逐题问用户并等待回答；Claude Code 选择/确认必须用 AskUserQuestion。',
      'Register 只问单选 product/brand；不要问 register 名称、品牌 ID 或产品 ID。',
      '写 evidence/init-interview.json；禁止代答、禁止从当前设计任务反推项目上下文。',
      'PRODUCT.md 必须是 Impeccable strategic context，DESIGN.md 必须是 Stitch 视觉系统文档，不是技术架构文档。',
      '可用 fresh subagent 只根据 init-interview evidence 写 PRODUCT.md / DESIGN.md；完成后运行 bfds.mjs next。'
    ],
    NEEDS_SURFACE: [
      '只确认目标界面与变更边界，不生成三方向、不写工作台。',
      'Claude Code 中改动类型、证据来源或确认类选择必须用 AskUserQuestion；开放说明一次只问一个问题。',
      '写 evidence/surface.json：目标界面、现状来源、改动类型、必须保留、允许改变、必须避免。',
      'modify/remove/replace/restyle 必须有视觉证据或用户确认；仅代码推断要标注未视觉验证。',
      '写完后运行 bfds.mjs next。'
    ],
    NEEDS_DIRECTIONS: [
      '只做设计方向探索；父会话一次只问一个设计表达问题并等待用户回答。',
      '先写 evidence/brainstorm-dialogue.json；用户确认 2-3 个方向取舍后，才写 evidence/directions.json。',
      'Claude Code 中方向取舍确认必须用 AskUserQuestion；开放设计表达题可以普通文本。',
      '用户明确拒绝继续追问时，brainstorm-dialogue mode=user-skipped，并记录 skipReasonQuote。',
      '三个方向至少在两个维度上不同，换色、换圆角、换阴影不算差异。',
      '不得新增未确认的产品能力、API、数据库、权限或后端范围。',
      '写每个 evidence 后都重新运行 bfds.mjs next。'
    ],
    NEEDS_WORKBENCH: [
      '只生成评审工作台和三个方案 HTML。',
      '必须使用 directions evidence 的 A/B/C 方向，不临时改方向。',
      '生成 workbench.html 和 option-a/b/c.html 后重新运行 bfds.mjs next。'
    ],
    NEEDS_SELECTION: [
      '停止等待用户用 AskUserQuestion 选择，不写设计交付包。',
      'Claude Code 必须用 AskUserQuestion 单选 A/B/C/合并或调整；推荐方案不算选择。',
      '用户必须明确选择 A/B/C 或给出合并方案。',
      '有明确选择后写 evidence/selection.json，再重新运行 bfds.mjs next。'
    ],
    NEEDS_CONTRACT: [
      '只生成设计交付包：design-contract.json、implementation-handoff.md、qa-plan.json。',
      '交付包必须使用 selection evidence 和前置证据，不凭聊天记忆补写。',
      '生成前先回显 selection evidence 的用户选择原话和选中方案摘要；Claude Code 用 AskUserQuestion 单选确认无误/需要修正。',
      '生成后运行 bfds.mjs validate，再重新运行 bfds.mjs next。'
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
      '不要补猜缺失证据；先修正 evidence 或删除错误下游产物后再运行 bfds.mjs next。'
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
    initInterviewEvidence: artifact(INIT_INTERVIEW_FILE),
    surfaceEvidence: artifact('evidence/surface.json'),
    brainstormDialogueEvidence: artifact(BRAINSTORM_DIALOGUE_FILE),
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
    sourceSummary: surface?.sourceSummary || existingStatus?.sourceSummary || null,
    currentSurface: surface?.surface?.name ?? existingStatus?.currentSurface ?? null,
    changeType: surface?.changeType ?? existingStatus?.changeType ?? null,
    notes: existingStatus?.notes ?? 'Managed by BFDS runtime.'
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

function contextBlockedTask(missing, errors) {
  if (missing.includes(INIT_INTERVIEW_FILE)) {
    return [
      'Claude Code 用 AskUserQuestion 单选 register: product / brand；不要问 register 名称、品牌 ID 或产品 ID。',
      '逐题询问项目级上下文：用户与目的、品牌人格/反参考、可访问性、视觉系统来源。',
      `把用户回答和确认原话写入 ${INIT_INTERVIEW_FILE}，不要写 PRODUCT.md / DESIGN.md。`,
      '用户确认后，再用 fresh subagent 或同等隔离流程写 PRODUCT.md / DESIGN.md。'
    ];
  }
  if (errors.some(error => error.includes('DESIGN.md'))) {
    return [
      '修正 DESIGN.md：必须是 Stitch 视觉系统文档，包含 token frontmatter 和 Overview/Colors/Typography/Elevation/Components/Do\'s and Don\'ts。',
      '不要写技术栈、项目结构、目录结构、包管理或前端架构文档。',
      '写完后运行 bfds.mjs next。'
    ];
  }
  if (errors.some(error => error.includes('PRODUCT.md'))) {
    return [
      '修正 PRODUCT.md：必须包含 ## Register，值只能是 brand 或 product。',
      '补齐用户、产品目的、品牌人格、反参考、设计原则、可访问性等项目级战略上下文。',
      '写完后运行 bfds.mjs next。'
    ];
  }
  return [
    '补齐 Impeccable 项目级上下文后运行 bfds.mjs next。'
  ];
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

  const initInterviewResult = validateJsonFile(path.join(dir, INIT_INTERVIEW_FILE), schemaPath('init-interview.schema.json'), 'init interview evidence');
  const surfaceResult = validateJsonFile(path.join(dir, 'evidence', 'surface.json'), schemaPath('surface-evidence.schema.json'), 'surface evidence');
  const brainstormResult = validateJsonFile(path.join(dir, BRAINSTORM_DIALOGUE_FILE), schemaPath('brainstorm-dialogue.schema.json'), 'brainstorm dialogue evidence');
  const directionsResult = validateJsonFile(path.join(dir, 'evidence', 'directions.json'), schemaPath('directions-evidence.schema.json'), 'directions evidence');
  const selectionResult = validateJsonFile(path.join(dir, 'evidence', 'selection.json'), schemaPath('selection-evidence.schema.json'), 'selection evidence');
  const contractResult = validateJsonFile(path.join(dir, 'design-contract.json'), schemaPath('design-contract.schema.json'), 'design contract');
  const qaPlanResult = validateJsonFile(path.join(dir, 'qa-plan.json'), schemaPath('qa-plan.schema.json'), 'qa plan');

  const surfaceExists = surfaceResult.exists;
  const brainstormExists = brainstormResult.exists;
  const directionsExists = directionsResult.exists;
  const selectionExists = selectionResult.exists;
  const expectedWorkbenchFiles = ['workbench.html', 'workbench.css', 'option-a.html', 'option-b.html', 'option-c.html'];
  const existingWorkbenchFiles = expectedWorkbenchFiles.filter(name => fileExists(dir, name));
  const placeholderWorkbenchFiles = expectedWorkbenchFiles.filter(name => fileContains(dir, name, 'BFDS_PLACEHOLDER'));
  const validWorkbenchFiles = expectedWorkbenchFiles.filter(name => fileExists(dir, name) && !fileContains(dir, name, 'BFDS_PLACEHOLDER'));
  const hasWorkbench = validWorkbenchFiles.length === expectedWorkbenchFiles.length;
  const hasPartialWorkbench = existingWorkbenchFiles.length > 0 && !hasWorkbench && placeholderWorkbenchFiles.length === 0;
  const contractFiles = ['design-contract.json', 'implementation-handoff.md', 'qa-plan.json'].filter(name => fileExists(dir, name));
  const hasContractPack = contractFiles.length === 3;
  const hasPartialContractPack = contractFiles.length > 0 && contractFiles.length < 3;

  const contextMissing = [];
  const contextErrors = [];
  if (!context.productPath) contextMissing.push('trusted PRODUCT.md');
  if (!context.designPath) contextMissing.push('trusted DESIGN.md');
  if (!initInterviewResult.exists) contextMissing.push(INIT_INTERVIEW_FILE);
  if (context.problems.length > 0) contextErrors.push(...context.problems);
  if (initInterviewResult.exists && !initInterviewResult.ok) contextErrors.push(...initInterviewResult.errors);
  if (initInterviewResult.ok) {
    if (initInterviewResult.data.slug !== slug) contextErrors.push(`init interview evidence slug must equal directory slug ${slug}`);
    if (initInterviewResult.data.productPath !== context.productPath) {
      contextErrors.push(`init interview evidence productPath ${initInterviewResult.data.productPath} differs from current trusted path ${context.productPath}`);
    }
    if (initInterviewResult.data.designPath !== context.designPath) {
      contextErrors.push(`init interview evidence designPath ${initInterviewResult.data.designPath} differs from current trusted path ${context.designPath}`);
    }
    if (initInterviewResult.data.source === 'user-interview' && initInterviewResult.data.questions.length < 2) {
      contextErrors.push('init interview evidence source user-interview requires at least two user Q/A entries');
    }
  }

  if (contextMissing.length > 0 || contextErrors.length > 0 || !context.ready) {
    return {
      phase: 'CONTEXT_BLOCKED',
      slug,
      dir: toProjectPath(dir),
      context,
      missing: contextMissing,
      errors: contextErrors,
      warnings,
      contextTask: contextBlockedTask(contextMissing, contextErrors)
    };
  }

  if (surfaceExists && !surfaceResult.ok) errors.push(...surfaceResult.errors);
  if (brainstormExists && !brainstormResult.ok) errors.push(...brainstormResult.errors);
  if (directionsExists && !directionsResult.ok) errors.push(...directionsResult.errors);
  if (selectionExists && !selectionResult.ok) errors.push(...selectionResult.errors);

  if (surfaceResult.ok && surfaceResult.data?.slug !== slug) errors.push(`surface evidence slug must equal directory slug ${slug}`);
  if (brainstormResult.ok && brainstormResult.data?.slug !== slug) errors.push(`brainstorm dialogue evidence slug must equal directory slug ${slug}`);
  if (directionsResult.ok && directionsResult.data?.slug !== slug) errors.push(`directions evidence slug must equal directory slug ${slug}`);
  if (selectionResult.ok && selectionResult.data?.slug !== slug) errors.push(`selection evidence slug must equal directory slug ${slug}`);

  if (surfaceResult.ok) {
    if (surfaceResult.data.productPath !== context.productPath) warnings.push(`surface evidence productPath ${surfaceResult.data.productPath} differs from current trusted path ${context.productPath}`);
    if (surfaceResult.data.designPath !== context.designPath) warnings.push(`surface evidence designPath ${surfaceResult.data.designPath} differs from current trusted path ${context.designPath}`);
    if (CHANGE_TYPES_REQUIRING_CURRENT_SURFACE.has(surfaceResult.data.changeType) && surfaceResult.data.surface.confidence === 'low') {
      errors.push('surface evidence for modify/remove/replace/restyle cannot use low confidence');
    }
  }

  if (brainstormResult.ok) {
    if (brainstormResult.data.surfaceEvidence !== toProjectPath(path.join(dir, 'evidence', 'surface.json'))) {
      errors.push(`brainstorm dialogue evidence surfaceEvidence must equal ${toProjectPath(path.join(dir, 'evidence', 'surface.json'))}`);
    }
    if (brainstormResult.data.mode === 'socratic' && brainstormResult.data.turns.length < 2) {
      errors.push('brainstorm dialogue evidence mode socratic requires at least two user Q/A turns');
    }
    if (brainstormResult.data.mode === 'user-skipped' && !brainstormResult.data.skipReasonQuote?.trim()) {
      errors.push('brainstorm dialogue evidence mode user-skipped requires skipReasonQuote');
    }
  }

  if (directionsResult.ok) {
    if (directionsResult.data.surfaceEvidence !== toProjectPath(path.join(dir, 'evidence', 'surface.json'))) {
      errors.push(`directions evidence surfaceEvidence must equal ${toProjectPath(path.join(dir, 'evidence', 'surface.json'))}`);
    }
    if (directionsResult.data.brainstormDialogueEvidence !== toProjectPath(path.join(dir, BRAINSTORM_DIALOGUE_FILE))) {
      errors.push(`directions evidence brainstormDialogueEvidence must equal ${toProjectPath(path.join(dir, BRAINSTORM_DIALOGUE_FILE))}`);
    }
    for (const [key, option] of Object.entries(directionsResult.data.options)) {
      if (option.optionId !== key) errors.push(`directions evidence options.${key}.optionId must be ${key}`);
    }
    for (const [key, value] of Object.entries(directionsResult.data.selfCheck)) {
      if (key !== 'notes' && value !== true) errors.push(`directions evidence selfCheck.${key} must be true`);
    }
  }

  if (selectionResult.ok) {
    if (invalidSelectionQuote(selectionResult.data.selectionQuote)) {
      warnings.push('selection evidence quote may delegate the choice to the agent; confirm A/B/C or merge selection with the user');
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

  if (brainstormExists && !surfaceExists) errors.push('brainstorm dialogue evidence exists before surface evidence');
  if (directionsExists && !surfaceExists) errors.push('directions evidence exists before surface evidence');
  if (directionsExists && !brainstormExists) errors.push('directions evidence exists before brainstorm dialogue evidence');
  if ((existingWorkbenchFiles.length > 0) && !directionsExists) errors.push('workbench files exist before directions evidence');
  const delegatedSelection = selectionResult.ok && invalidSelectionQuote(selectionResult.data.selectionQuote);
  if (selectionExists && !hasWorkbench) errors.push('selection evidence exists before complete workbench files');
  if ((hasContractPack || hasPartialContractPack) && !selectionExists) errors.push('contract files exist before selection evidence');
  if ((hasContractPack || hasPartialContractPack) && delegatedSelection) errors.push('contract files exist before explicit user selection');
  if (hasPartialWorkbench) errors.push(`incomplete workbench files: found ${existingWorkbenchFiles.join(', ')}`);
  if (hasPartialContractPack) errors.push(`incomplete contract pack: found ${contractFiles.join(', ')}`);

  warnIfOlder(warnings, dir, 'evidence/surface.json', ['evidence/directions.json'], 'stale evidence');
  warnIfOlder(warnings, dir, 'evidence/surface.json', [BRAINSTORM_DIALOGUE_FILE], 'stale brainstorm');
  warnIfOlder(warnings, dir, BRAINSTORM_DIALOGUE_FILE, ['evidence/directions.json'], 'stale directions');
  warnIfOlder(warnings, dir, 'evidence/directions.json', ['workbench.html', 'workbench.css', 'option-a.html', 'option-b.html', 'option-c.html'], 'stale workbench');
  warnIfOlder(warnings, dir, 'workbench.html', ['evidence/selection.json'], 'stale selection');
  warnIfOlder(warnings, dir, 'evidence/selection.json', ['design-contract.json', 'implementation-handoff.md', 'qa-plan.json'], 'stale contract pack');

  if (errors.length > 0) {
    return { phase: 'INCONSISTENT', slug, dir: toProjectPath(dir), context, missing: [], errors, warnings };
  }
  if (!surfaceExists) return { phase: 'NEEDS_SURFACE', slug, dir: toProjectPath(dir), context, missing: ['evidence/surface.json'], errors, warnings };
  if (!brainstormExists) return { phase: 'NEEDS_DIRECTIONS', slug, dir: toProjectPath(dir), context, missing: [BRAINSTORM_DIALOGUE_FILE], errors, warnings, surface: surfaceResult.data };
  if (!directionsExists) return { phase: 'NEEDS_DIRECTIONS', slug, dir: toProjectPath(dir), context, missing: ['evidence/directions.json'], errors, warnings, surface: surfaceResult.data, brainstorm: brainstormResult.data };
  if (!hasWorkbench) return { phase: 'NEEDS_WORKBENCH', slug, dir: toProjectPath(dir), context, missing: expectedWorkbenchFiles.filter(name => !fileExists(dir, name) || fileContains(dir, name, 'BFDS_PLACEHOLDER')), errors, warnings, surface: surfaceResult.data, directions: directionsResult.data };
  if (!selectionExists || delegatedSelection) {
    return {
      phase: 'NEEDS_SELECTION',
      slug,
      dir: toProjectPath(dir),
      context,
      missing: delegatedSelection ? ['explicit user A/B/C or merge confirmation'] : ['evidence/selection.json'],
      errors,
      warnings,
      surface: surfaceResult.data,
      directions: directionsResult.data
    };
  }
  if (!hasContractPack) return { phase: 'NEEDS_CONTRACT', slug, dir: toProjectPath(dir), context, missing: ['design-contract.json', 'implementation-handoff.md', 'qa-plan.json'].filter(name => !fileExists(dir, name)), errors, warnings, surface: surfaceResult.data, directions: directionsResult.data, selection: selectionResult.data };
  return { phase: IMPLEMENTABLE_STATUS.has(existingStatus?.state) ? 'IMPLEMENT_READY' : 'CONTRACT_READY', slug, dir: toProjectPath(dir), context, missing: [], errors, warnings, surface: surfaceResult.data, directions: directionsResult.data, selection: selectionResult.data };
}

function renderText(result) {
  const lines = [
    `BFDS_STAGE: ${result.phase}`,
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
  if (result.contextTask?.length) {
    lines.push('Impeccable 子流程任务:');
    lines.push(...result.contextTask.map(task => `- ${task}`));
  }
  if (result.phase === 'NEEDS_CONTRACT' && result.selection) {
    lines.push(`用户选择原话: ${result.selection.selectionQuote}`);
    lines.push(`选中方案摘要: ${result.selection.selectedOption?.summary ?? 'missing'}`);
  }
  lines.push('下一步纪律:');
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
