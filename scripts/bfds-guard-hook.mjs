#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const cwd = process.cwd();
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const DESIGN_ROOT = path.join(cwd, 'docs', 'design');
const PROTECTED_CONTEXT_NAMES = new Set(['PRODUCT.md', 'Product.md', 'product.md', 'DESIGN.md', 'Design.md', 'design.md']);
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
const WRITE_COMMAND_RE = /(cat\s+>|tee\s+|cp\s+|mv\s+|sed\s+-i|perl\s+-pi|fs\.writeFileSync|writeFileSync|python\d?\s+-c|node\s+-e)/;
const DELEGATED_TOOL_RE = /^(task|agent|subagent)$/i;
const DELEGATED_WRITE_INTENT_RE = /(写|创建|生成|产出|更新|修改|编辑|固化|落盘|write|create|generate|update|edit|produce|author|save)/i;
const DELEGATED_PROTECTED_TARGET_RE = /(PRODUCT\.md|DESIGN\.md|docs\/design\/|design-contract\.json|implementation-handoff\.md|qa-plan\.json|workbench\.html|option-[abc]\.html|BFDS\s*(产物|artifact))/i;
const DELEGATED_READ_ONLY_INTENT_RE = /(只读|只读取|读取|总结|分析|read-only|read only|summarize|analyze)/i;
const DELEGATED_NEGATED_WRITE_RE = /((不要|不得|禁止|无需|不需要|不能).{0,8}(写|创建|生成|产出|更新|修改|编辑|固化|落盘))|((do not|don't|without).{0,8}(write|create|generate|update|edit|save))/i;

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function parseHookInput() {
  const raw = readStdin().trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function projectPath(file) {
  return path.relative(cwd, path.resolve(cwd, file)).split(path.sep).join('/');
}

function deny(reason) {
  const message = `BFDS guard blocked this tool call: ${reason}`;
  process.stderr.write(`${message}\n`);
  process.stdout.write(`${JSON.stringify({ decision: 'block', reason: message })}\n`);
  process.exit(2);
}

function allow() {
  process.exit(0);
}

function findGateScript() {
  const candidates = [
    path.join(cwd, '.claude', 'skills', 'bfds-design', 'runtime', 'bfds', 'scripts', 'bfds-gate.mjs'),
    path.join(cwd, '.agents', 'skills', 'bfds-design', 'runtime', 'bfds', 'scripts', 'bfds-gate.mjs'),
    path.join(process.env.HOME ?? '', '.codex', 'skills', 'bfds-design', 'runtime', 'bfds', 'scripts', 'bfds-gate.mjs'),
    // 仓库内开发/测试布局：hook 位于 scripts/，gate 源码在 src/runtime/bfds/scripts/。
    path.join(scriptDir, '..', 'src', 'runtime', 'bfds', 'scripts', 'bfds-gate.mjs')
  ];
  return candidates.find(candidate => candidate && fs.existsSync(candidate)) ?? null;
}

function designSlugFor(file) {
  const rel = projectPath(file);
  const parts = rel.split('/');
  if (parts[0] === 'docs' && parts[1] === 'design' && parts[2]) return parts[2];
  return null;
}

function runGate(slug) {
  const gateScript = findGateScript();
  if (!gateScript) return { phase: 'UNKNOWN', errors: ['missing BFDS runtime gate'] };
  const result = spawnSync(process.execPath, [gateScript, slug, '--json', '--check-only'], {
    cwd,
    encoding: 'utf8'
  });
  try {
    return JSON.parse(result.stdout || '{}');
  } catch {
    return { phase: 'UNKNOWN', errors: [result.stderr || 'failed to parse gate output'] };
  }
}

function newestInitInterview() {
  if (!fs.existsSync(DESIGN_ROOT)) return null;
  const files = [];
  for (const slug of fs.readdirSync(DESIGN_ROOT)) {
    const file = path.join(DESIGN_ROOT, slug, 'evidence', 'init-interview.json');
    if (fs.existsSync(file)) files.push(file);
  }
  return files.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] ?? null;
}

function contextFileAlreadyValid(file) {
  // 探针 slug：gate 的 resolveContext 是项目级、与 slug 无关，--check-only 不写盘。
  const probe = runGate('__bfds-context-probe__');
  const ctx = probe && probe.context;
  if (!ctx) return false;
  const target = path.resolve(cwd, file);
  const base = path.basename(file).toLowerCase();
  if (base === 'product.md') {
    return Boolean(ctx.productOk && ctx.productPath && path.resolve(cwd, ctx.productPath) === target);
  }
  if (base === 'design.md') {
    return Boolean(ctx.designOk && ctx.designPath && path.resolve(cwd, ctx.designPath) === target);
  }
  return false;
}

function assertContextWriteAllowed(file, content) {
  const exists = fs.existsSync(file);
  // 已通过 BFDS 形状校验的项目级文件不随需求重写；形状不达标的文件仍允许就地修复。
  if (exists && contextFileAlreadyValid(file)) {
    deny(`${projectPath(file)} 已存在且已通过 BFDS 形状校验：PRODUCT.md / DESIGN.md 是项目级设计规范，只在缺失或形状不达标时建立或就地修复，不随需求重写已合法文件。如需更新项目级规范请单独处理。`);
  }
  // 新建项目级文件必须先有用户确认的 init 访谈证据；就地修复已存在文件不需要。
  if (!exists && !newestInitInterview()) {
    deny(`writing ${projectPath(file)} requires docs/design/<slug>/evidence/init-interview.json with user-confirmed Impeccable init answers first`);
  }

  if (/design\.md$/i.test(path.basename(file)) && content) {
    const redFlags = DESIGN_ARCHITECTURE_HEADINGS
      .map(pattern => content.match(pattern)?.[0]?.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    if (redFlags.length > 0) {
      deny(`DESIGN.md must be a Stitch visual design-system document, not a technical architecture document. Red flags: ${redFlags.join('; ')}`);
    }
  }
}

function allowedPhaseForWrite(relFile) {
  if (relFile.endsWith('/evidence/init-interview.json')) return ['CONTEXT_BLOCKED'];
  if (relFile.endsWith('/evidence/surface.json')) return ['NEEDS_SURFACE'];
  if (relFile.endsWith('/evidence/brainstorm-dialogue.json')) return ['NEEDS_DIRECTIONS'];
  if (relFile.endsWith('/evidence/directions.json')) return ['NEEDS_DIRECTIONS'];
  if (relFile.endsWith('/workbench.html')) return ['NEEDS_WORKBENCH'];
  if (relFile.endsWith('/workbench.css')) return ['NEEDS_WORKBENCH'];
  if (relFile.endsWith('/option-a.html')) return ['NEEDS_WORKBENCH'];
  if (relFile.endsWith('/option-b.html')) return ['NEEDS_WORKBENCH'];
  if (relFile.endsWith('/option-c.html')) return ['NEEDS_WORKBENCH'];
  if (relFile.endsWith('/evidence/selection.json')) return ['NEEDS_SELECTION'];
  if (relFile.endsWith('/design-contract.json')) return ['NEEDS_CONTRACT'];
  if (relFile.endsWith('/implementation-handoff.md')) return ['NEEDS_CONTRACT'];
  if (relFile.endsWith('/qa-plan.json')) return ['NEEDS_CONTRACT'];
  if (relFile.endsWith('/qa-report.md')) return ['CONTRACT_READY', 'IMPLEMENT_READY'];
  if (relFile.endsWith('/status.json') || relFile.endsWith('/evidence/gate-log.ndjson')) return [];
  return null;
}

function assertDesignArtifactWriteAllowed(file) {
  const slug = designSlugFor(file);
  if (!slug) return;
  const relFile = projectPath(file);
  const allowed = allowedPhaseForWrite(relFile);
  if (allowed === null) return;
  if (allowed.length === 0) deny(`${relFile} is managed by BFDS scripts and must not be written manually`);

  if (relFile.endsWith('/evidence/directions.json')) {
    const brainstormFile = path.join(path.dirname(file), 'brainstorm-dialogue.json');
    if (!fs.existsSync(brainstormFile)) {
      deny(`writing ${relFile} requires ${projectPath(brainstormFile)} first`);
    }
  }

  const gate = runGate(slug);
  if (!allowed.includes(gate.phase)) {
    deny(`writing ${relFile} is only allowed during ${allowed.join(' or ')}, current gate phase is ${gate.phase}. Run bfds.mjs next and follow its next-card.`);
  }
}

function likelyProtectedBashWrite(command) {
  if (!WRITE_COMMAND_RE.test(command)) return false;
  return /(?:^|\s)(PRODUCT\.md|DESIGN\.md|docs\/design\/[^\s'"`]+|\.\.?\/docs\/design\/[^\s'"`]+)/.test(command);
}

function delegatedBfdsWriteRequest(toolInput) {
  const text = [
    toolInput.prompt,
    toolInput.description,
    toolInput.instructions,
    toolInput.task,
    toolInput.message,
    toolInput.subagent_type
  ].filter(Boolean).join('\n');
  if (!DELEGATED_PROTECTED_TARGET_RE.test(text)) return false;
  if (!DELEGATED_WRITE_INTENT_RE.test(text)) return false;
  return !(DELEGATED_READ_ONLY_INTENT_RE.test(text) && DELEGATED_NEGATED_WRITE_RE.test(text));
}

const input = parseHookInput();
const toolName = input.tool_name ?? input.toolName ?? input.tool ?? '';
const toolInput = input.tool_input ?? input.toolInput ?? input.input ?? {};

if (DELEGATED_TOOL_RE.test(toolName)) {
  if (delegatedBfdsWriteRequest(toolInput)) {
    deny('delegating BFDS artifact writing to a Task/Agent is blocked. Keep PRODUCT.md, DESIGN.md, and docs/design/** writes in the parent session with visible progress; subagents may only do read-only research.');
  }
  allow();
}

if (/^bash$/i.test(toolName)) {
  const command = toolInput.command ?? '';
  if (/\bbfds\.mjs\b/.test(command)) allow();
  if (likelyProtectedBashWrite(command)) {
    deny('write-like Bash commands targeting PRODUCT.md, DESIGN.md, or docs/design/** are blocked. Use bfds.mjs, or Write/Edit in the correct BFDS phase.');
  }
  allow();
}

if (/^(write|edit|multiedit)$/i.test(toolName)) {
  const target = toolInput.file_path ?? toolInput.path ?? toolInput.filePath;
  if (!target) allow();
  const file = path.resolve(cwd, target);
  const basename = path.basename(file);
  const content = [
    toolInput.content,
    toolInput.new_string,
    toolInput.newString
  ].filter(Boolean).join('\n');

  if (PROTECTED_CONTEXT_NAMES.has(basename)) assertContextWriteAllowed(file, content);
  assertDesignArtifactWriteAllowed(file);
}

allow();
