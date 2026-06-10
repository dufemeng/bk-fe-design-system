---
name: bfds-implement
description: 当用户要求实现已经确认的 BFDS 设计方案时使用；也用于按 docs/design/<slug> 实现交接说明继续实现、从 status.json 恢复 BFDS 设计任务、运行 BFDS 设计还原检查或验收、以及实现后进入局部实时微调。该技能必须读取 design-contract.json、implementation-handoff.md 和 qa-plan.json；缺少已确认 BFDS 设计产物时不要凭记忆实现，应先引导用户选择已有设计产物或回到 bfds-design。不要用于 API、数据库、后端权限、算法、普通 bug 修复或纯重构。
---

# BFDS Implement

BFDS Implement 只实现已经固化为设计交付包的 BFDS 设计方案。实现依据来自 `docs/design/<slug>/`，不是聊天记忆。

## 开场习惯

Claude Code 中，选择和确认类用户输入必须用 `AskUserQuestion`。

1. 如果用户没有指定 `<slug>`，运行 `node <bfds-implement-skill-dir>/scripts/bfds-status.mjs --json --limit 4`，用 `AskUserQuestion` 让用户单选；候选超过 4 个时先要求用户提供更具体的 `<slug>`、页面或关键词。
2. 对目标设计任务运行：

```bash
node <bfds-implement-skill-dir>/scripts/bfds-gate.mjs <slug>
```

只有 `CONTRACT_READY` 或 `IMPLEMENT_READY` 可以继续实现、验收或 live。`CONTEXT_BLOCKED`、`INCONSISTENT` 或缺设计交付包时停止。

状态写回也用 gate：

```bash
node <bfds-implement-skill-dir>/scripts/bfds-gate.mjs <slug> --mark implementing
node <bfds-implement-skill-dir>/scripts/bfds-gate.mjs <slug> --mark implemented
node <bfds-implement-skill-dir>/scripts/bfds-gate.mjs <slug> --mark qa-passed
```

`qa-failed`、`qa-passed`、`done` 需要 `qa-report.md` 已存在。

## 阶段入口

- 实现代码：读 [implementation-protocol.md](references/implementation-protocol.md) 和 [visual-fidelity-discipline.md](references/visual-fidelity-discipline.md)。
- 设计还原检查：读 [qa-protocol.md](references/qa-protocol.md)。
- 局部实时微调：读 [live-region-iteration.md](references/live-region-iteration.md) 和 [impeccable-integration.md](references/impeccable-integration.md)。

## 不触发

- “实现这个 API 方案。”
- “实现这个算法。”
- “修后端权限。”
- “重构数据层。”
