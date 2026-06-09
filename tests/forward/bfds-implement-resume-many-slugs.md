# Forward Test: resume many design tasks

## 用户输入

继续实现这个方案。

## 仓库初始状态

- 新会话，没有当前线程设计任务。
- 仓库有多个 `docs/design/*/status.json`。
- 至少两个设计任务为 `contract-ready`、`qa-failed` 或 `implemented`。

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

停止等待用户选择设计任务。

## 期望产物

- 无代码改动。
- 用户选择设计任务后才读取设计交付包并实现。
