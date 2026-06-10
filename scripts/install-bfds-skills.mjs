#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function usage() {
  console.log(`Usage:
  node scripts/install-bfds-skills.mjs codex [--target <project-root>] [--codex-skills-dir <dir>] [--dry-run]
  node scripts/install-bfds-skills.mjs claude [--target <project-root>] [--dry-run]

Installs BFDS skills plus the vendored Impeccable host-native skill bundle.
When --target is omitted, the target project root is the current working directory.
`);
}

function parseArgs(argv) {
  const args = { mode: argv[2], target: null, codexSkillsDir: null, dryRun: false };

  for (let i = 3; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--target') {
      args.target = argv[i + 1];
      i += 1;
    } else if (arg === '--codex-skills-dir') {
      args.codexSkillsDir = argv[i + 1];
      i += 1;
    } else if (arg === '--dry-run') {
      args.dryRun = true;
    } else if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

function assertDir(dir, label) {
  if (!dir || !fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    throw new Error(`${label} does not exist or is not a directory: ${dir}`);
  }
}

function defaultCodexSkillsDir() {
  const home = os.homedir();
  if (process.env.CODEX_HOME) {
    return path.join(process.env.CODEX_HOME, 'skills');
  }
  return path.join(home, '.codex', 'skills');
}

function copyDir(src, dest, dryRun) {
  assertDir(src, 'Source directory');
  copyPath(src, dest, dryRun);
}

function noteRuntime(skillDir, dryRun) {
  const runtimeDir = path.join(skillDir, 'runtime', 'bfds');
  const runtimeCli = path.join(runtimeDir, 'cli.mjs');
  if (!dryRun && !fs.existsSync(runtimeCli)) {
    throw new Error(`BFDS runtime is missing from skill: ${runtimeCli}`);
  }
  console.log(`${dryRun ? '[dry-run] ' : ''}runtime included ${runtimeDir}`);
}

function copyPath(src, dest, dryRun) {
  if (!fs.existsSync(src)) {
    throw new Error(`Source path does not exist: ${src}`);
  }

  console.log(`${dryRun ? '[dry-run] ' : ''}copy ${src} -> ${dest}`);

  if (dryRun) {
    return;
  }

  const stat = fs.statSync(src);
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(dest), { recursive: true });

  if (stat.isDirectory()) {
    fs.cpSync(src, dest, { recursive: true, force: true });
  } else {
    fs.copyFileSync(src, dest);
  }
}

function copyRuntimeInto(skillDest, dryRun) {
  const runtimeSource = path.join(repoRoot, 'src', 'runtime', 'bfds');
  const runtimeDest = path.join(skillDest, 'runtime', 'bfds');
  copyDir(runtimeSource, runtimeDest, dryRun);
}

function resetDir(dest, dryRun) {
  console.log(`${dryRun ? '[dry-run] ' : ''}reset ${dest}`);
  if (dryRun) return;
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });
}

function copyBfdsSkill(skillName, dest, dryRun) {
  const source = path.join(repoRoot, 'skills', skillName);
  resetDir(dest, dryRun);
  copyPath(path.join(source, 'SKILL.md'), path.join(dest, 'SKILL.md'), dryRun);
  copyDir(path.join(source, 'agents'), path.join(dest, 'agents'), dryRun);
  copyDir(path.join(source, 'references'), path.join(dest, 'references'), dryRun);
  copyDir(path.join(source, 'scripts'), path.join(dest, 'scripts'), dryRun);
  copyRuntimeInto(dest, dryRun);
  noteRuntime(dest, dryRun);
}

function copyDirContents(srcDir, destDir, dryRun) {
  assertDir(srcDir, 'Source directory');

  for (const entry of fs.readdirSync(srcDir)) {
    copyPath(path.join(srcDir, entry), path.join(destDir, entry), dryRun);
  }
}

function installCodex(targetRoot, codexSkillsDir, dryRun) {
  const impeccableAgents = path.join(repoRoot, 'vendor', 'impeccable', '.agents', 'skills', 'impeccable');

  copyBfdsSkill('bfds-design', path.join(codexSkillsDir, 'bfds-design'), dryRun);
  copyBfdsSkill('bfds-implement', path.join(codexSkillsDir, 'bfds-implement'), dryRun);
  copyDir(impeccableAgents, path.join(targetRoot, '.agents', 'skills', 'impeccable'), dryRun);
}

function installClaude(targetRoot, dryRun) {
  const impeccableClaude = path.join(repoRoot, 'vendor', 'impeccable', '.claude', 'skills', 'impeccable');
  const impeccableClaudeAgents = path.join(repoRoot, 'vendor', 'impeccable', '.claude', 'agents');
  const bfdsGuardHook = path.join(repoRoot, 'scripts', 'bfds-guard-hook.mjs');
  const bfdsSessionStartHook = path.join(repoRoot, 'scripts', 'bfds-session-start.mjs');

  copyBfdsSkill('bfds-design', path.join(targetRoot, '.claude', 'skills', 'bfds-design'), dryRun);
  copyBfdsSkill('bfds-implement', path.join(targetRoot, '.claude', 'skills', 'bfds-implement'), dryRun);
  copyDir(impeccableClaude, path.join(targetRoot, '.claude', 'skills', 'impeccable'), dryRun);
  copyDirContents(impeccableClaudeAgents, path.join(targetRoot, '.claude', 'agents'), dryRun);
  copyPath(bfdsGuardHook, path.join(targetRoot, '.claude', 'hooks', 'bfds-guard-hook.mjs'), dryRun);
  copyPath(bfdsSessionStartHook, path.join(targetRoot, '.claude', 'hooks', 'bfds-session-start.mjs'), dryRun);
}

try {
  const args = parseArgs(process.argv);

  if (args.help || !args.mode) {
    usage();
    process.exit(args.help ? 0 : 1);
  }

  if (args.mode !== 'codex' && args.mode !== 'claude') {
    throw new Error(`Mode must be "codex" or "claude", got: ${args.mode}`);
  }

  const targetRoot = path.resolve(args.target || process.cwd());
  assertDir(targetRoot, 'Target project root');
  console.log(`Target project root: ${targetRoot}`);

  if (args.mode === 'codex') {
    const codexSkillsDir = path.resolve(args.codexSkillsDir || defaultCodexSkillsDir());
    installCodex(targetRoot, codexSkillsDir, args.dryRun);
  } else {
    installClaude(targetRoot, args.dryRun);
  }

  console.log('BFDS skill install plan completed.');
} catch (error) {
  console.error(error.message);
  usage();
  process.exit(1);
}
