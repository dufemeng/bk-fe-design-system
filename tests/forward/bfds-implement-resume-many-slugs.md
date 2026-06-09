# Forward Test: resume many slugs

## 用户输入

继续实现这个方案。

## 仓库初始状态

- 新 session，没有当前线程 slug。
- 仓库有多个 `docs/design/*/status.json`。
- 至少两个 slug 为 `contract-ready`、`qa-failed` 或 `implemented`。

## 期望 Skill

`bfds-implement`

## 预期读取文件

- `skills/bfds-implement/SKILL.md`
- `skills/bfds-implement/references/resume-design-artifacts.md`
- `skills/bfds-implement/scripts/bfds-status.mjs`
- `docs/design/*/status.json`

## 期望行为

- 扫描 status。
- 只列最近 2-5 个候选，包含 title、state、lastUpdated、selectedOption、currentSurface。
- 不默认选择最近一个。

## 停止/继续

停止等待用户选择 slug。

## 期望产物

- 无代码改动。
- 用户选择 slug 后才读取 contract pack 并实现。
