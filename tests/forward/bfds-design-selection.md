# Forward Test: user selects design

## 用户输入

选 B，但导航用 A 的，错误态用 C 的。

## 仓库初始状态

- 当前线程或用户指定 slug 存在 `docs/design/settings-prompt/workbench.html`。
- 存在 `option-a.html`、`option-b.html`、`option-c.html`。
- `status.json.state` 为 `workbench-ready` 或当前线程明确该 slug。

## 期望 Skill

`bfds-design`

## 期望行为

- 读取 `intent-router.md` 和 `contract-pack.md`。
- 将选择固化为 B+A+C，不把聊天记忆当实现依据。
- 写入 design contract pack。

## 停止/继续

继续到 contract pack 生成；生成后停止，等待用户要求实现。

## 期望产物

- `docs/design/settings-prompt/design-contract.json`
- `docs/design/settings-prompt/implementation-handoff.md`
- `docs/design/settings-prompt/qa-plan.json`
- `docs/design/settings-prompt/status.json`，state 为 `contract-ready`
