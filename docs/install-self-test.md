# BFDS Install Self-Test

这份自测用于在一台新电脑或一个新目标项目里确认 BFDS 可以安装并进入正确流程。

## 0. 前置条件

在 BFDS 仓库中确认：

```bash
node -v
git status --short
```

预期行为：

- Node 可用，建议 Node 24+。
- BFDS 仓库是完整拷贝，包含 `skills/`、`scripts/`、`vendor/impeccable/`。

验收标准：

- `vendor/impeccable/.agents/skills/impeccable/SKILL.md` 存在。
- `vendor/impeccable/.claude/skills/impeccable/SKILL.md` 存在。

## 1. Dry Run

进入要使用 BFDS 的目标项目根目录：

```bash
cd /path/to/target-project
node /path/to/bk-fe-design-system/scripts/install-bfds-skills.mjs codex --dry-run
node /path/to/bk-fe-design-system/scripts/install-bfds-skills.mjs claude --dry-run
```

预期行为：

- 输出 `Target project root: <当前目录>`。
- Codex dry-run 显示将复制 `bfds-design`、`bfds-implement` 和 `.agents/skills/impeccable`。
- Claude dry-run 显示将复制 `bfds-design`、`bfds-implement`、`.claude/skills/impeccable` 和 Impeccable auxiliary agent。
- 不实际写入文件。

验收标准：

- dry-run 无报错。
- 输出目标路径是当前目标项目，不是 BFDS 仓库目录。

## 2. 安装 Codex

在目标项目根目录运行：

```bash
node /path/to/bk-fe-design-system/scripts/install-bfds-skills.mjs codex
```

预期行为：

- BFDS 两个 skill 安装到 `${CODEX_HOME:-$HOME/.codex}/skills/`。
- Impeccable 安装到当前目标项目 `.agents/skills/impeccable/`。

验收标准：

```bash
test -f "${CODEX_HOME:-$HOME/.codex}/skills/bfds-design/SKILL.md"
test -f "${CODEX_HOME:-$HOME/.codex}/skills/bfds-implement/SKILL.md"
test -f .agents/skills/impeccable/SKILL.md
test -f .agents/skills/impeccable/scripts/context.mjs
```

## 3. 安装 Claude Code

在目标项目根目录运行：

```bash
node /path/to/bk-fe-design-system/scripts/install-bfds-skills.mjs claude
```

预期行为：

- BFDS 两个 skill 安装到目标项目 `.claude/skills/`。
- Impeccable 安装到目标项目 `.claude/skills/impeccable/`。
- Impeccable auxiliary agent 安装到目标项目 `.claude/agents/`。

验收标准：

```bash
test -f .claude/skills/bfds-design/SKILL.md
test -f .claude/skills/bfds-implement/SKILL.md
test -f .claude/skills/impeccable/SKILL.md
test -f .claude/skills/impeccable/scripts/context.mjs
test -f .claude/agents/impeccable-manual-edit-applier.md
```

## 4. BFDS 仓库自检

在 BFDS 仓库根目录运行：

```bash
node skills/bfds-design/scripts/bfds-context.mjs --json
node scripts/validate-artifacts.mjs fixtures/docs-design-sample/settings-prompt
node scripts/validate-artifacts.mjs --forward-tests
node scripts/validate-artifacts.mjs --pressure-tests
node skills/bfds-design/scripts/validate-artifacts.mjs fixtures/docs-design-sample/settings-prompt
node skills/bfds-design/scripts/validate-artifacts.mjs --pressure-tests
node skills/bfds-implement/scripts/validate-artifacts.mjs fixtures/docs-design-sample/settings-prompt
```

预期行为：

- 示例设计产物校验通过。
- BFDS 设计上下文脚本只报告可信上下文位置，不误用 `vendor/`、`open-sources/`、`fixtures/`。
- 前向测试结构校验通过。
- 压力测试结构校验通过。
- skill-local 脚本能在不依赖 repo-root `templates/` 的情况下校验 fixture。

验收标准：

- 所有命令退出码为 0。
- 输出包含 `Artifacts valid`、`Forward test files are structurally valid.` 和 `Pressure test files are structurally valid.`。

## 5. Skill 触发冒烟

安装后重新打开 Codex 或 Claude Code session，再在目标项目里测试。

设计正例：

```text
用 $bfds-design 基于这个 PRD 开始设计：设置页里需要一个提示词输入组件，可以保存、重置，并显示错误状态。
```

预期行为：

- 进入 BFDS Design，而不是直接写实现代码。
- 先走需求意图识别、设计上下文梳理、目标界面与变更边界确认。
- 缺 `PRODUCT.md` / `DESIGN.md` 时复用 Impeccable `init` 或要求补足设计上下文。
- 用户确认后生成 `docs/design/<slug>/workbench.html` 和三个方案。

验收标准：

- 不脑暴产品功能。
- 不实现 API、数据库、后端。
- 用户选择方案前不生成设计交付包。

实现负例：

```text
用 $bfds-implement 实现刚才那个页面。
```

在没有完整 `docs/design/<slug>/design-contract.json`、`implementation-handoff.md`、`qa-plan.json` 时，预期行为：

- 停止实现。
- 要求选择已有 BFDS 设计产物，或回到 `bfds-design` 生成设计交付包。

验收标准：

- 不凭聊天记忆写代码。
- 不绕过设计产物完整性校验。

## 6. 完整产物恢复冒烟

把 BFDS fixture 拷到目标项目：

```bash
mkdir -p docs/design
cp -R /path/to/bk-fe-design-system/fixtures/docs-design-sample/settings-prompt docs/design/
```

然后在新 session 里运行：

```text
用 $bfds-implement 继续实现 docs/design/settings-prompt。
```

预期行为：

- 从 `docs/design/settings-prompt/status.json` 恢复设计任务。
- 读取 `design-contract.json`、`implementation-handoff.md`、`qa-plan.json`。
- 按实现交接说明扫描目标项目代码，再决定实现入口。
- 验收阶段尝试 Impeccable 反模式扫描；入口不可用时记录未运行，不写成通过。

验收标准：

- 先读设计产物，再动代码。
- 缺目标项目页面或无法截图时停止或记录阻塞。
- 验收报告覆盖字体、间距、颜色、资产、状态、交互、响应式、可访问性。

## 7. 通过标准

自测通过需要同时满足：

- 安装脚本默认目标是当前目录。
- Codex 和 Claude Code 的 Impeccable 都安装到各自宿主路径，不嵌进 BFDS skill 内部。
- BFDS 设计产物和前向测试校验通过。
- `bfds-design` 只补齐设计，不做产品规划或工程实现。
- `bfds-implement` 缺设计交付包时硬停止。
- 有完整设计交付包时，能从 `status.json` 恢复并按实现交接说明进入实现和验收。
- `bfds-design` 压力测试场景下不会误用第三方设计上下文、不会跳过三方向设计规格、不会越过评审工作台/设计交付包门禁。
