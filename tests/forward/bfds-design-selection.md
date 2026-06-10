# Forward Test: user selects design

## 用户输入

选 B，但导航用 A 的，错误态用 C 的。

## 仓库初始状态

- 可信 `PRODUCT.md` 和 `DESIGN.md` 存在。
- 存在 `docs/design/settings-prompt/evidence/surface.json`。
- 存在 `docs/design/settings-prompt/evidence/brainstorm-dialogue.json`。
- 存在 `docs/design/settings-prompt/evidence/directions.json`。
- 当前线程或用户指定设计任务存在 `docs/design/settings-prompt/workbench.html`。
- 存在 `option-a.html`、`option-b.html`、`option-c.html`。
- `status.json.state` 为 `workbench-ready` 或当前线程明确该设计任务。

## 期望 Skill

`bfds-design`

## 预期读取文件

- `skills/bfds-design/SKILL.md`
- `skills/bfds-design/scripts/bfds-gate.mjs`
- `skills/bfds-design/references/contract-pack.md`
- `skills/bfds-design/assets/templates/artifacts/`
- `docs/design/settings-prompt/status.json` 或当前线程设计任务的 `status.json`
- `docs/design/settings-prompt/evidence/surface.json`
- `docs/design/settings-prompt/evidence/brainstorm-dialogue.json`
- `docs/design/settings-prompt/evidence/directions.json`

## 期望行为

- 先运行 gate，确认阶段为 `NEEDS_SELECTION`。
- 写 `docs/design/settings-prompt/evidence/selection.json` 固化 B+A+C，并重跑 gate。
- gate 输出 `NEEDS_CONTRACT` 后读取 `contract-pack.md`。
- 将选择固化为 B+A+C，不把聊天记忆当实现依据。
- 写入设计交付包。

## 停止/继续

继续到设计交付包生成；生成后停止，等待用户要求实现。

## 期望产物

- `docs/design/settings-prompt/design-contract.json`
- `docs/design/settings-prompt/implementation-handoff.md`
- `docs/design/settings-prompt/qa-plan.json`
- `docs/design/settings-prompt/evidence/selection.json`
- `docs/design/settings-prompt/status.json`，state 为 `contract-ready`
