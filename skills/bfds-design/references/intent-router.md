# Intent Router

Intent Router 是 BFDS skill 的开场步骤，不是独立 skill。它先判断用户意图，再决定继续设计、恢复设计、固化选择、进入 live，或退回上游。

## 输入信号

按顺序读取：

1. 用户当前输入。
2. 当前线程是否刚创建 workbench、刚选择 option、或已明确 slug。
3. `docs/design/*/status.json`，可用 `node <bfds-design-skill-dir>/scripts/bfds-status.mjs --json` 辅助扫描。
4. 用户是否指定 `docs/design/<slug>`。
5. 当前仓库是否有 `PRODUCT.md`、`DESIGN.md`。

如果当前仓库有 repo-root 脚本，也可以运行 `node scripts/bfds-status.mjs --json`。脚本失败时，人工 fallback：用文件工具列出 `docs/design/*/status.json`，读取最近更新的 2-5 个。

## 决策矩阵

| 用户输入类型 | 当前线程有 slug | 仓库 contract-ready slug | 指定 docs/design/<slug> | 行为 |
|---|---:|---:|---:|---|
| “这是 PRD，开始设计” | 任意 | 任意 | 否 | 开始新设计，进入 Design Context |
| “继续刚才的设计” | 是 | 任意 | 否 | 恢复当前 slug，回放状态摘要 |
| “继续刚才的设计” | 否 | 1 个或多个 | 否 | 列最近 2-5 个让用户选，不猜 |
| “基于这个原型出三个方案” | 任意 | 任意 | 否 | 新设计或当前 slug 的新 workbench，先做 Surface Change Framing |
| “选 B”或“选 B 合并 A/C” | 是 | 任意 | 否 | 固化选择，生成 contract pack |
| “选 B”或“选 B 合并 A/C” | 否 | 任意 | 是 | 读取该 slug workbench/status，确认后固化选择 |
| “选 B”或“选 B 合并 A/C” | 否 | 任意 | 否 | 要求用户指定 slug 或选择 workbench |
| “实现这个方案” | 是 | 任意 | 否 | 如果 contract-ready，交给 bfds-implement；否则先固化 contract |
| “实现这个方案” | 否 | 0 个 | 否 | 不写代码，引导先生成/选择设计 |
| “实现这个方案” | 否 | 1 个 | 否 | 回放摘要，请用户确认后交给 bfds-implement |
| “实现这个方案” | 否 | 多个 | 否 | 列最近 2-5 个让用户选择 |
| “跑设计还原检查” | 任意 | 任意 | 可选 | 交给 bfds-implement QA 子流程 |
| “这个区域再紧凑一点” | 是 | 任意 | 否 | 判断是否是 live 微调；读 Impeccable live reference |
| API、数据库、权限、算法、普通 debug、重构 | 任意 | 任意 | 任意 | 停止，说明不是 BFDS 设计范围 |

## 恢复状态

`status.json.state` 的可用状态：

- `draft`
- `workbench-ready`
- `selected`
- `contract-ready`
- `implementing`
- `implemented`
- `qa-failed`
- `qa-passed`
- `live-iterating`
- `done`

Design skill 可继续的状态：

- `draft`：继续 surface/context。
- `workbench-ready`：等待用户选择或要求重做方案。
- `selected`：如果 contract pack 未写，生成 contract pack。
- `contract-ready` 及之后：设计侧只做摘要、变更或 live，不重复生成合同。

## 输出要求

恢复 slug 时，先给一段短摘要：

```text
找到 BFDS 设计：
Slug: settings-prompt
Title: Settings Prompt Input Redesign
State: contract-ready
Selected: B with A navigation
Surface: /settings prompt 输入组件
Last updated: 2026-06-09T12:00:00.000Z
```

多 slug 时只列最近 2-5 个，包含 title、state、lastUpdated、selectedOption、currentSurface。

## 停止而不是猜

- 新 session 没上下文且没有可用 `status.json`：要求先生成设计 workbench。
- 当前线程刚选择方案但 contract pack 缺失：先执行 contract pack，不写实现代码。
- 现有 surface 缺视觉证据：进入 Surface Evidence Checklist，不生成 workbench。
