# BK FE Design System (BFDS)

BFDS 是一个面向前端代码生成的设计规范执行层（Design System Execution Layer）。

它不负责重新做产品方案、架构取舍、后端接口或数据模型；它负责在产品方案、PRD、OpenSpec、原型、截图、Figma、URL 或现有页面大致明确后，把 `DESIGN.md`、需求和代码现状转化为可实现的设计决策，并驱动代码 agent 生码、自审和局部微调：

- 设计规范建模：用 Impeccable `init` 建立 `PRODUCT.md` 和 `DESIGN.md`；其中 `DESIGN.md` 是唯一设计规范事实源。
- 目标界面与变更边界确认：明确当前目标界面、现状来源、本次新增/修改/删除/替换/局部设计范围。
- 设计方向探索：先做苏格拉底式设计问答和方向取舍确认，再产出 A/B/C 可实现方向规格；不脑暴产品能力。
- 轻量方案评审工作台：生成 `docs/design/<slug>/workbench.html`，用 Kami 风格外壳承载方案卡、局部示意和实现约束摘要。
- 设计交付包：用户选择方向后，生成 `design-contract.json`、`implementation-handoff.md`、`qa-plan.json`、`status.json`。
- 规范驱动实现与自审：由 `bfds-implement` 消费设计交付包和 `DESIGN.md`，实现代码并进行代码层设计自审；标记 `implemented` 时必须写入 `evidence/implementation-self-review.json`。
- 运行态检查与局部实时微调：复用 Impeccable `detect`、`critique`、`live` 做还原检查和局部调整。

设计稿是中间校准物，用来让用户理解后续生码方向；最终高保真以真实代码、运行页面、自审和局部微调闭环为准。MVP 采用静态 HTML 工作台，用户在 Codex / Claude Code 对话里确认选择；事件记录 server 放到后续版本。

详见 [MVP 方案](docs/bfds-mvp-design-spec.md)。

## Skills

BFDS MVP 由两个 skill 组成：

- `skills/bfds-design/SKILL.md`：当用户明确要求从 PRD、原型、截图、Figma、URL、现有页面或组件开始前端设计时使用。它负责需求意图识别、设计规范建模、目标界面与变更边界确认、设计方向探索、轻量方案评审工作台和设计交付包。
- `skills/bfds-implement/SKILL.md`：当用户要求实现已经确认的 BFDS 设计方案时使用。它从 `docs/design/<slug>/status.json` 恢复，读取 `DESIGN.md`、`design-contract.json`、`implementation-handoff.md`、`qa-plan.json`，按设计规范和实现约束生码、自审并运行验收。`mark --state implemented` 必须带 `--field selfReviewNote="..."`。

不触发 BFDS 的请求包括：API 实现、数据库 migration、后端权限、普通 bug 修复、纯代码重构、算法实现，以及没有 BFDS 设计交付包的“凭记忆实现”。

## Install Skills

BFDS 仓库已经内置 Impeccable。安装时不要把 `vendor/impeccable/.agents` 嵌到 BFDS skill 内部，而是把 Impeccable 安装成目标项目的同级宿主 skill。原因是 Impeccable 自己的 reference 和脚本命令依赖宿主路径：

- Codex / agents：`<target-project>/.agents/skills/impeccable/`
- Claude Code：`<target-project>/.claude/skills/impeccable/`

推荐用安装脚本：

```bash
cd /path/to/target-project
node /path/to/bk-fe-design-system/scripts/install-bfds-skills.mjs codex
node /path/to/bk-fe-design-system/scripts/install-bfds-skills.mjs claude
```

`--target /path/to/target-project` 仍可用于从别的目录安装；不传时默认安装到当前所在目录。

Codex 模式会把 BFDS 两个 skill 复制到 `${CODEX_HOME:-$HOME/.codex}/skills/`，并把内置 Impeccable 复制到目标项目的 `.agents/skills/impeccable/`。

