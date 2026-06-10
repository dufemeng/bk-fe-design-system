#!/usr/bin/env node

const bootstrap = `
<EXTREMELY_IMPORTANT>
当前仓库启用了 BFDS 护栏。

处理 BFDS 设计请求时：
- 使用 bfds-design skill，并在写任何 BFDS 产物前运行 bfds-gate.mjs <slug>。
- 只接受磁盘上的 BFDS_GATE 阶段，不从聊天记忆推断状态。
- status.json 和 evidence/gate-log.ndjson 只由 bfds-gate.mjs 管理。
- Claude Code 中选择或确认类用户输入必须用 AskUserQuestion；Register 只问 product/brand 单选，不问名称或 ID。

硬阶段边界：
- CONTEXT_BLOCKED：父会话逐题询问用户项目级 Impeccable init 信息。evidence/init-interview.json 记录用户回答和确认前，不写 PRODUCT.md 或 DESIGN.md。PRODUCT.md 是战略上下文；DESIGN.md 是 Stitch 视觉设计系统文档，不是架构文档。
- NEEDS_SURFACE：只写 evidence/surface.json，然后重跑 gate。
- NEEDS_DIRECTIONS：父会话做苏格拉底式设计脑暴，一次只问一个设计表达问题。先写 evidence/brainstorm-dialogue.json；用户用 AskUserQuestion 确认 2-3 个方向取舍后，才写 evidence/directions.json，然后重跑 gate。
- NEEDS_WORKBENCH：只根据方向证据生成 workbench.html 和 option-a/b/c.html。
- NEEDS_SELECTION：停止等待用户用 AskUserQuestion 明确选择；推荐方案或“你定”不算选择。
- NEEDS_CONTRACT：向用户回显选择证据原话和摘要；用 AskUserQuestion 确认后才写设计交付包。

如果 startup、clear 或 compact 丢失上下文，先重跑 bfds-gate.mjs，再从 gate 报告的阶段继续。
</EXTREMELY_IMPORTANT>
`.trim();

process.stdout.write(`${JSON.stringify({
  hookSpecificOutput: {
    hookEventName: 'SessionStart',
    additionalContext: bootstrap
  }
})}\n`);
