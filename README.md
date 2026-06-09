# BK FE Design System (BFDS)

BFDS 是一个面向前端需求生命周期的 Design Completion Layer。

它不负责重新做产品方案、架构取舍、后端接口或数据模型；它负责在产品方案、PRD、OpenSpec、原型、截图、Figma、URL 或现有页面大致明确后，补齐设计这块拼图：

- 设计上下文：用 Impeccable `init` 建立 `PRODUCT.md` 和 `DESIGN.md`。
- 设计范围确认：明确当前 surface、现状来源、本次新增/修改/删除/替换/局部设计范围。
- 设计脑暴：只脑暴设计稿，不脑暴产品能力。
- 三方案工作台：生成 `docs/design/<slug>/workbench.html`，用 Kami 风格外壳承载三个 iframe 交互模拟器。
- 设计契约：用户选择方案后，生成 `design-contract.json`、`implementation-handoff.md`、`qa-plan.json`、`status.json`。
- 实现与还原检查：由 `bfds-implement` 消费设计产物，实现代码并运行设计还原检查。
- 局部微调：复用 Impeccable `live` 做选区、注释、对话微调。

MVP 采用静态 HTML 工作台，用户在 Codex / Claude Code 对话里确认选择；事件记录 server 放到后续版本。

详见 [MVP 方案](docs/bfds-mvp-design-spec.md)。

## Skills

BFDS MVP 由两个 skill 组成：

- `skills/bfds-design/SKILL.md`：当用户明确要求从 PRD、原型、截图、Figma、URL、现有页面或组件开始前端设计时使用。它负责 Intent Router、Design Context、Surface Change Framing、Design Brainstorm、Static Kami Workbench 和 contract pack。
- `skills/bfds-implement/SKILL.md`：当用户要求实现已经确认的 BFDS 设计方案时使用。它从 `docs/design/<slug>/status.json` 恢复，读取 `design-contract.json`、`implementation-handoff.md`、`qa-plan.json`，按 handoff 实现并运行 QA。

不触发 BFDS 的请求包括：API 实现、数据库 migration、后端权限、普通 bug 修复、纯代码重构、算法实现，以及没有 BFDS contract pack 的“凭记忆实现”。

## Artifact Layout

设计需求级产物写入：

```text
docs/design/<slug>/
  workbench.html
  option-a.html
  option-b.html
  option-c.html
  design-contract.json
  implementation-handoff.md
  qa-plan.json
  status.json
```

MVP 模板和 schema 位于：

```text
templates/artifacts/
templates/kami-workbench/
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
- `detect` 可作为 QA 的确定性 anti-pattern 检查入口；如果依赖或入口不可验证，必须记录未运行，不能假装通过。

## Scripts

```bash
node scripts/bfds-status.mjs
node scripts/bfds-status.mjs --json --root fixtures/docs-design-sample
node scripts/validate-artifacts.mjs fixtures/docs-design-sample/settings-prompt
node scripts/validate-artifacts.mjs --forward-tests
```

脚本只做确定性辅助：扫描状态、校验 artifact 结构、校验 forward test 文件结构。核心设计判断仍由 BFDS skill 协议和用户确认完成。

## Validation

推荐验证顺序：

1. skill frontmatter 校验：`python3 /Users/loomisli/.codex/skills/.system/skill-creator/scripts/quick_validate.py skills/bfds-design` 和 `skills/bfds-implement`。
2. artifact fixture 校验：`node scripts/validate-artifacts.mjs fixtures/docs-design-sample/settings-prompt`。
3. forward tests 结构校验：`node scripts/validate-artifacts.mjs --forward-tests`。
4. 人工走读 `tests/forward/`，确认开始设计、现有 surface 改造、用户选择、缺 artifact 实现、新 session 恢复、多 slug 恢复和负例行为都符合 spec。