Claude Code 模式会把 BFDS 两个 skill 和内置 Impeccable 都复制到目标项目的 `.claude/skills/`，并复制 Impeccable 的 `.claude/agents/` 辅助 agent。
同时会复制 BFDS 写入防火墙脚本和 SessionStart 上下文脚本到 `.claude/hooks/`。在 Claude Code settings 中把它们挂到 `PreToolUse` 和 `SessionStart`：

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup|clear|compact",
        "hooks": [
          { "type": "command", "command": "node .claude/hooks/bfds-session-start.mjs", "timeout": 15 }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [{ "type": "command", "command": "node .claude/hooks/bfds-guard-hook.mjs" }]
      },
      {
        "matcher": "Bash",
        "hooks": [{ "type": "command", "command": "node .claude/hooks/bfds-guard-hook.mjs" }]
      },
      {
        "matcher": "Task|Agent",
        "hooks": [{ "type": "command", "command": "node .claude/hooks/bfds-guard-hook.mjs" }]
      }
    ]
  }
}
```

手动安装 Codex 时，执行：

```bash
TARGET="$(pwd)"
BFDS=/path/to/bk-fe-design-system
mkdir -p "${CODEX_HOME:-$HOME/.codex}/skills" "$TARGET/.agents/skills"
cp -R "$BFDS/skills/bfds-design" "${CODEX_HOME:-$HOME/.codex}/skills/"
cp -R "$BFDS/skills/bfds-implement" "${CODEX_HOME:-$HOME/.codex}/skills/"
mkdir -p "${CODEX_HOME:-$HOME/.codex}/skills/bfds-design/runtime" "${CODEX_HOME:-$HOME/.codex}/skills/bfds-implement/runtime"
cp -R "$BFDS/src/runtime/bfds" "${CODEX_HOME:-$HOME/.codex}/skills/bfds-design/runtime/"
cp -R "$BFDS/src/runtime/bfds" "${CODEX_HOME:-$HOME/.codex}/skills/bfds-implement/runtime/"
cp -R "$BFDS/vendor/impeccable/.agents/skills/impeccable" "$TARGET/.agents/skills/"
```

手动安装 Claude Code 时，执行：

```bash
TARGET="$(pwd)"
BFDS=/path/to/bk-fe-design-system
mkdir -p "$TARGET/.claude/skills" "$TARGET/.claude/agents"
cp -R "$BFDS/skills/bfds-design" "$TARGET/.claude/skills/"
cp -R "$BFDS/skills/bfds-implement" "$TARGET/.claude/skills/"
mkdir -p "$TARGET/.claude/skills/bfds-design/runtime" "$TARGET/.claude/skills/bfds-implement/runtime"
cp -R "$BFDS/src/runtime/bfds" "$TARGET/.claude/skills/bfds-design/runtime/"
cp -R "$BFDS/src/runtime/bfds" "$TARGET/.claude/skills/bfds-implement/runtime/"
cp -R "$BFDS/vendor/impeccable/.claude/skills/impeccable" "$TARGET/.claude/skills/"
cp -R "$BFDS/vendor/impeccable/.claude/agents/"* "$TARGET/.claude/agents/"
mkdir -p "$TARGET/.claude/hooks"
cp "$BFDS/scripts/bfds-guard-hook.mjs" "$TARGET/.claude/hooks/"
cp "$BFDS/scripts/bfds-session-start.mjs" "$TARGET/.claude/hooks/"
```

安装脚本会把 BFDS runtime、schema、模板和辅助脚本注入两个 BFDS skill；仓库内只保留一份 runtime 源码：`src/runtime/bfds/`。安装后不要求保留本仓库的 `src/` 或 `scripts/`。Impeccable 由本仓库 `vendor/impeccable/` 提供安装源；如果目标项目缺少对应宿主路径，BFDS 会在需要 `init`、`detect` 或 `live` 时停止并要求安装，不会伪造结果。

## 设计产物目录

设计需求级产物写入：

```text
docs/design/<slug>/
  evidence/
    init-interview.json
    surface.json
    brainstorm-dialogue.json
    directions.json
    selection.json
    implementation-self-review.json
    gate-log.ndjson
  workbench.html
  workbench.css
  option-a.html
  option-b.html
  option-c.html
  design-contract.json
  implementation-handoff.md
  qa-plan.json
  status.json
