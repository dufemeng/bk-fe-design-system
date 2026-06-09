# Resume Design Artifacts

`bfds-implement` 的第一步永远是恢复 slug 和 contract pack。没有完整 artifacts，不写代码。

## 恢复顺序

1. 如果用户显式给出 `docs/design/<slug>` 或 `<slug>`，先读取该目录。
2. 如果当前线程刚生成 `contract-ready`，使用当前 slug，但仍必须读文件确认。
3. 否则运行 `node <bfds-implement-skill-dir>/scripts/bfds-status.mjs --json` 扫描 `docs/design/*/status.json`。
4. 如果当前仓库有 repo-root 脚本，也可以运行 `node scripts/bfds-status.mjs --json`。
5. 脚本不可用时，人工列出并读取 `docs/design/*/status.json`。

## Artifact Gate

目标目录必须同时存在：

- `design-contract.json`
- `implementation-handoff.md`
- `qa-plan.json`
- `status.json`

并且：

- `status.json.state` 应为 `contract-ready`、`implementing`、`implemented`、`qa-failed`、`qa-passed`、`live-iterating` 或 `done`。
- `design-contract.json.slug` 与目录 slug 一致。
- `qa-plan.json.slug` 与目录 slug 一致。
- `status.json.artifacts` 指向的路径存在。

任一失败都停止，说明缺什么，并引导回 `bfds-design` 固化 contract pack。

## 单 slug 恢复

如果新 session 只有一个可实现 slug，先回放摘要并要求确认：

```text
我找到一个可实现的 BFDS 设计：
Slug: settings-prompt
Title: Settings Prompt Input Redesign
Selected: B with A navigation
Surface: /settings prompt 输入组件
Last updated: 2026-06-09T12:00:00.000Z

确认用这个 design contract 实现吗？
```

用户确认后再读代码和实现。

## 多 slug 恢复

如果有多个可实现 slug，只列最近 2-5 个：

```text
找到多个 BFDS 设计，请指定要实现哪个：
1. settings-prompt, contract-ready, selected B, updated 2026-06-09T12:00:00.000Z
2. onboarding-empty-state, qa-failed, selected A+C, updated 2026-06-08T18:30:00.000Z
```

不要默认选择最近一个。

## 无 artifact 请求实现

用户说“实现这个方案”但没有 contract pack 时：

- 不读取聊天记忆实现。
- 不根据 workbench HTML 猜实现。
- 不把 `status.state = workbench-ready` 当成可实现。
- 回复缺少 contract pack，并询问是否回到 `bfds-design` 选择/固化方案。

## 负例

以下请求不进入 BFDS implement：

- “实现这个 API 方案。”
- “修数据库 migration。”
- “这个组件报错，帮我 debug。”
- “重构数据层。”

如果用户明确同时提到 BFDS slug 和普通工程任务，先确认是否是在实现该 BFDS 设计合同。
