# Forward Test: implement without artifacts

## 用户输入

实现这个方案。

## 仓库初始状态

- 当前线程没有设计任务。
- `docs/design/` 不存在或没有任何 `contract-ready` status。
- 没有 `design-contract.json`、`implementation-handoff.md`、`qa-plan.json`。

## 期望 Skill

`bfds-implement`

## 预期读取文件

- `skills/bfds-implement/SKILL.md`
- `skills/bfds-implement/references/resume-design-artifacts.md`
- `skills/bfds-implement/scripts/bfds-status.mjs`

## 期望行为

- 读取 `resume-design-artifacts.md`。
- 扫描 `docs/design/*/status.json`。
- 明确缺少设计交付包。
- 不读聊天记忆实现，不写代码。

## 停止/继续

停止，并询问是否先回到 `bfds-design` 生成或选择设计。

## 期望产物

- 无代码改动。
- 无新实现文件。