```

关键约束：

- `directions.json.options[].codeReuseHypothesis` 中出现源码路径时，路径必须是当前目标仓库真实存在的 repo-relative path；找不到源码证据时写“暂无可验证源码复用证据”，不要编造路径或组件名。
- `implementation-self-review.json` 由 `bfds.mjs mark <slug> --state implemented --field selfReviewNote="..."` 写入，用于记录实现完成前对 `implementationConstraints.selfReviewChecks` 的代码层设计自审结论。
- `qa-report.md` 必须为 `qa-plan.json.checks[].id` 的每个 check 提供独立 `## Check <id>` 区块，并包含非空 `Result:` 和 `Evidence:`；未运行写 `Result: not-run` 和未运行原因，不能只粘贴 check ID。

MVP runtime、模板和 schema 位于：

```text
src/runtime/bfds/schemas/
src/runtime/bfds/templates/kami-workbench/
```

完整样例位于：

```text
fixtures/docs-design-sample/settings-prompt/
```

## Impeccable Boundary

`vendor/impeccable/` 是本地 upstream-compatible 拷贝，不放 BFDS 定制逻辑。BFDS 适配说明在 `src/adapters/impeccable/` 和两个 skill 的 references 中。

本地已确认：

- Impeccable CLI 支持 `detect` 和 `skills`。
- Impeccable skill reference 包含 `init`、`document`、`critique`、`live`。
- BFDS 优先复用 `init` 建立 `PRODUCT.md` 和 `DESIGN.md`。
- `detect` 可作为验收阶段的确定性反模式扫描入口；如果依赖或入口不可验证，必须记录未运行，不能假装通过。

## Scripts

```bash
node scripts/install-bfds-skills.mjs codex --dry-run
node scripts/install-bfds-skills.mjs claude --dry-run
node scripts/bfds.mjs next settings-prompt
node scripts/bfds.mjs list --json --root fixtures/docs-design-sample
node scripts/bfds.mjs validate fixtures/docs-design-sample/settings-prompt
node scripts/bfds.mjs validate --forward-tests
node scripts/bfds.mjs validate --pressure-tests
node scripts/bfds.mjs validate --gate-tests
```

脚本只做确定性辅助：扫描状态、从磁盘证据裁决 next-card 阶段、校验设计产物结构、校验前向测试和压力测试文件结构。核心设计判断仍由 BFDS skill references 和用户确认完成。

## Validation

安装和冒烟自测见 [BFDS Install Self-Test](docs/install-self-test.md)。

推荐验证顺序：

1. skill frontmatter 校验：`python3 /Users/loomisli/.codex/skills/.system/skill-creator/scripts/quick_validate.py skills/bfds-design` 和 `skills/bfds-implement`。
2. 示例设计产物校验：`node scripts/bfds.mjs validate fixtures/docs-design-sample/settings-prompt`。
3. 前向测试结构校验：`node scripts/bfds.mjs validate --forward-tests`。
4. 压力测试结构校验：`node scripts/bfds.mjs validate --pressure-tests`。
5. 阶段状态机校验：`node scripts/bfds.mjs validate --gate-tests`。
6. 人工走读 `tests/forward/`，并按 `tests/pressure/RUNBOOK.md` 做新会话 agent 压力测试，确认开始设计、上下文陷阱、拒绝继续追问、用户选择、缺设计产物实现、新会话恢复、多设计任务恢复和负例行为都符合规格。
