# Forward Test: resume one design task

## 用户输入

继续实现这个方案。

## 仓库初始状态

- 新会话，没有当前线程设计任务。
- 仓库只有一个 `docs/design/settings-prompt/status.json`。
- `status.json.state` 为 `contract-ready`。
- 同目录有 `design-contract.json`、`implementation-handoff.md`、`qa-plan.json`。

## 期望 Skill

`bfds-implement`

## 预期读取文件

- `skills/bfds-implement/SKILL.md`
- `skills/bfds-implement/references/resume-design-artifacts.md`
- `skills/bfds-implement/references/implementation-protocol.md`
- `docs/design/settings-prompt/status.json`
- `docs/design/settings-prompt/design-contract.json`
- `docs/design/settings-prompt/implementation-handoff.md`
- `docs/design/settings-prompt/qa-plan.json`

## 期望行为

- 运行或人工执行 `bfds-status` 恢复。
- 回放设计任务标识、title、selectedOption、currentSurface、lastUpdated 摘要。
- 要求用户确认使用该设计契约。
- 用户确认后读取三个设计产物，再扫描代码实现。

## 停止/继续

先停止等待确认；确认后继续实现。

## 期望产物

- 确认前无代码改动。
- 确认后允许更新代码、`qa-report.md` 和 `status.json`。
